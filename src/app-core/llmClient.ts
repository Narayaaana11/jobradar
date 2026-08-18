import { IJob, IProfile, IInterviewPrep, IColdOutreachSuite, IInterviewMasterGuide } from './types';
import { IExtractedJD } from './extractor';
import { IScoreResult } from './scorer';
import { ragAugmentor } from './rag/ragAugmentor';
import { IRagCitation, IRagChatMessage } from './rag/types';
import { generateOutreachSuite } from './outreachAgent';
import { generateInterviewMasterGuide } from './interviewMasterGuide';

export interface ILlmResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  modelUsed?: string;
}

// Resilient fallback seed list if offline or network fetch fails
const SEED_FREE_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-20b:free',
  'liquid/lfm-2.5-2.6b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'z-ai/glm-5.2:free',
  'openrouter/free',
];

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class LlmClientService {
  private cachedFreeModels: string[] = [...SEED_FREE_MODELS];
  private lastModelsFetchTime = 0;
  private roundRobinCounter = 0;

  /**
   * Fetches the LIVE list of 100% free models from OpenRouter's public API
   * and caches the result for 1 hour.
   */
  public async getLiveFreeModels(): Promise<string[]> {
    const now = Date.now();
    if (this.cachedFreeModels.length > 0 && now - this.lastModelsFetchTime < CACHE_TTL_MS) {
      return this.cachedFreeModels;
    }

    try {
      const electronApi = typeof window !== 'undefined' ? (window as any)?.electronAPI : null;
      let data: any = null;

      if (electronApi?.callLlmApi) {
        const res = await electronApi.callLlmApi({
          endpoint: 'https://openrouter.ai/api/v1/models',
          headers: {},
          method: 'GET',
        });
        if (res.success && res.data?.data) {
          data = res.data;
        }
      } else {
        const res = await fetch('https://openrouter.ai/api/v1/models', { method: 'GET' });
        if (res.ok) {
          data = await res.json();
        }
      }

      if (data?.data && Array.isArray(data.data)) {
        // Filter for models with 0 prompt and 0 completion cost
        const liveFree = data.data
          .filter((m: any) => {
            const isZeroCost = m.pricing && m.pricing.prompt === '0' && m.pricing.completion === '0';
            const isFreeId = m.id && (m.id.endsWith(':free') || m.id === 'openrouter/free');
            // Filter out non-chat / audio / safety-only utility models
            const isExcluded = m.id.includes('safety') || m.id.includes('lyria') || m.id.includes('clip');
            return (isZeroCost || isFreeId) && !isExcluded;
          })
          .map((m: any) => m.id);

        if (liveFree.length > 0) {
          this.cachedFreeModels = liveFree;
          this.lastModelsFetchTime = now;
          return this.cachedFreeModels;
        }
      }
    } catch {
      // Gracefully retain seed list if network fetch fails
    }

    return this.cachedFreeModels;
  }

  /**
   * Universal OpenRouter fetch caller with True Load-Balanced Rotation
   * and Automatic Failover Cascade across all free models.
   */
  public async callLlm(
    prompt: string,
    systemPrompt: string,
    apiKey: string,
    preferredModel?: string
  ): Promise<{ text: string; model: string }> {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('No API key provided. Please configure your OpenRouter API key in Settings.');
    }

    const key = apiKey.trim();
    const electronApi = typeof window !== 'undefined' ? (window as any)?.electronAPI : null;
    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    };

    const freeModels = await this.getLiveFreeModels();

    // Construct ordered trial list starting with rotated index
    let orderedModels: string[];
    if (preferredModel) {
      orderedModels = [preferredModel, ...freeModels.filter((m) => m !== preferredModel)];
    } else {
      const startIndex = this.roundRobinCounter % freeModels.length;
      this.roundRobinCounter++;
      orderedModels = [
        ...freeModels.slice(startIndex),
        ...freeModels.slice(0, startIndex),
      ];
    }

    let lastError = '';

    for (let i = 0; i < orderedModels.length; i++) {
      const model = orderedModels[i];
      try {
        const body = {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
        };

        if (electronApi?.callLlmApi) {
          const res = await electronApi.callLlmApi({ endpoint, headers, body, method: 'POST' });
          if (res.success && res.data?.choices?.[0]?.message?.content) {
            return {
              text: res.data.choices[0].message.content,
              model: res.data.model || model,
            };
          }
          lastError = res.error || `HTTP ${res.status || 'unknown'}`;
        } else {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(12000),
          });

          if (res.ok) {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              return { text: content, model: data.model || model };
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            lastError = errData?.error?.message || `HTTP ${res.status}`;
            // If rate-limited (429) or model temporarily unavailable (503), cascade to next model
            if (res.status === 429 || res.status === 503) {
              continue;
            }
          }
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    throw new Error(lastError || 'OpenRouter request failed across all free model endpoints.');
  }

  /**
   * 1. EXTRACTOR AGENT (LLM Mode):
   * Extracts structured JD metadata from unstructured text dumps.
   */
  public async extractJobWithLlm(rawText: string, apiKey: string): Promise<ILlmResponse<IExtractedJD>> {
    try {
      const systemPrompt = `You are a Technical Recruitment Parser. Extract structured metadata from this job posting text. Return strictly valid JSON matching the requested schema with no markdown formatting.`;
      const prompt = `Extract all details from this job posting into JSON:
POSTING TEXT:
${rawText}

SCHEMA:
{
  "companyName": "Exact Company Name",
  "jobTitle": "Exact Job Title",
  "jobType": "Full-Time | Internship | Contract | null",
  "location": "City or Remote",
  "isRemote": true or false or null,
  "ctcMentioned": true or false,
  "ctcRange": "e.g. ₹12 - 18 LPA or null",
  "applicationLink": "Valid application URL or null",
  "applicationDeadline": "Deadline or null",
  "skillsRequired": ["Skill 1", "Skill 2", "Skill 3"],
  "experienceRequired": "e.g. Freshers / 0-2 years or null"
}`;

      const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const result: IExtractedJD = {
        companyName: parsed.companyName || 'Unknown Company',
        jobTitle: parsed.jobTitle || 'Software Engineer',
        jobType: parsed.jobType || 'Full-Time',
        location: parsed.location || 'India',
        isRemote: parsed.isRemote ?? false,
        ctcMentioned: parsed.ctcMentioned ?? false,
        ctcRange: parsed.ctcRange || null,
        applicationLink: parsed.applicationLink || null,
        applicationDeadline: parsed.applicationDeadline || null,
        skillsRequired: Array.isArray(parsed.skillsRequired) ? parsed.skillsRequired : ['React', 'JavaScript'],
        experienceRequired: parsed.experienceRequired || 'Freshers / 2026 Batch',
        rawDescription: rawText,
        dedupHash: `${parsed.companyName || ''}-${parsed.jobTitle || ''}`.toLowerCase().replace(/[^a-z0-9]/g, ''),
      };

      return { success: true, data: result, modelUsed: model };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 2. SCORER & RUBRIC AGENT (RAG-Augmented LLM Mode):
   * Evaluates candidate fit against JD with evidence retrieved from knowledge vault.
   */
  public async scoreJobWithLlm(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    apiKey: string
  ): Promise<ILlmResponse<IScoreResult>> {
    try {
      const ragContext = ragAugmentor.getRagContextForJob(job, { topK: 4 });
      const systemPrompt = `You are a Principal Engineering Hiring Evaluator. Assess candidate fit for this opening using a 0-100 score and 1.0-5.0 rubric ratings across skills, tech stack, experience, and location. Ground your evaluation in the candidate's actual projects, case studies, and credentials retrieved from their knowledge base. Return strictly valid JSON.`;
      const prompt = `EVALUATE CANDIDATE FIT:
JOB:
Company: ${job.companyName}
Title: ${job.jobTitle}
Skills Required: ${(job.skillsRequired || []).join(', ')}
Location: ${job.location}

CANDIDATE BASE PROFILE:
Name: ${profile.name}
Degree: ${profile.education}
Primary Skills: ${profile.primarySkills.join(', ')}
Experience: ${profile.experience}

RETRIEVED CANDIDATE KNOWLEDGE VAULT EVIDENCE (GROUND TRUTH):
${ragContext.formattedContext || 'AUSVMS (MERN, Socket.io, MongoDB), Guard Hub (MERN, Scheduling), Matrix Library (MERN, Python NLP), JobRadar (Electron, React, TypeScript).'}

SCHEMA:
{
  "matchScore": 88,
  "matchConfidence": "high | medium | low",
  "gapAnalysis": {
    "missingSkills": ["Skills mentioned in JD not in profile"],
    "strongMatches": ["Skills candidate excels in based on retrieved evidence"]
  },
  "fitBreakdown": {
    "techFitScore": 90,
    "experienceFitScore": 85,
    "locationFitScore": 90
  },
  "rubricScores": {
    "skillsScore": 4.8,
    "techStackScore": 4.7,
    "experienceScore": 4.5,
    "locationScore": 4.5,
    "overallRubricRating": 4.6
  },
  "skillMatched": true
}`;

      const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed: IScoreResult = JSON.parse(cleaned);
      parsed.scoreFlag = parsed.matchScore >= 80 ? 'auto' : parsed.matchScore >= 60 ? 'borderline' : 'low_match';

      return { success: true, data: parsed, modelUsed: model };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 3. RESUME TAILORING AGENT (RAG-Augmented LLM Mode):
   * Customizes candidate project highlights with authentic metrics retrieved from knowledge vault.
   */
  public async tailorResumeBulletsWithLlm(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    apiKey: string
  ): Promise<ILlmResponse<{ summary: string; customizedBullets: string[] }>> {
    try {
      const ragContext = ragAugmentor.getRagContextForJob(job, { topK: 4 });
      const { prompt, systemPrompt } = ragAugmentor.buildAugmentedResumePrompt(job, profile, ragContext);

      const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return { success: true, data: parsed, modelUsed: model };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 4. INTERVIEW PREP AGENT (RAG-Augmented LLM Mode):
   * Generates dynamic role-specific questions and authentic STAR answers from candidate vault.
   */
  public async generateAiInterviewPrep(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    apiKey: string
  ): Promise<ILlmResponse<IInterviewPrep>> {
    try {
      const ragContext = ragAugmentor.getRagContextForJob(job, { topK: 5 });
      const { prompt, systemPrompt } = ragAugmentor.buildAugmentedInterviewPrepPrompt(job, profile, ragContext);

      const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed: IInterviewPrep = JSON.parse(cleaned);

      return {
        success: true,
        data: parsed,
        modelUsed: model,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * 5. COVER LETTER AGENT (RAG-Augmented LLM Mode):
   * Generates high-converting tailored cover letter grounded in retrieved project evidence.
   */
  public async generateAiCoverLetter(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    apiKey: string
  ): Promise<ILlmResponse<string>> {
    try {
      const ragContext = ragAugmentor.getRagContextForJob(job, { topK: 4 });
      const { prompt, systemPrompt } = ragAugmentor.buildAugmentedCoverLetterPrompt(job, profile, ragContext);

      const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey);
      return {
        success: true,
        data: text.trim(),
        modelUsed: model,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * 6. INTERACTIVE RAG CAREER CHAT:
   * Queries knowledge vault with hybrid search & generates grounded response with citations.
   */
  public async ragChat(
    userQuery: string,
    chatHistory: IRagChatMessage[] = [],
    apiKey?: string,
    preferredModel?: string
  ): Promise<{
    content: string;
    citations: IRagCitation[];
    modelUsed: string;
    queryTimeMs: number;
  }> {
    return ragAugmentor.queryRagChat(userQuery, chatHistory, apiKey, preferredModel);
  }

  /**
   * 6. REFERRAL OUTREACH AGENT (LLM Mode):
   * Generates a tailored referral outreach message for a specific employee persona.
   */
  public async generateAiReferralMessage(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    personaTitle: string,
    apiKey: string
  ): Promise<ILlmResponse<string>> {
    try {
      const systemPrompt = `You are a Career Networking Expert. Write a warm, polite, and persuasive 3-sentence LinkedIn connection / referral outreach message that highlights relevant skills and links without being pushy.`;
      const prompt = `Write a referral outreach request to an employee at ${job.companyName} who works as a "${personaTitle}".
ROLE APPLIED FOR: ${job.jobTitle}
CANDIDATE: ${profile.name}, MCA 2026 graduate with MERN stack experience, Portfolio: ${profile.portfolio}, GitHub: ${profile.github}.`;

      const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey);
      return { success: true, data: text.trim(), modelUsed: model };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 7. COLD OUTREACH & CADENCE AGENT (LLM Mode):
   * Generates highly tailored corporate emails, 3-step follow-up sequences, and InMails.
   */
  public async generateAiOutreachSuite(
    job: IJob,
    profile: IProfile,
    apiKey: string
  ): Promise<ILlmResponse<IColdOutreachSuite>> {
    try {
      const fallback = generateOutreachSuite(job, profile);
      const systemPrompt = `You are an Executive Job Search Coach & Outreach Strategist. Write a tailored, high-converting cold email outreach and follow-up sequence. Respond with valid JSON matching the schema with no markdown outside the JSON block.`;
      const prompt = `Generate tailored outreach for:
COMPANY: ${job.companyName}
ROLE: ${job.jobTitle}
CANDIDATE: ${profile.name}, MCA 2026 Aditya University (MERN Stack: React, Node.js, Express, MongoDB, Projects: AUSVMS, Guard Hub).

Return JSON matching:
{
  "companyDomain": "${fallback.companyDomain}",
  "emailPatterns": ${JSON.stringify(fallback.emailPatterns)},
  "cadenceSequence": [
    {
      "stepNumber": 1,
      "dayLabel": "Day 1 — Concise Value Pitch",
      "triggerCondition": "Immediate application",
      "channel": "Email",
      "subject": "string",
      "body": "string"
    },
    {
      "stepNumber": 2,
      "dayLabel": "Day 4 — Engineering Value-Add Bump",
      "triggerCondition": "No response after 3 days",
      "channel": "Email",
      "subject": "string",
      "body": "string"
    },
    {
      "stepNumber": 3,
      "dayLabel": "Day 9 — Graceful Keep-in-Touch Close",
      "triggerCondition": "No response after 8-10 days",
      "channel": "Email",
      "subject": "string",
      "body": "string"
    }
  ],
  "linkedInNotes": {
    "connectionRequestNote300Char": "Max 300 characters connection note",
    "recruiterDirectPitch": "Direct InMail pitch",
    "alumniWarmIntroduction": "Alumni outreach message"
  }
}`;

      const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return { success: true, data: { ...fallback, ...parsed }, modelUsed: model };
    } catch (err: any) {
      console.warn('[LLM Client] LLM outreach generation fallback:', err.message);
      return { success: true, data: generateOutreachSuite(job, profile), modelUsed: 'Heuristic Fallback' };
    }
  }

  /**
   * 8. INTERVIEW MASTER GUIDE AGENT (LLM Mode):
   * Generates tailored DSA challenges, system design architecture, and 48-hour cram sheets.
   */
  public async generateAiInterviewMasterGuide(
    job: IJob,
    profile: IProfile,
    apiKey: string
  ): Promise<ILlmResponse<IInterviewMasterGuide>> {
    try {
      const fallback = generateInterviewMasterGuide(job, profile);
      const systemPrompt = `You are a Principal Software Engineer & Staff Technical Interviewer at a FAANG company. Generate a comprehensive technical interview prep guide for this role. Return strictly valid JSON matching the schema.`;
      const prompt = `Generate technical interview master guide for:
COMPANY: ${job.companyName}
ROLE: ${job.jobTitle}
REQUIRED SKILLS: ${job.skillsRequired.join(', ')}
CANDIDATE: ${profile.name}, MCA 2026 (Projects: AUSVMS Vehicle Management System with MongoDB & JWT, Guard Hub Security Platform).

Return JSON matching:
{
  "generatedAt": "${new Date().toISOString()}",
  "dsaChallenges": ${JSON.stringify(fallback.dsaChallenges)},
  "systemDesign": ${JSON.stringify(fallback.systemDesign)},
  "skillGapCramSheet": ${JSON.stringify(fallback.skillGapCramSheet)},
  "salaryBenchmark": ${JSON.stringify(fallback.salaryBenchmark)},
  "companyCultureAudit": ${JSON.stringify(fallback.companyCultureAudit)}
}`;

      const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return { success: true, data: { ...fallback, ...parsed }, modelUsed: model };
    } catch (err: any) {
      console.warn('[LLM Client] LLM Master Guide generation fallback:', err.message);
      return { success: true, data: generateInterviewMasterGuide(job, profile), modelUsed: 'Heuristic Fallback' };
    }
  }

  /**
   * Validates if an API Key is active using OpenRouter's official Auth Check API.
   */
  public async testApiKey(apiKey: string): Promise<{ valid: boolean; message: string; model?: string }> {
    if (!apiKey || !apiKey.trim()) {
      return { valid: false, message: 'Please provide an OpenRouter API key.' };
    }

    const key = apiKey.trim();
    const electronApi = typeof window !== 'undefined' ? (window as any)?.electronAPI : null;

    try {
      const endpoint = 'https://openrouter.ai/api/v1/auth/key';
      const headers = { Authorization: `Bearer ${key}` };

      if (electronApi?.callLlmApi) {
        try {
          const res = await electronApi.callLlmApi({ endpoint, headers, method: 'GET' });
          if (res.success && res.data?.data) {
            const info = res.data.data;
            const statusTag = info.is_free_tier ? 'Free Tier' : 'Active Account';
            return {
              valid: true,
              message: `OpenRouter key verified (${statusTag})!`,
              model: 'OpenRouter Unified API',
            };
          }
        } catch {
          // Fall through to direct fetch
        }
      }

      // Direct Browser/Node fetch fallback
      const res = await fetch(endpoint, { method: 'GET', headers });
      if (res.ok) {
        const data = await res.json();
        const info = data?.data;
        const statusTag = info?.is_free_tier ? 'Free Tier' : 'Active Account';
        return {
          valid: true,
          message: `OpenRouter key verified (${statusTag})!`,
          model: 'OpenRouter Unified API',
        };
      } else {
        const errData = await res.json().catch(() => ({}));
        return { valid: false, message: errData?.error?.message || `HTTP ${res.status}: Invalid key` };
      }
    } catch (err: any) {
      return { valid: false, message: err.message };
    }
  }
}

export const llmClient = new LlmClientService();
