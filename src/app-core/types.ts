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
  createdAt: string;
  updatedAt: string;
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
