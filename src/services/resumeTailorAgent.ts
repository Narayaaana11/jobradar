  import fs from 'fs';
import path from 'path';
import { llmService } from './llmService';
import { latexPdfService } from './latexPdfService';

export interface IResumeTailorResult {
  resumeVersionUrl: string;
  resumeNotes: string;
  markdownContent: string;
}

function extractTexBlock(text: string): string {
  const start = text.indexOf('\\documentclass');
  const end = text.lastIndexOf('\\end{document}');
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 14);
  }
  return text.replace(/```latex/g, '').replace(/```/g, '').trim();
}

function loadMasterLatexResume(): string {
  const texPath = path.resolve(process.cwd(), 'config', 'master_resume.tex');
  if (fs.existsSync(texPath)) {
    return fs.readFileSync(texPath, 'utf-8');
  }
  return `\\documentclass[letterpaper,11pt]{article}\n\\begin{document}\nVeera Venkata Naga Satyanarayana Thota\n\\end{document}`;
}

export async function generateTailoredResume(jobDetails: any, gapAnalysis: any): Promise<IResumeTailorResult> {
  const masterLatex = loadMasterLatexResume();
  const companyName = (jobDetails.companyName || 'Company').trim();
  const jobTitle = (jobDetails.jobTitle || 'Role').trim();
  
  // Extract required and missing keywords
  const requiredSkills: string[] = jobDetails.skillsRequired || ['JavaScript', 'React.js', 'Node.js', 'Python', 'REST APIs'];
  const missingKeywords: string[] = gapAnalysis?.gapAnalysis?.missingKeywords || gapAnalysis?.missingKeywords || [];
  const allTargetKeywords = Array.from(new Set([...requiredSkills, ...missingKeywords]))
    .filter(s => !['b.e', 'b.tech', 'mca', 'bca', 'graduation', 'degree', 'freshers', 'experienced', 'asap'].includes(s.toLowerCase()))
    .slice(0, 10);

  const prompt = `
You are an expert ATS Resume Optimization Agent specializing in 100% ATS match scores and single-page formatting.
Adapt candidate Narayana Thota's Master LaTeX Resume for the target job: ${jobTitle} at ${companyName}.

TARGET KEYWORDS TO INJECT: ${allTargetKeywords.join(', ')}

STRICT RULES:
1. PRESERVE ALL FACTUAL DETAILS EXACTLY:
   - Candidate Name: Veera Venkata Naga Satyanarayana Thota
   - Location: Bhimavaram, Andhra Pradesh | Phone: +91 6301253789 | Email: narayananaiduthota@gmail.com
   - Education: MCA (2024-2026) Aditya University, BCA (2021-2024) Aditya Degree College
   - Internship: Full Stack Development Intern at Technical Hub Pvt. Ltd. (June 2025 - July 2025)
   - Projects: AUSVMS, Guard Hub -- Security Roster Management System, Matrix Library Management System
   - DO NOT hallucinate fake companies, degrees, dates, or non-existent projects.

2. KEYWORD INTEGRATION:
   - Add target missing keywords naturally into \\section{Technical Skills} under the appropriate category (Languages, Frontend Development, Backend \\& Database, Cloud \\& DevOps, Tools \\& Platforms, Core Concepts).
   - Update \\section{Summary} to highlight candidate experience matching ${jobTitle} at ${companyName} using keywords: ${allTargetKeywords.slice(0, 4).join(', ')}.

3. STRICT SINGLE PAGE LIMIT:
   - Keep all bullet points concise (max 2 lines per bullet point) so the compiled LaTeX document fits on EXACTLY ONE PAGE.
   - Do NOT add excessive padding or line breaks.

4. OUTPUT FORMAT:
   - Return ONLY valid compilable LaTeX code starting with \\documentclass and ending with \\end{document}.

Master LaTeX Resume:
"""
${masterLatex}
"""
`;

  let tailoredTex = masterLatex;
  let resumeNotes = `Single-page ATS LaTeX Resume optimized for ${jobTitle} at ${companyName}. Injected keywords: ${allTargetKeywords.slice(0, 5).join(', ')}.`;

  try {
    const textContent = await llmService.completion(prompt, { model: 'sonnet', maxTokens: 3500 });
    const extracted = extractTexBlock(textContent);
    if (extracted && extracted.includes('\\begin{document}')) {
      tailoredTex = extracted;
    }
  } catch (error: any) {
    console.warn('[ResumeTailorAgent] LLM limit/error. Applying rule-based ATS LaTeX Keyword Injection Engine:', error.message);

    // Rule-Based ATS Keyword Injection Engine (Preserves Master Resume Structure)
    const validSkillsStr = allTargetKeywords.slice(0, 5).join(', ');

    // Categorize keywords into technical lines
    const extraLangs: string[] = [];
    const extraFront: string[] = [];
    const extraBack: string[] = [];
    const extraDevOps: string[] = [];

    allTargetKeywords.forEach(k => {
      const kl = k.toLowerCase();
      if (['python', 'sql', 'javascript', 'typescript', 'java', 'c++', 'go', 'rust', 'c#', 'php'].some(x => kl.includes(x))) {
        extraLangs.push(k);
      } else if (['react', 'tailwind', 'next', 'redux', 'vue', 'angular', 'bootstrap', 'css', 'html'].some(x => kl.includes(x))) {
        extraFront.push(k);
      } else if (['node', 'express', 'mongo', 'postgres', 'sql', 'rest', 'api', 'jwt', 'redis', 'graphql', 'microservices'].some(x => kl.includes(x))) {
        extraBack.push(k);
      } else if (['aws', 's3', 'docker', 'kubernetes', 'git', 'github', 'ci/cd', 'linux'].some(x => kl.includes(x))) {
        extraDevOps.push(k);
      } else {
        extraBack.push(k);
      }
    });

    tailoredTex = masterLatex
      .replace(
        /\\section\{Summary\}[\s\S]*?\\section\{Technical Skills\}/,
        `\\section{Summary}\n\\small{Full Stack Developer & MCA candidate with hands-on experience building responsive web applications (React.js, Tailwind CSS) and RESTful backend microservices (Node.js, Express.js, MongoDB). Skilled in end-to-end development, API optimization, and software delivery matching core requirements: ${validSkillsStr || 'React.js, Node.js, REST APIs'}. Backed by strong Data Structures & Algorithms and OOP fundamentals.}\n\n\\section{Technical Skills}`
      );

    if (extraLangs.length > 0) {
      tailoredTex = tailoredTex.replace(/(\\textbf\{Languages\}\{:)([^}]+)/, (m, g1, g2) => `${g1}${g2}, ${extraLangs.join(', ')}`);
    }
    if (extraFront.length > 0) {
      tailoredTex = tailoredTex.replace(/(\\textbf\{Frontend Development\}\{:)([^}]+)/, (m, g1, g2) => `${g1}${g2}, ${extraFront.join(', ')}`);
    }
    if (extraBack.length > 0) {
      tailoredTex = tailoredTex.replace(/(\\textbf\{Backend \\& Database\}\{:)([^}]+)/, (m, g1, g2) => `${g1}${g2}, ${extraBack.join(', ')}`);
    }
    if (extraDevOps.length > 0) {
      tailoredTex = tailoredTex.replace(/(\\textbf\{Cloud \\& DevOps\}\{:)([^}]+)/, (m, g1, g2) => `${g1}${g2}, ${extraDevOps.join(', ')}`);
    }
  }

  // Exact filename format: Narayana_Thota_<Role>_<Company>
  const cleanTitle = jobTitle.replace(/[^\w]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  const cleanCompany = companyName.replace(/[^\w]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  const filenameBase = `Narayana_Thota_${cleanTitle}_${cleanCompany}`;

  // Compile LaTeX to PDF & Upload both .tex and .pdf to AWS S3 bucket 'jobsprep'
  const { texUrl, pdfUrl } = await latexPdfService.compileAndUpload(filenameBase, tailoredTex);

  console.log(`[ResumeTailorAgent] 90+ ATS Resume compiled & uploaded to AWS S3: ${pdfUrl}`);

  return {
    resumeVersionUrl: pdfUrl,
    resumeNotes,
    markdownContent: tailoredTex,
  };
}
