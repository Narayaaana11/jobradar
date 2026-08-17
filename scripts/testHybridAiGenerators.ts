import { extractJobDetails } from '../src/app-core/extractor';
import { defaultProfile } from '../src/app-core/store';
import { generateCoverLetter } from '../src/app-core/coverLetterGenerator';
import { generateInterviewPrep } from '../src/app-core/interviewPrep';
import { scoreJobAgainstProfile } from '../src/app-core/scorer';
import { llmClient } from '../src/app-core/llmClient';

async function testHybridGenerators() {
  console.log('================================================================');
  console.log('🔬 SIDE-BY-SIDE PROOF: OFFLINE HEURISTIC VS LIVE CLOUD LLM');
  console.log('================================================================\n');

  const amazonInput = `Amazon SDE Hiring
Graduation Year: 2024/2025 / 2026
Location: Bengaluru / Hyderabad / Chennai / Delhi
Apply Link: https://www.amazon.jobs/en/jobs/10454435/software-dev-engineer-i-amazon-university-talent-acquisition`;

  const extracted = extractJobDetails(amazonInput);
  const apiKey = process.env.OPENROUTER_API_KEY || defaultProfile.apiKey || '';

  // ── 1. COVER LETTER COMPARISON ──
  console.log('--- 1. COVER LETTER: HEURISTIC TEMPLATE VS LIVE CLOUD LLM ---');
  const offlineLetter = generateCoverLetter(extracted, defaultProfile);
  console.log('📄 [Offline Heuristic Template Output]:');
  console.log(offlineLetter.slice(0, 350) + '...\n');

  console.log('🧠 [Calling Live Cloud LLM: generateAiCoverLetter]...');
  const aiLetterRes = await llmClient.generateAiCoverLetter(extracted, defaultProfile, apiKey);
  if (aiLetterRes.success && aiLetterRes.data) {
    console.log(`✓ AI Model Used: ${aiLetterRes.modelUsed}`);
    console.log('📄 [Live Cloud LLM Output]:');
    console.log(aiLetterRes.data.slice(0, 450) + '...\n');
  } else {
    console.error('❌ AI Cover Letter Call Failed:', aiLetterRes.error);
  }

  // ── 2. INTERVIEW PREP COMPARISON ──
  console.log('--- 2. INTERVIEW PREP: HEURISTIC TEMPLATE VS LIVE CLOUD LLM ---');
  const offlinePrep = generateInterviewPrep(extracted, defaultProfile);
  console.log('📄 [Offline Heuristic Output - Question #1 & #2]:');
  console.log(`Q1: ${offlinePrep.questions[0]?.question}`);
  console.log(`A1: ${offlinePrep.questions[0]?.suggestedAnswer.slice(0, 150)}...`);
  console.log(`Q2: ${offlinePrep.questions[1]?.question}`);
  console.log(`A2: ${offlinePrep.questions[1]?.suggestedAnswer.slice(0, 150)}...\n`);

  console.log('🧠 [Calling Live Cloud LLM: generateAiInterviewPrep]...');
  const aiPrepRes = await llmClient.generateAiInterviewPrep(extracted, defaultProfile, apiKey);
  if (aiPrepRes.success && aiPrepRes.data) {
    console.log(`✓ AI Model Used: ${aiPrepRes.modelUsed}`);
    console.log(`Role Overview: ${aiPrepRes.data.roleOverview}`);
    console.log('📄 [Live Cloud LLM Output - Question #1 & #2]:');
    console.log(`Q1: ${aiPrepRes.data.questions[0]?.question}`);
    console.log(`A1: ${aiPrepRes.data.questions[0]?.suggestedAnswer.slice(0, 150)}...`);
    console.log(`Q2: ${aiPrepRes.data.questions[1]?.question}`);
    console.log(`A2: ${aiPrepRes.data.questions[1]?.suggestedAnswer.slice(0, 150)}...\n`);
  } else {
    console.error('❌ AI Interview Prep Call Failed:', aiPrepRes.error);
  }

  // ── 3. AI RE-SCORE COMPARISON ──
  console.log('--- 3. MATCH SCORER: OFFLINE HEURISTIC VS LIVE CLOUD LLM ---');
  const offlineScore = scoreJobAgainstProfile(extracted, defaultProfile);
  console.log('📄 [Offline Heuristic Score]:', {
    matchScore: offlineScore.matchScore,
    rubricOverall: offlineScore.rubricScores.overallRubricRating,
    rubricTier: offlineScore.rubricScores.rubricTier,
  });

  console.log('🧠 [Calling Live Cloud LLM: scoreJobWithLlm]...');
  const aiScoreRes = await llmClient.scoreJobWithLlm(extracted, defaultProfile, apiKey);
  if (aiScoreRes.success && aiScoreRes.data) {
    console.log(`✓ AI Model Used: ${aiScoreRes.modelUsed}`);
    console.log('📄 [Live Cloud LLM Reasoning Score]:', {
      matchScore: aiScoreRes.data.matchScore,
      rubricOverall: aiScoreRes.data.rubricScores?.overallRubricRating,
      rubricTier: aiScoreRes.data.rubricScores?.rubricTier,
      gapAnalysis: aiScoreRes.data.gapAnalysis,
    });
  } else {
    console.error('❌ AI Scorer Call Failed:', aiScoreRes.error);
  }

  // ── 4. ERROR HANDLING TESTS (NO KEY / INVALID KEY) ──
  console.log('\n--- 4. ERROR HANDLING: NO KEY & INVALID KEY TESTS ---');
  
  // Test A: No API key
  try {
    await llmClient.callLlm('test', 'test', '');
  } catch (err: any) {
    console.log('✓ Missing Key Result (Throws clear actionable error):');
    console.log(`  "${err.message}"`);
  }

  // Test B: Invalid API key
  try {
    await llmClient.callLlm('test', 'test', 'sk-or-v1-invalidkey9999999999999999999999999999');
  } catch (err: any) {
    console.log('✓ Invalid Key Result (Catches upstream provider 401 and returns explicit message):');
    console.log(`  "${err.message}"`);
  }
}

testHybridGenerators();
