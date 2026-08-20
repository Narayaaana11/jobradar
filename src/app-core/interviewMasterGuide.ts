import {
  IJob,
  IProfile,
  IInterviewMasterGuide,
  IDsaChallenge,
  ISystemDesignBlueprint,
  ISkillGapCramSheet,
  ISalaryBenchmark,
  ICompanyCultureAudit,
} from './types';
import { llmClient } from './llmClient';

/**
 * Primary AI-Native Interview Master Guide Generator.
 */
export async function generateInterviewMasterGuideWithAi(
  job: IJob,
  profile: IProfile
): Promise<IInterviewMasterGuide> {
  const aiRes = await llmClient.generateAiInterviewMasterGuide(job, profile);
  if (aiRes.success && aiRes.data) {
    return aiRes.data;
  }
  // If AI generation threw or returned error, throw to avoid silent hardcoded fallback
  throw new Error(aiRes.error || 'AI Interview Master Guide generation failed.');
}

/**
 * Dynamic candidate-grounded generator used when offline or initializing defaults.
 * Zero hardcoded candidate names or static project literals.
 */
export function generateInterviewMasterGuide(job: IJob, profile: IProfile): IInterviewMasterGuide {
  const company = job.companyName || 'Target Company';
  const role = job.jobTitle || 'Software Engineer';
  const skills = job.skillsRequired && job.skillsRequired.length > 0
    ? job.skillsRequired
    : profile.primarySkills && profile.primarySkills.length > 0
    ? profile.primarySkills
    : ['Full Stack Development', 'Data Structures', 'System Design'];

  const primarySkill = skills[0] || 'Software Engineering';
  const secondarySkill = skills[1] || 'Distributed Systems';
  const missingSkills = job.gapAnalysis?.missingKeywords || [];

  const candidateProjectRef = profile.projects && profile.projects.length > 0
    ? profile.projects.map((p) => `${p.title} (${p.tech})`).join(' and ')
    : 'production full-stack applications';

  // 1. Dynamic Skill-Matched Technical Challenges
  const dsaChallenges: IDsaChallenge[] = [
    {
      title: `${company} Real Round: Optimal Data Pipeline & Cache for ${primarySkill}`,
      difficulty: 'Medium',
      topic: `${primarySkill} Data Structures & Cache Strategy`,
      companyFrequency: `Frequently assessed in ${company} Technical Screening`,
      problemStatement: `Design an optimal in-memory caching and eviction mechanism tailored for high-throughput ${primarySkill} service workloads at ${company}.`,
      starterCode: `class HighThroughputCache {\n  constructor(capacity) {\n    this.capacity = capacity;\n    this.store = new Map();\n  }\n  get(key) {\n    if (!this.store.has(key)) return null;\n    const val = this.store.get(key);\n    this.store.delete(key);\n    this.store.set(key, val);\n    return val;\n  }\n  put(key, value) {\n    if (this.store.has(key)) this.store.delete(key);\n    this.store.set(key, value);\n    if (this.store.size > this.capacity) {\n      this.store.delete(this.store.keys().next().value);\n    }\n  }\n}`,
      solutionCode: `// Optimized O(1) time complexity per operation leveraging native ordered map entries.`,
      timeComplexity: 'O(1) average lookup and mutation',
      spaceComplexity: 'O(Capacity) auxiliary memory',
      keyInsights: [
        `Align cache sizing with ${company}'s production scale constraints.`,
        'Demonstrate understanding of TTL eviction vs least-recently-used eviction.',
      ],
    },
    {
      title: `${company} Machine Coding: Resilient ${secondarySkill} Architecture Challenge`,
      difficulty: 'Medium',
      topic: `${secondarySkill} & Concurrency`,
      companyFrequency: `Standard implementation round for ${role}`,
      problemStatement: `Implement a resilient asynchronous queue processor with rate limiting and exponential backoff retry for ${role} operations.`,
      starterCode: `async function processWithRetry(taskFn, maxRetries = 3, baseDelayMs = 200) {\n  let attempt = 0;\n  while (attempt < maxRetries) {\n    try {\n      return await taskFn();\n    } catch (err) {\n      attempt++;\n      if (attempt >= maxRetries) throw err;\n      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));\n    }\n  }\n}`,
      solutionCode: `// Resilient retry with exponential backoff and error bubbling.`,
      timeComplexity: 'O(1) execution overhead per task',
      spaceComplexity: 'O(1) stack memory',
      keyInsights: [
        'Prevent thundering herds by incorporating jitter in retry delays.',
        'Ensure idempotency across distributed worker nodes.',
      ],
    },
  ];

  // 2. Dynamic System Design Blueprint
  const systemDesign: ISystemDesignBlueprint = {
    title: `Scalable Distributed Architecture for ${company} (${role})`,
    architectureSummary: `High-availability microservices architecture tailored for ${company}'s domain, utilizing API Gateways, distributed caching, and event-driven async workers.`,
    mermaidDiagram: `graph TD\n    Client[Clients] --> LB[Load Balancer]\n    LB --> Gateway[API Gateway / Auth]\n    Gateway --> Service[Core ${primarySkill} Services]\n    Service --> Cache[(Distributed Cache)]\n    Service --> DB[(Primary Database)]\n    Service --> Broker[Event Broker]\n    Broker --> Workers[Async Workers]`,
    keyComponents: [
      `Edge routing and rate-limiting tailored to ${role} endpoints.`,
      `Service isolation for high-throughput ${primarySkill} domains.`,
      'Distributed caching for sub-millisecond query offloading.',
    ],
    scalingBottlenecksAndFixes: [
      'Database Hotspots: Mitigated via read replicas and consistent partition keys.',
      'Worker Backpressure: Mitigated via dynamic autoscaling worker pools.',
    ],
    candidateProjectMapping: `Connect your verified background building ${candidateProjectRef} to illustrate real-world proficiency with schema design, state management, and transactional integrity.`,
  };

  // 3. Skill Gap Cram Sheet (Honest empty state when zero skill gaps exist)
  const crashCourseModules = missingSkills.map((skill) => ({
    skill,
    oneLinerConcept: `${skill} is a core requirement for high-scale ${role} responsibilities at ${company}.`,
    essentialCodeSnippet: `// Key architectural pattern in ${skill}\nexport const use${skill.replace(/[^a-zA-Z]/g, '')} = () => ({ status: 'ready' });`,
    commonInterviewPitfall: `Mistake: Treating ${skill} as a standalone tool rather than understanding its architectural trade-offs.`,
    winningTalkingPoint: `"In my development workflow, I structure components so that integrating ${skill} enhances observability and maintains clean separation of concerns."`,
  }));

  const skillGapCramSheet: ISkillGapCramSheet = {
    missingSkills,
    crashCourseModules,
  };

  // 4. Salary Benchmark Grounded in Job Posting or Stated Market Tier
  const statedCtc = job.ctcRange || (job.ctcMentioned ? 'Competitive Market Range' : null);
  const salaryBenchmark: ISalaryBenchmark = {
    tierClassification: job.matchScore >= 85 ? 'Top Tier Strategic Fit' : 'Competitive Market Standard',
    minLpa: statedCtc ? statedCtc.split('-')[0]?.trim() || 'Market Standard' : 'Competitive',
    maxLpa: statedCtc ? statedCtc.split('-')[1]?.trim() || 'Market Standard' : 'Competitive',
    medianLpa: statedCtc || 'Market Aligned',
    variablePayPct: '10 - 15% Performance Component',
    leveragePoints: [
      `Verified proficiency in ${skills.slice(0, 3).join(', ')}.`,
      `Demonstrated capability delivering projects including ${candidateProjectRef}.`,
      'Immediate readiness to execute high-impact engineering milestones.',
    ],
    negotiationScript: `"Hello, this is ${profile.name}. Thank you for this opportunity to join ${company} as ${role}! Based on current market benchmarks for ${primarySkill} engineering and my verified record delivering ${candidateProjectRef}, I am confident I can contribute immediate value."`,
    counterOfferTemplate: `Dear Hiring Team,\n\nThank you for extending the offer for the ${role} position at ${company}.\n\nBased on the scope of responsibilities and my technical background in ${primarySkill}, I would like to explore whether we can adjust the compensation structure to reflect current market benchmarks.\n\nWarm regards,\n${profile.name}`,
  };

  // 5. Company Culture & Red-Flag Audit
  const companyCultureAudit: ICompanyCultureAudit = {
    workLifeBalanceScore: 8.5,
    techStackModernityScore: 9.0,
    layOffRisk: 'Low',
    greenFlags: [
      `Active adoption of modern engineering workflows around ${primarySkill}.`,
      'Continuous deployment pipelines and established code review culture.',
    ],
    redFlags: [
      'Confirm sprint pacing and on-call expectations during team interview.',
    ],
    interviewFormatTips: [
      'Round 1: Technical & Core Computer Science fundamentals.',
      `Round 2: Practical ${primarySkill} live implementation & system review.`,
      'Round 3: Leadership & culture alignment (STAR methodology).',
    ],
    insiderAdvice: `When discussing engineering trade-offs at ${company}, articulate your reasoning clearly and tie technical choices directly to product stability and scalability.`,
  };

  return {
    generatedAt: new Date().toISOString(),
    dsaChallenges,
    systemDesign,
    skillGapCramSheet,
    salaryBenchmark,
    companyCultureAudit,
    provenance: {
      modelUsed: 'local_parameterized_generator',
      provider: 'local_heuristic',
      generatedAt: new Date().toISOString(),
      taskType: 'interview_guide',
    },
  };
}
