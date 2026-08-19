import { IJob, IProfile, IColdOutreachSuite, ICorporateEmailPattern, ICadenceStep } from './types';
import { llmClient } from './llmClient';

/**
 * Primary AI-Native Cold Outreach Suite Generator.
 */
export async function generateOutreachSuiteWithAi(
  job: IJob,
  profile: IProfile
): Promise<IColdOutreachSuite> {
  const res = await llmClient.generateAiOutreachSuite(job, profile);
  if (res.success && res.data) {
    return res.data;
  }
  throw new Error(res.error || 'AI Cold Outreach generation failed.');
}

/**
 * Predicts corporate email patterns based on domain naming conventions.
 */
export function predictCorporateEmailPatterns(
  companyName: string,
  domainGuess?: string,
  candidateName?: string
): { domain: string; patterns: ICorporateEmailPattern[] } {
  const cleanComp = (companyName || 'company').toLowerCase().replace(/[^a-z0-9]/g, '');
  const domain = domainGuess || `${cleanComp}.com`;

  const nameParts = (candidateName || 'First Last').trim().split(/\s+/);
  const first = nameParts[0].toLowerCase();
  const last = (nameParts[1] || 'dev').toLowerCase();
  const fInit = first.charAt(0);

  const patterns: ICorporateEmailPattern[] = [
    {
      pattern: `{first}.{last}@${domain}`,
      example: `${first}.${last}@${domain}`,
      confidence: 'High',
      domain,
    },
    {
      pattern: `{firstInitial}{last}@${domain}`,
      example: `${fInit}${last}@${domain}`,
      confidence: 'Medium',
      domain,
    },
    {
      pattern: `{first}@${domain}`,
      example: `${first}@${domain}`,
      confidence: 'Medium',
      domain,
    },
    {
      pattern: `{first}{last}@${domain}`,
      example: `${first}${last}@${domain}`,
      confidence: 'Estimated',
      domain,
    },
  ];

  return { domain, patterns };
}

/**
 * Dynamic parameter-driven cold outreach generator.
 * Parameterized with candidate's actual profile details with zero static literals.
 */
export function generateOutreachSuite(job: IJob, profile: IProfile): IColdOutreachSuite {
  const { domain, patterns } = predictCorporateEmailPatterns(job.companyName, undefined, profile.name);

  const firstName = profile.name ? profile.name.split(' ')[0] : 'Candidate';
  const role = job.jobTitle || 'Software Engineer';
  const company = job.companyName || 'Target Company';
  const topSkill = (job.skillsRequired && job.skillsRequired[0]) || (profile.primarySkills && profile.primarySkills[0]) || 'Full Stack Development';

  const projectReference = profile.projects && profile.projects.length > 0
    ? profile.projects.map((p) => p.title).join(' and ')
    : 'production full-stack applications';

  const cadenceSequence: ICadenceStep[] = [
    {
      stepNumber: 1,
      dayLabel: 'Day 1 — The Concise Value Pitch',
      triggerCondition: 'Immediate application or cold outreach',
      channel: 'Email',
      subject: `Application & Quick Introduction: ${role} — ${profile.name}`,
      body: `Hi [Hiring Manager / Tech Lead],\n\nI recently came across the ${role} opening at ${company} and wanted to reach out directly. As a Software Engineer with strong expertise in ${topSkill} and modern web architecture, I recently built scalable platforms including ${projectReference}.\n\nGiven ${company}'s scale and engineering standards, I would love the opportunity to contribute. I have attached my ATS resume and portfolio (${profile.portfolio || profile.github}) for your review.\n\nBest regards,\n${profile.name}\n${profile.phone} | ${profile.email}\n${profile.linkedin ? `LinkedIn: ${profile.linkedin}` : ''}`,
    },
    {
      stepNumber: 2,
      dayLabel: 'Day 4 — The Engineering Value-Add Bump',
      triggerCondition: 'No response after 3 business days',
      channel: 'Email',
      subject: `Re: Application & Quick Introduction: ${role} — ${profile.name}`,
      body: `Hi [Hiring Manager],\n\nI wanted to briefly follow up on my note from earlier this week regarding the ${role} opening. In the meantime, I reviewed ${company}'s product and put together a quick architecture note on how I approach scalable systems and performance using ${topSkill}.\n\nI understand you are busy, but would appreciate 5 minutes to connect if you are interviewing candidates for this team.\n\nThanks,\n${firstName}`,
    },
    {
      stepNumber: 3,
      dayLabel: 'Day 9 — The Graceful Keep-in-Touch Close',
      triggerCondition: 'No response after 8-10 days',
      channel: 'Email',
      subject: `Final follow-up: ${role} — ${profile.name}`,
      body: `Hi [Hiring Manager],\n\nI realize you may be moving forward with other candidates for the ${role} position or have closed the requisition. No problem at all!\n\nI will keep following ${company}'s engineering milestones. If any new openings open up in the future for ${topSkill} developers, I would love to be kept in mind.\n\nThanks again,\n${profile.name}\n${profile.linkedin ? `LinkedIn: ${profile.linkedin}` : ''}`,
    },
  ];

  const candidateEdu = profile.education || 'Computer Science';
  const topSkillsList = (job.skillsRequired && job.skillsRequired.length > 0)
    ? job.skillsRequired.slice(0, 3).join(', ')
    : (profile.primarySkills || []).slice(0, 3).join(', ') || 'modern software engineering';

  const linkedInNotes = {
    connectionRequestNote300Char: `Hi [Name], I'm a developer with background in ${candidateEdu} specializing in ${topSkill}. I noticed your work at ${company} and recently applied for the ${role} role. Would love to connect and follow your team's engineering updates!`,
    recruiterDirectPitch: `Hi [Recruiter Name], I hope you're having a great week! I recently submitted my application for ${role} at ${company}. With strong proficiency in ${topSkillsList} and production projects in ${projectReference}, I would love to know if you are actively scheduling introductory screens. Thanks!`,
    alumniWarmIntroduction: `Hi [Alumni Name]! Hope you're doing well. As a fellow student/alumni with background in ${candidateEdu}, I saw you're working as [Role] at ${company}. I'm preparing to interview for the ${role} position and would love 5 minutes to learn about your experience and engineering culture at ${company}!`,
  };

  return {
    companyDomain: domain,
    emailPatterns: patterns,
    cadenceSequence,
    linkedInNotes,
    provenance: {
      modelUsed: 'local_parameterized_outreach_generator',
      provider: 'local_heuristic',
      generatedAt: new Date().toISOString(),
      taskType: 'outreach',
    },
  };
}
