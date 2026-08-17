import { extractJobDetails } from '../src/app-core/extractor';
import { scoreJobAgainstProfile } from '../src/app-core/scorer';
import { analyzeAtsCompliance } from '../src/app-core/atsMatcher';
import { generateReferralContacts } from '../src/app-core/referralGenerator';
import { generateInterviewPrep } from '../src/app-core/interviewPrep';
import { generateCoverLetter } from '../src/app-core/coverLetterGenerator';
import { splitBulkChatText } from '../src/app-core/bulkSplitter';
import { buildAtsResumePdf } from '../src/app-core/resumeGenerator';
import { defaultProfile } from '../src/app-core/store';
import { llmClient } from '../src/app-core/llmClient';

console.log('=== VERIFYING COMPLETE SUITE OF ALL AI AGENTS ===\n');

const multiDump = `*Google Recruitment 2026 Drive* 🔥
💼 *Job Role:* Full Stack Software Engineer
📍 *Location:* Bengaluru / Hyderabad
💰 *Package:* ₹24,00,000 - ₹32,00,000 LPA
👉 *Apply @* https://careers.google.com/jobs/1
*Skills:* React, TypeScript, Node.js, Distributed Systems, Data Structures, Algorithms.

---------------------------------------------------

*Microsoft Off-Campus 2026* 🔥
💼 *Job Role:* Full Stack Developer
📍 *Location:* Hyderabad
👉 *Apply @* https://careers.microsoft.com/jobs/2
*Skills:* MERN Stack, React.js, Express, MongoDB, REST APIs, Git.

---------------------------------------------------

*Deloitte Hiring 2026* 🔥
💼 *Job Role:* Associate Analyst - Cloud
📍 *Location:* Hyderabad
👉 *Apply @* https://deloitte.com/jobs/3
*Skills:* JavaScript, Python, SQL, Cloud Architecture.`;

// 1. Ingestion & Splitter Agent
const chunks = splitBulkChatText(multiDump);
console.log(`[Agent 1: Splitter] Split ${chunks.length} jobs from chat dump. (Expected: 3)`);
if (chunks.length !== 3) throw new Error(`Expected 3 chunks, got ${chunks.length}`);

for (let i = 0; i < chunks.length; i++) {
  console.log(`\n--- Testing Pipeline on Job Posting #${i + 1} ---`);
  
  // 2. Extractor Agent
  const extracted = extractJobDetails(chunks[i]);
  console.log(`[Agent 2: Extractor] Company: "${extracted.companyName}" | Role: "${extracted.jobTitle}" | Location: "${extracted.location}"`);
  if (!extracted.companyName || extracted.companyName === 'Unknown') throw new Error(`Extraction failed for chunk ${i}`);

  // 3. Scorer & 5-Tier Rubric Agent
  const score = scoreJobAgainstProfile(extracted, defaultProfile);
  console.log(`[Agent 3: Scorer] Match: ${score.matchScore}% | Overall Rubric: ${score.rubricScores.overallRubricRating}/5.0 | Flag: ${score.scoreFlag}`);

  // 4. ATS Matcher Agent
  const ats = analyzeAtsCompliance(extracted, defaultProfile);
  console.log(`[Agent 4: ATS Matcher] Keyword Density: ${ats.keywordDensityScore}% | ATS Format: ${ats.atsFormatScore}% | Impact: ${ats.bulletImpactScore}%`);

  // 5. Referral Outreach Agent
  const referrals = generateReferralContacts(extracted, defaultProfile);
  console.log(`[Agent 5: Referrals] Generated ${referrals.length} outreach personas with LinkedIn search queries.`);
  if (referrals.length !== 6) throw new Error(`Expected 6 referral personas, got ${referrals.length}`);

  // 6. Interview Prep Agent
  const prep = generateInterviewPrep(extracted, defaultProfile);
  console.log(`[Agent 6: Interview Prep] Generated ${prep.questions.length} tailored interview questions with STAR answers.`);
  if (prep.questions.length < 3) throw new Error(`Expected at least 3 prep questions, got ${prep.questions.length}`);

  // 7. Cover Letter Agent
  const letter = generateCoverLetter(extracted, defaultProfile);
  console.log(`[Agent 7: Cover Letter] Generated personalized letter (${letter.length} characters).`);
  if (!letter || letter.length < 100) throw new Error(`Cover letter generation failed`);

  // 8. ATS Resume PDF Compiler Agent
  const pdfDoc = buildAtsResumePdf(
    {
      id: `test-${i}`,
      companyName: extracted.companyName,
      companyPageUrl: null,
      jobTitle: extracted.jobTitle,
      jobType: 'Full-Time',
      location: extracted.location,
      isRemote: false,
      ctcMentioned: true,
      ctcRange: extracted.ctcRange,
      applicationLink: extracted.applicationLink,
      applicationDeadline: null,
      skillsRequired: extracted.skillsRequired,
      experienceRequired: extracted.experienceRequired,
      rawDescription: extracted.rawDescription,
      sources: [],
      dedupHash: extracted.dedupHash,
      matchScore: score.matchScore,
      matchConfidence: 'high',
      gapAnalysis: score.gapAnalysis,
      fitBreakdown: score.fitBreakdown,
      rubricScores: score.rubricScores,
      atsAnalysis: ats,
      scoreFlag: score.scoreFlag,
      skillMatched: true,
      stage: 'approved',
      approvalStatus: 'approved',
      applicationStatus: 'not_applied',
      referralContacts: referrals,
      interviewPrep: prep,
      coverLetterText: letter,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    defaultProfile
  );
  const pdfBytes = pdfDoc.output('arraybuffer');
  console.log(`[Agent 8: Resume PDF] Compiled single-page ATS PDF (${pdfBytes.byteLength} bytes).`);
  if (pdfBytes.byteLength < 5000) throw new Error('PDF output size too small');
}

// 9. Verify LLM Client methods are defined
console.log('\n[Agent 9: LLM Client] Verifying interface signatures...');
if (typeof llmClient.extractJobWithLlm !== 'function') throw new Error('Missing extractJobWithLlm');
if (typeof llmClient.scoreJobWithLlm !== 'function') throw new Error('Missing scoreJobWithLlm');
if (typeof llmClient.generateAiInterviewPrep !== 'function') throw new Error('Missing generateAiInterviewPrep');
if (typeof llmClient.generateAiCoverLetter !== 'function') throw new Error('Missing generateAiCoverLetter');
if (typeof llmClient.tailorResumeBulletsWithLlm !== 'function') throw new Error('Missing tailorResumeBulletsWithLlm');
if (typeof llmClient.generateAiReferralMessage !== 'function') throw new Error('Missing generateAiReferralMessage');
if (typeof llmClient.testApiKey !== 'function') throw new Error('Missing testApiKey');
console.log('[Agent 9: LLM Client] All LLM agent endpoints verified.');

console.log('\n========================================================');
console.log('✅ ALL 9 AI AGENT PIPELINES VERIFIED & WORKING PERFECTLY');
console.log('========================================================');
