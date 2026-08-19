import { IJob, IProfile, IAtsOptimizationResult } from './types';
import { IExtractedJD } from './extractor';
import { analyzeAtsCompliance } from './atsMatcher';
import { generateAtsResumeLatex } from './resumeGenerator';
import { llmClient } from './llmClient';

export class AtsOptimizerService {
  /**
   * Evaluates ATS compliance and runs an iterative optimization loop (up to 3 iterations)
   * to align resume phrasing and truthful keyword density to reach a 90+ ATS score or honest ceiling.
   */
  public async optimizeResumeForJob(
    job: Partial<IJob | IExtractedJD>,
    profile: IProfile,
    options: { maxIterations?: number } = {}
  ): Promise<IAtsOptimizationResult> {
    const maxIterations = options.maxIterations || 3;
    const initialAts = analyzeAtsCompliance(job as IExtractedJD, profile);
    const initialScore = initialAts.overallAtsScore ?? 75;

    const missingKeywords = initialAts.hardSkillsMissing || [];
    const matchedKeywords = initialAts.hardSkillsFound || [];

    // Identify which missing skills can be truthfully represented based on candidate's full profile
    const candidateFullSkills = new Set([
      ...(profile.primarySkills || []).map((s) => s.toLowerCase()),
      ...(profile.specializations || []).map((s) => s.toLowerCase()),
    ]);

    const truthfulInjectable = missingKeywords.filter((mk) =>
      candidateFullSkills.has(mk.toLowerCase())
    );

    let currentScore: number = initialScore;
    let iterations = 0;
    let targetScoreReached = currentScore >= 90;

    let tailoredSummary = `${profile.title || 'Software Engineer'} with demonstrated experience in ${(profile.primarySkills || []).slice(0, 5).join(', ')}. Tailored for ${job.companyName || 'Target Company'} (${job.jobTitle || 'Role'}) with specialized alignment in ${(job.skillsRequired || []).slice(0, 4).join(', ')}.`;

    let tailoredProjects = (profile.projects || []).map((p) => ({
      title: p.title,
      tech: p.tech,
      bullets: p.highlights && p.highlights.length > 0 ? [...p.highlights] : [p.description],
    }));

    let modelUsed = 'heuristic_optimizer';

    // If AI is available and initial score < 90, run iterative optimization loop
    if (!targetScoreReached) {
      try {
        const systemPrompt = `You are a Principal ATS Resume Optimization Engineer.
Your task is to refine the candidate's resume summary and project bullet points to maximize ATS keyword relevance and impact metrics against the Job Description.
RULES:
1. Ground all bullet points in the candidate's actual projects and background—DO NOT invent fake projects.
2. Incorporate action verbs and quantifiable impact where appropriate.
3. Optimize keyword density for required skills truthfully matching candidate capabilities.
Return strictly valid JSON with no markdown wrapping.`;

        for (let iter = 1; iter <= maxIterations; iter++) {
          iterations = iter;

          const prompt = `ITERATION ${iter}/${maxIterations}:
JOB REQUIREMENTS:
Company: ${job.companyName}
Role: ${job.jobTitle}
Required Skills: ${(job.skillsRequired || []).join(', ')}
Missing ATS Keywords: ${missingKeywords.join(', ')}

CANDIDATE BASE:
Name: ${profile.name}
Title: ${profile.title}
Skills: ${(profile.primarySkills || []).join(', ')}
Current Projects:
${tailoredProjects.map((p) => `- ${p.title} (${p.tech}):\n${p.bullets.map((b) => `  * ${b}`).join('\n')}`).join('\n')}

SCHEMA:
{
  "tailoredSummary": "2-3 sentence impactful ATS summary",
  "tailoredProjects": [
    {
      "title": "Project Title",
      "tech": "Relevant Technologies",
      "bullets": [
        "Action verb + technical accomplishment + metric / outcome",
        "Action verb + architectural decision + result"
      ]
    }
  ],
  "truthfulInjectedKeywords": ["Keyword 1", "Keyword 2"]
}`;

          const aiRes = await llmClient.callLlmUniversal(prompt, systemPrompt, 'resume_tailoring', profile);
          if (aiRes.text) {
            const cleaned = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            if (parsed.tailoredSummary) tailoredSummary = parsed.tailoredSummary;
            if (Array.isArray(parsed.tailoredProjects) && parsed.tailoredProjects.length > 0) {
              tailoredProjects = parsed.tailoredProjects;
            }
            modelUsed = aiRes.model;

            // Recalculate ATS score with refined content
            const simulatedProfile: IProfile = {
              ...profile,
              projects: tailoredProjects.map((tp) => ({
                title: tp.title,
                tech: tp.tech,
                description: tp.bullets.join('. '),
                highlights: tp.bullets,
              })),
            };

            const updatedAts = analyzeAtsCompliance(job as IExtractedJD, simulatedProfile);
            currentScore = Math.max(currentScore, updatedAts.overallAtsScore ?? currentScore);

            if (currentScore >= 90) {
              targetScoreReached = true;
              break;
            }
          }
        }
      } catch {
        // Retain best effort heuristic score
      }
    }

    // Build final optimized LaTeX resume
    const optimizedProfile: IProfile = {
      ...profile,
      projects: tailoredProjects.map((tp) => ({
        title: tp.title,
        tech: tp.tech,
        description: tp.bullets.join('. '),
        highlights: tp.bullets,
      })),
    };

    const latexResume = generateAtsResumeLatex(job, optimizedProfile);

    return {
      initialScore,
      finalScore: currentScore,
      iterations,
      targetScoreReached,
      tailoredSummary,
      tailoredProjects,
      latexResume,
      missingKeywordsIdentified: missingKeywords,
      truthfulInjectedKeywords: truthfulInjectable,
      modelUsed,
    };
  }
}

export const atsOptimizer = new AtsOptimizerService();
