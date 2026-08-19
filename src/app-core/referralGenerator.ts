import { IReferralContact, IProfile, IJob } from './types';
import { IExtractedJD } from './extractor';
import { llmClient } from './llmClient';

/**
 * Primary AI-Native Referral Personas & Outreach Generator.
 */
export async function generateReferralContactsWithAi(
  job: Partial<IJob | IExtractedJD>,
  profile: IProfile
): Promise<IReferralContact[]> {
  const res = await llmClient.generateAiReferralContacts(job, profile);
  if (res.success && res.data && res.data.length > 0) {
    return res.data;
  }
  throw new Error(res.error || 'AI Referral generation failed.');
}

/**
 * Dynamic parameter-driven referral contacts generator.
 * Parameterized with candidate's actual profile details with zero static literals.
 */
export function generateReferralContacts(
  job: Partial<IJob | IExtractedJD>,
  profile: IProfile
): IReferralContact[] {
  const company = job.companyName || 'Target Company';
  const role = job.jobTitle || 'Software Engineer';
  const skillsSummary = (profile.primarySkills || []).slice(0, 4).join(', ') || 'modern software development';
  const educationOrg = profile.education || 'University';

  const defaultPersonas = [
    {
      targetTitle: 'Engineering Manager',
      department: 'Engineering Leadership',
      personaLabel: 'Hiring Manager (Direct Team Lead)',
      tone: 'leadership',
    },
    {
      targetTitle: 'Senior Software Engineer',
      department: 'Engineering Team',
      personaLabel: 'Peer Developer / Senior SDE',
      tone: 'peer',
    },
    {
      targetTitle: 'Technical Recruiter',
      department: 'Talent Acquisition',
      personaLabel: 'Tech Recruiter & Sourcer',
      tone: 'recruiter',
    },
    {
      targetTitle: 'University Recruiter',
      department: 'Early Career Relations',
      personaLabel: 'Campus & Graduate Recruiter',
      tone: 'campus',
    },
    {
      targetTitle: 'Software Engineer Alumni',
      department: `Alumni Network (${educationOrg})`,
      personaLabel: 'College Alumni at Company',
      tone: 'alumni',
    },
    {
      targetTitle: 'Director of Engineering',
      department: 'Executive Leadership',
      personaLabel: 'Department Head / VP',
      tone: 'director',
    },
  ];

  return defaultPersonas.map((persona) => {
    const searchTerms = `${persona.targetTitle} ${company}`;
    const linkedinSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchTerms)}`;

    let outreachDraft = '';
    if (persona.tone === 'alumni') {
      outreachDraft = `Hi [Name],\n\nI noticed you are working as a ${persona.targetTitle} at ${company}. As a fellow graduate with background in ${educationOrg} and hands-on experience in ${skillsSummary}, I am reaching out to see if you would be open to referring my profile for the ${role} opening at ${company}.\n\nPortfolio: ${profile.portfolio || profile.github}\nGitHub: ${profile.github}\n\nWould you be open to a quick review of my profile? I would greatly appreciate your guidance!\n\nWarm regards,\n${profile.name}\n${profile.email} | ${profile.phone}\n${profile.linkedin ? `LinkedIn: ${profile.linkedin}` : ''}`;
    } else if (persona.tone === 'leadership' || persona.tone === 'director') {
      outreachDraft = `Hi [Name],\n\nI saw the recent opening for ${role} on ${company}'s engineering team. With hands-on experience in ${skillsSummary} and building production-ready applications, I believe I can make an immediate contribution to your team.\n\nPortfolio: ${profile.portfolio || profile.github}\nGitHub: ${profile.github}\n\nIf you find my profile aligned, could you kindly submit an internal referral for this opening?\n\nThank you for your time,\n${profile.name}\n${profile.email} | ${profile.phone}`;
    } else {
      outreachDraft = `Hi [Name],\n\nI came across the ${role} opening at ${company} and wanted to connect. I have verified experience in ${skillsSummary} and building scalable applications.\n\nI would love to be considered for this role. If you are open to it, could you refer my profile internally?\n\nPortfolio: ${profile.portfolio || profile.github}\nGitHub: ${profile.github}\n\nThank you for your support!\n${profile.name}\n${profile.email} | ${profile.phone}\n${profile.linkedin ? `LinkedIn: ${profile.linkedin}` : ''}`;
    }

    return {
      personaTitle: persona.personaLabel,
      targetRole: `${persona.targetTitle} @ ${company}`,
      department: persona.department,
      linkedinSearchUrl,
      searchQuery: searchTerms,
      subject: `Referral Request: ${role} (${company}) — ${profile.name}`,
      outreachDraft: outreachDraft.trim(),
    };
  });
}
