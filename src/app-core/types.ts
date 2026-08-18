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

export interface IRubricScores {
  overallRubricRating: number; // 1.0 - 5.0
  skillsScore: number;
  techStackScore: number;
  experienceScore: number;
  cultureFitScore: number;
  rubricTier: 'Tier 1 - Strong Fit' | 'Tier 2 - Good Match' | 'Tier 3 - Borderline' | 'Tier 4 - Stretch' | 'Tier 5 - Low Fit';
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

  // Referral & Tailored Assets
  referralContacts: IReferralContact[];
  interviewPrep: IInterviewPrep;
  coverLetterText: string;
  resumeNotes?: string;
  resumePdfDataUri?: string;
  appliedAt?: string | null;
  aiCouncil?: IAiCouncilVerdict;
  outreachSuite?: IColdOutreachSuite;
  interviewMasterGuide?: IInterviewMasterGuide;
  webIntelligence?: IWebScrapingIntelligence;
  createdAt: string;
  updatedAt: string;
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
  candidateProjectMapping: string; // e.g. "Map AUSVMS Redis queue to Swiggy order processing"
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

export interface IChannelSource {
  id: string;
  platform: 'whatsapp' | 'telegram';
  type: 'group' | 'channel';
  name: string;
  avatarUrl?: string;
  memberCount?: number;
  enabled: boolean;
  lastActiveAt?: string;
  totalCaptured: number;
}

export interface ICircuitBreakerState {
  tripped: boolean;
  reason: string;
  platform: 'whatsapp' | 'telegram' | 'all';
  trippedAt: string;
}

export interface IDomUpdateWarning {
  consecutiveEmptyCount: number;
  warning: string;
  lastCheckedAt: string;
}

export interface IWatcherConfig {
  whatsappConnected: boolean;
  whatsappStatus: 'disconnected' | 'pairing' | 'connected';
  whatsappPhone?: string;
  whatsappPairingCode?: string;
  telegramConnected: boolean;
  telegramStatus: 'disconnected' | 'code_sent' | 'connected';
  telegramPhone?: string;
  telegramToken?: string;
  clipboardWatcherEnabled: boolean;
  minMatchScoreForToast: number;
  monitoredChannels: IChannelSource[];

  // Hardened Background Scanning & Detection Defense Config
  periodicScanningEnabled: boolean;
  minScanIntervalMinutes: number; // e.g. 8 mins
  maxScanIntervalMinutes: number; // e.g. 20 mins
  dailyScanCap: number; // e.g. 50 scans per 24h
  idleSkipChancePct: number; // e.g. 20%
  lastScanTimestamp?: number;
  scansInLast24h?: number;
  nextScheduledScanTime?: string;
  circuitBreaker?: ICircuitBreakerState;
  domUpdateWarnings?: Record<string, IDomUpdateWarning>;
}

export interface IRadarFeedItem {
  id: string;
  platform: 'whatsapp' | 'telegram' | 'clipboard';
  channelName: string;
  rawText: string;
  status: 'noise_dropped' | 'duplicate_skipped' | 'extracted' | 'council_approved' | 'low_match';
  extractedCompany?: string;
  extractedRole?: string;
  matchScore?: number;
  jobId?: string;
  timestamp: string;
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
  apiKey?: string;
  telegramToken?: string;
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

export type CareerSiteCategory = 'Tier 1 Tech' | 'MNC / IT Services' | 'High-Growth Startup' | 'FinTech / E-Commerce' | 'Custom';

export interface ICareerWatchlistSite {
  id: string;
  companyName: string;
  careerUrl: string;
  category: CareerSiteCategory;
  enabled: boolean;
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

