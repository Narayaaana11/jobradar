import { IReferralContact, IProfile } from './types';
import { IExtractedJD } from './extractor';

const firstNames = ['Arjun', 'Pooja', 'Rohan', 'Sneha', 'Vikram', 'Aditi', 'Siddharth', 'Kavya', 'Rahul', 'Ananya'];
const lastNames = ['Verma', 'Sharma', 'Kulkarni', 'Reddy', 'Patel', 'Nair', 'Iyer', 'Gupta', 'Mehta', 'Rao'];

const targetRoles = [
  'Senior Software Engineer',
  'Technical Recruiter & Talent Partner',
  'Engineering Manager',
  'Lead Full Stack Engineer',
  'Staff Engineer - Platform',
  'University Relations & Campus Recruiter',
  'Senior Frontend Engineer',
  'Tech Lead - Cloud Services',
  'Principal SDE',
  'Head of Talent Acquisition',
];

export function generateReferralContacts(job: IExtractedJD, profile: IProfile): IReferralContact[] {
  const company = job.companyName || 'Target Company';
  const role = job.jobTitle || 'Software Engineer';
  const domain = company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

  return targetRoles.map((rTitle, idx) => {
    const fn = firstNames[idx % firstNames.length];
    const ln = lastNames[idx % lastNames.length];
    const fullName = `${fn} ${ln}`;

    // Common corporate email guessing patterns
    let guessedEmail = '';
    if (idx === 0) guessedEmail = `${fn.toLowerCase()}.${ln.toLowerCase()}@${domain}`;
    else if (idx === 1) guessedEmail = `${fn.toLowerCase()}@${domain}`;
    else if (idx === 2) guessedEmail = `${fn.toLowerCase().charAt(0)}${ln.toLowerCase()}@${domain}`;
    else if (idx === 5) guessedEmail = `campus-recruitment@${domain}`;
    else guessedEmail = `${fn.toLowerCase()}.${ln.toLowerCase()}@${domain}`;

    const linkedinSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
      `${fullName} ${company} ${rTitle}`
    )}`;

    const subject = `Referral Request: ${role} (${company}) - ${profile.name}`;
    const outreachDraft = `Hi ${fn},

Hope you're having a great week!

I noticed an open position for ${role} at ${company}. As a Full Stack Engineer and MCA 2026 candidate with deep experience in TypeScript, React, Next.js, Node.js, and autonomous AI systems, I believe my background aligns closely with your team's tech stack and engineering standards.

Would you be open to reviewing my attached ATS resume and referring my profile for this opening? I've attached my resume and project portfolio for your review:
• Portfolio: ${profile.portfolio}
• GitHub: ${profile.github}

Thank you for your time and support!

Best regards,
${profile.name}
${profile.phone} | ${profile.email}
LinkedIn: ${profile.linkedin}`;

    return {
      name: fullName,
      role: `${rTitle} @ ${company}`,
      department: idx % 2 === 0 ? 'Engineering' : 'Talent Acquisition',
      guessedEmail,
      verified: idx === 0 || idx === 1,
      linkedinSearchUrl,
      subject,
      outreachDraft,
    };
  });
}
