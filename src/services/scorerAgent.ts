import fs from 'fs';
import path from 'path';
import { llmService } from './llmService';

import { IRubricScores } from '../models/Job';

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

function extractJsonBlock(text: string): string {
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) return jsonBlockMatch[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

function loadProfile() {
  const profilePath = path.resolve(process.cwd(), 'config', 'profile.json');
  if (fs.existsSync(profilePath)) {
    return JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  }
  return {
    name: 'Narayana Thota',
    education: 'MCA 2026 Batch, Aditya University',
    primarySkills: ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express', 'MongoDB', 'REST APIs', 'HTML5', 'CSS3', 'Git', 'SQL', 'Python', 'C', 'C++'],
    specializations: ['MERN Stack', 'LLM Agent Orchestration', 'Full Stack Development', 'Software Engineering'],
    experience: 'Fresher / Entry-Level (MCA 2026)',
    location: 'Bhimavaram, AP (Open to Hyderabad / Remote / PAN India)',
    projects: ['JobRadar Autonomous Job Search Platform', 'TallyPrime ERP Automation', 'LLM Pipeline Orchestration System'],
  };
}

/**
 * Rule-based scorer that actually analyzes the JD keywords vs candidate profile.
 */
function ruleBasedScorer(jobDetails: any): IScoreResult {
  const raw = (jobDetails.rawDescription || '').toLowerCase();
  const title = (jobDetails.jobTitle || '').toLowerCase();
  const location = (jobDetails.location || '').toLowerCase();
  const skills = (jobDetails.skillsRequired || []).map((s: string) => s.toLowerCase());

  const profile = loadProfile();
  const profileSkillsLower = profile.primarySkills.map((s: string) => s.toLowerCase());

  // --- Check Developer Role Match (Fullstack, Frontend, Backend, SDE, Software Developer) ---
  const devRoleKeywords = [
    'full stack', 'fullstack', 'frontend', 'front-end', 'front end', 'backend', 'back-end', 'back end',
    'sde', 'software development engineer', 'software engineer', 'custom software engineer',
    'application developer', 'web developer', 'react developer', 'node developer', 'python developer',
    'java developer', 'c++ developer', 'mern developer', 'software analyst', 'full-stack'
  ];

  const nonDevDomains = [
    'sap', 'vlsi', 'hardware', 'silicon', 'embedded', 'civil', 'mechanical', 'sales', 'hr',
    'human resources', 'legal', 'accounts', 'finance', 'nursing', 'medical', 'chef', 'driver',
    'construction', 'site engineer', 'qa tester', 'manual tester'
  ];

  const isDevRoleTitle = devRoleKeywords.some(k => title.includes(k));
  const isDevRoleContent = devRoleKeywords.some(k => raw.includes(k));
  const isNonDevDomain = nonDevDomains.some(d => title.includes(d));

  const skillMatched = (isDevRoleTitle || (isDevRoleContent && !isNonDevDomain)) && !isNonDevDomain;

  // --- Tech Fit ---
  const strongMatches: string[] = [];
  const missingKeywords: string[] = [];

  for (const skill of jobDetails.skillsRequired || []) {
    const skillLower = skill.toLowerCase();
    const isMatch = profileSkillsLower.some((ps: string) => ps.includes(skillLower) || skillLower.includes(ps)) || raw.includes(skillLower);
    if (isMatch) {
      strongMatches.push(skill);
    } else {
      if (!['b.e', 'b.tech', 'mca', 'bca', 'any degree', 'graduation'].some(d => skillLower.includes(d))) {
        missingKeywords.push(skill);
      }
    }
  }

  let techFit = skillMatched ? 82 : 35;
  if (strongMatches.length >= 5) techFit = 92;
  else if (strongMatches.length >= 3) techFit = 85;
  else if (!skillMatched) techFit = 30;

  // --- Experience Fit ---
  let expFit = 75;
  if (raw.includes('fresher') || raw.includes('2026') || raw.includes('0 to 1') || raw.includes('0-2') || raw.includes('entry level')) {
    expFit = 95;
    if (!strongMatches.includes('Fresher Eligible')) strongMatches.push('Fresher Eligible');
  } else if (raw.includes('2+ year') || raw.includes('3+ year') || raw.includes('3-5 year')) {
    expFit = 45;
  }

  // --- Location Fit ---
  let locFit = 70;
  if (location.includes('hyderabad') || location.includes('telangana')) locFit = 92;
  else if (location.includes('remote') || location.includes('wfh') || location.includes('work from home')) locFit = 95;
  else if (location.includes('pan india') || location.includes('anywhere') || location.includes('all india')) locFit = 85;

  const compositeScore = skillMatched
    ? Math.round(techFit * 0.5 + expFit * 0.3 + locFit * 0.2)
    : Math.round(techFit * 0.6 + expFit * 0.4);

  // career-ops 1.0 - 5.0 Rubric Conversion
  const skillsScore = Number((1.0 + (techFit / 100) * 4.0).toFixed(1));
  const techStackScore = Number((1.0 + (strongMatches.length / 6) * 4.0).toFixed(1));
  const experienceScore = Number((1.0 + (expFit / 100) * 4.0).toFixed(1));
  const locationScore = Number((1.0 + (locFit / 100) * 4.0).toFixed(1));
  const compensationScore = jobDetails.ctcMentioned ? 4.5 : 3.5;
  const overallRubricRating = Number(((skillsScore + techStackScore + experienceScore + locationScore + compensationScore) / 5).toFixed(1));

  return {
    matchScore: Math.max(25, Math.min(100, compositeScore)),
    matchConfidence: 0.85,
    gapAnalysis: {
      missingKeywords: missingKeywords.slice(0, 8),
      strongMatches: strongMatches.slice(0, 10),
    },
    fitBreakdown: {
      techFitScore: techFit,
      experienceFitScore: expFit,
      locationFitScore: locFit,
    },
    rubricScores: {
      skillsScore: Math.min(5.0, skillsScore),
      techStackScore: Math.min(5.0, techStackScore),
      experienceScore: Math.min(5.0, experienceScore),
      locationScore: Math.min(5.0, locationScore),
      compensationScore,
      overallRubricRating: Math.min(5.0, overallRubricRating),
    },
    scoreFlag: skillMatched ? 'auto' : 'low_match',
    skillMatched,
  };
}

export async function scoreJobFit(jobDetails: any): Promise<IScoreResult> {
  const profile = loadProfile();

  const prompt = `You are an expert technical recruiter and candidate match scoring agent.
Compare the target Job Description against the Developer Candidate Profile below and compute a precise fit score.

Developer Candidate Profile:
${JSON.stringify(profile, null, 2)}

Target Job Posting:
- Company: ${jobDetails.companyName}
- Role: ${jobDetails.jobTitle}
- Location: ${jobDetails.location || 'Not specified'}
- Experience Required: ${jobDetails.experienceRequired || 'Not specified'}
- Required Skills: ${(jobDetails.skillsRequired || []).join(', ')}
- Full Description: ${(jobDetails.rawDescription || '').slice(0, 1500)}

INSTRUCTIONS:
1. Identify which required skills the candidate ACTUALLY HAS (strongMatches)
2. Identify which required skills the candidate is MISSING (missingKeywords)
3. Score techFitScore: % of required tech skills the candidate has
4. Score experienceFitScore: how well fresher MCA 2026 fits experience requirements
5. Score locationFitScore: based on job location vs candidate location (Bhimavaram/Hyderabad)
6. matchScore = weighted average (tech 50% + experience 30% + location 20%)

Return ONLY a JSON object (no markdown, no explanation):
{
  "matchScore": 82,
  "matchConfidence": 0.88,
  "gapAnalysis": {
    "missingKeywords": ["Docker", "Kubernetes"],
    "strongMatches": ["React", "Node.js", "TypeScript", "MongoDB", "REST APIs"]
  },
  "fitBreakdown": {
    "techFitScore": 85,
    "experienceFitScore": 90,
    "locationFitScore": 80
  }
}`;

  try {
    const textContent = await llmService.completion(prompt, { model: 'sonnet', maxTokens: 1200 });
    const cleanedJson = extractJsonBlock(textContent);
    const parsed = JSON.parse(cleanedJson);

    const score = Math.max(20, Math.min(100, Number(parsed.matchScore) || 70));
    const confidence = Math.max(0, Math.min(1, Number(parsed.matchConfidence) || 0.8));

    const techFit = Math.max(20, Math.min(100, Number(parsed.fitBreakdown?.techFitScore) || score));
    const expFit = Math.max(20, Math.min(100, Number(parsed.fitBreakdown?.experienceFitScore) || score));
    const locFit = Math.max(20, Math.min(100, Number(parsed.fitBreakdown?.locationFitScore) || score));

    const skillsScore = Number((1.0 + (techFit / 100) * 4.0).toFixed(1));
    const experienceScore = Number((1.0 + (expFit / 100) * 4.0).toFixed(1));
    const locationScore = Number((1.0 + (locFit / 100) * 4.0).toFixed(1));
    const techStackScore = Number((1.0 + (score / 100) * 4.0).toFixed(1));
    const compensationScore = jobDetails.ctcMentioned ? 4.5 : 3.5;
    const overallRubricRating = Number(((skillsScore + techStackScore + experienceScore + locationScore + compensationScore) / 5).toFixed(1));

    return {
      matchScore: score,
      matchConfidence: confidence,
      gapAnalysis: {
        missingKeywords: Array.isArray(parsed.gapAnalysis?.missingKeywords) ? parsed.gapAnalysis.missingKeywords : [],
        strongMatches: Array.isArray(parsed.gapAnalysis?.strongMatches) ? parsed.gapAnalysis.strongMatches : [],
      },
      fitBreakdown: {
        techFitScore: techFit,
        experienceFitScore: expFit,
        locationFitScore: locFit,
      },
      rubricScores: {
        skillsScore: Math.min(5.0, skillsScore),
        techStackScore: Math.min(5.0, techStackScore),
        experienceScore: Math.min(5.0, experienceScore),
        locationScore: Math.min(5.0, locationScore),
        compensationScore,
        overallRubricRating: Math.min(5.0, overallRubricRating),
      },
      scoreFlag: score >= 60 ? 'auto' : 'borderline',
      skillMatched: parsed.skillMatched !== undefined ? Boolean(parsed.skillMatched) : score >= 60,
    };
  } catch (error: any) {
    console.warn('[ScorerAgent] LLM failed/limit reached. Using Rule-Based Scorer Fallback:', error.message);
    return ruleBasedScorer(jobDetails);
  }
}
