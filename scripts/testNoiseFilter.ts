import { evaluateNoiseTriage } from '../src/app-core/noiseFilter';

const TEST_MESSAGES = [
  {
    text: 'Good morning guys! Anyone got the link for TCS test yesterday?',
    expectedJob: false,
    label: 'Casual chat greeting',
  },
  {
    text: 'Happy Diwali everyone! Wishing you all the best.',
    expectedJob: false,
    label: 'Festival greeting',
  },
  {
    text: 'Pls share resume format',
    expectedJob: false,
    label: 'Short request',
  },
  {
    text: 'Who is admin here? Pls add my friend +919876543210',
    expectedJob: false,
    label: 'Group admin query',
  },
  {
    text: 'Amazon is hiring SDE-1 for 2026 Batch. Location: Bengaluru. Package: 28 LPA. Skills: DSA, React, Node.js. Apply: https://amazon.jobs/en/jobs/289123',
    expectedJob: true,
    label: 'Structured Amazon Job Posting',
  },
  {
    text: '*Microsoft Off-Campus Drive 2025/2026*\nRole: Software Engineer\nEligibility: MCA / B.Tech\nLocation: Hyderabad\nApply: https://careers.microsoft.com/us/en/job/10293',
    expectedJob: true,
    label: 'WhatsApp Bold-Formatted Microsoft Drive',
  },
  {
    text: 'Infosys Walk-in Recruitment for Systems Engineer role. Freshers 2024/2025/2026 batch eligible. CTC 4.5 - 9.5 LPA. Registration Form: https://forms.gle/xyz123',
    expectedJob: true,
    label: 'Infosys Walk-in Drive with Google Form',
  },
  {
    text: 'Swiggy looking for Full Stack Developer (React/Node/TypeScript). 2026 graduates can apply. Send CV or apply at https://swiggy.careers',
    expectedJob: true,
    label: 'Swiggy Developer Opportunity',
  },
];

console.log('================================================================');
console.log('🛡️ TESTING 3-TIER NOISE & SPAM TRIAGE FILTER');
console.log('================================================================\n');

let passed = 0;

for (let i = 0; i < TEST_MESSAGES.length; i++) {
  const item = TEST_MESSAGES[i];
  const res = evaluateNoiseTriage(item.text);
  const ok = res.isJobPosting === item.expectedJob;
  if (ok) passed++;

  console.log(`[Test #${i + 1}] ${item.label}`);
  console.log(`   Input: "${item.text.slice(0, 60)}..."`);
  console.log(`   Classification: ${res.isJobPosting ? '✅ JOB POSTING' : '🛡️ NOISE / CHAT'} (Signal Score: ${res.signalScore.toFixed(1)}, Confidence: ${res.confidenceScore}%)`);
  console.log(`   Reason: ${res.reason}`);
  console.log(`   Status: ${ok ? 'PASSED ✅' : 'FAILED ❌'}\n`);
}

console.log('================================================================');
console.log(`Summary: ${passed}/${TEST_MESSAGES.length} tests passed (${Math.round((passed / TEST_MESSAGES.length) * 100)}%)`);
console.log('================================================================');

if (passed !== TEST_MESSAGES.length) {
  process.exit(1);
}
