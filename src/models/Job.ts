import mongoose, { Schema, Document } from 'mongoose';

export interface ISource {
  platform: string;
  channelName: string;
  rawMessageId: string;
  discoveredAt: Date;
}

export interface IReferralContact {
  name?: string | null;
  role?: string | null;
  guessedEmail?: string | null;
  verified: boolean;
  linkedinSearchUrl: string;
  outreachDraft: string;
  outreachStatus: 'draft' | 'sent' | 'responded' | 'ghosted';
}

export interface IFitBreakdown {
  techFitScore: number;
  experienceFitScore: number;
  locationFitScore: number;
}

export interface IRubricScores {
  skillsScore: number;       // 1.0 - 5.0
  techStackScore: number;    // 1.0 - 5.0
  experienceScore: number;   // 1.0 - 5.0
  locationScore: number;     // 1.0 - 5.0
  compensationScore: number; // 1.0 - 5.0
  overallRubricRating: number; // 1.0 - 5.0 rating
}

export interface IAtsAnalysis {
  foundKeywords: string[];
  missingKeywords: string[];
  keywordDensityScore: number; // 0 - 100%
  atsFormatScore: number;       // 0 - 100%
  bulletImpactScore: number;    // 0 - 100%
  suggestedImprovements: string[];
}

export interface IAutoApplyDetails {
  prefillScreenshot?: string | null;
  fieldsFilled: string[];
  questionnaireAnswers?: Record<string, string>;
  appliedAt?: Date | null;
  status: 'idle' | 'prefilled' | 'submitted' | 'failed';
}

export interface IJob extends Document {
  dedupHash: string;
  sources: ISource[];
  companyName: string;
  companyPageUrl?: string | null;
  companySocialLinks: string[];
  jobTitle: string;
  jobType?: string | null;
  location?: string | null;
  isRemote?: boolean | null;
  ctcMentioned: boolean;
  ctcRange?: string | null;
  applicationLink?: string | null;
  applicationDeadline?: Date | null;
  skillsRequired: string[];
  experienceRequired?: string | null;
  rawDescription: string;
  matchScore: number;
  matchConfidence: number;
  gapAnalysis: {
    missingKeywords: string[];
    strongMatches: string[];
  };
  fitBreakdown?: IFitBreakdown;
  rubricScores?: IRubricScores;
  atsAnalysis?: IAtsAnalysis;
  autoApplyDetails?: IAutoApplyDetails;
  stage: 'discovered' | 'classified' | 'scored' | 'tailored' | 'pending_approval' | 'applying' | 'applied' | 'interviewing' | 'offered' | 'rejected';
  referralContacts: IReferralContact[];
  resumeVersionUrl?: string | null;
  resumeNotes?: string | null;
  coverLetterUrl?: string | null;
  coverLetterText?: string | null;
  applicationStatus: 'not_applied' | 'applied' | 'referral_pending' | 'interview' | 'rejected' | 'expired';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  scoreFlag: 'auto' | 'borderline' | 'low_match' | 'uncertain_jd';
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema(
  {
    dedupHash: { type: String, required: true, unique: true, index: true },
    sources: [
      {
        platform: { type: String, required: true },
        channelName: { type: String, required: true },
        rawMessageId: { type: String, required: true },
        discoveredAt: { type: Date, default: Date.now },
      },
    ],
    companyName: { type: String, required: true, index: true },
    companyPageUrl: { type: String, default: null },
    companySocialLinks: [{ type: String }],
    jobTitle: { type: String, required: true, index: true },
    jobType: { type: String, default: null },
    location: { type: String, default: null },
    isRemote: { type: Boolean, default: null },
    ctcMentioned: { type: Boolean, default: false },
    ctcRange: { type: String, default: null },
    applicationLink: { type: String, default: null },
    applicationDeadline: { type: Date, default: null },
    skillsRequired: [{ type: String }],
    experienceRequired: { type: String, default: null },
    rawDescription: { type: String, required: true },
    matchScore: { type: Number, default: 0, index: true },
    matchConfidence: { type: Number, default: 0 },
    gapAnalysis: {
      missingKeywords: [{ type: String }],
      strongMatches: [{ type: String }],
    },
    fitBreakdown: {
      techFitScore: { type: Number, default: 0 },
      experienceFitScore: { type: Number, default: 0 },
      locationFitScore: { type: Number, default: 0 },
    },
    rubricScores: {
      skillsScore: { type: Number, default: 1.0 },
      techStackScore: { type: Number, default: 1.0 },
      experienceScore: { type: Number, default: 1.0 },
      locationScore: { type: Number, default: 1.0 },
      compensationScore: { type: Number, default: 1.0 },
      overallRubricRating: { type: Number, default: 1.0 },
    },
    atsAnalysis: {
      foundKeywords: [{ type: String }],
      missingKeywords: [{ type: String }],
      keywordDensityScore: { type: Number, default: 0 },
      atsFormatScore: { type: Number, default: 0 },
      bulletImpactScore: { type: Number, default: 0 },
      suggestedImprovements: [{ type: String }],
    },
    autoApplyDetails: {
      prefillScreenshot: { type: String, default: null },
      fieldsFilled: [{ type: String }],
      questionnaireAnswers: { type: Map, of: String },
      appliedAt: { type: Date, default: null },
      status: { type: String, enum: ['idle', 'prefilled', 'submitted', 'failed'], default: 'idle' },
    },
    stage: {
      type: String,
      enum: ['discovered', 'classified', 'scored', 'tailored', 'pending_approval', 'applying', 'applied', 'interviewing', 'offered', 'rejected'],
      default: 'discovered',
      index: true,
    },
    referralContacts: [
      {
        name: { type: String, default: null },
        role: { type: String, default: null },
        guessedEmail: { type: String, default: null },
        verified: { type: Boolean, default: false },
        linkedinSearchUrl: { type: String, required: true },
        outreachDraft: { type: String, required: true },
        outreachStatus: { type: String, enum: ['draft', 'sent', 'responded', 'ghosted'], default: 'draft' },
      },
    ],
    resumeVersionUrl: { type: String, default: null },
    resumeNotes: { type: String, default: null },
    coverLetterUrl: { type: String, default: null },
    coverLetterText: { type: String, default: null },
    applicationStatus: {
      type: String,
      enum: ['not_applied', 'applied', 'referral_pending', 'interview', 'rejected', 'expired'],
      default: 'not_applied',
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    scoreFlag: {
      type: String,
      enum: ['auto', 'borderline', 'low_match', 'uncertain_jd'],
      default: 'auto',
    },
  },
  { timestamps: true }
);

export const Job = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
