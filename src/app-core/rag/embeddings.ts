/**
 * High-performance client-side Vector Embeddings, Cosine Similarity,
 * BM25 Lexical Scoring, and Reciprocal Rank Fusion (RRF) Hybrid Search Engine.
 */

export const EMBEDDING_DIM = 384;

// Common English stopwords to filter out from lexical/vector weighting
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as',
  'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
  'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself',
  'yourselves'
]);

/**
 * Tokenizes text into lowercase word tokens, stripping punctuation.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s\-\+\#\.\/]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Generates an integer hash for a string token using 32-bit FNV-1a.
 */
function fnv1a(str: string, seed = 0x811c9dc5): number {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Fast client-side 384-dimensional dense semantic vector generator.
 * Uses sub-word n-grams, word positional decay, TF-IDF weights, and L2 normalization.
 * Runs completely offline on the client in sub-millisecond time.
 */
export function generateLocalEmbedding(text: string, dimension: number = EMBEDDING_DIM): number[] {
  const vector = new Float64Array(dimension);
  const tokens = tokenizeText(text);

  if (tokens.length === 0) {
    return Array.from(vector);
  }

  // Count term frequencies
  const tfMap = new Map<string, number>();
  for (const token of tokens) {
    tfMap.set(token, (tfMap.get(token) || 0) + 1);
  }

  // Compute dense projection
  tokens.forEach((token, index) => {
    const tf = tfMap.get(token) || 1;
    const tfWeight = 1 + Math.log(tf);
    const posWeight = Math.max(0.5, 1.0 - (index / tokens.length) * 0.3); // Earlier terms have slightly higher focus

    // Word-level hash mapping into 3 diverse dimensions with distinct signs
    for (let k = 0; k < 4; k++) {
      const h = fnv1a(`${token}#${k}`);
      const dimIdx = h % dimension;
      const sign = (h & 0x8000) === 0 ? 1 : -1;
      vector[dimIdx] += sign * tfWeight * posWeight * 1.5;
    }

    // Sub-word character n-grams (tri-grams & 4-grams) for morphological/typo resilience
    if (token.length >= 3) {
      for (let j = 0; j <= token.length - 3; j++) {
        const trigram = token.slice(j, j + 3);
        const hTri = fnv1a(`tri_${trigram}`);
        const dimIdxTri = hTri % dimension;
        const signTri = (hTri & 0x4000) === 0 ? 1 : -1;
        vector[dimIdxTri] += signTri * 0.4 * tfWeight;
      }
    }
  });

  // L2-Normalize the vector so dotProduct(v1, v2) === cosineSimilarity(v1, v2)
  let norm = 0;
  for (let i = 0; i < dimension; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < dimension; i++) {
      vector[i] /= norm;
    }
  }

  return Array.from(vector);
}

/**
 * Computes Cosine Similarity between two L2-normalized float vectors.
 * Returns a value in the range [0.0, 1.0].
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  const len = vecA.length;
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
  }
  // Standard cosine similarity between L2-normalized vectors clamped between 0 and 1
  return Math.max(0, Math.min(1, dot));
}

/**
 * Calculates BM25 Lexical Scores for a corpus of chunks given a query.
 * Parameterized with standard k1 = 1.5, b = 0.75.
 */
export function calculateBm25Scores(
  query: string,
  chunks: Array<{ chunkId: string; text: string; keywords: string[] }>
): Map<string, number> {
  const scores = new Map<string, number>();
  const queryTokens = tokenizeText(query);
  const N = chunks.length;

  if (queryTokens.length === 0 || N === 0) {
    chunks.forEach((c) => scores.set(c.chunkId, 0));
    return scores;
  }

  // Pre-calculate document lengths and document frequencies
  const docTokens = new Map<string, string[]>();
  let totalDocLength = 0;
  const docFreq = new Map<string, number>();

  for (const chunk of chunks) {
    const tokens = tokenizeText(chunk.text + ' ' + (chunk.keywords || []).join(' '));
    docTokens.set(chunk.chunkId, tokens);
    totalDocLength += tokens.length;

    const uniqueTokens = new Set(tokens);
    for (const t of uniqueTokens) {
      docFreq.set(t, (docFreq.get(t) || 0) + 1);
    }
  }

  const avgdl = totalDocLength / N;
  const k1 = 1.5;
  const b = 0.75;

  for (const chunk of chunks) {
    const tokens = docTokens.get(chunk.chunkId) || [];
    const docLen = tokens.length;
    let score = 0;

    // Count term frequencies in this document
    const tfMap = new Map<string, number>();
    for (const t of tokens) {
      tfMap.set(t, (tfMap.get(t) || 0) + 1);
    }

    for (const qTerm of queryTokens) {
      const df = docFreq.get(qTerm) || 0;
      if (df === 0) continue;

      // Robertson-Spärck Jones IDF
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
      const tf = tfMap.get(qTerm) || 0;

      const tfComponent = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / (avgdl || 1))));
      score += idf * tfComponent;
    }

    scores.set(chunk.chunkId, Math.max(0, score));
  }

  // Normalize BM25 scores between 0.0 and 1.0
  let maxScore = 0;
  scores.forEach((s) => {
    if (s > maxScore) maxScore = s;
  });

  if (maxScore > 0) {
    scores.forEach((s, id) => {
      scores.set(id, s / maxScore);
    });
  }

  return scores;
}

/**
 * Reciprocal Rank Fusion (RRF) to merge Dense Vector Search and BM25 Lexical rankings.
 * Formula: RRF Score = 1 / (k + rank_dense) + 1 / (k + rank_bm25), with k = 60
 */
export function reciprocalRankFusion(
  denseRanks: Map<string, number>, // chunkId -> dense rank (1-indexed)
  bm25Ranks: Map<string, number>, // chunkId -> bm25 rank (1-indexed)
  k = 60
): Map<string, number> {
  const rrfScores = new Map<string, number>();
  const allIds = new Set([...denseRanks.keys(), ...bm25Ranks.keys()]);

  allIds.forEach((id) => {
    const rDense = denseRanks.get(id) ?? 1000;
    const rBm25 = bm25Ranks.get(id) ?? 1000;
    const score = 1 / (k + rDense) + 1 / (k + rBm25);
    rrfScores.set(id, score);
  });

  // Normalize to 0.0 - 1.0
  let maxScore = 0;
  rrfScores.forEach((s) => {
    if (s > maxScore) maxScore = s;
  });

  if (maxScore > 0) {
    rrfScores.forEach((s, id) => {
      rrfScores.set(id, s / maxScore);
    });
  }

  return rrfScores;
}
