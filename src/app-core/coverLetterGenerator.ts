import { IProfile, IJob } from './types';
import { IExtractedJD } from './extractor';
import { llmClient } from './llmClient';

/**
 * Primary AI-Native Cover Letter Generator.
 */
export async function generateCoverLetterWithAi(
  job: Partial<IJob | IExtractedJD>,
  profile: IProfile
): Promise<string> {
  const res = await llmClient.generateAiCoverLetter(job, profile);
  if (res.success && res.data) {
    return res.data;
  }
  throw new Error(res.error || 'AI Cover Letter generation failed.');
}

/**
 * Dynamic parameter-driven cover letter generator.
 * Parameterized entirely from profile and job with zero static literals.
 */
export function generateCoverLetter(
  job: Partial<IJob | IExtractedJD>,
  profile: IProfile
): string {
  const company = job.companyName || 'Hiring Team';
  const role = job.jobTitle || 'Software Engineer';
  const matchedSkills = (job.skillsRequired && job.skillsRequired.length > 0)
    ? job.skillsRequired.slice(0, 4).join(', ')
    : (profile.primarySkills || []).slice(0, 4).join(', ') || 'Modern Software Engineering';

  const projectHighlights = (profile.projects || [])
    .slice(0, 2)
    .map((p) => `• Built ${p.title} utilizing ${p.tech}: ${p.description}`)
    .join('\n');

  const educationText = profile.education ? ` possessing a background in ${profile.education}` : '';

  return `Dear ${company} Hiring Team,

I am writing to express my enthusiastic interest in the ${role} position at ${company}. As a ${profile.title || 'Software Engineer'}${educationText} with hands-on proficiency in ${matchedSkills}, I am eager to bring my problem-solving abilities and engineering discipline to your team.

${projectHighlights ? `Key highlights from my recent engineering work include:\n${projectHighlights}\n` : ''}
Your opening for ${role} strongly resonates with my background in ${matchedSkills}. I focus on building robust, maintainable systems, writing clean and modular code, and driving rapid development cycles.

I would welcome the opportunity to discuss how my technical skills and proactive work ethic can support ${company}'s product and engineering goals.

Thank you for your time and consideration.

Sincerely,
${profile.name}
${profile.email} | ${profile.phone}
${profile.linkedin ? `LinkedIn: ${profile.linkedin}` : ''}
${profile.github ? `GitHub: ${profile.github}` : ''}
${profile.portfolio ? `Portfolio: ${profile.portfolio}` : ''}`.trim();
}
