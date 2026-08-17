import { IJob, IProfile, IInterviewPrep, IInterviewQuestion } from './types';
import { IExtractedJD } from './extractor';

export interface ILlmResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  modelUsed?: string;
}

export class LlmClientService {
  /**
   * Calls OpenRouter or Anthropic Claude directly via standard fetch
   */
  public async callLlm(
    prompt: string,
    systemPrompt: string,
    apiKey: string,
    modelName: string = 'anthropic/claude-3.5-sonnet'
  ): Promise<{ text: string; model: string }> {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('No API key provided. Please configure your OpenRouter or Anthropic API key in Settings.');
    }

    const key = apiKey.trim();
    const isOpenRouter = key.startsWith('sk-or-') || !key.startsWith('sk-ant-');

    if (isOpenRouter) {
      // OpenRouter Unified API
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'https://github.com/Narayaaana11/jobradar',
          'X-Title': 'JobRadar Autonomous Career Agent',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `OpenRouter request failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      return { text: content, model: data.model || modelName };
    } else {
      // Anthropic Direct Messages API (via proxy or direct fetch)
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2500,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Anthropic request failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      const content = data.content?.[0]?.text || '';
      return { text: content, model: data.model || 'claude-3-5-sonnet-20241022' };
    }
  }

  /**
   * Generates REAL LLM-powered dynamic interview preparation tailored to the JD and candidate
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
   * Generates REAL LLM-powered tailored Cover Letter
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
   * Validates if an API Key is active
   */
  public async testApiKey(apiKey: string): Promise<{ valid: boolean; message: string; model?: string }> {
    try {
      const { model } = await this.callLlm('Reply with "OK"', 'You are a test ping bot.', apiKey);
      return { valid: true, message: 'API Key is valid and connected!', model };
    } catch (err: any) {
      return { valid: false, message: err.message };
    }
  }
}

export const llmClient = new LlmClientService();
