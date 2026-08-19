import { IJob, IProfile, IInterviewPrep, IColdOutreachSuite, IInterviewMasterGuide } from './types';
import { IExtractedJD } from './extractor';
import { IScoreResult } from './scorer';
import { IRagCitation } from './rag/types';
import { ragAugmentor } from './rag/ragAugmentor';
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
   * Reads Groq and Gemini keys from the saved profile (lazy import avoids circular dep).
   * Used by agent methods to auto-enable multi-provider fallback.
   */
  private getProfileProviderKeys(): { groqKey: string; geminiKey: string } {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { store } = require('./store') as typeof import('./store');
      const p = store.getProfile();
      return { groqKey: p.groqApiKey || '', geminiKey: p.geminiApiKey || '' };
    } catch {
      return { groqKey: '', geminiKey: '' };
    }
  }

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
   * Universal OpenRouter fetch caller with True Load-Balanced Rotation,
   * Automatic Failover Cascade across all free models,
   * and multi-provider fallback to Groq / Gemini when all OpenRouter models fail.
   */
  public async callLlm(
    prompt: string,
    systemPrompt: string,
    apiKey: string,
    preferredModel?: string,
    groqKey?: string,
    geminiKey?: string
  ): Promise<{ text: string; model: string }> {
    // If no OpenRouter key, go directly to Groq or Gemini
    if (!apiKey || !apiKey.trim()) {
      if (groqKey?.trim()) {
        return this.callGroq(prompt, systemPrompt, groqKey);
      }
      if (geminiKey?.trim()) {
        return this.callGemini(prompt, systemPrompt, geminiKey);
      }
      throw new Error('No API key provided. Please configure your OpenRouter, Gemini, or Groq API key in Settings.');
    }

    // Support Multi-Key Pooling: parse comma/newline-separated API keys
    const rawKeys = apiKey.split(/[,;\n]+/).map((k) => k.trim()).filter((k) => k.length > 5);
    const keyPool = rawKeys.length > 0 ? rawKeys : [apiKey.trim()];

    const electronApi = typeof window !== 'undefined' ? (window as any)?.electronAPI : null;
    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
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

    // Loop through available API keys in key pool
    for (let kIdx = 0; kIdx < keyPool.length; kIdx++) {
      const key = keyPool[kIdx];
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      };

    let keyRateLimitedCount = 0;

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
            if (res.status === 429) {
              keyRateLimitedCount++;
              lastError = `Rate limited (HTTP 429) on model ${model}. Trying next model...`;
              continue; // try next free model, don't break key rotation
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
              if (res.status === 429) {
                keyRateLimitedCount++;
                lastError = `Rate limited (HTTP 429) on model ${model}. Trying next model...`;
                continue; // rotate to next model, NOT next key
              }
              lastError = errData?.error?.message || `HTTP ${res.status}`;
              if (res.status === 503 || res.status === 502) {
                continue;
              }
            }
          }
        } catch (err: any) {
          lastError = err.message;
        }
      }

      // Only switch to next key if ALL models were rate-limited on this key
      if (keyRateLimitedCount < orderedModels.length) {
        break; // non-rate-limit error, don't try more keys
      }
    }

    // OpenRouter exhausted â€” cascade to Groq then Gemini
    if (groqKey?.trim()) {
      try {
        return await this.callGroq(prompt, systemPrompt, groqKey);
      } catch { /* fall through to Gemini */ }
    }
    if (geminiKey?.trim()) {
      try {
        return await this.callGemini(prompt, systemPrompt, geminiKey);
      } catch { /* fall through to final error */ }
    }

    throw new Error(lastError || 'All AI providers (OpenRouter, Groq, Gemini) failed or rate-limited.');
  }


  /**
   * Calls Groq API (console.groq.com) â€” 14,400 req/day free.
   * Models: llama-3.1-70b-versatile, mixtral-8x7b-32768, gemma2-9b-it
   */
  private async callGroq(
    prompt: string,
    systemPrompt: string,
    groqApiKey: string
  ): Promise<{ text: string; model: string }> {
    const GROQ_MODELS = [
      'llama-3.1-70b-versatile',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ];
    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    const electronApi = typeof window !== 'undefined' ? (window as any)?.electronAPI : null;

    for (const model of GROQ_MODELS) {
      try {
        const body = {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 4096,
        };
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        };

        if (electronApi?.callLlmApi) {
          const res = await electronApi.callLlmApi({ endpoint, headers, body, method: 'POST' });
          if (res.success && res.data?.choices?.[0]?.message?.content) {
            return { text: res.data.choices[0].message.content, model: `groq/${model}` };
          }
          if (res.status === 429) continue; // rate limited, try next model
        } else {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
          });
          if (res.ok) {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) return { text: content, model: `groq/${model}` };
          } else if (res.status === 429) {
            continue; // try next model
          }
        }
      } catch {
        continue;
      }
    }
    throw new Error('Groq: All models rate-limited or unavailable.');
  }

  /**
   * Calls Google Gemini API (aistudio.google.com) â€” 1,500 req/day free.
   * Model: gemini-1.5-flash (fast, capable, huge context window)
   */
  private async callGemini(
    prompt: string,
    systemPrompt: string,
    geminiApiKey: string
  ): Promise<{ text: string; model: string }> {
    const GEMINI_MODELS = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.0-pro',
    ];
    const electronApi = typeof window !== 'undefined' ? (window as any)?.electronAPI : null;

    for (const model of GEMINI_MODELS) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      try {
        const body = {
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\n${prompt}` }],
            },
          ],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
        };

        if (electronApi?.callLlmApi) {
          const res = await electronApi.callLlmApi({
            endpoint,
            headers: { 'Content-Type': 'application/json' },
            body,
            method: 'POST',
          });
          if (res.success) {
            const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return { text, model: `gemini/${model}` };
          }
          if (res.status === 429) continue;
        } else {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
          });
          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return { text, model: `gemini/${model}` };
          } else if (res.status === 429) {
            continue;
          }
        }
      } catch {
        continue;
      }
    }
    throw new Error('Gemini: All models rate-limited or unavailable.');
  }

  /**
   * Multi-provider LLM caller with automatic failover:
   * OpenRouter (free models) â†’ Groq â†’ Gemini
   *
   * Any subset of keys can be provided; providers with no key are skipped.
   * Pass groqApiKey and geminiApiKey for maximum resilience.
   */
  public async callLlmMultiProvider(
    prompt: string,
    systemPrompt: string,
    openRouterKey: string,
    groqApiKey?: string,
    geminiApiKey?: string,
    preferredModel?: string
  ): Promise<{ text: string; model: string }> {
    const errors: string[] = [];

    // 1. Try OpenRouter first (if key present)
    if (openRouterKey?.trim()) {
      try {
        return await this.callLlm(prompt, systemPrompt, openRouterKey, preferredModel);
      } catch (err: any) {
        errors.push(`OpenRouter: ${err.message}`);
      }
    }

    // 2. Try Groq (if key present) â€” 14,400 req/day free
    if (groqApiKey?.trim()) {
      try {
        return await this.callGroq(prompt, systemPrompt, groqApiKey);
      } catch (err: any) {
        errors.push(`Groq: ${err.message}`);
      }
    }

    // 3. Try Gemini (if key present) â€” 1,500 req/day free
    if (geminiApiKey?.trim()) {
      try {
        return await this.callGemini(prompt, systemPrompt, geminiApiKey);
      } catch (err: any) {
        errors.push(`Gemini: ${err.message}`);
      }
    }

    throw new Error(`All AI providers failed. Details: ${errors.join(' | ')}`);
  }

  /**
   * Test a Groq API key.
   */
  public async testGroqKey(groqApiKey: string): Promise<{ valid: boolean; model?: string; message?: string }> {
    try {
      const res = await this.callGroq('Reply with "OK" only.', 'You are a connectivity test.', groqApiKey);
      return { valid: true, model: res.model };
    } catch (err: any) {
      return { valid: false, message: err.message };
    }
  }

  /**
   * Test a Gemini API key.
   */
  public async testGeminiKey(geminiApiKey: string): Promise<{ valid: boolean; model?: string; message?: string }> {
    try {
      const res = await this.callGemini('Reply with "OK" only.', 'You are a connectivity test.', geminiApiKey);
      return { valid: true, model: res.model };
    } catch (err: any) {
      return { valid: false, message: err.message };
    }
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
  "ctcRange": "e.g. â‚¹12 - 18 LPA or null",
  "applicationLink": "Valid application URL or null",
  "applicationDeadline": "Deadline or null",
  "skillsRequired": ["Skill 1", "Skill 2", "Skill 3"],
  "experienceRequired": "e.g. Freshers / 0-2 years or null"
}`;

      const { groqKey, geminiKey } = this.getProfileProviderKeys(); const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey, undefined, groqKey, geminiKey);
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

      const { groqKey, geminiKey } = this.getProfileProviderKeys(); const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey, undefined, groqKey, geminiKey);
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

      const { groqKey, geminiKey } = this.getProfileProviderKeys(); const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey, undefined, groqKey, geminiKey);
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

      const { groqKey, geminiKey } = this.getProfileProviderKeys(); const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey, undefined, groqKey, geminiKey);
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

      const { groqKey, geminiKey } = this.getProfileProviderKeys(); const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey, undefined, groqKey, geminiKey);
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

      const { groqKey, geminiKey } = this.getProfileProviderKeys(); const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey, undefined, groqKey, geminiKey);
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
      "dayLabel": "Day 1 â€” Concise Value Pitch",
      "triggerCondition": "Immediate application",
      "channel": "Email",
      "subject": "string",
      "body": "string"
    },
    {
      "stepNumber": 2,
      "dayLabel": "Day 4 â€” Engineering Value-Add Bump",
      "triggerCondition": "No response after 3 days",
      "channel": "Email",
      "subject": "string",
      "body": "string"
    },
    {
      "stepNumber": 3,
      "dayLabel": "Day 9 â€” Graceful Keep-in-Touch Close",
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

      const { groqKey, geminiKey } = this.getProfileProviderKeys(); const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey, undefined, groqKey, geminiKey);
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

      const { groqKey, geminiKey } = this.getProfileProviderKeys(); const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey, undefined, groqKey, geminiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return { success: true, data: { ...fallback, ...parsed }, modelUsed: model };
    } catch (err: any) {
      console.warn('[LLM Client] LLM Master Guide generation fallback:', err.message);
      return { success: true, data: generateInterviewMasterGuide(job, profile), modelUsed: 'Heuristic Fallback' };
    }
  }

  /**
   * 8. SCRAPING OVERSEER & CAREER PORTAL AUDITOR (LLM Agent):
   * Inspects scraped career page content, strips UI navigation / buttons,
   * extracts genuine job openings with full titles, skills, and direct apply links.
   */
  public async auditAndExtractCareerPageWithAi(
    rawText: string,
    pageUrl: string,
    companyName: string,
    apiKey: string
  ): Promise<ILlmResponse<{
    openings: Array<{
      jobTitle: string;
      location: string;
      skillsRequired: string[];
      experienceRequired: string;
      applicationLink?: string;
      rawDescription: string;
    }>;
    rejectedNavElements: string[];
  }>> {
    try {
      const systemPrompt = `You are an Autonomous Scraping Overseer & Quality Auditor AI Agent for a tech job radar.
Your job is to inspect raw text extracted from a company career portal and:
1. Reject and filter out all website navigation UI elements, buttons, and headers (e.g. "Home", "Jobs", "Careers", "Support", "How we Hire", "I'm Interested", "SEE ALL JOBS", "About Us", "Login").
2. Extract ONLY genuine, individual technical and software engineering job openings.
3. For each opening, extract the authentic job title, location, required skills, and clear job description.
Return strictly valid JSON with no markdown wrapping.`;

      const prompt = `AUDIT SCRAPED CAREER PORTAL CONTENT:
COMPANY: ${companyName}
PAGE URL: ${pageUrl}

RAW SCRAPED CONTENT:
${rawText.substring(0, 3500)}

SCHEMA:
{
  "openings": [
    {
      "jobTitle": "Exact Engineering Job Title (e.g. Software Engineer, Full Stack Developer, Frontend Intern)",
      "location": "Job Location or Remote",
      "skillsRequired": ["Skill 1", "Skill 2"],
      "experienceRequired": "e.g. Freshers / 0-2 yrs",
      "applicationLink": "Direct URL if found, else null",
      "rawDescription": "Substantive summary of duties and requirements"
    }
  ],
  "rejectedNavElements": ["Junk title 1", "Junk title 2"]
}`;

      const { groqKey, geminiKey } = this.getProfileProviderKeys(); const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey, undefined, groqKey, geminiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        success: true,
        data: {
          openings: Array.isArray(parsed.openings) ? parsed.openings : [],
          rejectedNavElements: Array.isArray(parsed.rejectedNavElements) ? parsed.rejectedNavElements : [],
        },
        modelUsed: model,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 9. AI FOLLOW-UP CADENCE SYNTHESIZER:
   * Generates highly tailored, context-specific follow-up messages across all cadence milestones.
   */
  public async generateAiFollowupCadence(
    job: IJob,
    profile: IProfile,
    apiKey: string
  ): Promise<ILlmResponse<import('./types').IFollowupCadenceSuite>> {
    try {
      const systemPrompt = `You are a JobRadar Automated Follow-Up Strategist.
Generate 4 highly tailored follow-up emails for an active job application:
1. Day 3 Warm Ping (Recruiter / Senior Engineer)
2. Day 7 Recruiter Check-in (Lead Tech Recruiter)
3. Day 14 Subsequent Follow-up (Hiring Manager)
4. Post-Interview 24h Thank-You Note (Interview Panel)

Tailor the emails specifically to the company's tech stack, product mission, and candidate's key strengths.
Return strictly valid JSON with no markdown formatting.`;

      const prompt = `JOB DETAILS:
Company: ${job.companyName}
Role: ${job.jobTitle}
Skills Required: ${(job.skillsRequired || []).join(', ')}

CANDIDATE:
Name: ${profile.name}
Primary Skills: ${profile.primarySkills.join(', ')}
Portfolio / GitHub: ${profile.github} | LinkedIn: ${profile.linkedin}

SCHEMA:
{
  "items": [
    {
      "milestone": "Day 3 Warm Ping",
      "daysAfterApplication": 3,
      "targetPersona": "Recruiter / Senior Engineer",
      "subject": "Email subject",
      "messageBody": "Full email message body"
    },
    {
      "milestone": "Day 7 Recruiter Check-in",
      "daysAfterApplication": 7,
      "targetPersona": "Lead Tech Recruiter",
      "subject": "Email subject",
      "messageBody": "Full email message body"
    },
    {
      "milestone": "Day 14 Subsequent Follow-up",
      "daysAfterApplication": 14,
      "targetPersona": "Hiring Manager / Department Head",
      "subject": "Email subject",
      "messageBody": "Full email message body"
    },
    {
      "milestone": "Post-Interview 24h Thank-You",
      "daysAfterApplication": 1,
      "targetPersona": "Interview Panel & Hiring Manager",
      "subject": "Email subject",
      "messageBody": "Full email message body"
    }
  ]
}`;

      const { groqKey, geminiKey } = this.getProfileProviderKeys(); const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey, undefined, groqKey, geminiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const baseDate = new Date(job.createdAt || Date.now());
      const addDays = (d: Date, days: number): string => {
        const next = new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
        return next.toISOString().split('T')[0];
      };

      const items = (parsed.items || []).map((item: any, idx: number) => {
        const days = item.daysAfterApplication || (idx === 0 ? 3 : idx === 1 ? 7 : idx === 2 ? 14 : 1);
        const scheduledDate = addDays(baseDate, days);
        return {
          id: `cadence-ai-${idx}-${job.id}`,
          milestone: item.milestone || 'Follow-up Check-in',
          daysAfterApplication: days,
          scheduledDate,
          isOverdue: new Date(scheduledDate).getTime() < Date.now() && job.applicationStatus === 'applied',
          completed: false,
          targetPersona: item.targetPersona || 'Hiring Team',
          subject: item.subject || `Following up on ${job.jobTitle} - ${profile.name}`,
          messageBody: item.messageBody || '',
        };
      });

      return {
        success: true,
        data: {
          appliedDate: baseDate.toISOString().split('T')[0],
          items,
        },
        modelUsed: model,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 10. AI BLOCK G LEGITIMACY & GHOST JOB DEEP AUDITOR:
   * Uses LLM reasoning to detect evergreen ghost postings, phantom listings, visa compliance filings, and scams.
   */
  public async auditBlockGLegitimacyWithAi(
    job: IJob,
    apiKey: string
  ): Promise<ILlmResponse<import('./types').IBlockGAudit>> {
    try {
      const systemPrompt = `You are a Principal Technical Recruiting Fraud & Ghost Job Auditor.
Analyze the target job description, company name, location, and apply link to determine if it is:
1. "Verified Legitimate" (Genuine active hiring with clear project scope)
2. "Low Risk" (Evergreen / stale repost, or broad general pool listing)
3. "High Risk Ghost Job" (Deceptive listing, resume harvesting without intent to hire, scam, or payment requests)
4. "Work-Auth Blocker" (Strict US/EU citizenship or non-sponsorship blockers)

Return strictly valid JSON with no markdown wrapping.`;

      const prompt = `JOB TO AUDIT:
Company: ${job.companyName}
Title: ${job.jobTitle}
Location: ${job.location || 'India / Remote'}
Apply URL: ${job.applicationLink || 'None'}
Job Description Snippet:
${(job.rawDescription || '').slice(0, 2000)}

SCHEMA:
{
  "legitimacyScore": 85,
  "isGhostJobRisk": false,
  "workAuthBlocker": false,
  "verdict": "Verified Legitimate",
  "signalsFound": ["Positive Signal 1", "Risk Signal 2"],
  "recommendation": "Strategic guidance for the candidate"
}`;

      const { groqKey, geminiKey } = this.getProfileProviderKeys(); const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey, undefined, groqKey, geminiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        success: true,
        data: {
          legitimacyScore: typeof parsed.legitimacyScore === 'number' ? parsed.legitimacyScore : 85,
          isGhostJobRisk: Boolean(parsed.isGhostJobRisk),
          isStaleRepost: Boolean(parsed.isStaleRepost),
          workAuthBlocker: Boolean(parsed.workAuthBlocker),
          verdict: parsed.verdict || 'Verified Legitimate',
          signalsFound: Array.isArray(parsed.signalsFound) ? parsed.signalsFound : ['Verified by AI Reasoner'],
          recommendation: parsed.recommendation || 'Verified authentic posting.',
        },
        modelUsed: model,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 11. AI KNOWLEDGE VAULT STAR STORY SYNTHESIZER:
   * Ingests candidate resumes/documents and automatically synthesizes high-impact STAR project case studies.
   */
  public async synthesizeKnowledgeVaultWithAi(
    rawDocsText: string,
    profile: IProfile,
    apiKey: string
  ): Promise<ILlmResponse<{
    caseStudies: Array<{
      title: string;
      category: 'project' | 'experience' | 'system_design' | 'soft_skill';
      problem: string;
      solution: string;
      metricsAchieved: string[];
      technologiesUsed: string[];
      fullNarrative: string;
    }>;
    extractedKeySkills: string[];
  }>> {
    try {
      const systemPrompt = `You are a Principal Engineering Career Strategist & Knowledge Synthesizer.
Extract structured STAR (Situation, Task, Action, Result) engineering case studies and verified hard skills from candidate documents.
Return strictly valid JSON with no markdown wrapping.`;

      const prompt = `CANDIDATE: ${profile.name}
RAW DOCUMENTS TEXT:
${rawDocsText.slice(0, 4000)}

SCHEMA:
{
  "caseStudies": [
    {
      "title": "Project or Feature Name",
      "category": "project",
      "problem": "Challenge or bottleneck faced",
      "solution": "Technical architecture and implementation built",
      "metricsAchieved": ["Latency reduced by 40%", "Handled 10k concurrent reqs"],
      "technologiesUsed": ["React", "TypeScript", "Node.js", "Redis"],
      "fullNarrative": "Complete 4-sentence STAR story"
    }
  ],
  "extractedKeySkills": ["Skill 1", "Skill 2"]
}`;

      const { groqKey, geminiKey } = this.getProfileProviderKeys(); const { text, model } = await this.callLlm(prompt, systemPrompt, apiKey, undefined, groqKey, geminiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        success: true,
        data: {
          caseStudies: Array.isArray(parsed.caseStudies) ? parsed.caseStudies : [],
          extractedKeySkills: Array.isArray(parsed.extractedKeySkills) ? parsed.extractedKeySkills : [],
        },
        modelUsed: model,
      };
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

