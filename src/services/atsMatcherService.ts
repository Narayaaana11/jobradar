import { IAtsAnalysis } from '../models/Job';
import fs from 'fs';
import path from 'path';

export class AtsMatcherService {
  /**
   * Analyzes Job Description against Master Resume / Profile (Resume-Matcher standard).
   */
  public static analyzeAtsMatch(jobDescription: string, skillsRequired: string[]): IAtsAnalysis {
    let masterResumeText = '';
    const masterResumePath = path.resolve(process.cwd(), 'config', 'master_resume.md');
    
    if (fs.existsSync(masterResumePath)) {
      masterResumeText = fs.readFileSync(masterResumePath, 'utf-8').toLowerCase();
    } else {
      masterResumeText = 'javascript typescript react next.js node.js express mongodb html css tailwind REST api mern stack tally prime llm agent prompt engineering';
    }

    const jdTextLower = jobDescription.toLowerCase();

    // 1. Keyword Extraction & Found/Missing Split
    const foundKeywords: string[] = [];
    const missingKeywords: string[] = [];

    const candidateKeywords = [
      ...skillsRequired,
      'javascript', 'typescript', 'react', 'next.js', 'node.js', 'express',
      'mongodb', 'git', 'rest api', 'docker', 'tailwind', 'python', 'aws'
    ];

    const uniqueJdKeywords = Array.from(new Set(candidateKeywords.map(k => k.toLowerCase())));

    for (const keyword of uniqueJdKeywords) {
      if (jdTextLower.includes(keyword)) {
        if (masterResumeText.includes(keyword)) {
          foundKeywords.push(keyword);
        } else {
          missingKeywords.push(keyword);
        }
      }
    }

    // Deduplicate lists
    const uniqueFound = Array.from(new Set(foundKeywords));
    const uniqueMissing = Array.from(new Set(missingKeywords));

    // 2. Keyword Density Score
    const totalKeywordsCount = uniqueFound.length + uniqueMissing.length;
    const keywordDensityScore = totalKeywordsCount > 0 
      ? Math.round((uniqueFound.length / totalKeywordsCount) * 100) 
      : 80;

    // 3. ATS Format Score (Check for clear standard section headers)
    const requiredSections = ['education', 'skills', 'experience', 'projects', 'contact'];
    let matchedSections = 0;
    for (const section of requiredSections) {
      if (masterResumeText.includes(section)) matchedSections++;
    }
    const atsFormatScore = Math.round((matchedSections / requiredSections.length) * 100);

    // 4. Bullet Impact Score (Check for strong action verbs & numbers/metrics)
    const actionVerbs = ['developed', 'built', 'created', 'designed', 'implemented', 'engineered', 'integrated', 'optimized', 'led', 'scaled'];
    let verbHits = 0;
    for (const verb of actionVerbs) {
      if (masterResumeText.includes(verb)) verbHits++;
    }
    const hasNumbers = /\d+%|\d+\+|\$\d+/.test(masterResumeText);
    const bulletImpactScore = Math.min(100, Math.round((verbHits / 5) * 60 + (hasNumbers ? 40 : 0)));

    // 5. Actionable Suggested Improvements
    const suggestedImprovements: string[] = [];
    if (uniqueMissing.length > 0) {
      suggestedImprovements.push(`Incorporate high-frequency JD keywords: ${uniqueMissing.slice(0, 4).join(', ')}.`);
    }
    if (bulletImpactScore < 75) {
      suggestedImprovements.push('Add quantifiable metrics (e.g. percentages, performance boosts, latency reductions) to experience bullet points.');
    }
    if (atsFormatScore < 100) {
      suggestedImprovements.push('Ensure standard H2 headings (Education, Experience, Skills, Projects) exist for ATS parser compatibility.');
    }

    return {
      foundKeywords: uniqueFound,
      missingKeywords: uniqueMissing,
      keywordDensityScore,
      atsFormatScore,
      bulletImpactScore,
      suggestedImprovements,
    };
  }
}
