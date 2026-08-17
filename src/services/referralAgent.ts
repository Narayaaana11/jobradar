import { llmService } from './llmService';

export interface IReferralContact {
  name: string;
  role: string;
  guessedEmail: string;
  verified: boolean;
  linkedinSearchUrl: string;
  subject: string;
  outreachDraft: string;
  outreachStatus: 'draft';
}

function extractJsonBlock(text: string): string {
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) return jsonBlockMatch[1].trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

/**
 * Returns common corporate email formats for well-known companies.
 */
function getCompanyEmailDomain(company: string): string {
  const known: Record<string, string> = {
    'google': 'google.com',
    'microsoft': 'microsoft.com',
    'amazon': 'amazon.com',
    'infosys': 'infosys.com',
    'tcs': 'tcs.com',
    'wipro': 'wipro.com',
    'cognizant': 'cognizant.com',
    'accenture': 'accenture.com',
    'hcl': 'hcltech.com',
    'ntt data': 'nttdata.com',
    'nttdata': 'nttdata.com',
    'deloitte': 'deloitte.com',
    'capgemini': 'capgemini.com',
    'ibm': 'ibm.com',
    'oracle': 'oracle.com',
    'salesforce': 'salesforce.com',
    'zoho': 'zoho.com',
    'freshworks': 'freshworks.com',
    'flipkart': 'flipkart.com',
    'swiggy': 'swiggy.in',
    'zomato': 'zomato.com',
    'paytm': 'paytm.com',
    'byju': 'byjus.com',
    'razorpay': 'razorpay.com',
    'meesho': 'meesho.com',
    'groww': 'groww.in',
    'cred': 'dreamplug.io',
    'myntra': 'myntra.com',
    'ola': 'olacabs.com',
    'uber': 'uber.com',
    'phonepe': 'phonepe.com',
    'zepto': 'zepto.team',
  };

  const companyLower = company.toLowerCase().trim();
  for (const [key, domain] of Object.entries(known)) {
    if (companyLower.includes(key)) return domain;
  }

  // Generic: company.com
  return `${companyLower.replace(/[^a-z0-9]/g, '').slice(0, 20)}.com`;
}

/**
 * Build a proper LinkedIn people search URL for a specific person at a company.
 */
function buildLinkedInProfileSearchUrl(name: string, company: string, role: string): string {
  // LinkedIn people search with company and role filters
  const query = `${name} ${company}`;
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER`;
}

/**
 * Build a LinkedIn company page URL for Google search fallback.
 */
function buildLinkedInCompanySearchUrl(company: string, role: string): string {
  const query = `site:linkedin.com/in/ "${company}" "${role}"`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export async function generateReferralDrafts(jobDetails: any): Promise<IReferralContact[]> {
  const company = (jobDetails.companyName || 'Company').trim();
  const role = (jobDetails.jobTitle || 'Software Engineer').trim();
  const location = (jobDetails.location || 'Hyderabad').trim();
  const domain = getCompanyEmailDomain(company);
  const cleanRole = role.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  const cleanCompany = company.replace(/[^a-zA-Z0-9]/g, '_');

  const prompt = `You are an expert Referral Outreach Agent. Generate 10 realistic current employee contacts at ${company} in ${location}.

Target role: ${role}
Company: ${company}
Company email domain: ${domain}

Generate employees with roles like: Senior Software Engineer, Tech Lead, Engineering Manager, HR Lead, Talent Acquisition Manager, Staff Engineer, Principal Engineer, Engineering Director, Recruiting Coordinator.

For each contact, use realistic Indian professional names that would actually work at ${company}.
Email format: firstname.lastname@${domain}

Return ONLY a JSON array of 10 objects with no extra text:
[
  {
    "name": "Priya Sharma",
    "role": "Senior Software Engineer",
    "guessedEmail": "priya.sharma@${domain}",
    "subject": "Referral Request: ${role} Position - Narayana Thota (MCA 2026)",
    "outreachDraft": "Hi Priya,\\n\\nI hope this message finds you well. I'm Narayana Thota, a final-year MCA student (2026 Batch, Aditya University) specializing in MERN Stack development and LLM Agent orchestration. I came across the ${role} opening at ${company} and felt strongly that my skills align well with this opportunity.\\n\\nI would be incredibly grateful if you could consider referring me for this role or passing along my resume to the hiring team.\\n\\n📎 Attached: Narayana_Thota_${cleanRole}_${cleanCompany}.pdf\\n\\nPortfolio: https://www.narayanathota.me\\nLinkedIn: https://www.linkedin.com/in/narayaaana/\\n\\nThank you for your time!\\n\\nBest regards,\\nNarayana Thota\\n+91 6301253789 | narayananaiduthota@gmail.com"
  }
]`;

  try {
    const textContent = await llmService.completion(prompt, { model: 'sonnet', maxTokens: 3500 });
    const cleanedJson = extractJsonBlock(textContent);
    const parsedArray = JSON.parse(cleanedJson);

    if (Array.isArray(parsedArray) && parsedArray.length > 0) {
      return parsedArray.slice(0, 10).map((c: any, idx: number) => ({
        name: c.name || `Employee #${idx + 1} @ ${company}`,
        role: c.role || `Software Engineer @ ${company}`,
        guessedEmail: c.guessedEmail || `referrals@${domain}`,
        verified: false,
        linkedinSearchUrl: buildLinkedInProfileSearchUrl(c.name || '', company, c.role || role),
        subject: c.subject || `Referral Request for ${role} - Narayana Thota (MCA 2026)`,
        outreachDraft: c.outreachDraft || generateFallbackOutreach(c.name || '', c.role || '', role, company, cleanRole, cleanCompany),
        outreachStatus: 'draft',
      }));
    }
  } catch (error: any) {
    console.warn('[ReferralAgent] LLM unavailable/limit reached. Using structured fallback contacts:', error.message);
  }

  // High-quality rule-based fallback with realistic names
  return generateFallbackContacts(company, role, location, domain, cleanRole, cleanCompany);
}

function generateFallbackOutreach(name: string, employeeRole: string, jobRole: string, company: string, cleanRole: string, cleanCompany: string): string {
  const firstName = name.split(' ')[0] || 'there';
  return `Hi ${firstName},

I hope this message finds you well.

I'm Narayana Thota, a final-year MCA student (2026 Batch, Aditya University) specializing in MERN Stack development (React, Node.js, TypeScript, MongoDB) and AI/LLM agent orchestration. I'm reaching out regarding the ${jobRole} position at ${company}.

Having seen your profile as ${employeeRole || `a ${company} professional`}, I would be incredibly grateful if you could either refer me for this role or forward my details to the hiring team.

My technical background includes:
• Full Stack Development (React.js, Next.js, Node.js, Express, MongoDB)
• TypeScript, REST APIs, AWS S3, Git
• AI Agent Pipeline Orchestration (LangChain, OpenRouter APIs)
• Projects: JobRadar Autonomous Search Platform, TallyPrime Automation

📎 Attached: Narayana_Thota_${cleanRole}_${cleanCompany}.pdf
🌐 Portfolio: https://www.narayanathota.me
💼 LinkedIn: https://www.linkedin.com/in/narayaaana/

I truly believe I can bring value to ${company} and would love the opportunity to demonstrate that.

Thank you so much for your time and consideration!

Best regards,
Narayana Thota
Bhimavaram, Andhra Pradesh | +91 6301253789
narayananaiduthota@gmail.com`;
}

function generateFallbackContacts(
  company: string, role: string, location: string, domain: string, cleanRole: string, cleanCompany: string
): IReferralContact[] {
  const positions = [
    'Engineering Manager', 'Senior Software Engineer', 'Tech Lead',
    'Talent Acquisition Lead', 'Staff Software Engineer',
    'Full Stack Developer', 'HR Business Partner', 'Lead Developer'
  ];

  return positions.map((employeeRole, idx) => {
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(company + ' ' + employeeRole)}&origin=GLOBAL_SEARCH_HEADER`;
    return {
      name: `${employeeRole} @ ${company}`,
      role: `${employeeRole} @ ${company}`,
      guessedEmail: `(Search LinkedIn for active contact at ${domain})`,
      verified: false,
      linkedinSearchUrl: searchUrl,
      subject: `Referral Request: ${role} Opening — Narayana Thota (MCA 2026)`,
      outreachDraft: generateFallbackOutreach('Hiring Team / Employee', `${employeeRole} at ${company}`, role, company, cleanRole, cleanCompany),
      outreachStatus: 'draft',
    };
  });
}

// Single contact fallback compatibility
export async function generateReferralDraft(jobDetails: any): Promise<any> {
  const contacts = await generateReferralDrafts(jobDetails);
  return contacts[0];
}
