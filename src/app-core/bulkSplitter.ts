/**
 * High-accuracy chat dump splitter for multi-job WhatsApp and Telegram messages.
 */
export function splitBulkChatText(rawBulkText: string): string[] {
  if (!rawBulkText || typeof rawBulkText !== 'string') return [];

  const text = rawBulkText.trim();
  if (text.length < 50) return [text];

  const candidates: string[][] = [];

  // Strategy 1. Split on explicit horizontal dividers (e.g. "----------------", "================", "________________")
  const dividerChunks = text
    .split(/\n\s*[-=_*~]{4,}\s*\n/)
    .map((c) => c.trim())
    .filter((c) => c.length > 25);
  if (dividerChunks.length > 1) {
    candidates.push(dividerChunks);
  }

  // Strategy 2. Numbered posts e.g. "\n1. ", "\n2) ", "1. Company", "2. Company"
  const numberedChunks = text
    .split(/\n(?=\s*\d+[\.\)]\s+[A-Za-z])/i)
    .map((c) => c.trim())
    .filter((c) => c.length > 25);
  if (numberedChunks.length > 1) {
    candidates.push(numberedChunks);
  }

  // Strategy 3. Split on company recruitment header patterns starting on a new line
  // e.g. "\n*Company Recruitment 2026*" or "\n*Company Hiring*"
  const headerPattern = /\n(?=\s*(?:[*_#]+\s*)?[A-Z0-9][A-Za-z0-9\s&.,'-]{1,30}?\s+(?:Recruitment|Hiring|Walkin|Walk-in|Drive|Offcampus|Careers|Mega Drive)\b)/i;
  const headerChunks = text
    .split(headerPattern)
    .map((c) => c.trim())
    .filter((c) => c.length > 30);
  if (headerChunks.length > 1) {
    candidates.push(headerChunks);
  }

  // Strategy 4. Split on multiple blank lines (2+ consecutive newlines)
  const doubleNewlineChunks = text
    .split(/\n\s*\n\s*\n+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 35);
  if (doubleNewlineChunks.length > 1) {
    candidates.push(doubleNewlineChunks);
  }

  // Strategy 5. Emoji or bullet list delimiters (e.g. "\n📌", "\n🚀", "\n•", "\n-")
  const emojiChunks = text
    .split(/\n(?=\s*(?:[📌🚀👉💼🔥⭐•\-\*]|[\u{1F300}-\u{1FAFF}])\s*[A-Za-z0-9])/u)
    .map((c) => c.trim())
    .filter((c) => c.length > 25);
  if (emojiChunks.length > 1) {
    candidates.push(emojiChunks);
  }

  if (candidates.length > 0) {
    // Pick the strategy that decomposed the text into the most granular valid chunks
    candidates.sort((a, b) => b.length - a.length);
    return candidates[0];
  }

  return [text];
}
