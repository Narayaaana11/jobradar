import { extractJobDetails, extractValidApplicationLink } from '../src/app-core/extractor';

console.log('=== TEST 1: Amazon Customer Service Role Extraction & Link Disambiguation ===');

const amazonCustomerPost = `
🔥 *Amazon Customer Service Associate Mega Drive 2026* 🔥
💼 *Job Role:* Customer Service Associate (Voice & Chat Process)
📍 *Location:* Hyderabad / Work From Home
💰 *Salary:* ₹3.5 LPA - ₹4.8 LPA
🎓 *Eligibility:* Any Graduate / MCA / B.Tech / Freshers (2024, 2025, 2026 Batch)

👉 *Follow our Telegram:* https://t.me/fake_job_channel
👉 *Join WhatsApp Group:* https://chat.whatsapp.com/INVITE12345
👉 *Follow Instagram:* https://instagram.com/hyderabad_jobs_daily
👉 *Official Amazon Apply Link:* https://amazon.jobs/en/jobs/2849102/customer-service-associate

*Key Responsibilities & Skills:*
- Excellent verbal and written communication in English and Hindi.
- Handle customer inquiries, troubleshooting, CRM ticketing, and email support.
- Problem solving and escalation management.
`;

const extractedAmazon = extractJobDetails(amazonCustomerPost);
console.log('Extracted Company:', extractedAmazon.companyName);
console.log('Extracted Job Title:', extractedAmazon.jobTitle);
console.log('Extracted Apply Link:', extractedAmazon.applicationLink);
console.log('Extracted Location:', extractedAmazon.location);
console.log('Extracted Skills:', extractedAmazon.skillsRequired);

// Assertions
if (extractedAmazon.jobTitle !== 'Customer Service Associate (Voice & Chat Process)' && !extractedAmazon.jobTitle.includes('Customer Service')) {
  throw new Error(`FAIL: Job Title was incorrectly extracted as: "${extractedAmazon.jobTitle}". Expected Customer Service.`);
}

if (extractedAmazon.applicationLink !== 'https://amazon.jobs/en/jobs/2849102/customer-service-associate') {
  throw new Error(`FAIL: Apply link was wrongly extracted as: "${extractedAmazon.applicationLink}". Expected genuine amazon.jobs link.`);
}

console.log('✅ TEST 1 PASSED: Amazon Customer Service extracted accurately with genuine ATS URL!\n');

console.log('=== TEST 2: Software Engineer with Spammed Social Links ===');

const techPost = `
*Deloitte Hiring 2026*
*Role:* Associate Analyst - Full Stack Development
*Location:* Bengaluru
*Apply Here:* https://jobs2.deloitte.com/in/en/job/DELA01923
*Subscribe:* https://youtube.com/c/freejobs
*Skills:* React, Node.js, MongoDB, TypeScript
`;

const extractedTech = extractJobDetails(techPost);
console.log('Extracted Company:', extractedTech.companyName);
console.log('Extracted Job Title:', extractedTech.jobTitle);
console.log('Extracted Apply Link:', extractedTech.applicationLink);

if (extractedTech.applicationLink !== 'https://jobs2.deloitte.com/in/en/job/DELA01923') {
  throw new Error(`FAIL: Expected Deloitte link, got: "${extractedTech.applicationLink}"`);
}

console.log('✅ TEST 2 PASSED: Deloitte SDE extracted accurately!\n');
