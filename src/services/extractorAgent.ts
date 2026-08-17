import { llmService } from './llmService';

export interface IExtractedJD {
  companyName: string;
  companyPageUrl?: string | null;
  companySocialLinks?: string[];
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
}

function extractJsonBlock(text: string): string {
  // Try to find JSON block between ```json and ```
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) return jsonBlockMatch[1].trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

/**
 * Rule-based extractor for WhatsApp job message format.
 * Handles patterns like:
 *   *Google Recruitment 2026* 🔥
 *   💼 *Job Role:* Silicon Engineer
 *   👉 *Apply @* https://fvoice.site/google
 */
function ruleBasedExtractor(rawText: string, resolvedUrl?: string): IExtractedJD {
  let companyName = '';
  let jobTitle = '';
  let location: string | null = null;
  let applicationLink: string | null = null;
  let experienceRequired: string | null = null;
  let ctcRange: string | null = null;
  const skills: string[] = [];

  // 1. Extract Company Name - WhatsApp format: *Google Recruitment 2026*
  // Pattern: *CompanyName Recruitment/Hiring/Walkin Year*
  const companyPatterns = [
    /\*([A-Za-z0-9\s&.,-]+?)\s+(?:Recruitment|Hiring|Walkin|Walk.?in|Campus|Selection)\b/i,
    /^\s*[\*_]*([A-Za-z0-9\s&.,-]{2,40}?)\s+(?:Recruitment|Hiring)\b/im,
    /Company:\s*[\*_]*([A-Za-z0-9\s&.,-]+?)[\*_]*\s*\n/i,
    /(?:hiring|recruiting)\s+at\s+([A-Za-z0-9\s&.,-]+)/i,
    /\b([A-Za-z0-9]{2,}(?:\s[A-Za-z0-9]{2,}){0,3})\s+(?:is\s+)?(?:hiring|recruiting)/i,
    // Broad WhatsApp header match: any bold/asterisk-wrapped company name at start of line
    /^[\*_]+([A-Za-z0-9][A-Za-z0-9\s&.,'-]{1,40}?)[\*_]+/im,
  ];

  for (const pattern of companyPatterns) {
    const m = rawText.match(pattern);
    if (m) {
      const candidate = m[1].replace(/[*_🔥💼📅👉🧑‍💻🎓]/g, '').trim();
      // Filter out generic words
      const genericWords = ['job', 'role', 'apply', 'recruitment', 'hiring', 'walkin', 'freshers'];
      if (candidate.length > 2 && candidate.length < 60 && !genericWords.some(g => candidate.toLowerCase().startsWith(g))) {
        companyName = candidate;
        break;
      }
    }
  }

  // Fallback: look for first bold/asterisk word in the raw text 
  if (!companyName || companyName === 'Unknown Company') {
    const firstBoldMatch = rawText.match(/\*([A-Z][A-Za-z0-9\s&]{2,40}?)\s/);
    if (firstBoldMatch) {
      const w = firstBoldMatch[1].trim();
      const skip = ['Job', 'Role', 'Apply', 'Last', 'Date', 'Experience', 'Qualification', 'Freshers', 'Location'];
      if (!skip.includes(w)) companyName = w;
    }
  }

  // Also try from scraped content if available
  if ((!companyName || companyName === 'Unknown Company') && rawText.includes('[Scraped Target Page')) {
    const scrapedTitleMatch = rawText.match(/Title:\s*([A-Za-z0-9\s&.,-]+?)(?:\s+Recruitment|\s+Hiring|\s+is|\s+:|-|\||–)/i);
    if (scrapedTitleMatch) {
      const titleWords = scrapedTitleMatch[1].trim();
      if (titleWords && titleWords.length > 1 && titleWords.length < 50) companyName = titleWords;
    }
  }

  // Also try extracting company name from rawText or resolvedUrl if noisy/unknown
  if (!companyName || companyName === 'Unknown Company' || /see this job|learn more|we hire/i.test(companyName)) {
    const textLower = (rawText + ' ' + (resolvedUrl || '')).toLowerCase();
    const knownList = ['google', 'microsoft', 'amazon', 'infosys', 'tcs', 'wipro', 'cognizant', 'accenture', 'hcl', 'nttdata', 'deloitte', 'capgemini', 'oracle', 'salesforce'];
    for (const k of knownList) {
      if (textLower.includes(k)) {
        companyName = k === 'nttdata' ? 'NTT DATA' : k.charAt(0).toUpperCase() + k.slice(1);
        break;
      }
    }
  }

  // Clean trailing verbs & noise words from company name
  if (companyName) {
    companyName = companyName
      .replace(/\s+(?:is|has|are|was|hiring|recruiting|looking|hiring\s+for|for|careers)\s*$/i, '')
      .replace(/^[\*_:]+/, '')
      .trim();
  }

  // 2. Extract Job Role / Title
  const rolePatterns = [
    /(?:Job\s*Role|Role|Position|Title|Post|Designation)\s*[:*]+\s*[\*_]*([^\n*_]+)/i,
    /💼\s*\*?Job\s*Role:\*?\s*([^\n*]+)/i,
    /(?:vacancy|opening|hiring\s+for)\s+(?:the\s+)?(?:position\s+of\s+)?([A-Za-z\s/&]+?)(?:\s+at\s|\s+for\s|\n|$)/i,
  ];

  for (const pattern of rolePatterns) {
    const m = rawText.match(pattern);
    if (m) {
      const candidate = m[1].replace(/[*_]/g, '').trim();
      const genericNoise = ['details', 'details:', 'info', 'overview', 'summary', 'about', 'table of contents', 'asap'];
      if (candidate.length > 2 && candidate.length < 70 && !genericNoise.includes(candidate.toLowerCase())) {
        jobTitle = candidate;
        break;
      }
    }
  }
  
  // Fallback for Accenture / Specific Role Patterns
  const projectRoleMatch = rawText.match(/(?:Project Role|Role Description|Title)\s*:\s*([^\n\r|*_]+)/i);
  if (projectRoleMatch && (!jobTitle || jobTitle.toLowerCase().includes('search jobs'))) {
    jobTitle = projectRoleMatch[1].replace(/[*_]/g, '').trim();
  }

  // 3. Extract Application Link
  // 3a. Check for official direct ATS / Corporate portal URLs (e.g. google.com/about/careers, careers.google.com, myworkdayjobs, lever, greenhouse, etc.)
  const officialAtsPattern = /(https?:\/\/(?:[a-z0-9-]+\.)*(?:careers\.google\.com|google\.com\/about\/careers|google\.com\/careers|amazon\.jobs|myworkdayjobs\.com|lever\.co|greenhouse\.io|naukri\.com|taleo\.net|icims\.com|jobvite\.com|smartrecruiters\.com|careers\.microsoft\.com|oracle\.com\/careers|jobs\.[a-z0-9-]+\.[a-z]{2,}|careers\.[a-z0-9-]+\.[a-z]{2,})[^\s\n<>'"]+)/i;
  const officialMatch = rawText.match(officialAtsPattern);

  const directApplyMatch = rawText.match(/\[Found Direct Apply Link\]:\s*(https?:\/\/[^\s\n]+)/i);

  if (officialMatch) {
    applicationLink = officialMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  } else if (directApplyMatch) {
    applicationLink = directApplyMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  } else if (resolvedUrl && resolvedUrl.startsWith('http')) {
    applicationLink = resolvedUrl.replace(/&amp;/g, '&').trim();
  } else {
    const applyMatch = rawText.match(/(?:Apply\s*[@:*]*|Apply\s+at\s*[:*]*|👉[^h]*)(https?:\/\/[^\s\n]+)/i);
    if (applyMatch) {
      applicationLink = applyMatch[1].replace(/&amp;/g, '&').trim();
    } else {
      const urlMatch = rawText.match(/(https?:\/\/[^\s\n]+)/i);
      if (urlMatch) applicationLink = urlMatch[1].replace(/&amp;/g, '&').trim();
    }
  }

  // 4. Extract Location
  const locPatterns = [
    /(?:Location|Place|City|Based)\s*[:*]+\s*([^\n*_]+)/i,
    /📍\s*([^\n*_]+)/i,
    /@\s+([A-Za-z,\s]+?)(?:\s|$|\n)/i,
  ];

  for (const pattern of locPatterns) {
    const m = rawText.match(pattern);
    if (m) {
      location = m[1].replace(/[*_🔥💼📅👉🧑‍💻🎓]/g, '').trim();
      if (location.length > 2) break;
    }
  }

  // Fallback location detection
  if (!location) {
    if (rawText.toLowerCase().includes('hyderabad')) location = 'Hyderabad';
    else if (rawText.toLowerCase().includes('bangalore') || rawText.toLowerCase().includes('bengaluru')) location = 'Bangalore';
    else if (rawText.toLowerCase().includes('noida')) location = 'Noida';
    else if (rawText.toLowerCase().includes('chennai')) location = 'Chennai';
    else if (rawText.toLowerCase().includes('pune')) location = 'Pune';
    else if (rawText.toLowerCase().includes('remote') || rawText.toLowerCase().includes('work from home')) location = 'Remote';
    else location = 'PAN India';
  }

  // 5. Extract Experience
  const expMatch = rawText.match(/(?:Experience|Exp)\s*[:*]+\s*[\*_]*([^\n*_]+)/i);
  if (expMatch) {
    experienceRequired = expMatch[1].replace(/[*_🔥💼📅👉🧑‍💻🎓]/g, '').trim();
  } else if (rawText.toLowerCase().includes('fresher')) {
    experienceRequired = 'Freshers / 0-1 Year';
  }

  // 6. Extract Technical Skills from JD
  const techKeywords = [
    'Verilog', 'SystemVerilog', 'System Verilog', 'SoC', 'ASIC', 'FPGA', 'Hardware', 'Electrical Engineering',
    'Embedded Systems', 'Digital Logic', 'Microcontrollers', 'C++', 'C', 'Python', 'Java', 'SQL',
    'JavaScript', 'TypeScript', 'React.js', 'React', 'Node.js', 'Express', 'MongoDB', 'AWS', 'S3',
    'Docker', 'Kubernetes', 'REST APIs', 'Git', 'Linux'
  ];

  for (const tech of techKeywords) {
    if (rawText.toLowerCase().includes(tech.toLowerCase())) {
      if (!skills.includes(tech)) skills.push(tech);
    }
  }

  // Filter out any degree noise from skills
  const degreeNoise = ['b.e', 'b.tech', 'mca', 'bca', 'b.sc', 'm.tech', 'graduation', 'degree', 'qualification', 'qualifications'];
  const cleanSkills = skills.filter(s => !degreeNoise.includes(s.toLowerCase().trim()));

  // Use the full rawText as the description (includes scraped content)
  const rawDescription = rawText.length > 200 ? rawText : `Job posting: ${jobTitle || 'Role'} at ${companyName || 'Company'}. ${rawText}`;

  return {
    companyName: companyName || 'Unknown Company',
    companyPageUrl: applicationLink,
    companySocialLinks: [],
    jobTitle: jobTitle || 'Software Engineer',
    jobType: rawText.toLowerCase().includes('walk') ? 'Walk-in Interview' : 'Full-time',
    location,
    isRemote: rawText.toLowerCase().includes('remote') || rawText.toLowerCase().includes('work from home'),
    ctcMentioned: Boolean(ctcRange),
    ctcRange: ctcRange || null,
    applicationLink,
    applicationDeadline: rawText.match(/(?:Last\s*Date|Deadline)\s*[:*]+\s*([^\n*_]+)/i)?.[1]?.replace(/[*_]/g, '').trim() || null,
    skillsRequired: cleanSkills.length > 0 ? cleanSkills : ['JavaScript', 'React.js', 'Node.js', 'Python', 'REST APIs'],
    experienceRequired: experienceRequired || 'Freshers / Experienced',
    rawDescription,
  };
}

/**
 * Extract structured job details from raw text (WhatsApp message + optional scraped page content).
 * Uses LLM with rule-based fallback.
 * @param rawText - The combined raw text (WhatsApp message + scraped URL content)
 * @param resolvedApplicationUrl - The final resolved URL after following redirects (for apply link)
 */
export async function extractJobDetails(rawText: string, resolvedApplicationUrl?: string): Promise<IExtractedJD> {
  const prompt = `You are an expert Job Description Extractor Agent. Extract structured JSON metadata from the raw job description provided below.

The input may be a WhatsApp job posting message (with emoji formatting like *Bold* and 💼 icons) or a scraped career page.

Raw Job Description:
"""
${rawText.slice(0, 4000)}
"""

${resolvedApplicationUrl ? `The actual job application URL (after following redirects) is: ${resolvedApplicationUrl}` : ''}

Return ONLY a valid JSON object with these exact fields:
{
  "companyName": "Google",
  "companyPageUrl": "${resolvedApplicationUrl || 'null'}",
  "companySocialLinks": [],
  "jobTitle": "Silicon Engineer / Systems Development Engineer",
  "jobType": "Full-time",
  "location": "Hyderabad / PAN India",
  "isRemote": false,
  "ctcMentioned": false,
  "ctcRange": null,
  "applicationLink": "${resolvedApplicationUrl || 'https://example.com/apply'}",
  "applicationDeadline": "ASAP",
  "skillsRequired": ["C++", "Systems Engineering", "Linux", "Hardware Design"],
  "experienceRequired": "Freshers / Experienced",
  "rawDescription": "Full job description text here including all scraped content"
}

CRITICAL RULES:
1. Extract the REAL company name (e.g. Google, NTT DATA, Infosys) — NOT "Target Company"
2. The applicationLink must be the resolved URL: ${resolvedApplicationUrl || 'extract from text'}
3. skillsRequired should list ALL technical skills mentioned in the JD
4. rawDescription should be the complete job description text (up to 2000 chars)
5. Do not hallucinate — only extract what is present in the text
`;

  try {
    const textContent = await llmService.completion(prompt, { model: 'sonnet', maxTokens: 2000 });
    const cleanedJson = extractJsonBlock(textContent);
    const result: IExtractedJD = JSON.parse(cleanedJson);

    const degreeNoise = ['b.e', 'b.tech', 'mca', 'bca', 'b.sc', 'm.tech', 'graduation', 'degree', 'qualification', 'qualifications'];
    const sanitizedSkills = (Array.isArray(result.skillsRequired) ? result.skillsRequired : [])
      .filter(s => typeof s === 'string' && !degreeNoise.includes(s.toLowerCase().trim()));

    return {
      companyName: result.companyName && result.companyName !== 'Target Company' && result.companyName !== 'Unknown' ? result.companyName : (ruleBasedExtractor(rawText, resolvedApplicationUrl).companyName),
      companyPageUrl: result.companyPageUrl || resolvedApplicationUrl || null,
      companySocialLinks: Array.isArray(result.companySocialLinks) ? result.companySocialLinks : [],
      jobTitle: result.jobTitle || 'Software Engineer',
      jobType: result.jobType || null,
      location: result.location || null,
      isRemote: typeof result.isRemote === 'boolean' ? result.isRemote : null,
      ctcMentioned: Boolean(result.ctcMentioned),
      ctcRange: result.ctcRange || null,
      applicationLink: resolvedApplicationUrl || result.applicationLink || null,
      applicationDeadline: result.applicationDeadline || null,
      skillsRequired: sanitizedSkills.length > 0 ? sanitizedSkills : ['JavaScript', 'React.js', 'Node.js', 'Python', 'REST APIs'],
      experienceRequired: result.experienceRequired || null,
      rawDescription: result.rawDescription || rawText.slice(0, 3000),
    };
  } catch (error: any) {
    console.warn('[ExtractorAgent] LLM failed/limit reached. Using Rule-Based Extractor Fallback:', error.message);
    return ruleBasedExtractor(rawText, resolvedApplicationUrl);
  }
}
