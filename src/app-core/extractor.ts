import { normalizeUnicodeText } from './noiseFilter';

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

const KNOWN_COMPANIES = [
  'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Uber', 'Swiggy', 'Zomato', 'Razorpay',
  'Infosys', 'TCS', 'Wipro', 'Cognizant', 'Accenture', 'HCLTech', 'NTT DATA', 'Deloitte', 'Capgemini',
  'Goldman Sachs', 'JPMorgan', 'Morgan Stanley', 'Walmart', 'Flipkart', 'Cisco', 'Adobe', 'Paytm',
  'PhonePe', 'Cred', 'Zoho', 'Jio', 'Tech Mahindra', 'Oracle', 'Salesforce', 'ServiceNow', 'Target',
  'Siemens', 'SAP', 'Genpact', 'Concentrix', 'Teleperformance', 'WNS', 'EXL', 'CDK Global', 'KLA',
  'FedEx', 'HARMAN', 'Peroptyx', 'Xpentra', 'SuperKalam', 'Thermo Fisher', 'VIAVI', 'HPE', 'Labcorp',
  'FRND', 'DarkRange', 'Amura', 'Capital Engineering', 'Nagarro'
];

const KNOWN_TECH_SKILLS = [
  'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL',
  'SQL', 'Python', 'Java', 'C++', 'C#', 'HTML', 'CSS', 'Tailwind', 'REST APIs', 'GraphQL',
  'Git', 'Docker', 'AWS', 'Azure', 'Redux', 'Data Structures', 'Algorithms', 'Microservices',
  'Full Stack', 'MERN', 'Spring Boot', 'Django', 'FastAPI', 'Linux', 'Unit Testing', 'React Native'
];

const KNOWN_NON_TECH_SKILLS = [
  'Customer Support', 'Customer Service', 'Voice Support', 'Non-Voice Support', 'CRM', 'Zendesk',
  'Ticketing', 'Email Support', 'Chat Support', 'Communication Skills', 'Problem Solving',
  'Excel', 'Data Entry', 'Operations', 'Client Handling', 'Escalation Management', 'Sales',
  'Lead Generation', 'Quality Assurance', 'Technical Support', 'Troubleshooting'
];

// Domains that should NEVER be treated as the job application link
const SPAM_PROMO_DOMAINS = [
  't.me', 'telegram.me', 'telegram.dog', 'whatsapp.com', 'chat.whatsapp.com',
  'instagram.com', 'facebook.com', 'fb.com', 'youtube.com', 'youtu.be',
  'twitter.com', 'x.com', 'threads.net', 'linkedin.com/in/', 'linkedin.com/company/',
  'linkedin.com/school/', 'play.google.com', 'apps.apple.com'
];

// Domains that are definitive job application portals
const CAREER_ATS_DOMAINS = [
  'amazon.jobs', 'careers.', 'jobs.', 'myworkdayjobs.com', 'greenhouse.io', 'lever.co',
  'taleo.net', 'workable.com', 'naukri.com', 'internshala.com', 'wellfound.com',
  'smartrecruiters.com', 'icims.com', 'darwinbox.in', 'linkedin.com/jobs/view',
  'ashbyhq.com', 'workday.com', 'rippling-ats.com', 'bamboohr.com', 'freshteam.com'
];

export const KNOWN_CAREER_PORTALS: Record<string, string> = {
  'Google': 'https://careers.google.com/',
  'Microsoft': 'https://careers.microsoft.com/',
  'Amazon': 'https://amazon.jobs/',
  'Apple': 'https://jobs.apple.com/',
  'Meta': 'https://metacareers.com/',
  'Netflix': 'https://jobs.netflix.com/',
  'Uber': 'https://uber.com/careers',
  'Swiggy': 'https://careers.swiggy.com/',
  'Zomato': 'https://zomato.com/careers',
  'Razorpay': 'https://razorpay.com/jobs/',
  'Infosys': 'https://infosys.com/careers',
  'TCS': 'https://tcs.com/careers',
  'Wipro': 'https://careers.wipro.com/',
  'Cognizant': 'https://careers.cognizant.com/',
  'Accenture': 'https://accenture.com/careers',
  'HCLTech': 'https://hcltech.com/careers',
  'Deloitte': 'https://jobs2.deloitte.com/',
  'Capgemini': 'https://capgemini.com/careers',
  'Goldman Sachs': 'https://goldmansachs.com/careers',
  'JPMorgan': 'https://careers.jpmorgan.com/',
  'Morgan Stanley': 'https://morganstanley.com/careers',
  'Walmart': 'https://careers.walmart.com/',
  'Flipkart': 'https://flipkartcareers.com/',
  'Cisco': 'https://jobs.cisco.com/',
  'Adobe': 'https://adobe.com/careers',
  'Paytm': 'https://paytm.com/careers',
  'PhonePe': 'https://phonepe.com/careers',
  'Cred': 'https://cred.club/careers',
  'Zoho': 'https://zoho.com/careers',
  'Jio': 'https://careers.jio.com/',
  'Tech Mahindra': 'https://careers.techmahindra.com/',
  'Oracle': 'https://oracle.com/careers',
  'Salesforce': 'https://salesforce.com/careers',
  'ServiceNow': 'https://careers.servicenow.com/',
};

/**
 * Resolves the official career portal for a company.
 */
export function getCompanyCareerPortal(companyName: string, applicationLink?: string | null): string {
  if (!companyName) return 'https://www.linkedin.com/jobs';

  for (const [known, url] of Object.entries(KNOWN_CAREER_PORTALS)) {
    if (companyName.toLowerCase().includes(known.toLowerCase())) {
      return url;
    }
  }

  if (applicationLink && (applicationLink.startsWith('http://') || applicationLink.startsWith('https://'))) {
    try {
      const parsed = new URL(applicationLink);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch {}
  }

  const cleanComp = encodeURIComponent(companyName.replace(/[^a-zA-Z0-9\s]/g, '').trim());
  return `https://www.linkedin.com/jobs/search/?keywords=${cleanComp}`;
}

/**
 * Extracts clean, authentic application link from job posting text,
 * filtering out social media promotions and channel join links.
 */
export function extractValidApplicationLink(text: string, defaultUrl?: string | null): string | null {
  if (!text) return defaultUrl || null;

  // 1. Check for explicit application link patterns (e.g. "Apply Link: https://...", "Apply @ https://...")
  const explicitApplyPatterns = [
    /(?:Apply\s*(?:Link|Here|Online|@|Now|URL)?|Registration\s*(?:Link|URL)?|Application\s*Link|Job\s*Link|Apply:)\s*[:=-]?\s*(https?:\/\/[^\s\)\>\]\*]+)/i,
    /(?:Link|URL)\s*:\s*(https?:\/\/[^\s\)\>\]\*]+)/i,
  ];

  for (const pat of explicitApplyPatterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      const cleanUrl = m[1].replace(/[\.\,\;\)\]\*]+$/, '');
      const isSpam = SPAM_PROMO_DOMAINS.some((spam) => cleanUrl.toLowerCase().includes(spam));
      if (!isSpam) {
        return cleanUrl;
      }
    }
  }

  // 2. Find all URLs in the text
  const allUrls = text.match(/https?:\/\/[^\s\)\>\]\*]+/g) || [];
  const cleanUrls = allUrls
    .map((u) => u.replace(/[\.\,\;\)\]\*]+$/, ''))
    .filter((u) => !SPAM_PROMO_DOMAINS.some((spam) => u.toLowerCase().includes(spam)));

  if (cleanUrls.length === 0) {
    return defaultUrl || null;
  }

  // 3. Priority: check if any URL matches known Career / ATS domains
  const atsUrl = cleanUrls.find((u) =>
    CAREER_ATS_DOMAINS.some((domain) => u.toLowerCase().includes(domain))
  );
  if (atsUrl) {
    return atsUrl;
  }

  // 4. Return the first non-spam URL
  return cleanUrls[0] || defaultUrl || null;
}

/**
 * High-precision heuristic & regex extractor for job postings across ALL industries.
 */
export function extractJobDetails(rawText: string, sourceUrl?: string): IExtractedJD {
  const normalizedRaw = normalizeUnicodeText(rawText || '');
  // Strip HTML tags and entities for clean parsing
  const text = normalizedRaw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();

  // Validate input contains actual readable alphanumeric text
  const alphanumericOnly = text.replace(/[^a-zA-Z0-9]/g, '');
  if (!text || alphanumericOnly.length < 10) {
    throw new Error('Unable to extract job details: Input is empty, contains only emojis/symbols, or lacks substantive job posting content.');
  }

  // Validate that the text actually contains job-relevant content
  const hasJobKeywords = /(?:hiring|recruiting|opening|job|role|position|developer|engineer|intern|analyst|trainee|fresher|salary|ctc|lpa|experience|apply|skills?|responsibilities|qualifications|requirements|batch|passout|customer\s*service|support|operations|associate)\b/i.test(text);
  const hasTechSkills = KNOWN_TECH_SKILLS.some((s) => new RegExp(`\\b${s.replace('+', '\\+')}\\b`, 'i').test(text));
  const hasNonTechSkills = KNOWN_NON_TECH_SKILLS.some((s) => new RegExp(`\\b${s.replace('+', '\\+')}\\b`, 'i').test(text));
  const hasKnownCompany = KNOWN_COMPANIES.some((kc) => new RegExp(`\\b${kc.replace(/\s+/g, '\\s+')}\\b`, 'i').test(text));

  if (!hasJobKeywords && !hasTechSkills && !hasNonTechSkills && !hasKnownCompany) {
    throw new Error('Unable to extract job details: Input lacks job-related keywords, skills, or company information.');
  }

  let companyName = '';
  let jobTitle = '';
  let location: string | null = null;
  let experienceRequired: string | null = null;
  let ctcRange: string | null = null;
  const skills: string[] = [];

  // ── 0. Check Explicit Position/Role Patterns (Highest Precedence) ──
  const explicitTitlePatterns = [
    /(?:Role|Job Role|Position|Designation|Job Profile|Profile|Job Title|Title|Opening For):\s*[\*_]*([^\n\*_]+)/i,
    /\*Role:\*\s*([^\n\*_]+)/i,
    /Hiring\s+for\s+(?:the\s+role\s+of\s+)?[\*_]*([^\n\*_]+)/i,
    /Looking\s+for\s+[\*_]*([^\n\*_]+)/i,
  ];

  for (const pattern of explicitTitlePatterns) {
    const m = text.match(pattern);
    if (m) {
      const candidate = m[1].replace(/[*_👉💼🔥📍💰🎓]/g, '').trim();
      const cleanCandidate = candidate.split(/\s*[-–|•]\s*(?:Location|Salary|Experience|Batch)/i)[0].trim();
      if (cleanCandidate.length > 2 && cleanCandidate.length < 75) {
        jobTitle = cleanCandidate;
        break;
      }
    }
  }

  // ── 1. High-Priority Pattern Match: "*1. Company — Role*" or "*Company — Role*" ──
  const listDashMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?(?:\d+[\.\)]\s*)?([A-Za-z0-9\s&.,'-]{2,35}?)\s*[-—–|•]\s*([^\n\*_]+)/i);
  if (listDashMatch) {
    const candidateComp = listDashMatch[1].replace(/[*_🔥💼📅👉🧑‍💻🎓]/g, '').trim();
    const candidateRole = listDashMatch[2].replace(/[*_🔥💼📅👉🧑‍💻🎓]/g, '').trim();
    const genericWords = ['job', 'role', 'apply', 'recruitment', 'hiring', 'freshers', 'urgent', 'alert', 'top', 'mega', 'offcampus'];
    if (candidateComp.length > 1 && !genericWords.some((g) => candidateComp.toLowerCase().startsWith(g))) {
      companyName = candidateComp;
    }
    if (!jobTitle && candidateRole.length > 2 && candidateRole.length < 80) {
      const cleanRole = candidateRole.split(/\s*[-–|•]\s*(?:Location|Salary|Experience|Batch)/i)[0].trim();
      if (!['internship', 'hiring', 'recruitment', 'careers', 'drive', 'alert', 'openings'].includes(cleanRole.toLowerCase().replace(/[^a-z]/g, ''))) {
        jobTitle = cleanRole;
      }
    }
  }

  // ── 2. Extract Company Name (if not resolved by list dash match) ──
  if (!companyName) {
    const companyPatterns = [
      /(?:^|\n)\s*(?:[🚀🚨📌🔥⭐]\s*)?([A-Za-z0-9\s&.,'-]{2,35}?)\s+Hiring\s+(?:Freshers\s+for|for)\s+([^\n\*_]+)/i,
      /\*([A-Za-z0-9\s&.,-]+?)\s+(?:Recruitment|Hiring|Walkin|Walk.?in|Campus|Selection|Drive|Offcampus|Mega\s*Drive)\b/i,
      /(?:Company|Organization|Employer):\s*[\*_]*([A-Za-z0-9\s&.,-]+?)[\*_]*\s*(?:\n|$)/i,
      /(?:hiring|recruiting|opening)\s+at\s+([A-Za-z0-9\s&.,-]+)/i,
      /^[\*_]+([A-Za-z0-9][A-Za-z0-9\s&.,'-]{1,35}?)[\*_]+/im,
      /\b([A-Za-z0-9]{2,}(?:\s[A-Za-z0-9]{2,}){0,2})\s+is\s+(?:actively\s+)?(?:hiring|recruiting)/i,
    ];

    for (const pattern of companyPatterns) {
      const m = text.match(pattern);
      if (m) {
        const candidate = m[1].replace(/[*_🔥💼📅👉🧑‍💻🎓]/g, '').trim();
        const genericWords = ['job', 'role', 'apply', 'recruitment', 'hiring', 'freshers', 'urgent', 'alert', 'top', 'mega', 'offcampus'];
        if (candidate.length > 1 && candidate.length < 50 && !genericWords.some((g) => candidate.toLowerCase().startsWith(g))) {
          companyName = candidate;
          if (m[2] && !jobTitle) {
            const roleCandidate = m[2].replace(/[*_🔥💼📅👉🧑‍💻🎓]/g, '').trim();
            if (roleCandidate.length > 2 && roleCandidate.length < 80) {
              jobTitle = roleCandidate.split(/\s*[-–|•]\s*(?:Location|Salary|Experience|Batch)/i)[0].trim();
            }
          }
          break;
        }
      }
    }
  }

  // Known company lookup fallback
  if (!companyName || companyName.toLowerCase().includes('job') || companyName.length < 2) {
    for (const kc of KNOWN_COMPANIES) {
      if (new RegExp(`\\b${kc.replace(/\s+/g, '\\s+')}\\b`, 'i').test(text)) {
        companyName = kc;
        break;
      }
    }
  }

  // URL fallback for company name
  if (!companyName || companyName === 'Hiring Company') {
    const urlMatch = text.match(/https?:\/\/(?:www\.)?[^\/\s]+\/([a-z0-9-]+)(?:-careers|-recruitment|-off-campus|-drive|-hiring|-internship|-jobs)/i);
    if (urlMatch && urlMatch[1]) {
      const rawSlug = urlMatch[1].replace(/[-_]+/g, ' ').trim();
      if (rawSlug.length > 2 && rawSlug.length < 30) {
        companyName = rawSlug.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }

  if (companyName) {
    companyName = companyName.replace(/\s*(?:Careers|Jobs|Hiring Portal|Off Campus)\s*$/i, '').trim();
  }

  if (!companyName) {
    companyName = 'Hiring Company';
  }

  // Regex pattern matching for diverse roles (Customer Support, Operations, QA, SDE, etc.)
  if (!jobTitle) {
    const broadRolePatterns = [
      /\b(Customer\s*Service\s*(?:Associate|Representative|Executive|Specialist|Lead)?|Customer\s*Support\s*(?:Associate|Executive|Representative)?|Client\s*Support\s*Executive|Voice\s*Process\s*(?:Executive|Associate)?|Non-Voice\s*Process\s*Associate|Technical\s*Support\s*(?:Engineer|Executive|Associate)|Helpdesk\s*Analyst|BPO\s*Executive|Operations\s*(?:Executive|Associate|Analyst)|Business\s*Analyst|Data\s*Analyst|Quality\s*Analyst|Associate\s*Analyst|Software\s*Development\s*Engineer(?:\s*-\s*[I|II|III|1|2|3])?|Software\s*Engineer(?:,\s*Intern)?|Full\s*Stack\s*Developer|Frontend\s*Developer|Backend\s*Developer|MERN\s*Stack\s*Developer|Java\s*Developer|Python\s*Developer|Web\s*Developer|Associate\s*Software\s*Engineer|Graduate\s*Trainee|Graduate\s*Engineer\s*Trainee|Systems\s*Engineer|System\s*Engineer|QA\s*Engineer|Associate\s*Quality\s*Engineer|React\s*Native\s*Developer|Custom\s*Software\s*Engineering\s*Associate)\b/i,
    ];

    for (const pattern of broadRolePatterns) {
      const m = text.match(pattern);
      if (m) {
        jobTitle = m[1].trim();
        break;
      }
    }
  }

  if (jobTitle && jobTitle.includes('|')) {
    const parts = jobTitle.split('|').map((p) => p.trim());
    // Strip company name and common suffixes from parts
    const sanitizedParts = parts.map((p) =>
      p.replace(/\s*(?:Jobs\s*at|Careers\s*at|Hiring\s*at|at)\s+.*$/i, '')
       .replace(/\s*(?:Jobs|Careers|Hiring Portal|Off Campus)\s*$/i, '')
       .trim()
    ).filter((p) => p.length > 2);

    // Pick the most descriptive title (avoid pure marketing slogans like 'Hiring AI Talent')
    const engineeringTitle = sanitizedParts.find((p) => !/^(?:hiring|we are hiring|apply now|careers|join us)/i.test(p));
    jobTitle = engineeringTitle || sanitizedParts[0] || parts[0];
  }

  if (jobTitle) {
    jobTitle = jobTitle
      .replace(/\s*(?:Jobs\s*at|Careers\s*at|Hiring\s*at|at)\s+.*$/i, '')
      .replace(/\s*(?:Jobs|Careers|Hiring Portal|Off Campus)\s*$/i, '')
      .trim();
  }

  // Fallback title from company header if available
  if (!jobTitle) {
    const headerTitleMatch = text.match(/\*([A-Za-z0-9\s&.,-]+?)\s+(?:Hiring|Recruitment|Walkin|Drive)\b/i);
    if (headerTitleMatch && !headerTitleMatch[1].toLowerCase().includes(companyName.toLowerCase())) {
      jobTitle = headerTitleMatch[1].trim();
    }
  }

  if (!jobTitle) {
    jobTitle = 'Associate / Professional';
  }

  // ── 3. Extract Location ──
  const locPatterns = [
    /(?:Location|Locations|Job Location|Work Location|Place):\s*[\*_]*([^\n\*_]+)/i,
    /\b(Hyderabad|Bengaluru|Bangalore|Pune|Chennai|Noida|Gurgaon|Gurugram|Mumbai|Delhi|Kolkata|Kochi|Coimbatore|Bhimavaram|Vijayawada|Visakhapatnam|Vizag|Pan India|Remote|Work from Home|WFH)\b/i,
  ];

  for (const pattern of locPatterns) {
    const m = text.match(pattern);
    if (m) {
      location = m[1].replace(/[*_📍]/g, '').replace(/\s+/g, ' ').trim();
      break;
    }
  }
  if (!location) location = 'India / Remote';

  // ── 4. Extract Clean Application Link (Anti-Spam & Career-ATS Priority) ──
  const applicationLink = extractValidApplicationLink(text, sourceUrl);

  // ── 5. Extract Experience / Batch ──
  const expPatterns = [
    /(?:Experience|Exp|Eligibility|Graduation Year|Grad Year|Batch|Passout Year|Target Batch):\s*[\*_]*([^\n\*_]+)/i,
    /\b(Fresher|Freshers|0\s*-\s*[12345]\s*years?|(?:2024|2025|2026)(?:\s*[\/\,\-]\s*(?:2024|2025|2026))*\s*(?:batch|passout)?)\b/i,
  ];
  for (const pattern of expPatterns) {
    const m = text.match(pattern);
    if (m) {
      experienceRequired = m[1].replace(/[*_🎓]/g, '').trim();
      break;
    }
  }
  if (!experienceRequired) experienceRequired = 'Fresher / 0-2 Years Eligible';

  // ── 6. Extract CTC / Salary ──
  const ctcPatterns = [
    /(?:Salary|CTC|Package|Compensation):\s*[\*_]*([^\n\*_]+)/i,
    /\b(₹?\s*\d+(?:\.\d+)?\s*(?:-\s*\d+(?:\.\d+)?)?\s*(?:LPA|Lakhs?|k|Per Month|PM))\b/i,
  ];
  for (const pattern of ctcPatterns) {
    const m = text.match(pattern);
    if (m) {
      ctcRange = m[1].replace(/[*_💰]/g, '').trim();
      break;
    }
  }

  // ── 7. Extract Skills (Tech + Non-Tech) ──
  for (const skill of KNOWN_TECH_SKILLS) {
    const regex = new RegExp(`\\b${skill.replace('+', '\\+')}\\b`, 'i');
    if (regex.test(text)) {
      skills.push(skill);
    }
  }

  for (const skill of KNOWN_NON_TECH_SKILLS) {
    const regex = new RegExp(`\\b${skill.replace('+', '\\+')}\\b`, 'i');
    if (regex.test(text) && !skills.includes(skill)) {
      skills.push(skill);
    }
  }

  // If no predefined skill found, derive from title
  if (skills.length === 0) {
    if (/customer|support|voice|bpo|call|service/i.test(jobTitle)) {
      skills.push('Customer Support', 'Communication', 'Problem Solving', 'CRM');
    } else if (/analyst|data/i.test(jobTitle)) {
      skills.push('Data Analysis', 'Excel', 'Problem Solving', 'Reporting');
    } else {
      skills.push('Communication', 'Problem Solving', 'Professional Skills');
    }
  }

  const isRemote = /remote|work from home|wfh/i.test(text + ' ' + (location || ''));

  // Resolve official company career portal URL
  const companyPageUrl = getCompanyCareerPortal(companyName, applicationLink);

  // Clean deduplication hash
  const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const dedupHash = `${cleanStr(companyName)}-${cleanStr(jobTitle)}-${cleanStr(location || '')}`;

  return {
    companyName,
    companyPageUrl,
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

/**
 * Primary AI-Native Extractor.
 * Extracts structured metadata using the multi-provider LLM gateway.
 */
export async function extractJobDetailsWithAi(
  rawText: string,
  profile?: any
): Promise<IExtractedJD> {
  const { llmClient } = await import('./llmClient');
  const aiRes = await llmClient.extractJobWithLlm(rawText, profile);
  if (aiRes.success && aiRes.data) {
    return aiRes.data;
  }
  throw new Error(aiRes.error || 'AI Structured Extraction failed.');
}

