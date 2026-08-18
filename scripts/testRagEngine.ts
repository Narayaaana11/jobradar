import { generateLocalEmbedding, cosineSimilarity, BM25Index, reciprocalRankFusion } from '../src/app-core/rag/embeddings';
import { chunkDocument, extractKeywords } from '../src/app-core/rag/chunker';
import { knowledgeVault } from '../src/app-core/rag/knowledgeStore';
import { ragAugmentor } from '../src/app-core/rag/ragAugmentor';

console.log('=== TEST 1: 384-D Vector Embeddings & Cosine Similarity ===');

const sdeQuery = 'React.js TypeScript Node.js Full Stack MCA Aditya University AUSVMS';
const customerServiceQuery = 'Amazon Customer Service Associate Voice Process CRM Ticketing Call Center';

const sdeVector = generateLocalEmbedding(sdeQuery);
const csVector = generateLocalEmbedding(customerServiceQuery);

console.log(`Vector dimension: ${sdeVector.length}`);
if (sdeVector.length !== 384) {
  throw new Error(`FAIL: Expected 384 dimensions, got ${sdeVector.length}`);
}

const sdeSelfSim = cosineSimilarity(sdeVector, sdeVector);
const sdeVsCsSim = cosineSimilarity(sdeVector, csVector);

console.log(`SDE Self-Similarity: ${sdeSelfSim.toFixed(4)} (Expected ~1.0)`);
console.log(`SDE vs Customer Support Similarity: ${sdeVsCsSim.toFixed(4)} (Expected low)`);

if (sdeSelfSim < 0.99) {
  throw new Error('FAIL: Self similarity must be 1.0');
}
if (sdeVsCsSim > 0.4) {
  throw new Error('FAIL: SDE and Customer Support queries should have low similarity');
}
console.log('✅ TEST 1 PASSED: Dense embeddings & Cosine similarity working accurately!\n');

console.log('=== TEST 2: Markdown Chunker & Keyword Extraction ===');

const sampleDoc = `
# AUSVMS - Aditya University Security Vehicle Management System
## Overview & Architecture
Developed an enterprise-grade vehicle security automation system using MERN stack and JWT authentication.
Engineered real-time QR code generation and validation pipeline handling 5,000+ daily vehicle movements.
Reduced campus entry queue latency by 45% through indexed MongoDB queries.

## Key Technical Decisions
Selected Tailwind CSS and React for dynamic frontend dashboards with 60 FPS rendering.
Implemented role-based access control (RBAC) with Super Admin, Security Guard, and Faculty tiers.
`;

const chunks = chunkDocument({
  id: 'doc-1',
  title: 'AUSVMS Case Study',
  category: 'project_case_study',
  content: sampleDoc,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tags: ['MERN', 'React', 'MongoDB'],
});
console.log(`Generated ${chunks.length} chunks from document.`);
if (chunks.length === 0) {
  throw new Error('FAIL: Chunker produced 0 chunks');
}
console.log(`First chunk preview: "${chunks[0].text.substring(0, 100)}..."`);
console.log(`Extracted keywords:`, chunks[0].keywords);

console.log('✅ TEST 2 PASSED: Semantic chunker working accurately!\n');

console.log('=== TEST 3: Knowledge Vault Hybrid Search (Dense + BM25) ===');

const vaultStats = knowledgeVault.getStats();
console.log(`Knowledge Vault initialized with: ${vaultStats.totalDocuments} documents, ${vaultStats.totalChunks} chunks.`);

if (vaultStats.totalDocuments < 5) {
  throw new Error(`FAIL: Knowledge vault should have at least 5 seeded documents, found ${vaultStats.totalDocuments}`);
}

// Perform search for SDE
const sdeResults = knowledgeVault.searchHybrid('Full Stack MERN developer React Node.js AUSVMS', 3);
console.log('\nTop Results for SDE Query:');
sdeResults.forEach((r, i) => {
  console.log(`  ${i + 1}. [${Math.round(r.similarityScore * 100)}%] ${r.chunk.documentTitle} (${r.chunk.category})`);
});

if (sdeResults.length === 0 || !sdeResults[0].chunk.documentTitle.includes('AUSVMS') && !sdeResults[0].chunk.documentTitle.includes('Resume')) {
  throw new Error('FAIL: Top result for SDE query should be AUSVMS or Master Resume');
}

console.log('\n✅ TEST 3 PASSED: Knowledge Vault hybrid search functioning accurately!\n');

console.log('=== TEST 4: RAG Career Copilot Chat Query ===');

const testChat = async () => {
  const chatRes = await ragAugmentor.queryRagChat('What projects did Narayana build that showcase full stack architecture?');
  console.log('AI Copilot Context Generated:');
  console.log('  Retrieved Chunks:', chatRes.citations.length);
  console.log('  Source Documents:', chatRes.citations.map(s => s.documentTitle).join(', '));
  console.log('\nResponse Preview:');
  console.log(chatRes.content.substring(0, 300) + '...\n');

  if (chatRes.citations.length === 0 || !chatRes.content.includes('AUSVMS')) {
    throw new Error('FAIL: RAG Copilot failed to cite AUSVMS project in response.');
  }

  console.log('✅ TEST 4 PASSED: RAG Career Copilot query generated grounded response with citations!\n');
  console.log('🎉 ALL RAG & KNOWLEDGE VAULT TESTS PASSED PERFECTLY!\n');
};

testChat().catch((e) => {
  console.error(e);
  process.exit(1);
});
