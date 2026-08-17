import { llmService } from './llmService';

function isJobPostingBlock(text: string): boolean {
  const lower = text.toLowerCase();
  // Filter out pure website promo chatter without job details
  if (lower.includes('save our website name') && !lower.includes('apply link') && !lower.includes('qualification')) {
    return false;
  }
  
  const hiringKeywords = [
    'recruitment', 'hiring', 'walkin', 'walk-in', 'apply link', 'qualification',
    'developer', 'engineer', 'trainee', 'associate', 'intern', 'executive',
    'consultant', 'analyst', 'batch', 'experience', 'salary', 'role', '@'
  ];

  return hiringKeywords.some((keyword) => lower.includes(keyword)) || text.length > 80;
}

function cleanWhatsAppNoise(text: string): string {
  // Strip header like [01/08, 5:34 pm] null: or [01/08, 12:03 am]
  return text.replace(/^\[\d{1,2}\/\d{1,2}(?:\/\d{2,4})?,\s*\d{1,2}:\d{2}\s*(?:am|pm)?\]\s*(?:null:)?\s*/i, '').trim();
}

export async function splitBulkChatText(bulkText: string): Promise<string[]> {
  if (!bulkText || !bulkText.trim()) return [];

  // Pass 1: Deterministic WhatsApp timestamp splitting
  // Matches patterns like [01/08, 12:03 am] or [01/08/2026, 12:03:00]
  const waTimestampRegex = /(?=\[\d{1,2}\/\d{1,2}(?:\/\d{2,4})?,\s*\d{1,2}:\d{2})/gi;
  let rawBlocks = bulkText.split(waTimestampRegex).map((b) => b.trim()).filter((b) => b.length > 0);

  // Pass 2: Fallback double newline splitting if no WhatsApp timestamps found
  if (rawBlocks.length <= 1) {
    rawBlocks = bulkText.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.length > 0);
  }

  const validJobPosts: string[] = [];

  for (const block of rawBlocks) {
    const cleaned = cleanWhatsAppNoise(block);
    if (isJobPostingBlock(cleaned)) {
      validJobPosts.push(cleaned);
    }
  }

  if (validJobPosts.length > 0) {
    console.log(`[BulkSplitterAgent] Deterministically split bulk WhatsApp dump into ${validJobPosts.length} distinct job posts.`);
    return validJobPosts;
  }

  // Pass 3: AI LLM Fallback if unstructured raw text
  const prompt = `
You are an expert WhatsApp Chat & Bulk Text Splitter Agent. 
You will receive raw text containing multiple job vacancies. Extract EACH distinct job post as a raw text string entry.

Raw Bulk Text:
"""
${bulkText}
"""

Return ONLY a valid JSON array of strings:
[
  "Job Post 1 raw text...",
  "Job Post 2 raw text..."
]
`;

  try {
    const textContent = await llmService.completion(prompt, { model: 'haiku', maxTokens: 3000 });
    const start = textContent.indexOf('[');
    const end = textContent.lastIndexOf(']');
    const cleanedJson = start !== -1 && end !== -1 ? textContent.slice(start, end + 1) : textContent;
    const parsed = JSON.parse(cleanedJson);

    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter((item) => item.length > 20);
    }
  } catch (error: any) {
    console.warn('[BulkSplitterAgent] AI Fallback failed, returning raw block:', error.message);
  }

  return [bulkText.trim()];
}
