import { extractJobDetails } from '../src/app-core/extractor';
import { processIngestion } from '../src/app-core/pipeline';
import { store } from '../src/app-core/store';

async function runEdgeCases() {
  console.log('================================================================');
  console.log('🛡️ TESTING EDGE CASES & ERROR HANDLING');
  console.log('================================================================\n');

  // 1. Empty string test
  console.log('--- 1. EMPTY INPUT TEST ---');
  const emptyExt = extractJobDetails('');
  console.log('Empty text output:', {
    company: emptyExt.companyName,
    role: emptyExt.jobTitle,
    location: emptyExt.location,
    dedupHash: emptyExt.dedupHash,
  });

  // 2. Emoji-only string test
  console.log('\n--- 2. EMOJI-ONLY INPUT TEST ---');
  const emojiExt = extractJobDetails('🔥🔥🔥🚀🚀🚀💼💼💼📍📍📍💰💰💰');
  console.log('Emoji text output:', {
    company: emojiExt.companyName,
    role: emojiExt.jobTitle,
    location: emojiExt.location,
    dedupHash: emojiExt.dedupHash,
  });

  // 3. 10,000 words massive text test
  console.log('\n--- 3. 10,000 WORDS MASSIVE INPUT TEST ---');
  const longText = 'Software Engineer job at Google Hyderabad. ' + 'Lorem ipsum dolor sit amet '.repeat(10000);
  const startLong = Date.now();
  const longExt = extractJobDetails(longText);
  const timeLong = Date.now() - startLong;
  console.log(`Massive 10,000 words parsed in ${timeLong}ms:`, {
    company: longExt.companyName,
    role: longExt.jobTitle,
    location: longExt.location,
  });

  // 4. Duplicate Deduplication Test (Pasting identical job twice)
  console.log('\n--- 4. DEDUPLICATION COLLISION TEST (Same Job Ingested Twice) ---');
  const amazonMsg = `Amazon SDE Hiring
Graduation Year: 2024/2025 / 2026
Location: Bengaluru / Hyderabad / Chennai / Delhi
Apply Link: https://www.amazon.jobs/en/jobs/10454435/software-dev-engineer-i-amazon-university-talent-acquisition`;

  const countBefore = store.getJobs().length;
  console.log(`Initial job count in store: ${countBefore}`);

  // Ingestion #1
  const res1 = await processIngestion(amazonMsg, 'Test Ingest #1');
  const countAfter1 = store.getJobs().length;
  console.log(`Run 1: Extracted ${res1.totalExtracted} jobs. Store count now: ${countAfter1} (+${countAfter1 - countBefore})`);

  // Ingestion #2 (Exact duplicate)
  const res2 = await processIngestion(amazonMsg, 'Test Ingest #2');
  const countAfter2 = store.getJobs().length;
  console.log(`Run 2 (Duplicate): Extracted ${res2.totalExtracted} jobs. Store count now: ${countAfter2} (+${countAfter2 - countAfter1})`);
  
  if (countAfter2 === countAfter1) {
    console.log('✓ DEDUPLICATION VERIFIED: Exact duplicate matched dedupHash ("' + res1.jobs[0].dedupHash + '") and updated in-place without duplicating!');
  } else {
    console.error('❌ DEDUPLICATION FAILED: Duplicate record created!');
  }
}

runEdgeCases();
