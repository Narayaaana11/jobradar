import { IReferralContact, IProfile } from './types';
import { IExtractedJD } from './extractor';

interface ITargetPersona {
  targetTitle: string;
  department: string;
  personaLabel: string;
  tone: string;
}

const targetPersonas: ITargetPersona[] = [
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
    department: 'Alumni Network (Aditya University)',
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

export function generateReferralContacts(job: IExtractedJD, profile: IProfile): IReferralContact[] {
  const company = job.companyName || 'Target Company';
  const role = job.jobTitle || 'Software Engineer';

  return targetPersonas.map((persona) => {
    const searchTerms = `${persona.targetTitle} ${company}`;
    const linkedinSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchTerms)}`;

    let outreachDraft = '';
    if (persona.tone === 'alumni') {
      outreachDraft = `Hi [Name],

I hope you're having a productive week!

I noticed you're working as a ${persona.targetTitle} at ${company}. As a fellow graduate / MCA candidate from Aditya University with hands-on experience in MERN stack development, RESTful APIs, and full stack projects, I'm reaching out to see if you would be open to referring me for the open ${role} position at ${company}.

My technical portfolio and projects are available here:
• Portfolio: ${profile.portfolio || 'https://www.narayanathota.me'}
• GitHub: ${profile.github || 'https://github.com/Narayaaana11'}

Would you have 5 minutes to connect or review my profile? I'd appreciate any guidance!

Warm regards,
${profile.name}
${profile.email} | ${profile.phone}
LinkedIn: ${profile.linkedin}`;
    } else if (persona.tone === 'leadership' || persona.tone === 'director') {
      outreachDraft = `Hi [Name],

I hope all is well with you and your team at ${company}.

I saw the recent opening for ${role} under ${company}'s engineering group. With hands-on experience building scalable full-stack web applications, React interfaces, and Node.js microservices, I believe I can make an immediate contribution to your team's development sprints.

I've attached my ATS resume and portfolio for your convenience:
• Portfolio: ${profile.portfolio || 'https://www.narayanathota.me'}
• GitHub: ${profile.github || 'https://github.com/Narayaaana11'}

If you believe my background is a fit, could you kindly submit a referral for this opening?

Thank you for your time and leadership,
${profile.name}
${profile.email} | ${profile.phone}`;
    } else {
      outreachDraft = `Hi [Name],

I hope you're having a great week!

I came across the ${role} opening at ${company} and wanted to reach out. I have experience across React.js, Node.js, Express, MongoDB, and modern web application development.

I would love to be considered for this role. If you are open to it, could you refer my profile internally at ${company}?

Here is a summary of my background and projects:
• Portfolio: ${profile.portfolio || 'https://www.narayanathota.me'}
• GitHub: ${profile.github || 'https://github.com/Narayaaana11'}

Thank you for your support,
${profile.name}
${profile.email} | ${profile.phone}
LinkedIn: ${profile.linkedin}`;
    }

    return {
      personaTitle: persona.personaLabel,
      targetRole: `${persona.targetTitle} @ ${company}`,
      department: persona.department,
      linkedinSearchUrl,
      searchQuery: searchTerms,
      subject: `Referral Request: ${role} (${company}) — ${profile.name}`,
      outreachDraft,
    };
  });
}
