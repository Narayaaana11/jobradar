import { IProfile, IRubricScores } from './types';
import { IExtractedJD } from './extractor';

export interface IScoreResult {
  matchScore: number;
  matchConfidence: number;
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
  scoreFlag: 'auto' | 'borderline' | 'low_match' | 'uncertain_jd';
  skillMatched: boolean;
}

export function scoreJobAgainstProfile(job: IExtractedJD, profile: IProfile): IScoreResult {
  const raw = (job.rawDescription || '').toLowerCase();
  const title = (job.jobTitle || '').toLowerCase();
  const location = (job.location || '').toLowerCase();
  const requiredSkills = (job.skillsRequired || []).map((s) => s.toLowerCase());

  const profileSkills = (profile.primarySkills || []).map((s) => s.toLowerCase());

  // 1. Developer Role Match Check
  const devKeywords = [
    'software', 'developer', 'engineer', 'frontend', 'backend', 'full stack', 'fullstack',
    'mern', 'react', 'node', 'web', 'sde', 'graduate', 'associate', 'trainee', 'javascript', 'typescript', 'python'
  ];
  const nonDevKeywords = [
    'sales', 'marketing', 'hr', 'human resources', 'accounts', 'finance', 'driver', 'chef', 'bpo', 'telecaller', 'hardware'
  ];

  const isDevRole = devKeywords.some((k) => title.includes(k) || raw.includes(k));
  const isNonDev = nonDevKeywords.some((k) => title.includes(k));

  const skillMatched = isDevRole && !isNonDev;

  // 2. Strong Matches & Missing Keywords
  const strongMatches: string[] = [];
  const missingKeywords: string[] = [];

  for (const skill of job.skillsRequired) {
    const sLower = skill.toLowerCase();
    const matchesProfile = profileSkills.some((ps) => ps.includes(sLower) || sLower.includes(ps));
    if (matchesProfile) {
      strongMatches.push(skill);
    } else {
      missingKeywords.push(skill);
    }
  }

  // Always credit general web skills if developer role
  if (skillMatched && strongMatches.length === 0) {
    strongMatches.push('JavaScript', 'Problem Solving', 'MCA 2026 Batch');
  }

  // 3. Score Calculations
  let techFit = skillMatched ? 75 : 30;
  if (strongMatches.length >= 4) techFit = 95;
  else if (strongMatches.length >= 2) techFit = 85;
  else if (strongMatches.length >= 1) techFit = 78;

  // Experience fit
  let expFit = 90;
  if (/fresher|entry|0\s*-\s*[123]|2025|2026|graduate|trainee/i.test(raw + ' ' + (job.experienceRequired || ''))) {
    expFit = 98;
  } else if (/\b[3-9]\s*(\+|-)\s*years?/i.test(raw)) {
    expFit = 55;
  }

  // Location fit
  let locFit = 85;
  if (/hyderabad|remote|wfh|pan india/i.test(location + ' ' + raw)) {
    locFit = 100;
  } else if (/bengaluru|bangalore|pune|chennai/i.test(location)) {
    locFit = 90;
  }

  // Overall Match Score (Weighted: 50% Tech, 30% Experience, 20% Location)
  let overallScore = Math.round(techFit * 0.5 + expFit * 0.3 + locFit * 0.2);
  if (!skillMatched) overallScore = Math.min(overallScore, 42);

  // Rubric Scores (career-ops 1.0 - 5.0 scale)
  const rubricRating = Number(Math.min(5.0, Math.max(1.0, overallScore / 20)).toFixed(1));
  const skillsScore = Number(Math.min(5.0, Math.max(1.0, techFit / 20)).toFixed(1));
  const techStackScore = Number(Math.min(5.0, Math.max(1.0, (techFit + 2) / 20)).toFixed(1));
  const experienceScore = Number(Math.min(5.0, Math.max(1.0, expFit / 20)).toFixed(1));
  const cultureFitScore = Number(Math.min(5.0, Math.max(1.0, locFit / 20)).toFixed(1));

  let rubricTier: IRubricScores['rubricTier'] = 'Tier 2 - Good Match';
  if (rubricRating >= 4.5) rubricTier = 'Tier 1 - Strong Fit';
  else if (rubricRating >= 3.8) rubricTier = 'Tier 2 - Good Match';
  else if (rubricRating >= 3.0) rubricTier = 'Tier 3 - Borderline';
  else if (rubricRating >= 2.0) rubricTier = 'Tier 4 - Stretch';
  else rubricTier = 'Tier 5 - Low Fit';

  let scoreFlag: IScoreResult['scoreFlag'] = 'auto';
  if (overallScore >= 75) scoreFlag = 'auto';
  else if (overallScore >= 50) scoreFlag = 'borderline';
  else scoreFlag = 'low_match';

  return {
    matchScore: overallScore,
    matchConfidence: 0.95,
    gapAnalysis: {
      missingKeywords,
      strongMatches,
    },
    fitBreakdown: {
      techFitScore: techFit,
      experienceFitScore: expFit,
      locationFitScore: locFit,
    },
    rubricScores: {
      overallRubricRating: rubricRating,
      skillsScore,
      techStackScore,
      experienceScore,
      cultureFitScore,
      rubricTier,
    },
    scoreFlag,
    skillMatched,
  };
}
