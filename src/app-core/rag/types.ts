export type KnowledgeCategory =
  | 'resume'
  | 'project'
  | 'experience'
  | 'star_story'
  | 'tech_note'
  | 'job_market'
  | 'custom';

export interface IKnowledgeDocument {
  id: string;
  title: string;
  category: KnowledgeCategory;
  tags: string[];
  content: string;
  enabled: boolean;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IDocumentChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  category: KnowledgeCategory;
  chunkIndex: number;
  totalChunks: number;
  text: string;
  embedding: number[]; // 384-dimensional dense vector
  tokenCount: number;
  tags: string[];
  keywords: string[];
  createdAt: string;
}

export interface ISearchResult {
  chunk: IDocumentChunk;
  similarityScore: number; // 0.0 - 1.0 (Composite / Hybrid score)
  denseScore: number; // Cosine similarity 0.0 - 1.0
  bm25Score: number; // BM25 lexical score
  rank: number;
  matchedKeywords: string[];
  contextSnippet: string;
}

export interface IRagQueryOptions {
  topK?: number; // Default: 4
  categoryFilter?: KnowledgeCategory | KnowledgeCategory[];
  minScore?: number; // Default: 0.15
  hybridSearch?: boolean; // Default: true (Vector + BM25)
  rerank?: boolean;
}

export interface IRagCitation {
  documentId: string;
  documentTitle: string;
  category: KnowledgeCategory;
  chunkIndex: number;
  similarityScore: number;
  snippet: string;
  tags: string[];
}

export interface IRagChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: IRagCitation[];
  modelUsed?: string;
  queryTimeMs?: number;
}

export interface IRagChatSession {
  id: string;
  title: string;
  messages: IRagChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface IRagPromptContext {
  retrievedChunks: ISearchResult[];
  formattedContext: string;
  topMatchedSkills: string[];
  confidenceScore: number;
  documentsReferenced: string[];
}

export interface IVaultStats {
  totalDocuments: number;
  totalChunks: number;
  totalTokens: number;
  categoriesCount: Record<KnowledgeCategory, number>;
  lastIndexedAt: string | null;
  embeddingDimension: number;
  indexStatus: 'ready' | 'indexing' | 'stale';
}
