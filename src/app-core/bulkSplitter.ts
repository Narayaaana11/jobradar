/**
 * High-accuracy chat dump splitter for multi-job WhatsApp and Telegram messages.
 * Handles single postings, timestamped channel dumps, and multi-opening sub-digests.
 */
export function splitBulkChatText(rawBulkText: string): string[] {
  if (!rawBulkText || typeof rawBulkText !== 'string') return [];

  const text = rawBulkText.trim();
  if (text.length < 30) return [text];

  let rawChunks: string[] = [];

  // Strategy 1: Split on WhatsApp / Telegram timestamps
  // Matches e.g.:
  // "[17/08, 2:43 pm] null: " (with unicode narrow space or regular space)
  // "17/08/24, 2:43 pm - "
  // "[17/08/2026, 14:43:00] Admin: "
  const waTimestampSplitter = /(?:^|\n)(?=\[\d{1,2}[\/\.\-]\d{1,2}(?:[\/\.\-]\d{2,4})?,\s*\d{1,2}:\d{2}(?::\d{2})?[\s\u202F\u00A0]*(?:[aApP][mM])?\]|\d{1,2}[\/\.\-]\d{1,2}(?:[\/\.\-]\d{2,4})?,\s*\d{1,2}:\d{2}[\s\u202F\u00A0]*(?:[aApP][mM])?\s*-\s*)/;
  
  const timestampChunks = text
    .split(waTimestampSplitter)
    .map((c) => c.trim())
    .filter((c) => c.length > 20);

  if (timestampChunks.length > 1) {
    rawChunks = timestampChunks;
  } else {
    // Strategy 2: Split on explicit horizontal dividers (e.g. "----------------", "================", "________________")
    const dividerChunks = text
      .split(/\n\s*[-=_*~]{4,}\s*\n/)
      .map((c) => c.trim())
      .filter((c) => c.length > 25);
    if (dividerChunks.length > 1) {
      rawChunks = dividerChunks;
    } else {
      // Strategy 3: Split on numbered posts e.g. "\n1. ", "\n2) ", "1. Company", "2. Company"
      const numberedChunks = text
        .split(/\n(?=\s*(?:\*\s*)?\d+[\.\)]\s+[A-Za-z0-9])/i)
        .map((c) => c.trim())
        .filter((c) => c.length > 25);
      if (numberedChunks.length > 1) {
        rawChunks = numberedChunks;
      } else {
        // Strategy 4: Split on company recruitment header patterns
        const headerPattern = /\n(?=\s*(?:[*_#]+\s*)?[A-Z0-9][A-Za-z0-9\s&.,'-]{1,30}?\s+(?:Recruitment|Hiring|Walkin|Walk-in|Drive|Offcampus|Careers|Mega Drive)\b)/i;
        const headerChunks = text
          .split(headerPattern)
          .map((c) => c.trim())
          .filter((c) => c.length > 30);
        if (headerChunks.length > 1) {
          rawChunks = headerChunks;
        } else {
          // Strategy 5: Split on multiple blank lines (2+ consecutive newlines)
          const doubleNewlineChunks = text
            .split(/\n\s*\n\s*\n+/)
            .map((c) => c.trim())
            .filter((c) => c.length > 35);
          if (doubleNewlineChunks.length > 1) {
            rawChunks = doubleNewlineChunks;
          } else {
            rawChunks = [text];
          }
        }
      }
    }
  }

  // Strategy 6: Recursive Sub-Digest Splitting
  // For each chunk, check if it contains a multi-job list header like:
  // "*7 NEW OPENINGS — 15 AUGUST*" or "*6 NEW OPENINGS*"
  // followed by numbered sub-items: "*1. CDK Global...*", "*2. JioHotstar...*"
  const finalChunks: string[] = [];

  for (const chunk of rawChunks) {
    // Strip leading timestamp header e.g. "[17/08, 2:43 pm] null: "
    const cleanedChunk = chunk
      .replace(/^\[\d{1,2}[\/\.\-]\d{1,2}(?:[\/\.\-]\d{2,4})?,\s*\d{1,2}:\d{2}(?::\d{2})?[\s\u202F\u00A0]*(?:[aApP][mM])?\]\s*(?:[^:\n]+:)?\s*/i, '')
      .replace(/^\d{1,2}[\/\.\-]\d{1,2}(?:[\/\.\-]\d{2,4})?,\s*\d{1,2}:\d{2}[\s\u202F\u00A0]*(?:[aApP][mM])?\s*-\s*(?:[^:\n]+:)?\s*/i, '')
      .trim();

    if (!cleanedChunk) continue;

    // Check for nested numbered job items e.g. "\n*1. CDK Global", "\n1. Company", "\n*2. JioHotstar"
    const subNumbered = cleanedChunk.split(/\n(?=\s*(?:\*\s*)?\d+[\.\)]\s+[A-Za-z0-9])/i)
      .map((sc) => sc.trim())
      .filter((sc) => sc.length > 25);

    if (subNumbered.length > 1) {
      // If the first chunk is just a header banner like "*7 NEW OPENINGS — 15 AUGUST*", discard or merge
      for (const sub of subNumbered) {
        if (/^\s*(?:\*\s*)?\d+[\.\)]/i.test(sub) || sub.includes('http') || sub.includes('Role:')) {
          finalChunks.push(sub);
        } else if (sub.length > 80 && (sub.includes('Hiring') || sub.includes('Recruitment'))) {
          finalChunks.push(sub);
        }
      }
    } else {
      finalChunks.push(cleanedChunk);
    }
  }

  return finalChunks.length > 0 ? finalChunks : [text];
}

