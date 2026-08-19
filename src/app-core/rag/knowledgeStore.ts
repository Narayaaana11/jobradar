import {
  IKnowledgeDocument,
  IDocumentChunk,
  ISearchResult,
  IRagQueryOptions,
  IVaultStats,
  KnowledgeCategory,
} from './types';
import {
  generateLocalEmbedding,
  cosineSimilarity,
  calculateBm25Scores,
  reciprocalRankFusion,
  tokenizeText,
} from './embeddings';
import { chunkDocument } from './chunker';
import { s3Cloud } from '../s3Client';

const RAG_VAULT_KEY = 'jobradar_rag_vault_v2';

export class KnowledgeVaultStore {
  private documents: IKnowledgeDocument[] = [];
  private chunks: IDocumentChunk[] = [];
  private lastIndexedAt: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(RAG_VAULT_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          this.documents = Array.isArray(data.documents) ? data.documents : [];
          this.chunks = Array.isArray(data.chunks) ? data.chunks : [];
          this.lastIndexedAt = data.lastIndexedAt || null;

          // If no chunks indexed yet but documents exist, build them now
          if (this.chunks.length === 0 && this.documents.length > 0) {
            this.reindexAllSync();
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Error loading RAG vault from localStorage:', err);
    }

    // Default to clean empty state (no pre-seeded documents)
    this.documents = [];
    this.chunks = [];
    this.reindexAllSync();
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined') {
        const payload = {
          documents: this.documents,
          chunks: this.chunks,
          lastIndexedAt: this.lastIndexedAt,
        };
        localStorage.setItem(RAG_VAULT_KEY, JSON.stringify(payload));
      }
      this.notify();
      this.syncWithS3Debounced();
    } catch (err) {
      console.error('Error saving RAG vault to storage:', err);
    }
  }

  private syncWithS3Debounced() {
    if (typeof window !== 'undefined') {
      try {
        if (s3Cloud.getConfig().autoSync) {
          const dataToSync = JSON.stringify(
            {
              documents: this.documents,
              totalChunks: this.chunks.length,
              lastIndexedAt: this.lastIndexedAt,
            },
            null,
            2
          );
          s3Cloud.putObject('rag_knowledge_vault.json', dataToSync, 'application/json').catch(() => {});
        }
      } catch (e) {}
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- Synchronous Document & Chunk Indexing ---
  private reindexAllSync() {
    const allChunks: IDocumentChunk[] = [];
    for (const doc of this.documents) {
      if (doc.enabled) {
        const docChunks = chunkDocument(doc);
        allChunks.push(...docChunks);
      }
    }
    this.chunks = allChunks;
    this.lastIndexedAt = new Date().toISOString();
  }

  public reindexAll(): void {
    this.reindexAllSync();
    this.saveToStorage();
  }

  // --- Document Operations ---
  public getDocuments(): IKnowledgeDocument[] {
    return [...this.documents];
  }

  public getDocumentById(id: string): IKnowledgeDocument | undefined {
    return this.documents.find((d) => d.id === id);
  }

  public addDocument(doc: Omit<IKnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'>): IKnowledgeDocument {
    const newDoc: IKnowledgeDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.documents.unshift(newDoc);
    this.reindexAllSync();
    this.saveToStorage();
    return newDoc;
  }

  public updateDocument(id: string, updates: Partial<IKnowledgeDocument>): IKnowledgeDocument | undefined {
    const doc = this.documents.find((d) => d.id === id);
    if (doc) {
      Object.assign(doc, updates, { updatedAt: new Date().toISOString() });
      this.reindexAllSync();
      this.saveToStorage();
      return doc;
    }
    return undefined;
  }

  public deleteDocument(id: string): boolean {
    const initialLen = this.documents.length;
    this.documents = this.documents.filter((d) => d.id !== id);
    if (this.documents.length !== initialLen) {
      this.reindexAllSync();
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public clearAllDocuments(): void {
    this.documents = [];
    this.chunks = [];
    this.lastIndexedAt = new Date().toISOString();
    this.saveToStorage();
  }

  public toggleDocumentEnabled(id: string): boolean {
    const doc = this.documents.find((d) => d.id === id);
    if (doc) {
      doc.enabled = !doc.enabled;
      doc.updatedAt = new Date().toISOString();
      this.reindexAllSync();
      this.saveToStorage();
      return doc.enabled;
    }
    return false;
  }

  public getChunks(): IDocumentChunk[] {
    return [...this.chunks];
  }

  // --- Hybrid Search: Dense Vector + BM25 Lexical + Reciprocal Rank Fusion ---
  public searchHybrid(query: string, options: IRagQueryOptions = {}): ISearchResult[] {
    if (!query || !query.trim() || this.chunks.length === 0) {
      return [];
    }

    const topK = options.topK || 4;
    const minScore = options.minScore ?? 0.15;
    const cleanQuery = query.trim();

    // 1. Filter candidate chunks by category if specified
    let candidateChunks = this.chunks;
    if (options.categoryFilter) {
      const allowedCategories = Array.isArray(options.categoryFilter)
        ? new Set(options.categoryFilter)
        : new Set([options.categoryFilter]);
      candidateChunks = this.chunks.filter((c) => allowedCategories.has(c.category));
    }

    if (candidateChunks.length === 0) {
      return [];
    }

    // 2. Dense Vector Embedding Search (Cosine Similarity)
    const queryEmbedding = generateLocalEmbedding(cleanQuery);
    const denseScores = new Map<string, number>();

    for (const chunk of candidateChunks) {
      const sim = cosineSimilarity(queryEmbedding, chunk.embedding);
      denseScores.set(chunk.chunkId, sim);
    }

    // Dense rank ordering (1-indexed)
    const sortedByDense = [...candidateChunks].sort(
      (a, b) => (denseScores.get(b.chunkId) || 0) - (denseScores.get(a.chunkId) || 0)
    );
    const denseRanks = new Map<string, number>();
    sortedByDense.forEach((c, idx) => denseRanks.set(c.chunkId, idx + 1));

    // 3. BM25 Lexical Search
    const bm25Scores = calculateBm25Scores(cleanQuery, candidateChunks);
    const sortedByBm25 = [...candidateChunks].sort(
      (a, b) => (bm25Scores.get(b.chunkId) || 0) - (bm25Scores.get(a.chunkId) || 0)
    );
    const bm25Ranks = new Map<string, number>();
    sortedByBm25.forEach((c, idx) => bm25Ranks.set(c.chunkId, idx + 1));

    // 4. Hybrid Fusion (RRF or Weighted Composite)
    const rrfScores = options.hybridSearch !== false
      ? reciprocalRankFusion(denseRanks, bm25Ranks)
      : denseScores;

    // 5. Query tokens for matched keywords detection
    const queryTokens = tokenizeText(cleanQuery);

    const searchResults: ISearchResult[] = [];

    for (const chunk of candidateChunks) {
      const dScore = denseScores.get(chunk.chunkId) || 0;
      const bScore = bm25Scores.get(chunk.chunkId) || 0;
      const rrf = rrfScores.get(chunk.chunkId) || 0;

      // Weighted Composite Score: 55% Dense Semantic + 25% BM25 Lexical + 20% RRF Boost
      const compositeScore = options.hybridSearch !== false
        ? dScore * 0.55 + bScore * 0.25 + rrf * 0.2
        : dScore;

      if (compositeScore >= minScore) {
        const chunkTextLower = chunk.text.toLowerCase();
        const matched = queryTokens.filter((t) => chunkTextLower.includes(t));
        const snippet = chunk.text.length > 220 ? chunk.text.slice(0, 217) + '...' : chunk.text;

        searchResults.push({
          chunk,
          similarityScore: Math.round(compositeScore * 100) / 100,
          denseScore: Math.round(dScore * 100) / 100,
          bm25Score: Math.round(bScore * 100) / 100,
          rank: 0,
          matchedKeywords: matched,
          contextSnippet: snippet,
        });
      }
    }

    // Sort by final composite score descending
    searchResults.sort((a, b) => b.similarityScore - a.similarityScore);

    // Assign final ranks and slice to topK
    const finalResults = searchResults.slice(0, topK).map((res, idx) => ({
      ...res,
      rank: idx + 1,
    }));

    return finalResults;
  }

  // --- Stats Calculation ---
  public getStats(): IVaultStats {
    const categoriesCount: Record<KnowledgeCategory, number> = {
      resume: 0,
      project: 0,
      experience: 0,
      star_story: 0,
      tech_note: 0,
      job_market: 0,
      custom: 0,
    };

    let totalTokens = 0;
    this.documents.forEach((d) => {
      categoriesCount[d.category] = (categoriesCount[d.category] || 0) + 1;
    });

    this.chunks.forEach((c) => {
      totalTokens += c.tokenCount;
    });

    return {
      totalDocuments: this.documents.length,
      totalChunks: this.chunks.length,
      totalTokens,
      categoriesCount,
      lastIndexedAt: this.lastIndexedAt,
      embeddingDimension: 384,
      indexStatus: this.chunks.length > 0 ? 'ready' : 'stale',
    };
  }

  // --- Backup & Restore ---
  public exportVault(): string {
    return JSON.stringify(
      {
        documents: this.documents,
        lastIndexedAt: this.lastIndexedAt,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  public importVault(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.documents)) {
        this.documents = parsed.documents;
        this.reindexAllSync();
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to import RAG vault JSON:', err);
      return false;
    }
  }

  public resetToEmpty(): void {
    this.clearAllDocuments();
  }
}

export const knowledgeVault = new KnowledgeVaultStore();
