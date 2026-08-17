import { extractJobDetails } from '../src/app-core/extractor';
import { scoreJobAgainstProfile } from '../src/app-core/scorer';
import { analyzeAtsCompliance } from '../src/app-core/atsMatcher';
import { generateReferralContacts } from '../src/app-core/referralGenerator';
import { generateInterviewPrep } from '../src/app-core/interviewPrep';
import { generateCoverLetter } from '../src/app-core/coverLetterGenerator';
import { splitBulkChatText } from '../src/app-core/bulkSplitter';
import { buildAtsResumePdf } from '../src/app-core/resumeGenerator';
import { defaultProfile } from '../src/app-core/store';

console.log('=== VERIFYING MULTI-JOB APP CORE PIPELINE ===');

const multiDump = `*Google Recruitment 2026 Drive* 🔥
💼 *Job Role:* Silicon Engineer
👉 *Apply @* https://careers.google.com/jobs/1

---------------------------------------------------

*Microsoft Off-Campus 2026* 🔥
💼 *Job Role:* Full Stack Developer
👉 *Apply @* https://careers.microsoft.com/jobs/2

---------------------------------------------------

*Deloitte Hiring 2026* 🔥
💼 *Job Role:* Associate Analyst
👉 *Apply @* https://deloitte.com/jobs/3`;

const chunks = splitBulkChatText(multiDump);
console.log(`Split ${chunks.length} jobs from multi-job dump. (Expected: 3)`);
if (chunks.length !== 3) throw new Error(`Expected 3 chunks, got ${chunks.length}`);

for (let i = 0; i < chunks.length; i++) {
  const extracted = extractJobDetails(chunks[i]);
  const score = scoreJobAgainstProfile(extracted, defaultProfile);
  console.log(`Job ${i + 1}: ${extracted.companyName} | ${extracted.jobTitle} | Score: ${score.matchScore}%`);
}

console.log('=== MULTI-JOB TEST PASSED PERFECTLY ===');
