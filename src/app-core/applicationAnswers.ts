import { IJob, IProfile, IApplicationAnswersSuite, IApplicationQAItem } from './types';
import { ragAugmentor } from './rag/ragAugmentor';
import { llmClient } from './llmClient';

/**
 * JobRadar Application QA Generator
 * Pre-generates tailored answers for ATS application form fields,
 * grounded in candidate's profile and technical achievements.
 */
export class ApplicationAnswersService {
  /**
   * Deterministic Grounded Generation
   */
  public generateAnswersDeterministic(job: IJob, profile: IProfile): IApplicationAnswersSuite {
    const primarySkills = (job.skillsRequired && job.skillsRequired.length > 0
      ? job.skillsRequired.slice(0, 4)
      : profile.primarySkills.slice(0, 4)
    ).join(', ') || 'software engineering';

    const ragContext = ragAugmentor.getRagContextForJob(job, { topK: 2 });
    const hasRag = ragContext.retrievedChunks && ragContext.retrievedChunks.length > 0;
    const projectProof = hasRag
      ? ragContext.retrievedChunks[0].chunk.text.slice(0, 180).replace(/\n/g, ' ')
      : (profile.projects && profile.projects.length > 0
          ? `${profile.projects[0].title} using ${profile.projects[0].tech}`
          : 'production applications with high reliability');

    const items: IApplicationQAItem[] = [
      {
        id: `qa-whyus-${job.id}`,
        category: 'Motivation & Why Us',
        question: `Why do you want to work at ${job.companyName}?`,
        suggestedAnswer: `I have followed ${job.companyName}'s product development and engineering standards closely. My background in ${primarySkills} directly mirrors the technical demands of the ${job.jobTitle} position. I am eager to apply my background in designing resilient architectures and shipping user-focused features to support ${job.companyName}'s goals.`,
        groundedEvidence: [`Target Company: ${job.companyName}`, `Matched Stack: ${primarySkills}`],
      },
      {
        id: `qa-techchallenge-${job.id}`,
        category: 'Technical Challenge',
        question: 'Describe a difficult technical challenge or bug you solved recently.',
        suggestedAnswer: `While building ${projectProof}, I investigated bottlenecks with state re-rendering and data consistency under concurrent load. To resolve this, I optimized query caching, indexed database queries, and modularized state lifecycles, significantly improving response latency and reliability.`,
        groundedEvidence: [`Project proof: ${projectProof.slice(0, 30)}...`],
      },
      {
        id: `qa-salary-${job.id}`,
        category: 'Salary & Notice Period',
        question: 'What are your compensation expectations and availability to join?',
        suggestedAnswer: `Based on industry benchmarks for ${job.jobTitle} roles requiring strong ${primarySkills} skills, my expected compensation is aligned with market standards (flexible based on overall benefits and team fit). I am available to join immediately or within standard notice timelines.`,
        groundedEvidence: ['Notice Period: Immediate / Flexible', 'Market CTC Benchmarked'],
      },
      {
        id: `qa-teamwork-${job.id}`,
        category: 'Team & Culture',
        question: 'How do you handle ambiguous requirements and collaborate across teams?',
        suggestedAnswer: `I prioritize early alignment through clear technical documentation, iterative prototypes, and open communication. When specifications evolve, I break milestones into measurable sprints, actively solicit peer feedback, and document trade-offs to keep engineering velocity high.`,
        groundedEvidence: ['Cross-functional collaboration', 'Modular architecture best practices'],
      },
    ];

    return {
      generatedAt: new Date().toISOString(),
      items,
    };
  }

  /**
   * Primary AI-Native Application QA Generator
   */
  public async generateAnswersWithAi(
    job: IJob,
    profile: IProfile,
    _apiKey?: string
  ): Promise<IApplicationAnswersSuite> {
    const res = await llmClient.generateAiApplicationAnswers(job, profile);
    if (res.success && res.data) {
      return res.data;
    }
    return this.generateAnswersDeterministic(job, profile);
  }
}

export const applicationAnswers = new ApplicationAnswersService();
