import { IJob, IProfile } from '../types';
import { IExtractedJD } from '../extractor';
import { knowledgeVault } from './knowledgeStore';
import {
  ISearchResult,
  IRagPromptContext,
  IRagCitation,
  IRagChatMessage,
  IRagQueryOptions,
} from './types';
import { llmClient } from '../llmClient';

export class RagAugmentorService {
  /**
   * Retrieves relevant candidate knowledge chunks for a target job posting.
   */
  public getRagContextForJob(
    job: Partial<IJob | IExtractedJD>,
    options: IRagQueryOptions = {}
  ): IRagPromptContext {
    const skills = (job.skillsRequired || []).join(' ');
    const query = `${job.jobTitle || ''} ${job.companyName || ''} ${skills} ${job.location || ''} ${(job.rawDescription || '').slice(0, 300)}`.trim();

    const topK = options.topK || 5;
    const searchResults = knowledgeVault.searchHybrid(query, {
      topK,
      minScore: options.minScore ?? 0.12,
      categoryFilter: options.categoryFilter,
      hybridSearch: options.hybridSearch ?? true,
    });

    // Format retrieved chunks into clean markdown context block
    let formattedContext = '';
    const docsReferenced = new Set<string>();
    const matchedSkills = new Set<string>();

    searchResults.forEach((res, idx) => {
      docsReferenced.add(res.chunk.documentTitle);
      (res.matchedKeywords || []).forEach((k) => matchedSkills.add(k));

      formattedContext += `--- [Retrieved Source #${idx + 1}: ${res.chunk.documentTitle} (${res.chunk.category.toUpperCase()}) | Relevance: ${Math.round(res.similarityScore * 100)}%] ---\n`;
      formattedContext += `${res.chunk.text}\n\n`;
    });

    const avgConfidence = searchResults.length > 0
      ? searchResults.reduce((acc, r) => acc + r.similarityScore, 0) / searchResults.length
      : 0;

    return {
      retrievedChunks: searchResults,
      formattedContext: formattedContext.trim(),
      topMatchedSkills: Array.from(matchedSkills),
      confidenceScore: Math.round(avgConfidence * 100) / 100,
      documentsReferenced: Array.from(docsReferenced),
    };
  }

  /**
   * Builds an augmented prompt for ATS Resume Tailoring.
   */
  public buildAugmentedResumePrompt(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    ragContext: IRagPromptContext
  ): { prompt: string; systemPrompt: string } {
    const systemPrompt = `You are a Principal ATS Resume Optimization Engineer at FAANG.
You specialize in tailoring candidate resumes using RETRIEVED KNOWLEDGE VAULT EVIDENCE.
Ground all bullet points and summary sentences in the candidate's actual projects, achievements, metrics, and case studies retrieved from their knowledge base. Do not invent non-existent projects or make false claims. Return strictly valid JSON.`;

    const prompt = `TAILOR ATS RESUME BULLETS & SUMMARY FOR:
Target Company: ${job.companyName}
Target Role: ${job.jobTitle}
Key JD Skills: ${(job.skillsRequired || []).join(', ')}

CANDIDATE BASE:
Name: ${profile.name}
Degree: ${profile.education}

RETRIEVED CANDIDATE KNOWLEDGE VAULT EVIDENCE (GROUND TRUTH):
${ragContext.formattedContext || 'No additional vault context found.'}

SCHEMA:
{
  "summary": "1 concise tailored ATS summary specifically matching ${job.companyName}'s domain using candidate's actual credentials",
  "customizedBullets": [
    "AUSVMS: Built role-based access control with real-time Socket.io and MongoDB pipelines cutting lookup times by 70%...",
    "Guard Hub: Engineered automated shift collision detection engine in React and Node.js eliminating 100% of double-booking conflicts...",
    "Matrix Library: Integrated NLP query assistant and real-time state synchronization..."
  ]
}`;

    return { prompt, systemPrompt };
  }

  /**
   * Builds an augmented prompt for AI Interview Prep.
   */
  public buildAugmentedInterviewPrepPrompt(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    ragContext: IRagPromptContext
  ): { prompt: string; systemPrompt: string } {
    const systemPrompt = `You are a Senior Staff Engineering Interviewer and Technical Career Coach.
You produce rigorous interview preparation packets tailored to the specific company, role, and candidate background.
CRITICAL: Utilize the candidate's RETRIEVED PROJECT CASE STUDIES and STAR STORIES provided below to construct hyper-personalized, authentic STAR answers grounded in candidate's actual experiences. Return strictly valid JSON with no markdown code fences.`;

    const prompt = `Analyze this job posting and generate comprehensive interview preparation:
COMPANY: ${job.companyName}
ROLE: ${job.jobTitle}
LOCATION: ${job.location || 'Remote'}
REQUIRED SKILLS: ${(job.skillsRequired || []).join(', ')}

RETRIEVED CANDIDATE KNOWLEDGE BASE & STAR EVIDENCE:
${ragContext.formattedContext || 'Candidate has MERN stack, Socket.io, MongoDB, and Python NLP experience.'}

Return JSON in this EXACT schema:
{
  "roleOverview": "2-3 sentence strategic analysis of what this role demands at ${job.companyName}",
  "technicalTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"],
  "questions": [
    {
      "category": "Technical",
      "question": "Deep technical question specific to ${job.companyName}'s stack and candidate's projects",
      "suggestedAnswer": "Detailed technical answer citing candidate's real project architecture and metrics from retrieved evidence",
      "keyConcepts": ["Concept A", "Concept B"]
    },
    {
      "category": "System Design",
      "question": "System design challenge relevant to ${job.companyName}",
      "suggestedAnswer": "Architectural breakdown referencing real scalability patterns from candidate's knowledge base",
      "keyConcepts": ["Concept A", "Concept B"]
    },
    {
      "category": "Behavioral",
      "question": "Behavioral / STAR question matching ${job.companyName}'s engineering culture",
      "suggestedAnswer": "Structured STAR story directly incorporating candidate's retrieved STAR experiences",
      "keyConcepts": ["Ownership", "Root Cause Analysis"]
    },
    {
      "category": "Company Fit",
      "question": "Why ${job.companyName} and how does this role fit your career trajectory?",
      "suggestedAnswer": "Persuasive company pitch connecting candidate's goals with company mission",
      "keyConcepts": ["Company Culture", "Product Impact"]
    }
  ]
}`;

    return { prompt, systemPrompt };
  }

  /**
   * Builds an augmented prompt for Cover Letter Generation.
   */
  public buildAugmentedCoverLetterPrompt(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    ragContext: IRagPromptContext
  ): { prompt: string; systemPrompt: string } {
    const systemPrompt = `You are an elite Tech Career Strategist.
Write concise, high-converting, persuasive cover letters that reference authentic project achievements, technical metrics, and evidence retrieved from the candidate's knowledge base. Formatted in clean Markdown with zero fluff.`;

    const prompt = `Write a high-converting cover letter for:
COMPANY: ${job.companyName}
ROLE: ${job.jobTitle}
LOCATION: ${job.location || 'India / Remote'}
SKILLS NEEDED: ${(job.skillsRequired || []).join(', ')}

CANDIDATE:
Name: ${profile.name}
Email: ${profile.email} | Phone: ${profile.phone}
Education: ${profile.education}
Portfolio: ${profile.portfolio} | GitHub: ${profile.github} | LinkedIn: ${profile.linkedin}

RETRIEVED EVIDENCE FROM CANDIDATE KNOWLEDGE VAULT:
${ragContext.formattedContext}

Write a 3-4 paragraph impactful cover letter incorporating specific metrics and case studies from the retrieved evidence.`;

    return { prompt, systemPrompt };
  }

  /**
   * Interactive RAG Chat Engine:
   * Answers candidate questions grounded in the Career Knowledge Vault & Ingested Jobs.
   */
  public async queryRagChat(
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
    const startTime = Date.now();

    // 1. Hybrid search against Knowledge Vault
    const searchResults = knowledgeVault.searchHybrid(userQuery, {
      topK: 4,
      minScore: 0.1,
      hybridSearch: true,
    });

    // 2. Build citations
    const citations: IRagCitation[] = searchResults.map((r) => ({
      documentId: r.chunk.documentId,
      documentTitle: r.chunk.documentTitle,
      category: r.chunk.category,
      chunkIndex: r.chunk.chunkIndex,
      similarityScore: r.similarityScore,
      snippet: r.contextSnippet,
      tags: r.chunk.tags,
    }));

    // 3. Format retrieved context
    let retrievedContext = '';
    searchResults.forEach((r, idx) => {
      retrievedContext += `[Document #${idx + 1}: "${r.chunk.documentTitle}" (${r.chunk.category.toUpperCase()}) | Relevance: ${Math.round(r.similarityScore * 100)}%]\n`;
      retrievedContext += `${r.chunk.text}\n\n`;
    });

    // 4. If LLM is available and API key provided, call OpenRouter LLM
    if (apiKey && apiKey.trim()) {
      const systemPrompt = `You are JobRadar AI Copilot — an Autonomous Career Agent and Technical Mentor powered by Retrieval-Augmented Generation (RAG).
You assist the candidate (Veera Venkata Naga Satyanarayana Thota / Narayana Thota, MCA 2026 graduate) by answering career questions, prepping for interviews, analyzing skills fit, drafting pitches, and strategizing job applications.

GROUNDING RULES:
1. Ground your answers in the RETRIEVED KNOWLEDGE VAULT SNIPPETS provided below.
2. Cite specific projects (AUSVMS, Guard Hub, Matrix Library, JobRadar), technologies, and metrics from the retrieved snippets.
3. Be clear, concise, actionable, and encouraging. Use clean Markdown with bullet points where appropriate.
4. If asked something outside the knowledge base, answer based on best engineering practices while noting what is in the candidate's portfolio.`;

      // Build context-rich prompt with chat history
      let conversationStr = '';
      const recentHistory = chatHistory.slice(-4);
      recentHistory.forEach((msg) => {
        if (msg.role !== 'system') {
          conversationStr += `${msg.role.toUpperCase()}: ${msg.content}\n`;
        }
      });

      const prompt = `RETRIEVED KNOWLEDGE VAULT CONTEXT:
${retrievedContext || 'No direct matches found in knowledge vault.'}

CONVERSATION HISTORY:
${conversationStr}

USER QUERY:
${userQuery}

Provide a comprehensive, grounded, and actionable response:`;

      try {
        const response = await llmClient.callLlm(prompt, systemPrompt, apiKey, preferredModel);
        return {
          content: response.text.trim(),
          citations,
          modelUsed: response.model,
          queryTimeMs: Date.now() - startTime,
        };
      } catch (err: any) {
        console.warn('Live LLM RAG chat failed, falling back to local synthesis:', err);
      }
    }

    // 5. Offline Fallback Synthesis (when offline or no API key)
    let offlineResponse = '';
    if (searchResults.length > 0) {
      offlineResponse = `### 🧠 Knowledge Vault Evidence Matches (${searchResults.length} sources retrieved)\n\n`;
      offlineResponse += `Based on your Career Knowledge Vault, here is the relevant evidence addressing your query:\n\n`;

      searchResults.forEach((r, idx) => {
        offlineResponse += `#### ${idx + 1}. ${r.chunk.documentTitle} (${r.chunk.category.toUpperCase()})\n`;
        offlineResponse += `*Relevance Score: ${Math.round(r.similarityScore * 100)}%*\n\n`;
        offlineResponse += `> ${r.chunk.text.replace(/\n/g, '\n> ')}\n\n`;
      });

      offlineResponse += `\n💡 **Tip:** Add your free OpenRouter API key in **Settings** for synthesized AI conversational reasoning across these documents.`;
    } else {
      offlineResponse = `No direct matches found in your Career Knowledge Vault for *"${userQuery}"*.\n\nYou can add custom documents, case studies, or notes in the **Knowledge Vault** tab to expand your vector knowledge base!`;
    }

    return {
      content: offlineResponse,
      citations,
      modelUsed: 'Local Hybrid Vector Search (Offline)',
      queryTimeMs: Date.now() - startTime,
    };
  }
}

export const ragAugmentor = new RagAugmentorService();
