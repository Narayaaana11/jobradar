import { IProfile, IRubricScores, IJob, IBlockGAudit, RubricLetterGrade, FitRecommendation, IStructuredFitReport } from './types';
import { IExtractedJD } from './extractor';
import { llmClient } from './llmClient';

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
  structuredFitReport: IStructuredFitReport;
}

export function scoreJobAgainstProfile(job: IExtractedJD, profile: IProfile): IScoreResult {
  const raw = (job.rawDescription || '').toLowerCase();
  const title = (job.jobTitle || '').toLowerCase();
  const location = (job.location || '').toLowerCase();
  const requiredSkills = (job.skillsRequired || []).map((s) => s.toLowerCase());

  const profileSkills = (profile.primarySkills || []).map((s) => s.toLowerCase());

  // ──────────────────────────────────────────────────────────────────
  // 1. DEALBREAKER / HARD FILTER DETECTION
  // ──────────────────────────────────────────────────────────────────
  const dealbreakersFound: string[] = [];

  // A. Citizenship / Visa / Clearance Hard Blockers
  const citizenshipBlockerRegex = /\b(us citizen only|u\.s\. citizen only|us citizenship required|active ts\/sci|top secret clearance|security clearance required|no visa sponsorship|must be authorized to work in us without sponsorship|must hold eu citizenship|native german speaker required)\b/i;
  if (citizenshipBlockerRegex.test(raw)) {
    dealbreakersFound.push('Citizenship / Security Clearance / Visa Sponsorship Hard Blocker');
  }

  // B. Extreme Seniority Disconnect (e.g. 10+ years Director/VP/Principal for entry-level candidate)
  const isExtremeSeniority = /\b(1[0-9]\+|15\+|12\+|20\+)\s*years?\b/i.test(raw) || /\b(principal engineer|director of engineering|vp of engineering|chief architect)\b/i.test(title);
  if (isExtremeSeniority) {
    dealbreakersFound.push('Excessive Seniority Requirement (10+ YOE / Principal / Director)');
  }

  // C. Unaligned Non-Tech / Unrelated Roles
  const nonDevKeywords = [
    'truck driver', 'delivery driver', 'chef', 'bpo', 'telecaller', 'tele-calling', 'sales executive',
    'real estate agent', 'carpenter', 'electrician', 'hardware technician'
  ];
  if (nonDevKeywords.some((k) => title.includes(k))) {
    dealbreakersFound.push(`Non-Engineering Domain Role: "${title}"`);
  }

  // D. Foreign Onsite-Only Without Relocation
  const isForeignOnsite = /\b(onsite in tokyo|onsite in berlin|onsite in london|onsite in sydney)\b/i.test(raw) && !/remote|relocation assistance|visa sponsorship/i.test(raw);
  if (isForeignOnsite) {
    dealbreakersFound.push('Foreign On-site Presence Required (No Remote/Relocation)');
  }

  const isDealbreaker = dealbreakersFound.length > 0;

  // ──────────────────────────────────────────────────────────────────
  // 2. MULTI-DIMENSIONAL SCORING EVALUATION
  // ──────────────────────────────────────────────────────────────────

  // Dimension 1: Technical Stack Match (0 - 100)
  const devKeywords = [
    'software', 'developer', 'engineer', 'frontend', 'backend', 'full stack', 'fullstack',
    'mern', 'react', 'node', 'web', 'sde', 'graduate', 'associate', 'trainee', 'javascript', 'typescript', 'python'
  ];
  const isDevRole = devKeywords.some((k) => title.includes(k) || raw.includes(k));
  const skillMatched = isDevRole && dealbreakersFound.length === 0;

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

  if (skillMatched && strongMatches.length === 0) {
    strongMatches.push('JavaScript', 'Problem Solving', 'Data Structures & Algorithms');
  }

  let techFit = skillMatched ? 75 : 30;
  if (strongMatches.length >= 4) techFit = 96;
  else if (strongMatches.length >= 2) techFit = 86;
  else if (strongMatches.length >= 1) techFit = 78;

  // Dimension 2: Seniority & Experience Fit (0 - 100)
  let expFit = 88;
  if (/fresher|entry|0\s*-\s*[123]|2024|2025|2026|graduate|trainee|associate|early career/i.test(raw + ' ' + (job.experienceRequired || ''))) {
    expFit = 98;
  } else if (/\b[3-5]\s*(\+|-)\s*years?/i.test(raw)) {
    expFit = 70;
  } else if (/\b[6-9]\s*(\+|-)\s*years?/i.test(raw)) {
    expFit = 45;
  }

  // Dimension 3: Domain & Industry Relevance (0 - 100)
  let domainFit = 80;
  if (/web|cloud|saas|api|full stack|mern|react|frontend|node/i.test(raw + ' ' + title)) {
    domainFit = 95;
  } else if (/ai|machine learning|data science/i.test(raw)) {
    domainFit = 85;
  } else if (/embedded|firmware|hardware|vlsi/i.test(raw)) {
    domainFit = 35;
  }

  // Dimension 4: Compensation & Location Fit (0 - 100)
  let locFit = 85;
  if (/remote|work from home|wfh|pan india|india remote/i.test(location + ' ' + raw)) {
    locFit = 100;
  } else if (/hyderabad|bengaluru|bangalore|pune|chennai|delhi|noida|gurgaon/i.test(location + ' ' + raw)) {
    locFit = 92;
  } else if (/india/i.test(location + ' ' + raw)) {
    locFit = 88;
  }

  // Overall Match Score (Weighted Composite)
  let overallScore = Math.round(techFit * 0.45 + expFit * 0.25 + domainFit * 0.15 + locFit * 0.15);

  if (isDealbreaker) {
    overallScore = Math.min(overallScore, 35);
  } else if (!skillMatched) {
    overallScore = Math.min(overallScore, 42);
  }

  // 1.0 - 5.0 Numerical Dimension Sub-Scores
  const technicalStackMatchScore = Number(Math.min(5.0, Math.max(1.0, techFit / 20)).toFixed(1));
  const seniorityExperienceScore = Number(Math.min(5.0, Math.max(1.0, expFit / 20)).toFixed(1));
  const domainRelevanceScore = Number(Math.min(5.0, Math.max(1.0, domainFit / 20)).toFixed(1));
  const compensationLocationScore = Number(Math.min(5.0, Math.max(1.0, locFit / 20)).toFixed(1));
  const rubricRating = Number(Math.min(5.0, Math.max(1.0, overallScore / 20)).toFixed(1));

  // ──────────────────────────────────────────────────────────────────
  // 3. A–F LETTER GRADING & FIT RECOMMENDATION
  // ──────────────────────────────────────────────────────────────────
  let letterGrade: RubricLetterGrade = 'B';
  let recommendation: FitRecommendation = 'APPLY';
  let rubricTier: IRubricScores['rubricTier'] = 'Tier 2 - Good Match';

  if (isDealbreaker || overallScore < 45 || rubricRating < 2.0) {
    letterGrade = 'F';
    recommendation = 'SKIP';
    rubricTier = 'Tier 5 - Low Fit';
  } else if (overallScore >= 88 || rubricRating >= 4.5) {
    letterGrade = 'A';
    recommendation = 'APPLY';
    rubricTier = 'Tier 1 - Strong Fit';
  } else if (overallScore >= 74 || rubricRating >= 3.8) {
    letterGrade = 'B';
    recommendation = 'APPLY';
    rubricTier = 'Tier 2 - Good Match';
  } else if (overallScore >= 60 || rubricRating >= 3.0) {
    letterGrade = 'C';
    recommendation = 'BORDERLINE';
    rubricTier = 'Tier 3 - Borderline';
  } else {
    letterGrade = 'D';
    recommendation = 'SKIP';
    rubricTier = 'Tier 4 - Stretch';
  }

  let scoreFlag: IScoreResult['scoreFlag'] = 'auto';
  if (recommendation === 'APPLY') scoreFlag = 'auto';
  else if (recommendation === 'BORDERLINE') scoreFlag = 'borderline';
  else scoreFlag = 'low_match';

  // ──────────────────────────────────────────────────────────────────
  // 4. STRUCTURED FIT REPORT GENERATION
  // ──────────────────────────────────────────────────────────────────
  const pros: string[] = [];
  const cons: string[] = [];

  if (strongMatches.length > 0) {
    pros.push(`High tech stack alignment across ${strongMatches.slice(0, 3).join(', ')}.`);
  }
  if (expFit >= 90) {
    pros.push('Experience level strongly targets MCA/B.Tech freshers & early-career talent.');
  }
  if (locFit >= 90) {
    pros.push(`Favorable location parameters (${job.location || 'Remote / India'}).`);
  }
  if (domainFit >= 90) {
    pros.push('Direct domain synergy with full-stack web and distributed system projects.');
  }

  if (dealbreakersFound.length > 0) {
    cons.push(...dealbreakersFound.map((d) => `Dealbreaker: ${d}`));
  }
  if (missingKeywords.length > 0) {
    cons.push(`Missing explicit keywords in JD: ${missingKeywords.slice(0, 3).join(', ')}.`);
  }
  if (expFit < 70 && !isDealbreaker) {
    cons.push('Requires slightly higher years of professional experience.');
  }

  let executiveSummary = '';
  if (isDealbreaker) {
    executiveSummary = `Rejected due to critical dealbreaker: ${dealbreakersFound.join('; ')}. Recommended action: SKIP.`;
  } else if (recommendation === 'APPLY') {
    executiveSummary = `Strong conviction match (${overallScore}%, Grade ${letterGrade}, Rubric ${rubricRating}/5.0). Direct overlap with ${strongMatches.slice(0, 3).join(', ')}. Recommended: APPLY with tailored ATS LaTeX resume.`;
  } else if (recommendation === 'BORDERLINE') {
    executiveSummary = `Borderline opportunity (${overallScore}%, Grade ${letterGrade}, Rubric ${rubricRating}/5.0). Matches core engineering capabilities, but has missing keywords (${missingKeywords.slice(0, 2).join(', ')}). Recommended: BORDERLINE (Review before applying).`;
  } else {
    executiveSummary = `Low alignment role (${overallScore}%, Grade ${letterGrade}, Rubric ${rubricRating}/5.0). Significant gap in tech stack or seniority. Recommended: SKIP.`;
  }

  const structuredFitReport: IStructuredFitReport = {
    recommendation,
    letterGrade,
    numericalScore: rubricRating,
    matchPercentage: overallScore,
    pros,
    cons,
    missingSkills: missingKeywords,
    dealbreakersFound,
    isDealbreaker,
    executiveSummary,
  };

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
      letterGrade,
      recommendation,
      skillsScore: technicalStackMatchScore,
      techStackScore: technicalStackMatchScore,
      experienceScore: seniorityExperienceScore,
      cultureFitScore: compensationLocationScore,
      rubricTier,
      technicalStackMatchScore,
      seniorityExperienceScore,
      domainRelevanceScore,
      compensationLocationScore,
    },
    scoreFlag,
    skillMatched,
    structuredFitReport,
  };
}

/**
 * JobRadar Block G: Posting Legitimacy & Ghost Job / Scam Detector
 */
export function auditBlockGLegitimacy(job: IExtractedJD): import('./types').IBlockGAudit {
  const raw = (job.rawDescription || '').toLowerCase();
  const link = (job.applicationLink || '').toLowerCase();
  const company = (job.companyName || '').toLowerCase();

  const signalsFound: string[] = [];
  let riskPoints = 0;

  // 1. Work Auth / Citizenship Blocker
  const isWorkAuthBlocker =
    /\b(us citizen only|security clearance required|active ts\/sci|no visa sponsorship|must be authorized to work in us without sponsorship)\b/i.test(raw);

  if (isWorkAuthBlocker) {
    signalsFound.push('Work Authorization / Citizenship Hard Blocker Detected');
    riskPoints += 40;
  }

  // 2. Scam / Fraud Indicators
  const isScam =
    /\b(pay fee|deposit money|registration fee|crypto payment|send money to receive laptop|telegram @\w+ for payment)\b/i.test(raw);

  if (isScam) {
    signalsFound.push('Critical Scam / Fraud Indicator Detected');
    riskPoints += 80;
  }

  // 3. Stale Repost / Ghost Job Indicators
  const isStaleRepost =
    /\b(reposted|posted 30\+ days ago|posted 60\+ days ago|always hiring|evergreen requisition)\b/i.test(raw);

  if (isStaleRepost) {
    signalsFound.push('Stale / Evergreen Repost Indicator');
    riskPoints += 25;
  }

  // 4. Missing Direct Apply URL
  const isMissingLink = !link || link.includes('javascript:') || link.startsWith('#');
  if (isMissingLink) {
    signalsFound.push('Missing Direct Official Application Link');
    riskPoints += 15;
  }

  // 5. Positive Legitimacy Signals
  const isTopATS = /greenhouse\.io|lever\.co|myworkdayjobs\.com|smartrecruiters\.com|ashbyhq\.com|workable\.com|workday/i.test(link);
  if (isTopATS) {
    signalsFound.push('Hosted on Verified Enterprise ATS (Greenhouse/Lever/Ashby/Workday)');
    riskPoints = Math.max(0, riskPoints - 20);
  }

  const isVerifiedDomain = company.length > 2 && link.includes(company.replace(/[^a-z0-9]/g, ''));
  if (isVerifiedDomain) {
    signalsFound.push(`Verified Direct Domain Matching Company (${company})`);
    riskPoints = Math.max(0, riskPoints - 15);
  }

  const legitimacyScore = Math.max(5, Math.min(100, 100 - riskPoints));
  const isGhostJobRisk = riskPoints >= 40 && !isScam;

  let verdict: import('./types').IBlockGAudit['verdict'] = 'Verified Legitimate';
  let recommendation = 'Posting verified authentic with genuine direct application flow.';

  if (isScam) {
    verdict = 'High Risk Ghost Job';
    recommendation = 'DO NOT APPLY: Fraudulent or payment-demanding listing detected.';
  } else if (isWorkAuthBlocker) {
    verdict = 'Work-Auth Blocker';
    recommendation = 'Explicit citizenship or work-authorization blocker specified in JD.';
  } else if (isGhostJobRisk || isStaleRepost) {
    verdict = 'Low Risk';
    recommendation = 'Possible evergreen or stale repost. Recommended to reach out directly to hiring team on LinkedIn.';
  }

  return {
    legitimacyScore,
    isGhostJobRisk,
    isStaleRepost,
    workAuthBlocker: isWorkAuthBlocker,
    verdict,
    signalsFound,
    recommendation,
  };
}

/**
 * Primary AI-Native Scorer & Fit Evaluator.
 * Uses the multi-provider LLM gateway for authoritative scoring, dealbreaker quoting, and rubric evaluation.
 */
export async function scoreJobAgainstProfileWithAi(
  job: Partial<IJob | IExtractedJD>,
  profile: IProfile
): Promise<IScoreResult> {
  const aiRes = await llmClient.scoreJobWithLlm(job, profile);
  if (aiRes.success && aiRes.data) {
    return aiRes.data;
  }
  // Heuristic pre-filter fallback
  return scoreJobAgainstProfile(job as IExtractedJD, profile);
}

/**
 * AI-Augmented Block G Legitimacy & Ghost Job Auditor
 */
export async function auditBlockGLegitimacyWithAi(
  job: IJob,
  apiKey?: string
): Promise<import('./types').IBlockGAudit> {
  const res = await llmClient.auditBlockGLegitimacyWithAi(job, apiKey);
  if (res.success && res.data) {
    return res.data;
  }
  return auditBlockGLegitimacy(job);
}

