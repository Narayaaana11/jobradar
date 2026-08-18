import { IJob, IProfile, IColdOutreachSuite, ICorporateEmailPattern, ICadenceStep } from './types';

/**
 * Predicts corporate email patterns for known companies and estimates for custom domains.
 */
export function predictCorporateEmailPatterns(companyName: string, domainGuess?: string): { domain: string; patterns: ICorporateEmailPattern[] } {
  const cleanComp = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const knownDomains: Record<string, { domain: string; patterns: { pattern: string; example: string; confidence: 'High' | 'Medium' | 'Estimated' }[] }> = {
    amazon: {
      domain: 'amazon.com',
      patterns: [
        { pattern: '{first}{last}@amazon.com', example: 'satyanarayana@amazon.com', confidence: 'High' },
        { pattern: '{last}{firstInitial}@amazon.com', example: 'thotan@amazon.com', confidence: 'High' },
        { pattern: '{first}.{last}@amazon.com', example: 'satya.thota@amazon.com', confidence: 'Medium' },
      ],
    },
    google: {
      domain: 'google.com',
      patterns: [
        { pattern: '{first}{last}@google.com', example: 'satyanarayana@google.com', confidence: 'High' },
        { pattern: '{first}.{last}@google.com', example: 'satya.thota@google.com', confidence: 'High' },
        { pattern: '{firstInitial}{last}@google.com', example: 'sthota@google.com', confidence: 'Medium' },
      ],
    },
    microsoft: {
      domain: 'microsoft.com',
      patterns: [
        { pattern: '{first}.{last}@microsoft.com', example: 'satya.nadella@microsoft.com', confidence: 'High' },
        { pattern: '{firstInitial}{last}@microsoft.com', example: 'snadella@microsoft.com', confidence: 'High' },
      ],
    },
    swiggy: {
      domain: 'swiggy.in',
      patterns: [
        { pattern: '{first}.{last}@swiggy.in', example: 'satya.thota@swiggy.in', confidence: 'High' },
        { pattern: '{first}@swiggy.in', example: 'satya@swiggy.in', confidence: 'Medium' },
      ],
    },
    deloitte: {
      domain: 'deloitte.com',
      patterns: [
        { pattern: '{firstInitial}{last}@deloitte.com', example: 'sthota@deloitte.com', confidence: 'High' },
        { pattern: '{first}.{last}@deloitte.com', example: 'satya.thota@deloitte.com', confidence: 'High' },
      ],
    },
    razorpay: {
      domain: 'razorpay.com',
      patterns: [
        { pattern: '{first}.{last}@razorpay.com', example: 'satya.thota@razorpay.com', confidence: 'High' },
        { pattern: '{first}@razorpay.com', example: 'satya@razorpay.com', confidence: 'High' },
      ],
    },
    flipkart: {
      domain: 'flipkart.com',
      patterns: [
        { pattern: '{first}.{last}@flipkart.com', example: 'satya.thota@flipkart.com', confidence: 'High' },
        { pattern: '{first}{lastInitial}@flipkart.com', example: 'satyat@flipkart.com', confidence: 'Medium' },
      ],
    },
    zoho: {
      domain: 'zohocorp.com',
      patterns: [
        { pattern: '{first}.{last}@zohocorp.com', example: 'satya.thota@zohocorp.com', confidence: 'High' },
        { pattern: '{first}@zohocorp.com', example: 'satya@zohocorp.com', confidence: 'Medium' },
      ],
    },
  };

  for (const [key, val] of Object.entries(knownDomains)) {
    if (cleanComp.includes(key)) {
      return {
        domain: val.domain,
        patterns: val.patterns.map((p) => ({ ...p, domain: val.domain })),
      };
    }
  }

  // Fallback domain prediction
  const domain = domainGuess || `${cleanComp}.com`;
  return {
    domain,
    patterns: [
      { pattern: '{first}.{last}@' + domain, example: 'satya.thota@' + domain, confidence: 'Medium', domain },
      { pattern: '{first}@' + domain, example: 'satya@' + domain, confidence: 'Medium', domain },
      { pattern: '{firstInitial}{last}@' + domain, example: 'sthota@' + domain, confidence: 'Estimated', domain },
    ],
  };
}

/**
 * Generates an automated 3-Step Follow-Up Outreach Cadence Sequence.
 */
export function generateOutreachSuite(job: IJob, profile: IProfile): IColdOutreachSuite {
  const { domain, patterns } = predictCorporateEmailPatterns(job.companyName);

  const firstName = profile.name ? profile.name.split(' ')[0] : 'Candidate';
  const role = job.jobTitle;
  const company = job.companyName;
  const topSkill = (job.skillsRequired && job.skillsRequired[0]) || 'Full Stack Development';

  const cadenceSequence: ICadenceStep[] = [
    {
      stepNumber: 1,
      dayLabel: 'Day 1 — The Concise Value Pitch',
      triggerCondition: 'Immediate application or cold outreach',
      channel: 'Email',
      subject: `Application & Quick Introduction: ${role} — ${profile.name}`,
      body: `Hi [Hiring Manager / Tech Lead],\n\nI recently came across the ${role} opening at ${company} and wanted to reach out directly. As a Full Stack Engineer with strong expertise in ${topSkill} and modern web architecture, I recently built high-concurrency platforms including AUSVMS and Guard Hub.\n\nGiven ${company}'s scale and engineering standards, I would love the opportunity to contribute. I have attached my ATS resume and portfolio (${profile.portfolio || 'GitHub: ' + profile.github}) for your review.\n\nBest regards,\n${profile.name}\n${profile.phone} | ${profile.linkedin}`,
    },
    {
      stepNumber: 2,
      dayLabel: 'Day 4 — The Engineering Value-Add Bump',
      triggerCondition: 'No response after 3 business days',
      channel: 'Email',
      subject: `Re: Application & Quick Introduction: ${role} — ${profile.name}`,
      body: `Hi [Hiring Manager],\n\nI wanted to briefly follow up on my note from earlier this week regarding the ${role} role. In the meantime, I reviewed ${company}'s tech stack and put together a quick architecture note on how I approach scalable REST APIs and state synchronization using ${topSkill}.\n\nI understand you are busy, but would appreciate 5 minutes to connect if you are interviewing candidates for this team.\n\nThanks,\n${firstName}`,
    },
    {
      stepNumber: 3,
      dayLabel: 'Day 9 — The Graceful Keep-in-Touch Close',
      triggerCondition: 'No response after 8-10 days',
      channel: 'Email',
      subject: `Final follow-up: ${role} — ${profile.name}`,
      body: `Hi [Hiring Manager],\n\nI realize you may be moving forward with other candidates for the ${role} position or have closed the requisition. No problem at all!\n\nI will keep following ${company}'s engineering milestones. If any new openings open up in the future for ${topSkill} developers, I would love to be kept in mind.\n\nThanks again,\n${profile.name}\n${profile.linkedin}`,
    },
  ];

  const linkedInNotes = {
    connectionRequestNote300Char: `Hi [Name], I'm an MCA Full Stack Dev specializing in ${topSkill}. I noticed your work at ${company} and recently applied for the ${role} position. Would love to connect and follow your team's engineering updates!`,
    recruiterDirectPitch: `Hi [Recruiter Name], I hope you're having a great week! I recently submitted my application for ${role} (Ref: ${company} Careers). With a 95%+ stack match in ${job.skillsRequired.slice(0, 3).join(', ')} and production projects in React & Node.js, I would love to know if you are actively scheduling introductory screens. Thanks!`,
    alumniWarmIntroduction: `Hi [Alumni Name]! Hope you're doing well. As a fellow student/alumni, I saw you're working as [Role] at ${company}. I'm preparing to interview for the ${role} role and would love 5 minutes to learn about your experience and engineering culture at ${company}!`,
  };

  return {
    companyDomain: domain,
    emailPatterns: patterns,
    cadenceSequence,
    linkedInNotes,
  };
}
