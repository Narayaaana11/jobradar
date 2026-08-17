export interface IExtractedJD {
  companyName: string;
  companyPageUrl?: string | null;
  jobTitle: string;
  jobType?: string | null;
  location?: string | null;
  isRemote?: boolean | null;
  ctcMentioned: boolean;
  ctcRange?: string | null;
  applicationLink?: string | null;
  applicationDeadline?: string | null;
  skillsRequired: string[];
  experienceRequired?: string | null;
  rawDescription: string;
  dedupHash: string;
}

/**
 * High-precision heuristic & regex extractor for job postings
 */
export function extractJobDetails(rawText: string, sourceUrl?: string): IExtractedJD {
  const text = rawText.trim();
  let companyName = '';
  let jobTitle = '';
  let location: string | null = null;
  let applicationLink: string | null = sourceUrl || null;
  let experienceRequired: string | null = null;
  let ctcRange: string | null = null;
  const skills: string[] = [];

  // 1. Extract Company Name
  const companyPatterns = [
    /\*([A-Za-z0-9\s&.,-]+?)\s+(?:Recruitment|Hiring|Walkin|Walk.?in|Campus|Selection|Drive|Offcampus)\b/i,
    /Company:\s*[\*_]*([A-Za-z0-9\s&.,-]+?)[\*_]*\s*\n/i,
    /(?:hiring|recruiting)\s+at\s+([A-Za-z0-9\s&.,-]+)/i,
    /^[\*_]+([A-Za-z0-9][A-Za-z0-9\s&.,'-]{1,35}?)[\*_]+/im,
    /\b([A-Za-z0-9]{2,}(?:\s[A-Za-z0-9]{2,}){0,2})\s+is\s+hiring/i,
  ];

  for (const pattern of companyPatterns) {
    const m = text.match(pattern);
    if (m) {
      const candidate = m[1].replace(/[*_🔥💼📅👉🧑‍💻🎓]/g, '').trim();
      const genericWords = ['job', 'role', 'apply', 'recruitment', 'hiring', 'freshers', 'urgent', 'alert', 'top'];
      if (candidate.length > 1 && candidate.length < 50 && !genericWords.some((g) => candidate.toLowerCase().startsWith(g))) {
        companyName = candidate;
        break;
      }
    }
  }

  // Known company lookup fallback
  if (!companyName || companyName.toLowerCase().includes('job') || companyName.length < 2) {
    const knownCompanies = [
      'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Uber', 'Swiggy', 'Zomato', 'Razorpay',
      'Infosys', 'TCS', 'Wipro', 'Cognizant', 'Accenture', 'HCLTech', 'NTT DATA', 'Deloitte', 'Capgemini',
      'Oracle', 'Salesforce', 'ServiceNow', 'Cisco', 'Adobe', 'Paytm', 'PhonePe', 'Cred', 'Zoho', 'Jio', 'Tech Mahindra'
    ];
    for (const kc of knownCompanies) {
      if (new RegExp(`\\b${kc}\\b`, 'i').test(text)) {
        companyName = kc;
        break;
      }
    }
  }

  if (!companyName) {
    companyName = 'Tech Company';
  }

  // 2. Extract Job Title / Role
  const titlePatterns = [
    /(?:Role|Job Role|Position|Designation|Profile|Title):\s*[\*_]*([^\n\*_]+)/i,
    /\*Role:\*\s*([^\n\*_]+)/i,
    /Hiring\s+for\s+[\*_]*([^\n\*_]+)/i,
    /Looking\s+for\s+[\*_]*([^\n\*_]+)/i,
    /\b(Software Engineer|Full Stack Developer|Frontend Developer|Backend Developer|MERN Stack Developer|SDE|Software Development Engineer|React Developer|Node Developer|Web Developer|Associate Software Engineer|Graduate Trainee|Java Developer|Python Developer)\b/i,
  ];

  for (const pattern of titlePatterns) {
    const m = text.match(pattern);
    if (m) {
      const candidate = m[1].replace(/[*_👉💼🔥]/g, '').trim();
      if (candidate.length > 2 && candidate.length < 70) {
        jobTitle = candidate;
        break;
      }
    }
  }

  if (!jobTitle) {
    jobTitle = 'Software Engineer / Developer';
  }

  // 3. Extract Location
  const locPatterns = [
    /(?:Location|Job Location|Work Location):\s*[\*_]*([^\n\*_]+)/i,
    /\b(Hyderabad|Bengaluru|Bangalore|Pune|Chennai|Noida|Gurgaon|Gurugram|Mumbai|Delhi|Kolkata|Kochi|Coimbatore|Pan India|Remote|Work from Home|WFH)\b/i,
  ];

  for (const pattern of locPatterns) {
    const m = text.match(pattern);
    if (m) {
      location = m[1].replace(/[*_📍]/g, '').trim();
      break;
    }
  }
  if (!location) location = 'Hyderabad / Pan India';

  // 4. Extract Application Link
  if (!applicationLink) {
    const urlMatches = text.match(/https?:\/\/[^\s\)\>\]\*]+/g);
    if (urlMatches && urlMatches.length > 0) {
      // Find the first link that is not a telegram channel promo if possible
      const applyUrl = urlMatches.find((u) => !u.includes('t.me') && !u.includes('whatsapp.com')) || urlMatches[0];
      applicationLink = applyUrl.replace(/[\.\,\;]$/, '');
    }
  }

  // 5. Extract Experience
  const expPatterns = [
    /(?:Experience|Exp|Eligibility):\s*[\*_]*([^\n\*_]+)/i,
    /\b(Fresher|Freshers|0\s*-\s*[123]\s*years?|2024|2025|2026\s*batch)\b/i,
  ];
  for (const pattern of expPatterns) {
    const m = text.match(pattern);
    if (m) {
      experienceRequired = m[1].replace(/[*_🎓]/g, '').trim();
      break;
    }
  }
  if (!experienceRequired) experienceRequired = 'Fresher / 0-2 Years (MCA/B.Tech eligible)';

  // 6. Extract CTC / Salary
  const ctcPatterns = [
    /(?:Salary|CTC|Package):\s*[\*_]*([^\n\*_]+)/i,
    /\b(₹?\s*\d+(?:\.\d+)?\s*(?:-\s*\d+(?:\.\d+)?)?\s*(?:LPA|Lakhs?|k|Per Month))\b/i,
  ];
  for (const pattern of ctcPatterns) {
    const m = text.match(pattern);
    if (m) {
      ctcRange = m[1].replace(/[*_💰]/g, '').trim();
      break;
    }
  }

  // 7. Extract Skills
  const commonTechSkills = [
    'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL',
    'SQL', 'Python', 'Java', 'C++', 'C#', 'HTML', 'CSS', 'Tailwind', 'REST APIs', 'GraphQL',
    'Git', 'Docker', 'AWS', 'Azure', 'Redux', 'Data Structures', 'Algorithms', 'Microservices',
    'Full Stack', 'MERN', 'Spring Boot', 'Django', 'FastAPI', 'Linux', 'Unit Testing'
  ];

  for (const skill of commonTechSkills) {
    const regex = new RegExp(`\\b${skill.replace('+', '\\+')}\\b`, 'i');
    if (regex.test(text)) {
      skills.push(skill);
    }
  }
  if (skills.length === 0) {
    skills.push('JavaScript', 'React', 'Node.js', 'REST APIs');
  }

  const isRemote = /remote|work from home|wfh/i.test(text + ' ' + (location || ''));

  // Generate clean deduplication hash
  const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const dedupHash = `${cleanStr(companyName)}-${cleanStr(jobTitle)}-${cleanStr(location || '')}`;

  return {
    companyName,
    jobTitle,
    location,
    isRemote,
    ctcMentioned: Boolean(ctcRange),
    ctcRange: ctcRange || null,
    applicationLink: applicationLink || null,
    skillsRequired: skills,
    experienceRequired: experienceRequired || null,
    rawDescription: text,
    dedupHash,
  };
}
