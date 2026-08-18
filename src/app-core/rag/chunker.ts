import { IKnowledgeDocument, IDocumentChunk } from './types';
import { generateLocalEmbedding, tokenizeText } from './embeddings';

/**
 * Configuration options for document chunking
 */
export interface IChunkerOptions {
  maxWordsPerChunk?: number; // Default: 250 words
  overlapWords?: number; // Default: 35 words
  preserveHeaderHierarchy?: boolean;
}

/**
 * Extracts key technical terms and unique keywords from text.
 */
export function extractKeywords(text: string, maxKeywords = 12): string[] {
  const tokens = tokenizeText(text);
  const tf = new Map<string, number>();

  for (const t of tokens) {
    if (t.length >= 3) {
      tf.set(t, (tf.get(t) || 0) + 1);
    }
  }

  // Prioritize technical and capitalized acronyms / domain terms
  const sorted = Array.from(tf.entries()).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, maxKeywords).map(([word]) => word);
}

/**
 * Splits markdown and plain text documents into semantically coherent chunks.
 */
export function chunkDocument(
  doc: IKnowledgeDocument,
  options: IChunkerOptions = {}
): IDocumentChunk[] {
  const maxWords = options.maxWordsPerChunk || 220;
  const overlapWords = options.overlapWords || 30;

  if (!doc.content || !doc.content.trim()) {
    return [];
  }

  const rawSections: string[] = [];

  // Step 1: Split on markdown headers (###, ##, #) or horizontal rules (---)
  const headerSplit = doc.content.split(/\n(?=(?:#{1,4}\s+|---+\s*\n))/g);

  for (const section of headerSplit) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Check word count of section
    const words = trimmed.split(/\s+/);
    if (words.length <= maxWords) {
      rawSections.push(trimmed);
    } else {
      // Step 2: Split large sections on double newlines or list items
      const paragraphs = trimmed.split(/\n\s*\n/);
      let currentChunkWords: string[] = [];

      for (const para of paragraphs) {
        const pWords = para.trim().split(/\s+/);
        if (currentChunkWords.length + pWords.length <= maxWords) {
          currentChunkWords.push(...pWords);
        } else {
          if (currentChunkWords.length > 0) {
            rawSections.push(currentChunkWords.join(' '));
            // Keep overlap from previous chunk
            const overlap = currentChunkWords.slice(-overlapWords);
            currentChunkWords = [...overlap, ...pWords];
          } else {
            rawSections.push(pWords.join(' '));
          }
        }
      }

      if (currentChunkWords.length > 0) {
        rawSections.push(currentChunkWords.join(' '));
      }
    }
  }

  const chunks: IDocumentChunk[] = [];
  const totalChunks = rawSections.length;

  rawSections.forEach((sectionText, index) => {
    // Inject contextual breadcrumbs at top of chunk for better embedding comprehension
    const enrichedText = `[Doc: ${doc.title} | Category: ${doc.category}]\n${sectionText}`;
    const keywords = extractKeywords(sectionText);
    const embedding = generateLocalEmbedding(enrichedText);
    const tokenCount = tokenizeText(sectionText).length;

    const chunk: IDocumentChunk = {
      chunkId: `${doc.id}-chunk-${index + 1}`,
      documentId: doc.id,
      documentTitle: doc.title,
      category: doc.category,
      chunkIndex: index + 1,
      totalChunks,
      text: sectionText,
      embedding,
      tokenCount,
      tags: doc.tags || [],
      keywords,
      createdAt: new Date().toISOString(),
    };

    chunks.push(chunk);
  });

  return chunks;
}
