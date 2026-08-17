import { llmService } from './llmService';

export interface IClassifierResult {
  is_job_post: boolean;
  confidence: number;
  reason: string;
}

function extractJsonBlock(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

function ruleBasedClassifier(rawText: string): IClassifierResult {
  const lower = rawText.toLowerCase();

  // 1. If text contains a URL (http:// or https://) or scraped page content, automatically treat as job post candidate
  if (lower.includes('http://') || lower.includes('https://') || lower.includes('[scraped target page')) {
    return {
      is_job_post: true,
      confidence: 0.95,
      reason: 'Contains single job URL or scraped career page content',
    };
  }

  // 2. Filter out pure website promo chatter without job details
  if (lower.includes('save our website name') && !lower.includes('apply link') && !lower.includes('qualification')) {
    return { is_job_post: false, confidence: 0.9, reason: 'Website promotional announcement' };
  }

  const jobKeywords = [
    'recruitment', 'hiring', 'walkin', 'walk-in', 'apply link', 'qualification',
    'developer', 'engineer', 'trainee', 'associate', 'intern', 'executive',
    'consultant', 'analyst', 'batch', 'experience', 'salary', 'role', '@', 'tinyurl.com',
    'careers', 'job', 'position', 'opening', 'vacancy', 'apply'
  ];

  const matchCount = jobKeywords.filter((k) => lower.includes(k)).length;

  if (matchCount >= 1) {
    return {
      is_job_post: true,
      confidence: 0.95,
      reason: 'Rule-based fallback detected legitimate job posting keywords',
    };
  }

  return {
    is_job_post: false,
    confidence: 0.6,
    reason: 'Rule-based fallback did not find sufficient hiring keywords',
  };
}

export async function classifyJobPost(rawText: string): Promise<IClassifierResult> {
  // If input is a single URL, automatically mark as job post
  if (/^https?:\/\/[^\s]+$/i.test(rawText.trim())) {
    return {
      is_job_post: true,
      confidence: 0.99,
      reason: 'Input is a single direct job URL',
    };
  }

  const prompt = `
You are a job posting classifier agent. Analyze raw text from a Telegram/WhatsApp channel or web posting URL and determine if it is a legitimate job posting / vacancy announcement or job link.

Text to evaluate:
"""
${rawText.slice(0, 2000)}
"""

Return ONLY a valid JSON object matching this exact schema:
{
  "is_job_post": true|false,
  "confidence": 0.9,
  "reason": "short explanation"
}
`;

  try {
    const textContent = await llmService.completion(prompt, { model: 'haiku', maxTokens: 256 });
    const cleanedJson = extractJsonBlock(textContent);
    const result: IClassifierResult = JSON.parse(cleanedJson);

    return {
      is_job_post: Boolean(result.is_job_post),
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
      reason: result.reason || '',
    };
  } catch (error: any) {
    console.warn('[ClassifierAgent] LLM failed/limit reached. Using Rule-Based Classifier Fallback:', error.message);
    return ruleBasedClassifier(rawText);
  }
}
