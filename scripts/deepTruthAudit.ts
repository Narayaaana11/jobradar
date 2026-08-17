import { extractJobDetails } from '../src/app-core/extractor';
import { scoreJobAgainstProfile } from '../src/app-core/scorer';
import { analyzeAtsCompliance } from '../src/app-core/atsMatcher';
import { generateReferralContacts } from '../src/app-core/referralGenerator';
import { generateInterviewPrep } from '../src/app-core/interviewPrep';
import { generateCoverLetter } from '../src/app-core/coverLetterGenerator';
import { splitBulkChatText } from '../src/app-core/bulkSplitter';
import { buildAtsResumePdf } from '../src/app-core/resumeGenerator';
import { defaultProfile, store } from '../src/app-core/store';
import { llmClient } from '../src/app-core/llmClient';
import { s3Cloud } from '../src/app-core/s3Client';

console.log('================================================================');
console.log('🕵️‍♂️ DEEP TRUTH AUDIT EXECUTION SCRIPT');
console.log('================================================================\n');

const testInput = `Amazon SDE Hiring
Graduation Year: 2024/2025 / 2026
Location: Bengaluru / Hyderabad / Chennai / Delhi
Apply Link: https://www.amazon.jobs/en/jobs/10454435/software-dev-engineer-i-amazon-university-talent-acquisition`;

console.log('--- TEST DATA INPUT ---');
console.log(testInput);
console.log('------------------------\n');

// 1. EXTRACTOR RUN
console.log('=== 1. EXTRACTOR RUN ===');
const extracted = extractJobDetails(testInput);
console.log(JSON.stringify(extracted, null, 2));

// 2. FIT SCORER RUN
console.log('\n=== 2. FIT SCORER RUN (HEURISTIC / OFFLINE) ===');
const score = scoreJobAgainstProfile(extracted, defaultProfile);
console.log(JSON.stringify(score, null, 2));

// 2b. ATS MATCHER RUN
console.log('\n=== 2b. ATS RESUME-MATCHER RUN ===');
const ats = analyzeAtsCompliance(extracted, defaultProfile);
console.log(JSON.stringify(ats, null, 2));

// 3. DOWNSTREAM: RESUME PDF TAILORING
console.log('\n=== 3. DOWNSTREAM: ATS RESUME PDF COMPILER ===');
const pdfDoc = buildAtsResumePdf(
  {
    id: 'amazon-test-1',
    companyName: extracted.companyName,
    companyPageUrl: null,
    jobTitle: extracted.jobTitle,
    jobType: 'Full-Time',
    location: extracted.location,
    isRemote: false,
    ctcMentioned: extracted.ctcMentioned,
    ctcRange: extracted.ctcRange,
    applicationLink: extracted.applicationLink,
    applicationDeadline: null,
    skillsRequired: extracted.skillsRequired,
    experienceRequired: extracted.experienceRequired,
    rawDescription: extracted.rawDescription,
    sources: [],
    dedupHash: extracted.dedupHash,
    matchScore: score.matchScore,
    matchConfidence: score.matchConfidence,
    gapAnalysis: score.gapAnalysis,
    fitBreakdown: score.fitBreakdown,
    rubricScores: score.rubricScores,
    atsAnalysis: ats,
    scoreFlag: score.scoreFlag,
    skillMatched: score.skillMatched,
    stage: 'approved',
    approvalStatus: 'approved',
    applicationStatus: 'not_applied',
    referralContacts: [],
    interviewPrep: { roleOverview: '', technicalTopics: [], questions: [] },
    coverLetterText: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  defaultProfile
);
const pdfBytes = pdfDoc.output('arraybuffer');
console.log(`Generated PDF byte length: ${pdfBytes.byteLength} bytes.`);

// 4. DOWNSTREAM: COVER LETTER
console.log('\n=== 4. DOWNSTREAM: COVER LETTER GENERATOR ===');
const coverLetter = generateCoverLetter(extracted, defaultProfile);
console.log(coverLetter);

// 5. DOWNSTREAM: REFERRAL GENERATOR
console.log('\n=== 5. DOWNSTREAM: REFERRAL PERSONAS & SEARCH QUERIES ===');
const referrals = generateReferralContacts(extracted, defaultProfile);
console.log(JSON.stringify(referrals, null, 2));

// 6. DOWNSTREAM: INTERVIEW PREP GENERATOR
console.log('\n=== 6. DOWNSTREAM: INTERVIEW PREP GENERATOR ===');
const interviewPrep = generateInterviewPrep(extracted, defaultProfile);
console.log(JSON.stringify(interviewPrep, null, 2));

// 7. S3 ATTEMPT WITH DUMMY CREDS
console.log('\n=== 7. S3 SYNC ATTEMPT WITH DUMMY CREDS ===');
s3Cloud.saveConfig({
  bucket: 'test-bucket-dummy',
  region: 'us-east-1',
  accessKeyId: 'AKIA_DUMMY_KEY_123',
  secretAccessKey: 'dummy_secret_key_456',
});
s3Cloud.syncAllToS3([extracted as any], [], defaultProfile, 'test resume').then((res) => {
  console.log('S3 Sync returned:', res);
  console.log('S3 Status:', s3Cloud.getStatus());
});
