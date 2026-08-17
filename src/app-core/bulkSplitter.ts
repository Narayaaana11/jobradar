/**
 * High-accuracy chat dump splitter for multi-job WhatsApp and Telegram messages.
 */
export function splitBulkChatText(rawBulkText: string): string[] {
  if (!rawBulkText || typeof rawBulkText !== 'string') return [];

  const text = rawBulkText.trim();
  if (text.length < 50) return [text];

  // 1. Split on explicit horizontal dividers (e.g. "----------------", "================", "________________")
  const dividerChunks = text
    .split(/\n\s*[-=_*~]{4,}\s*\n/)
    .map((c) => c.trim())
    .filter((c) => c.length > 25);

  if (dividerChunks.length > 1) {
    return dividerChunks;
  }

  // 2. Split on company recruitment header patterns starting on a new line
  // e.g. "\n*Company Recruitment 2026*" or "\n*Company Hiring*"
  const headerPattern = /\n(?=\s*(?:[*_#]+\s*)?[A-Z0-9][A-Za-z0-9\s&.,'-]{1,30}?\s+(?:Recruitment|Hiring|Walkin|Walk-in|Drive|Offcampus|Careers|Mega Drive)\b)/i;
  const headerChunks = text
    .split(headerPattern)
    .map((c) => c.trim())
    .filter((c) => c.length > 30);

  if (headerChunks.length > 1) {
    return headerChunks;
  }

  // 3. Fallback: split on multiple blank lines (3+ consecutive newlines)
  const doubleNewlineChunks = text
    .split(/\n\s*\n\s*\n+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 40);

  if (doubleNewlineChunks.length > 1) {
    return doubleNewlineChunks;
  }

  // 4. Fallback: numbered posts e.g. "\n1. Company", "\n2. Company"
  const numberedChunks = text
    .split(/\n(?=\s*\d+[\.\)]\s+[A-Z])/)
    .map((c) => c.trim())
    .filter((c) => c.length > 30);

  if (numberedChunks.length > 1) {
    return numberedChunks;
  }

  return [text];
}
