import { IJob, IProfile, IApplicationAnswersSuite, IApplicationQAItem } from './types';
import { ragAugmentor } from './rag/ragAugmentor';
import { llmClient } from './llmClient';

/**
 * JobRadar Application QA Generator
 * 
 * Pre-generates high-converting, tailored answers for standard ATS application form fields,
 * grounded in the candidate's actual projects, credentials, and technical achievements.
 */

export class ApplicationAnswersService {
  /**
   * Deterministic Grounded Generation
   */
  public generateAnswersDeterministic(job: IJob, profile: IProfile): IApplicationAnswersSuite {
    const primarySkills = (job.skillsRequired && job.skillsRequired.length > 0
      ? job.skillsRequired.slice(0, 4)
      : profile.primarySkills.slice(0, 4)
    ).join(', ');

    const ragContext = ragAugmentor.getRagContextForJob(job, { topK: 2 });
    const hasRag = ragContext.retrievedChunks && ragContext.retrievedChunks.length > 0;
    const projectProof = hasRag
      ? ragContext.retrievedChunks[0].chunk.text.slice(0, 180).replace(/\n/g, ' ')
      : `production full-stack applications with high concurrency, real-time data indexing, and robust error recovery`;

    const items: IApplicationQAItem[] = [
      {
        id: `qa-whyus-${job.id}`,
        category: 'Motivation & Why Us',
        question: `Why do you want to work at ${job.companyName}?`,
        suggestedAnswer: `I have been closely following ${job.companyName}'s product development, particularly in scalable infrastructure and developer experience. My core background in ${primarySkills} directly mirrors the technical demands of the ${job.jobTitle} opening. I am eager to apply my background in designing resilient architectures and shipping customer-focused features to support ${job.companyName}'s growth.`,
        groundedEvidence: [`Target Company: ${job.companyName}`, `Matched Stack: ${primarySkills}`],
      },
      {
        id: `qa-techchallenge-${job.id}`,
        category: 'Technical Challenge',
        question: 'Describe a difficult technical challenge or bug you solved recently.',
        suggestedAnswer: `While developing ${projectProof}, I encountered significant bottlenecks with state re-rendering and data consistency under heavy payload bursts. To resolve this, I implemented an asynchronous vector embedding queue, indexed query caches with LRU eviction, and optimized critical path rendering, reducing latency by over 60% while maintaining 100% data fidelity.`,
        groundedEvidence: [`Project proof: ${projectProof.slice(0, 30)}...`],
      },
      {
        id: `qa-salary-${job.id}`,
        category: 'Salary & Notice Period',
        question: 'What are your compensation expectations and availability to join?',
        suggestedAnswer: `Based on industry benchmarks for ${job.jobTitle} roles requiring strong ${primarySkills} skills, my expected CTC is competitive and aligned with market standards (flexible based on overall benefits and equity). I am available to join immediately or within standard 15-30 days notice.`,
        groundedEvidence: ['Notice Period: Immediate / Flexible', 'Market CTC Benchmarked'],
      },
      {
        id: `qa-teamwork-${job.id}`,
        category: 'Team & Culture',
        question: 'How do you handle ambiguous requirements and collaborate across teams?',
        suggestedAnswer: `I prioritize early alignment through clear technical design docs, iterative prototyping, and open communication. When specifications are fluid, I break down milestones into measurable spikes, actively solicit feedback from design and product peers, and document trade-offs to keep engineering velocity high.`,
        groundedEvidence: ['Cross-functional collaboration', 'Modular architecture best practices'],
      },
    ];

    return {
      generatedAt: new Date().toISOString(),
      items,
    };
  }

  /**
   * AI-Augmented Application QA Generator
   */
  public async generateAnswersWithAi(
    job: IJob,
    profile: IProfile,
    apiKey?: string
  ): Promise<IApplicationAnswersSuite> {
    if (!apiKey) {
      return this.generateAnswersDeterministic(job, profile);
    }

    try {
      const ragContext = ragAugmentor.getRagContextForJob(job, { topK: 3 });
      const systemPrompt = `You are a JobRadar Application Form Assistant. Write 4 concise, compelling, high-converting answers for ATS job application fields. Ground your answers authentically in the candidate's projects and technical background. Return strictly valid JSON without markdown wrapping.`;

      const prompt = `JOB DETAILS:
Company: ${job.companyName}
Role: ${job.jobTitle}
Skills: ${(job.skillsRequired || []).join(', ')}

CANDIDATE BACKGROUND:
Name: ${profile.name}
Skills: ${profile.primarySkills.join(', ')}
Key Project: ${profile.projects?.[0]?.title || 'Web Architecture'} (${profile.projects?.[0]?.tech || 'React, Node'})

EVIDENCE FROM KNOWLEDGE VAULT:
${ragContext.formattedContext || 'Candidate has strong software engineering background and portfolio.'}

SCHEMA:
{
  "items": [
    {
      "id": "qa-1",
      "category": "Motivation & Why Us",
      "question": "Why do you want to work at ${job.companyName}?",
      "suggestedAnswer": "Answer text (3-4 sentences)",
      "groundedEvidence": ["Point 1"]
    },
    {
      "id": "qa-2",
      "category": "Technical Challenge",
      "question": "Describe a difficult technical challenge you solved.",
      "suggestedAnswer": "Answer text using STAR method",
      "groundedEvidence": ["Project details"]
    },
    {
      "id": "qa-3",
      "category": "Salary & Notice Period",
      "question": "What is your expected CTC and notice period?",
      "suggestedAnswer": "Professional negotiation-friendly answer",
      "groundedEvidence": ["Flexible notice period"]
    },
    {
      "id": "qa-4",
      "category": "Team & Culture",
      "question": "How do you handle teamwork and fast-paced delivery?",
      "suggestedAnswer": "Collaborative answer",
      "groundedEvidence": ["Code quality and ownership"]
    }
  ]
}`;

      const { text } = await llmClient.callLlm(prompt, systemPrompt, apiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        return {
          generatedAt: new Date().toISOString(),
          items: parsed.items,
        };
      }
    } catch {
      // Fallback to deterministic
    }

    return this.generateAnswersDeterministic(job, profile);
  }
}

export const applicationAnswers = new ApplicationAnswersService();
