import { IJob, IProfile } from '../types';
import { IExtractedJD } from '../extractor';
import { knowledgeVault } from './knowledgeStore';
import {
  ISearchResult,
  IRagPromptContext,
  IRagCitation,
  IRagQueryOptions,
} from './types';

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
   * Builds an augmented prompt for Multi-Persona Cold Outreach Suite.
   */
  public buildAugmentedOutreachPrompt(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    ragContext: IRagPromptContext
  ): { prompt: string; systemPrompt: string } {
    const systemPrompt = `You are an elite Tech Career Strategist and Executive Headhunter.
Write hyper-personalized, authentic cold outreach messages (LinkedIn Connection notes, InMails, and Cold Emails) for 3 personas: Hiring Manager, Peer Senior Engineer, and Tech Recruiter.
CRITICAL: Ground all talking points in the candidate's actual projects, metrics, and case studies retrieved from their knowledge base.`;

    const prompt = `Write high-converting cold outreach messages for:
COMPANY: ${job.companyName}
ROLE: ${job.jobTitle}
LOCATION: ${job.location || 'India / Remote'}
TECH STACK: ${(job.skillsRequired || []).join(', ')}

CANDIDATE PROFILE:
Name: ${profile.name}
Title: ${profile.title}
Education: ${profile.education}
GitHub: ${profile.github} | LinkedIn: ${profile.linkedin} | Portfolio: ${profile.portfolio}

RETRIEVED KNOWLEDGE VAULT EVIDENCE:
${ragContext.formattedContext || 'No additional vault context.'}

Generate compelling, non-generic outreach pitches referencing candidate's real engineering accomplishments.`;

    return { prompt, systemPrompt };
  }
}

export const ragAugmentor = new RagAugmentorService();

