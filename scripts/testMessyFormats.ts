import { splitBulkChatText } from '../src/app-core/bulkSplitter';
import { extractJobDetails } from '../src/app-core/extractor';

console.log('================================================================');
console.log('🧪 TESTING 5 MESSY REAL-WORLD FORMATS AGAINST EXTRACTOR/SPLITTER');
console.log('================================================================\n');

// Format A: 4+ Jobs WhatsApp Forward with inconsistent separators & emojis
const formatA = `🔥 MEGA HIRING ALERT 2026 🔥
1) Infosys Off-Campus Recruitment Drive
Role: System Engineer
Locations: Pune / Bangalore / Hyderabad
Salary: 3.6 LPA - 5 LPA
Apply: https://career.infosys.com/job/101
Eligibility: 2024 / 2025 / 2026 Batch
Skills: Java, C++, Python, SQL

==================================================

2. Wipro Turbo 2026 Drive 🚀
💼 Project Engineer
📍 Chennai / Coimbatore / Hyderabad
💰 Package: 6.5 LPA
Link: https://careers.wipro.com/turbo/apply
Batch: 2025 & 2026 Passouts
Skills: Python, React, Cloud Computing

--------------------------------------------------

3) TCS Digital National Qualifier Test (NQT)
Designation: Systems Architect Associate
Location: Mumbai, Pune, Kolkata
CTC: 7.2 - 9.0 LPA
Application URL: https://www.tcs.com/careers/nqt2026
Required: Data Structures, Algorithms, TypeScript, React

**************************************************

4. Capgemini Exceller Off Campus Drive
Job Profile: Senior Analyst
Work Location: Noida / Gurgaon / Bangalore
Eligibility: 2024, 2025, 2026
Register: https://www.capgemini.com/in-en/careers/exceller`;

console.log('--- FORMAT A: Multi-Job WhatsApp Forward (4 Jobs) ---');
const chunksA = splitBulkChatText(formatA);
console.log(`Split count: ${chunksA.length} (Expected: 4)`);
chunksA.forEach((chunk, i) => {
  const ext = extractJobDetails(chunk);
  console.log(`[Job A${i + 1}] Company: "${ext.companyName}" | Role: "${ext.jobTitle}" | Loc: "${ext.location}" | CTC: "${ext.ctcRange}" | Batch: "${ext.experienceRequired}" | Link: "${ext.applicationLink}"`);
});

// Format B: LinkedIn Job Post Copy-Paste with HTML / raw text artifacts
const formatB = `<div><span class="job-card__company">Goldman Sachs</span></div>
<h1 class="job-title">Early Career Software Engineer - Global Investment Research</h1>
<div class="job-meta">
  <span>Location: Bengaluru, Karnataka, India</span>
  <span>Employment Type: Full-Time</span>
</div>
<div class="job-description">
  We are hiring 2024/2025 graduates for our Bangalore office.
  Key technical requirements: React.js, TypeScript, Distributed Systems, Microservices, MongoDB, Docker.
  Salary / Package: ₹28,00,000 - ₹35,00,000 per annum
  Apply at Goldman Sachs careers portal: https://www.goldmansachs.com/careers/jobs/109283
</div>`;

console.log('\n--- FORMAT B: LinkedIn HTML / Scraped Snippet ---');
const extB = extractJobDetails(formatB);
console.log(`Company: "${extB.companyName}"`);
console.log(`Role: "${extB.jobTitle}"`);
console.log(`Location: "${extB.location}"`);
console.log(`CTC: "${extB.ctcRange}"`);
console.log(`Batch/Exp: "${extB.experienceRequired}"`);
console.log(`Link: "${extB.applicationLink}"`);
console.log(`Skills: [${extB.skillsRequired.join(', ')}]`);

// Format C: Job Message with NO apply link (Email / DM / Referral notice)
const formatC = `Urgent Opening at Swiggy!
Looking for Frontend Engineer (React/React Native).
Location: Bangalore (Hybrid)
Experience: 0-2 Years
Send resume to hiring.team@swiggy.in with subject "Frontend SDE"
Package: 18 LPA`;

console.log('\n--- FORMAT C: Message with NO Apply Link (Email / Drop) ---');
const extC = extractJobDetails(formatC);
console.log(`Company: "${extC.companyName}"`);
console.log(`Role: "${extC.jobTitle}"`);
console.log(`Location: "${extC.location}"`);
console.log(`CTC: "${extC.ctcRange}"`);
console.log(`Link: "${extC.applicationLink}"`);

// Format D: Message with complex Indian CTC formats (LPA, Fixed + Variable)
const formatD = `*Adobe Off-Campus Drive 2026*
Role: Associate Quality Engineer
CTC: 16.5 LPA (Fixed 14.5 LPA + 2 Lakhs Bonus)
Location: Noida
Apply here: https://adobe.wd5.myworkdayjobs.com/careers/job/101
Batch: 2025/2026 passouts`;

console.log('\n--- FORMAT D: Complex CTC Format ---');
const extD = extractJobDetails(formatD);
console.log(`Company: "${extD.companyName}"`);
console.log(`Role: "${extD.jobTitle}"`);
console.log(`Location: "${extD.location}"`);
console.log(`CTC: "${extD.ctcRange}"`);
console.log(`Link: "${extD.applicationLink}"`);

// Format E: Mixed English + Hindi / Telugu Hinglish/Tenglish Chat Dump
const formatE = `Guys Urgent update! Amazon lo SDE role open aindi for freshers.
Company: Amazon
Role: Software Development Engineer - I
Location: Hyderabad / Bangalore
Salary / Package: ₹22,00,000 LPA
Eligible batch: 2024, 2025 and 2026 vallu andaru apply cheyyandi fast ga.
Link: https://amazon.jobs/en/jobs/2049281
Skills required: DSA, Python, Java, React, Node.js`;

console.log('\n--- FORMAT E: Hinglish / Tenglish Hybrid Chat Message ---');
const extE = extractJobDetails(formatE);
console.log(`Company: "${extE.companyName}"`);
console.log(`Role: "${extE.jobTitle}"`);
console.log(`Location: "${extE.location}"`);
console.log(`CTC: "${extE.ctcRange}"`);
console.log(`Batch/Exp: "${extE.experienceRequired}"`);
console.log(`Link: "${extE.applicationLink}"`);
console.log(`Skills: [${extE.skillsRequired.join(', ')}]`);
