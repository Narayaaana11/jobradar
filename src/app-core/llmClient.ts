import { IJob, IProfile, IInterviewPrep } from './types';
import { IExtractedJD } from './extractor';
import { IScoreResult } from './scorer';

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
   * 2. SCORER & RUBRIC AGENT (LLM Mode):
   * Evaluates candidate fit and calculates 5-tier career-ops rubric with deep reasoning.
   */
  public async scoreJobWithLlm(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    apiKey: string
  ): Promise<ILlmResponse<IScoreResult>> {
    try {
      const systemPrompt = `You are a Principal Engineering Hiring Evaluator. Assess candidate fit for this opening using a 0-100 score and 1.0-5.0 rubric ratings across skills, tech stack, experience, and location. Return strictly valid JSON.`;
      const prompt = `EVALUATE CANDIDATE FIT:
JOB:
Company: ${job.companyName}
Title: ${job.jobTitle}
Skills Required: ${(job.skillsRequired || []).join(', ')}
Location: ${job.location}

CANDIDATE PROFILE:
Name: ${profile.name}
Degree: ${profile.education}
Primary Skills: ${profile.primarySkills.join(', ')}
Experience: ${profile.experience}
Projects: AUSVMS (Visitor Management MERN), Guard Hub (Security Roster MERN), Matrix Library Management System (MERN, Python NLP)

SCHEMA:
{
  "matchScore": 88,
  "matchConfidence": "high | medium | low",
  "gapAnalysis": {
    "missingSkills": ["Skills mentioned in JD not in profile"],
    "strongMatches": ["Skills candidate excels in"]
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
   * 3. RESUME TAILORING AGENT (LLM Mode):
   * Customizes candidate project highlights for maximum ATS keyword alignment.
   */
  public async tailorResumeBulletsWithLlm(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    apiKey: string
  ): Promise<ILlmResponse<{ summary: string; customizedBullets: string[] }>> {
    try {
      const systemPrompt = `You are an ATS Resume Optimization Engineer at FAANG. Rewrite candidate project bullets to prominently showcase relevant technologies requested in the target Job Description while retaining technical veracity. Return strictly valid JSON.`;
      const prompt = `TAILOR RESUME BULLETS FOR:
Target Company: ${job.companyName}
Target Role: ${job.jobTitle}
Key JD Skills: ${(job.skillsRequired || []).join(', ')}

Candidate Profile:
Name: ${profile.name}
Degree: ${profile.education}
Projects: AUSVMS (Visitor Management MERN), Guard Hub (Security Roster MERN), Matrix Library Management System (MERN, NLP Python)

SCHEMA:
{
  "summary": "1 concise tailored ATS summary for ${job.companyName}",
  "customizedBullets": [
    "AUSVMS: Built role-based access control with real-time Socket.io and MongoDB pipelines...",
    "Guard Hub: Engineered automated shift collision detection engine in React and Node.js...",
    "Matrix Library: Integrated NLP query assistant and stateful real-time book checkout..."
  ]
}`;

      const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return { success: true, data: parsed, modelUsed: model };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 4. INTERVIEW PREP AGENT (LLM Mode):
   * Generates dynamic role-specific questions and STAR answers.
   */
  public async generateAiInterviewPrep(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    apiKey: string
  ): Promise<ILlmResponse<IInterviewPrep>> {
    try {
      const systemPrompt = `You are a Senior Staff Engineering Interviewer and Career Coach. You evaluate technical job descriptions and produce realistic, rigorous interview preparation packets tailored to the specific company, role, and candidate profile. Always return strictly valid JSON matching the requested schema with no markdown code fences or conversational filler.`;

      const prompt = `Analyze this job posting and generate a comprehensive interview preparation plan:
COMPANY: ${job.companyName}
ROLE: ${job.jobTitle}
LOCATION: ${job.location || 'Remote'}
REQUIRED SKILLS: ${(job.skillsRequired || []).join(', ')}
JOB DESCRIPTION:
${job.rawDescription || 'No description provided'}

CANDIDATE BACKGROUND:
Name: ${profile.name}
Degree: ${profile.education}
Primary Skills: ${profile.primarySkills.join(', ')}
Key Projects: AUSVMS (Visitor Management MERN), Guard Hub (Security Roster MERN), Matrix Library Management System (MERN, NLP Python)
Internship: Full Stack Development Intern @ Technical Hub Pvt. Ltd.

Return JSON in this EXACT schema:
{
  "roleOverview": "2-3 sentence strategic analysis of what this role specifically demands at ${job.companyName}",
  "technicalTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"],
  "questions": [
    {
      "category": "Technical",
      "question": "Realistic deep technical question specific to ${job.companyName}'s tech stack",
      "suggestedAnswer": "Detailed STAR/technical answer leveraging candidate's actual projects and skills",
      "keyConcepts": ["Concept A", "Concept B"]
    },
    {
      "category": "System Design",
      "question": "System design challenge relevant to ${job.companyName}",
      "suggestedAnswer": "Architectural breakdown covering API design, DB schema, scalability, and bottlenecks",
      "keyConcepts": ["Concept A", "Concept B"]
    },
    {
      "category": "Behavioral",
      "question": "Behavioral / culture fit question matching ${job.companyName}'s engineering principles",
      "suggestedAnswer": "Structured STAR story connecting to candidate's internship or university projects",
      "keyConcepts": ["Ownership", "Collaboration"]
    },
    {
      "category": "Company Fit",
      "question": "Why ${job.companyName} and how does this role fit your career trajectory?",
      "suggestedAnswer": "Persuasive company-specific pitch connecting candidate's goals with company mission",
      "keyConcepts": ["Company Culture", "Product Impact"]
    }
  ]
}`;

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
   * 5. COVER LETTER AGENT (LLM Mode):
   * Generates high-converting tailored cover letter.
   */
  public async generateAiCoverLetter(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    apiKey: string
  ): Promise<ILlmResponse<string>> {
    try {
      const systemPrompt = `You are a high-conversion Tech Career Strategist. Write concise, persuasive, non-generic cover letters that highlight measurable engineering impact and match candidate skills with company goals.`;

      const prompt = `Write a high-converting, professional cover letter for:
COMPANY: ${job.companyName}
ROLE: ${job.jobTitle}
LOCATION: ${job.location || 'India / Remote'}
SKILLS NEEDED: ${(job.skillsRequired || []).join(', ')}

CANDIDATE:
Name: ${profile.name}
Email: ${profile.email} | Phone: ${profile.phone}
Education: ${profile.education}
Experience: ${profile.experience}
Portfolio: ${profile.portfolio} | GitHub: ${profile.github} | LinkedIn: ${profile.linkedin}
Core Skills: ${profile.primarySkills.join(', ')}
Key Projects:
1. AUSVMS (Visitor Management MERN with RBAC & real-time Socket.io alerts)
2. Guard Hub (Security Roster Engine with shift constraint validation)
3. Matrix Library System (React, Node.js, NLP Python chatbot)

Write a 3-4 paragraph impactful cover letter with zero fluff, formatted in clean Markdown.`;

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
