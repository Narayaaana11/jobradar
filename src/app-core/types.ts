export interface IElectronApi {
  savePdfFile?: (options: { filename: string; base64Data: string }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  saveTextFile?: (options: { filename: string; content: string; extension?: string; filterName?: string }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  openExternal?: (url: string) => Promise<boolean>;
  openWhatsAppWeb?: () => Promise<{ success: boolean }>;
  openTelegramWeb?: () => Promise<{ success: boolean }>;
  scrapeSocialChats?: () => Promise<any>;
  interceptChannelMessages?: (options?: any) => Promise<any>;
  callLlmApi?: (options: { endpoint: string; headers?: Record<string, string>; body?: any; method?: string }) => Promise<any>;
  fetchWebPage?: (options: { url: string }) => Promise<{ success: boolean; data?: string; error?: string; status?: number }>;
  s3PutObject?: (options: any) => Promise<any>;
  s3SyncAll?: (options: any) => Promise<any>;
  s3PullAll?: (options: any) => Promise<any>;
  isDesktop?: boolean;
  [key: string]: any;
}

declare global {
  interface Window {
    electronAPI?: IElectronApi;
  }
}

export interface IJobSource {
  platform: 'telegram' | 'whatsapp' | 'web' | 'manual';
  channelName: string;
  messageId: string;
  url?: string | null;
  scrapedAt: string;
}

export type RubricLetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type FitRecommendation = 'APPLY' | 'BORDERLINE' | 'SKIP';

export interface IRubricScores {
  overallRubricRating: number; // 1.0 - 5.0
  letterGrade: RubricLetterGrade;
  recommendation: FitRecommendation;
  skillsScore: number;
  techStackScore: number;
  experienceScore: number;
  cultureFitScore: number;
  rubricTier: 'Tier 1 - Strong Fit' | 'Tier 2 - Good Match' | 'Tier 3 - Borderline' | 'Tier 4 - Stretch' | 'Tier 5 - Low Fit';
  technicalStackMatchScore?: number; // 1.0 - 5.0
  seniorityExperienceScore?: number; // 1.0 - 5.0
  domainRelevanceScore?: number; // 1.0 - 5.0
  compensationLocationScore?: number; // 1.0 - 5.0
}

export interface IStructuredFitReport {
  recommendation: FitRecommendation;
  letterGrade: RubricLetterGrade;
  numericalScore: number; // 1.0 - 5.0
  matchPercentage: number; // 0 - 100%
  pros: string[];
  cons: string[];
  missingSkills: string[];
  dealbreakersFound: string[];
  isDealbreaker: boolean;
  executiveSummary: string;
}

export interface IAtsAnalysis {
  overallAtsScore?: number; // 0 - 100% composite score
  keywordDensityScore: number; // 0 - 100% TF-IDF Cosine Match
  atsFormatScore: number; // 0 - 100% Layout & Parsing Score
  bulletImpactScore: number; // 0 - 100% Action Verbs & Metrics Score
  actionVerbScore?: number; // 0 - 100%
  metricQuantificationScore?: number; // 0 - 100%
  foundKeywords: string[];
  missingKeywords: string[];
  hardSkillsFound?: string[];
  hardSkillsMissing?: string[];
  softSkillsFound?: string[];
  softSkillsMissing?: string[];
  recommendations?: string[];
  atsChecklist: {
    cleanHeaders: boolean;
    standardFonts: boolean;
    noTablesOrColumns: boolean;
    quantifiableMetrics: boolean;
    contactInfoComplete?: boolean;
    singlePageLayout?: boolean;
  };
}

export interface IReferralContact {
  personaTitle: string;
  targetRole: string;
  department: string;
  linkedinSearchUrl: string;
  searchQuery: string;
  subject: string;
  outreachDraft: string;
}

export interface IInterviewQuestion {
  category: 'Technical' | 'System Design' | 'Behavioral' | 'Company Fit';
  question: string;
  suggestedAnswer: string;
  keyConcepts: string[];
}

export interface IInterviewPrep {
  roleOverview: string;
  technicalTopics: string[];
  questions: IInterviewQuestion[];
}

export interface IJob {
  id: string;
  companyName: string;
  companyPageUrl?: string | null;
  companySocialLinks?: string[];
  jobTitle: string;
  jobType?: string | null;
  location?: string | null;
  isRemote?: boolean | null;
  ctcMentioned: boolean;
  ctcRange?: string | null;
  applicationLink?: string | null;
  applicationDeadline?: string | null;
  skillsRequired: string[];
  experienceRequired?: string | null;
  rawDescription: string;
  sources: IJobSource[];
  dedupHash: string;

  // Scoring & AI Enhancements
  matchScore: number; // 0 - 100
  matchConfidence: number; // 0.0 - 1.0
  gapAnalysis: {
    missingKeywords: string[];
    strongMatches: string[];
  };
  fitBreakdown: {
    techFitScore: number;
    experienceFitScore: number;
    locationFitScore: number;
  };
  rubricScores: IRubricScores;
  atsAnalysis: IAtsAnalysis;
  scoreFlag: 'auto' | 'borderline' | 'low_match' | 'uncertain_jd';
  skillMatched: boolean;

  // Stage & Approval
  stage: 'pending_approval' | 'approved' | 'applied' | 'interview' | 'offer' | 'rejected';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  applicationStatus: 'not_applied' | 'applied' | 'interview' | 'offer' | 'rejected';

  // Referral & Tailored Assets (Populated on successful AI generation or explicit offline mode)
  referralContacts?: IReferralContact[];
  interviewPrep?: IInterviewPrep;
  coverLetterText?: string;
  resumeNotes?: string;
  resumePdfDataUri?: string;
  appliedAt?: string | null;
  aiCouncil?: IAiCouncilVerdict;
  outreachSuite?: IColdOutreachSuite;
  interviewMasterGuide?: IInterviewMasterGuide;
  webIntelligence?: IWebScrapingIntelligence;

  // Live Web-Scraped JD Content (from actual career portal URL)
  liveScrapedContent?: string | null;
  liveScrapedAt?: string | null;

  // JobRadar Intelligence Suite Integrations
  structuredFitReport?: IStructuredFitReport;
  blockGAudit?: IBlockGAudit;
  followupCadence?: IFollowupCadenceSuite;
  applicationAnswers?: IApplicationAnswersSuite;
  salaryNegotiation?: ISalaryNegotiationSuite;
  provenance?: IAiProvenance;
  generationStatus?: IJobGenerationStatusMap;

  createdAt: string;
  updatedAt: string;
}

export interface IFieldGenerationStatus {
  status: 'ai_generated' | 'failed' | 'pending' | 'offline_template';
  modelUsed?: string;
  provider?: string;
  error?: string;
  generatedAt?: string;
}

export interface IJobGenerationStatusMap {
  referralContacts?: IFieldGenerationStatus;
  interviewPrep?: IFieldGenerationStatus;
  coverLetterText?: IFieldGenerationStatus;
  outreachSuite?: IFieldGenerationStatus;
  interviewMasterGuide?: IFieldGenerationStatus;
  applicationAnswers?: IFieldGenerationStatus;
  salaryNegotiation?: IFieldGenerationStatus;
  followupCadence?: IFieldGenerationStatus;
  scoring?: IFieldGenerationStatus;
  extraction?: IFieldGenerationStatus;
  legitimacyAudit?: IFieldGenerationStatus;
}

export interface IBlockGAudit {
  legitimacyScore: number; // 0 - 100
  isGhostJobRisk: boolean;
  isStaleRepost: boolean;
  workAuthBlocker: boolean;
  verdict: 'Verified Legitimate' | 'Low Risk' | 'High Risk Ghost Job' | 'Work-Auth Blocker';
  signalsFound: string[];
  recommendation: string;
}

export interface IFollowupScheduleItem {
  id: string;
  milestone: 'Day 3 Warm Ping' | 'Day 7 Recruiter Check-in' | 'Day 14 Subsequent Follow-up' | 'Post-Interview 24h Thank-You';
  daysAfterApplication: number;
  scheduledDate: string;
  isOverdue: boolean;
  completed: boolean;
  targetPersona: string;
  subject: string;
  messageBody: string;
}

export interface IFollowupCadenceSuite {
  appliedDate?: string | null;
  items: IFollowupScheduleItem[];
}

export interface IApplicationQAItem {
  id: string;
  category: 'Motivation & Why Us' | 'Technical Challenge' | 'Salary & Notice Period' | 'Team & Culture';
  question: string;
  suggestedAnswer: string;
  groundedEvidence: string[];
}

export interface IApplicationAnswersSuite {
  generatedAt: string;
  items: IApplicationQAItem[];
}

export interface ISalaryNegotiationSuite {
  targetCtc: string;
  marketBenchmark: string;
  gapAnalysis: string;
  counterOfferEmailScript: string;
  remoteCompPushbackScript: string;
  competingOfferLeverageScript: string;
  keyTalkingPoints: string[];
}

export interface IReplyClassification {
  intent: 'interview_invite' | 'assessment_request' | 'rejection' | 'offer' | 'more_info_needed' | 'unknown';
  confidence: number;
  extractedDetails?: {
    interviewerName?: string;
    interviewDate?: string;
    assessmentPlatform?: string;
    deadline?: string;
    offeredCtc?: string;
  };
  suggestedNextAction: string;
  recommendedAction?: string;
  suggestedStageUpdate?: 'interview' | 'offer' | 'rejected' | 'applied';
  draftedResponse: string;
}

export interface ICorporateEmailPattern {
  pattern: string;
  example: string;
  confidence: 'High' | 'Medium' | 'Estimated';
  domain: string;
}

export interface ICadenceStep {
  stepNumber: number;
  dayLabel: string;
  triggerCondition: string;
  subject: string;
  body: string;
  channel: 'Email' | 'LinkedIn InMail' | 'Twitter DM';
}

export interface IColdOutreachSuite {
  companyDomain: string;
  emailPatterns: ICorporateEmailPattern[];
  cadenceSequence: ICadenceStep[];
  linkedInNotes: {
    connectionRequestNote300Char: string;
    recruiterDirectPitch: string;
    alumniWarmIntroduction: string;
  };
  provenance?: IAiProvenance;
}

export interface IDsaChallenge {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  companyFrequency: string; // e.g. "Asked 8x at Amazon SDE-1"
  problemStatement: string;
  starterCode: string;
  solutionCode: string;
  timeComplexity: string;
  spaceComplexity: string;
  keyInsights: string[];
}

export interface ISystemDesignBlueprint {
  title: string;
  architectureSummary: string;
  mermaidDiagram: string;
  keyComponents: string[];
  scalingBottlenecksAndFixes: string[];
  candidateProjectMapping: string;
}

export interface ISkillGapCramSheet {
  missingSkills: string[];
  crashCourseModules: {
    skill: string;
    oneLinerConcept: string;
    essentialCodeSnippet: string;
    commonInterviewPitfall: string;
    winningTalkingPoint: string;
  }[];
}

export interface ISalaryBenchmark {
  tierClassification: string;
  minLpa: string;
  maxLpa: string;
  medianLpa: string;
  variablePayPct?: string;
  leveragePoints: string[];
  negotiationScript: string;
  counterOfferTemplate: string;
}

export interface ICompanyCultureAudit {
  workLifeBalanceScore: number; // 1-10
  techStackModernityScore: number; // 1-10
  layOffRisk: 'Low' | 'Moderate' | 'Elevated';
  greenFlags: string[];
  redFlags: string[];
  interviewFormatTips: string[];
  insiderAdvice: string;
}

export interface IInterviewMasterGuide {
  generatedAt: string;
  dsaChallenges: IDsaChallenge[];
  systemDesign: ISystemDesignBlueprint;
  skillGapCramSheet: ISkillGapCramSheet;
  salaryBenchmark: ISalaryBenchmark;
  companyCultureAudit: ICompanyCultureAudit;
  provenance?: IAiProvenance;
}

export interface IWebScrapingIntelligence {
  isVerifiedLive: boolean;
  scrapedAt: string;
  companyCareerUrl: string;
  activeOpeningsSummary: string;
  verifiedTechStack: string[];
  liveSources: {
    title: string;
    url: string;
    snippet: string;
  }[];
  interviewQuestionsFromWeb: string[];
  recentCompanyNewsOrTechBlogs: string[];
}

export interface IAiCouncilMemberVote {
  role: 'Technical Screener' | 'Hiring Manager' | 'ATS Strategist';
  modelUsed: string;
  score: number; // 0 - 100
  verdict: 'Strong Fit' | 'Moderate Fit' | 'Borderline' | 'Reject';
  reasoning: string;
  keyFindings: string[];
}

export interface IAiCouncilVerdict {
  consensusScore: number; // 0 - 100
  consensusRubricTier: string;
  consensusRecommendation: 'auto' | 'borderline' | 'low_match';
  chairModelUsed: string;
  chairSynthesis: string;
  memberVotes: IAiCouncilMemberVote[];
  reconciledGaps: string[];
  tailoredStrategy: string;
  evaluatedAt: string;
}

export interface IRawQueueItem {
  id: string;
  platform: string;
  channelName: string;
  rawMessageId: string;
  rawText: string;
  processed: boolean;
  error?: string;
  jobId?: string;
  createdAt: string;
}

export interface IProfile {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  education: string;
  primarySkills: string[];
  specializations: string[];
  experience: string;
  projects: {
    title: string;
    tech: string;
    description: string;
    highlights: string[];
  }[];
  apiKey?: string;          // OpenRouter API key(s), comma-separated for pooling
  geminiApiKey?: string;    // Google Gemini API key (aistudio.google.com) — 1500 req/day free
  groqApiKey?: string;      // Groq API key (console.groq.com) — 14400 req/day free
  ollamaEndpoint?: string;  // Local Ollama base URL, default http://localhost:11434
  ollamaModel?: string;     // Local Ollama default model (e.g. llama3.2, qwen2.5)
  preferredProvider?: 'auto' | 'openrouter' | 'gemini' | 'groq' | 'ollama';
  telegramToken?: string;
}

export interface IAiProvenance {
  modelUsed: string;
  provider: 'openrouter' | 'gemini' | 'groq' | 'ollama' | 'local_heuristic';
  generatedAt: string;
  taskType?: string;
}

export interface IResolvedLink {
  originalUrl: string;
  canonicalUrl: string;
  linkType: 'direct_apply' | 'careers_portal' | 'redirect_wrapper' | 'job_board' | 'social_spam';
  pageTitle?: string;
  isJobPage: boolean;
  confidence: number;
  redirectHops: string[];
  extractedText?: string;
}

export interface IAtsOptimizationResult {
  initialScore: number;
  finalScore: number;
  iterations: number;
  targetScoreReached: boolean;
  tailoredSummary: string;
  tailoredProjects: {
    title: string;
    tech: string;
    bullets: string[];
  }[];
  latexResume: string;
  missingKeywordsIdentified: string[];
  truthfulInjectedKeywords: string[];
  modelUsed?: string;
}

export interface IStats {
  totalJobs: number;
  pendingApproval: number;
  approvedJobs: number;
  appliedJobs: number;
  interviewingJobs: number;
  rejectedJobs: number;
  unprocessedQueue: number;
  avgMatchScore: number;
  responseRatePct: number;
  highMatchCount: number;
}

export type CareerSiteCategory = 'Tier 1 Tech' | 'MNC / IT Services' | 'High-Growth Startup' | 'FinTech / E-Commerce' | 'AI / Machine Learning' | 'Custom';

export type AtsPlatform = 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'smartrecruiters' | 'workday' | 'generic';

export interface IAtsJobRaw {
  id: string;
  title: string;
  url: string;
  location?: string;
  department?: string;
  descriptionHtml?: string;
  plainText?: string;
  postedAt?: string;
  compensation?: string;
  requisitionId?: string;
  atsPlatform: AtsPlatform;
}

export interface IAtsAdapterResult {
  success: boolean;
  companyName: string;
  provider: AtsPlatform;
  totalJobs: number;
  jobs: IAtsJobRaw[];
  error?: string;
}

export interface ICareerWatchlistSite {
  id: string;
  companyName: string;
  careerUrl: string;
  category: CareerSiteCategory;
  enabled: boolean;
  atsProvider?: AtsPlatform;
  directApiEndpoint?: string;
  pollingIntervalHours?: number; // 1, 6, 12, 24
  autoApproveFitThreshold?: number; // e.g. 85 for auto-approval
  tags?: string[];
  searchKeywords: string[];
  lastSyncedAt?: string | null;
  lastSyncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  lastJobsFound?: number;
  lastError?: string | null;
  createdAt: string;
}

export interface ICareerSyncReport {
  totalSitesCrawled: number;
  totalJobsDiscovered: number;
  suitableJobsAdded: number;
  durationMs: number;
  syncedAt: string;
  siteResults: Array<{
    siteId: string;
    companyName: string;
    status: 'success' | 'error';
    jobsFound: number;
    suitableAdded: number;
    error?: string;
  }>;
}

export interface IWatchlistSchedulerStatus {
  isRunning: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  pollingIntervalHours: number;
  autoApproveThreshold: number;
  totalRunsCount: number;
  lastRunJobsAdded: number;
}


