import fs from 'fs';
import path from 'path';
import { llmService } from './llmService';
import { s3Service } from './s3Service';

export interface ICoverLetterResult {
  coverLetterUrl: string;
  coverLetterText: string;
}

export async function generateCoverLetter(jobDetails: any, gapAnalysis: any): Promise<ICoverLetterResult> {
  const company = jobDetails.companyName || 'Target Company';
  const role = jobDetails.jobTitle || 'Software Engineer';

  const prompt = `
You are an expert Cover Letter Generator Agent. Write a highly tailored, professional 3-paragraph cover letter in Markdown format for candidate Narayana Thota (MCA 2026 Batch, MERN Stack & LLM Agent developer).

Target Job Info:
- Role: ${role}
- Company: ${company}
- Location: ${jobDetails.location || 'Hyderabad'}
- Skills Required: ${(jobDetails.skillsRequired || []).join(', ')}

Return ONLY the plain cover letter text (no preamble, no JSON).
`;

  let coverLetterText = `Dear Hiring Manager at ${company},\n\nI am writing to express my enthusiasm for the ${role} position. As a Master of Computer Applications (MCA 2026 Batch) candidate specializing in MERN Stack development, TypeScript, and AI LLM agent workflows, I am confident in delivering immediate value to ${company}.\n\nSincerely,\nNarayana Thota`;

  try {
    const textContent = await llmService.completion(prompt, { model: 'sonnet', maxTokens: 1500 });
    if (textContent.trim()) {
      coverLetterText = textContent.trim();
    }
  } catch (error: any) {
    console.warn('[CoverLetterAgent] LLM unavailable/limit reached. Using standard cover letter template:', error.message);
  }

  // Save local copy
  const coverLettersDir = path.resolve(process.cwd(), 'cover_letters');
  if (!fs.existsSync(coverLettersDir)) {
    fs.mkdirSync(coverLettersDir, { recursive: true });
  }

  const sanitizedCompany = company.toLowerCase().replace(/[^\w]/g, '_');
  const sanitizedTitle = role.toLowerCase().replace(/[^\w]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${dateStr}-${sanitizedCompany}-${sanitizedTitle}-cover-letter.md`;
  const filePath = path.join(coverLettersDir, filename);

  fs.writeFileSync(filePath, coverLetterText, 'utf-8');

  // Upload to AWS S3 bucket 'jobsprep'
  const s3Key = `cover_letters/${filename}`;
  const s3Url = await s3Service.uploadFile(s3Key, coverLetterText, 'text/markdown');

  return {
    coverLetterUrl: s3Url,
    coverLetterText,
  };
}
