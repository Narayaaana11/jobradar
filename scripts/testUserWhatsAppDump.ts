import { splitBulkChatText } from '../src/app-core/bulkSplitter';
import { evaluateNoiseTriage } from '../src/app-core/noiseFilter';
import { extractJobDetails } from '../src/app-core/extractor';
import { scoreJobAgainstProfile } from '../src/app-core/scorer';
import { defaultProfile } from '../src/app-core/store';

const fullUserDump = `[17/08, 2:43 pm] null: 📊 𝟱 𝗕𝗲𝘀𝘁 𝗟𝗲𝗮𝗿𝗻𝗶𝗻𝗴 𝗥𝗲𝘀𝗼𝘂𝗿𝗰𝗲𝘀 𝗧𝗼 𝗠𝗮𝘀𝘁𝗲𝗿 𝗠𝗦 𝗘𝘅𝗰𝗲𝗹 𝗳𝗼𝗿 𝗙𝗥𝗘𝗘 

Excel is one of the most valuable workplace skills — start learning for FREE today!

✅ Beginner Friendly
✅ Learn at Your Own Pace
✅ Improve Excel & Data Analysis Skills
✅ Useful for Jobs & Interviews
✅ Completely FREE Resources

🔗 𝗘𝗻𝗿𝗼𝗹𝗹 𝗙𝗼𝗿 𝗙𝗥𝗘𝗘👇:- 

https://pdlink.in/3UkOmoa

🎓 Perfect for Students | Freshers | Data Analyst Aspirants | Working Professionals
[17/08, 5:13 pm] null: 🚀 Remote Job Opportunity!!

Nagarro Hiring Freshers for Associate

Experience: Freshers/Experienced
Education: Bachelor's/Master's Degree
Salary: Rs 5-6 LPA (Expected)
Location: Remote

Apply: https://kickcharm.com/nagarro-recruitment-hiring-any-graduates/

Join Whatsapp: https://tinyurl.com/43x7pyjk
[17/08, 6:11 pm] null: 🚨 Deloitte Off Campus Drive 2026!!

Deloitte Hiring Freshers for Machine Learning Intern (Generative AI)

Batch: 2024 / 2025 / 2026 / 2027
Salary: Rs 35,000 Per Month (Expected)
Location: Across India

Apply Link: https://freshershunt.in/deloitte-internship-2026/
[17/08, 8:18 pm] null: FREE Masterclass On Latest Technologies 🚀

Topic: Master in AI & Cloud Computing
Date: 18th Aug 2026 | 7:00 PM IST
Speaker: Industry Expert from Microsoft

Register For Free: https://pdlink.in/webinar-ai-cloud
[17/08, 9:01 pm] null: 📊 Master SQL for FREE 

Top 5 YouTube Channels To Learn SQL from Scratch to Advanced.

Watch Now: https://youtu.be/sql-masterclass
[17/08, 10:21 pm] null: *7 NEW OPENINGS — 15 AUGUST*

*1. CDK Global — Assoc Software Engineer*
• Exp: Freshers / 0-2 yrs
• Location: Hyderabad
• Link: https://www.jobsvacancy.in/cdk-global-off-campus-drive-2026/

*2. JioHotstar — Software Development Engineer I*
• Exp: Freshers / 0-2 yrs
• Location: Bengaluru
• Skills: JavaScript, React, Node.js
• Link: https://www.jobsvacancy.in/jiohotstar-recruitment-2026/

*3. KLA — Software Engineer, Full Stack*
• Exp: Freshers / 0-2 yrs
• Location: Chennai
• Skills: React, Python, Java
• Link: https://www.jobsvacancy.in/kla-off-campus-drive-2026/

*4. FedEx — Full Stack Developer I*
• Exp: Freshers / 0-2 yrs
• Location: Hyderabad
• Link: https://www.jobsvacancy.in/fedex-careers-2026/

*5. NNE — Trainee Engineer, Mechanical*
• Exp: Freshers
• Location: Bangalore
• Link: https://www.jobsvacancy.in/nne-trainee-engineer/

*6. Husky Technologies — Mechanical Designer*
• Exp: 0-1 yr
• Location: Chennai
• Link: https://www.jobsvacancy.in/husky-mechanical/

*7. Weaddo — QA Intern*
• Exp: Freshers
• Location: Remote
• Link: https://www.jobsvacancy.in/weaddo-qa-intern/
[18/08, 10:04 am] null: 📌 Amazon REMOTE Jobs 2026!!

Amazon Hiring Freshers for Associate, ML Data Operations

Experience: Freshers / Experienced
Education: Any Graduation
Location: Work From Home
Salary: Rs 3-4.5 LPA (Expected)

Apply: https://kickcharm.com/amazon-work-from-home-jobs-for-freshers-2026/
[18/08, 12:47 pm] null: 🚀 Deloitte Off Campus Drive 2026!!

Deloitte Hiring Freshers for Application Developer

Role: Application Developer
Experience: Freshers / 0-2 Years
Education: BE/B.Tech/MCA/BCA/B.Sc
Location: Across India
Salary: Rs 4.5-6 LPA (Expected)

Apply Link: https://freshershunt.in/deloitte-careers-2026/
[18/08, 4:21 pm] null: 🚨 HARMAN Off Campus Drive 2026!!

HARMAN Hiring Freshers for 2 INTERN ROLES

1. Associate Engineer Intern
2. Software Engineer Intern

Batch: 2024 / 2025 / 2026
Location: Bangalore / Pune / Chennai
Salary: Rs 35,000 Per Month (Expected)

Apply: https://kickcharm.com/harman-careers-2026/
[18/08, 6:01 pm] null: 🚀 Xpentra Technologies Off Campus Drive 2026!!

Xpentra Technologies Hiring Freshers for Backend Developer Internship

Role: Backend Developer Internship
Experience: Freshers
Location: Pune (Work From Office)
Stipend: ₹15,000 / Month + PPO up to ₹4 LPA

Apply Link: https://freshershunt.in/xpentra-technologies-recruitment-2026/
[18/08, 7:42 pm] null: 🚨 Peroptyx Recruitment 2026!!

Peroptyx Hiring Freshers for Data Analyst

Experience: Freshers / Experienced
Education: Any Graduate
Location: Remote (Work from Home)
Salary: Rs 3-4 LPA (Expected)

Apply: https://kickcharm.com/peroptyx-recruitment-2026/
[18/08, 9:46 pm] null: 4 FREE Courses To Boost Your Resume & Confidence 🚀

Enhance your technical skills with top certified courses from Coursera & edX.

1. Python for Everybody
2. Web Development Bootcamp
3. Data Structures & Algorithms
4. Cloud Computing Basics

Link: https://pdlink.in/4-free-courses
[18/08, 10:48 pm] null: *6 NEW OPENINGS — 18 AUGUST*

*1. FRND — Frontend Developer (React)*
• Exp: Freshers / 0-1 yr
• Location: Bangalore
• Link: https://www.jobsvacancy.in/frnd-frontend-developer/

*2. HARMAN — Associate Engineer*
• Exp: Freshers
• Location: Bangalore
• Link: https://www.jobsvacancy.in/harman-associate-engineer/

*3. DarkRange — Cybersecurity Intern*
• Exp: Freshers
• Location: Remote
• Link: https://www.jobsvacancy.in/darkrange-intern/

*4. VIAVI Solutions — Software Engineer*
• Exp: Freshers / 0-2 yrs
• Location: Pune
• Link: https://www.jobsvacancy.in/viavi-software-engineer/

*5. HPE — Graduate Software Engineer*
• Exp: 2025 / 2026 Batch
• Location: Bangalore
• Link: https://www.jobsvacancy.in/hpe-graduate-engineer/

*6. Labcorp — Associate Software Developer*
• Exp: Freshers / 0-2 yrs
• Location: Bangalore
• Link: https://www.jobsvacancy.in/labcorp-associate-developer/
[19/08, 11:09 am] null: 🚀 Cisco Off Campus Drive 2026!!

Cisco Hiring Freshers for Software Engineer (India Engineering)

Role: Software Engineer (India Engineering)
Experience: Freshers / 0-2 Years
Education: B.E / B.Tech / MCA / M.Tech
Location: Bangalore
Salary: Rs 14-18 LPA (Expected)

Apply Link: https://freshershunt.in/cisco-careers-2026/
[19/08, 1:44 pm] null: 🚨 Capital Engineering Off Campus Drive 2026!!

Capital Engineering Hiring Freshers for Data Analytics Internship

Role: Data Analytics Internship
Experience: Freshers / Experienced
Education: Any Graduation
Location: Remote (Work from Home)
Stipend: ₹25,000 / Month

Apply Link: https://freshershunt.in/capital-engineering-internship-2026/
[19/08, 3:37 pm] null: 📌 Cognizant Off Campus Drive 2026!!

Cognizant Hiring Freshers for Service Desk Executive

Role: Service Desk Executive
Experience: Freshers / 0-1 Year
Education: Any Graduate
Location: Hyderabad / Chennai
Salary: Rs 3-4 LPA (Expected)

Apply: https://kickcharm.com/cognizant-recruitment-2026/
[19/08, 7:16 pm] null: 🔥 Salesforce Off Campus Drive 2026!!

Salesforce Hiring for Software Engineering AMTS

Role: Software Engineering AMTS
Eligibility: 2027 Passouts Only
Location: Hyderabad / Bangalore
Salary: Rs 20-32 LPA (Expected)

Apply Link: https://freshershunt.in/salesforce-careers-2027/
[19/08, 10:18 pm] null: 🚨 Deloitte Off Campus Drive 2026!!

Deloitte Hiring Freshers for Freshers Internship

Role: Freshers Internship
Experience: Freshers
Location: Hyderabad / Bangalore
Salary: Rs 30,000 Per Month

Apply Link: https://freshershunt.in/deloitte-freshers-recruitment-2026/
[19/08, 10:57 pm] null: *5 NEW OPENINGS — 19 AUGUST*

*1. Salesforce — Software Engineer AMTS*
• Exp: Freshers / 0-1 yr
• Location: Hyderabad
• Link: https://www.jobsvacancy.in/salesforce-amts-freshers/

*2. Thermo Fisher — Software Engineer I*
• Exp: Freshers / 0-2 yrs
• Location: Bangalore
• Link: https://www.jobsvacancy.in/thermo-fisher-software-engineer/

*3. Amazon — Data Associate (Contract)*
• Exp: Freshers
• Location: Hyderabad
• Link: https://www.jobsvacancy.in/amazon-data-associate/

*4. Amura Marketing — Web QA Engineer*
• Exp: Freshers / 0-1 yr
• Location: Pune
• Link: https://www.jobsvacancy.in/amura-web-qa/

*5. SuperKalam — React Native Developer*
• Exp: Freshers / 0-2 yrs
• Location: Remote
• Skills: React Native, JavaScript, TypeScript
• Link: https://www.jobsvacancy.in/superkalam-react-native/
[20/08, 12:47 pm] null: 🚀 Accenture Off Campus Drive 2026!!

Accenture Hiring Freshers for Custom Software Engineering Associate

Role: Custom Software Engineering Associate
Experience: Freshers / 0-2 Years
Education: BE/B.Tech/MCA/M.Sc
Location: Across India
Salary: Rs 4.5-5.5 LPA (Expected)

Apply Link: https://freshershunt.in/accenture-careers-2026/
`;

console.log('--- 1. Testing Dump Splitting ---');
const chunks = splitBulkChatText(fullUserDump);
console.log(`Total Chunks Found: ${chunks.length}`);

console.log('\n--- 2. Testing Noise Triage, Extraction & Scoring ---');
let validJobsCount = 0;
let filteredSpamCount = 0;

for (let i = 0; i < chunks.length; i++) {
  const chunk = chunks[i];
  const triage = evaluateNoiseTriage(chunk);
  if (!triage.isJobPosting) {
    filteredSpamCount++;
    console.log(`[SPAM/NOISE FILTERED] #${i + 1}: ${triage.reason} | Preview: ${chunk.slice(0, 45).replace(/\n/g, ' ')}...`);
    continue;
  }

  validJobsCount++;
  try {
    const jd = extractJobDetails(chunk);
    const score = scoreJobAgainstProfile(jd, defaultProfile);
    const grade = score.structuredFitReport?.letterGrade || 'N/A';
    const rec = score.structuredFitReport?.recommendation || 'N/A';
    const dealbreaker = score.structuredFitReport?.isDealbreaker ? `[DEALBREAKER: ${score.structuredFitReport.dealbreakersFound[0]}]` : '';

    console.log(`[JOB #${String(validJobsCount).padStart(2, '0')}] ${jd.companyName.padEnd(19)} | ${jd.jobTitle.padEnd(38)} | Grade: ${grade} | Match: ${String(score.matchScore).padStart(3, ' ')}% | Rec: ${rec.padEnd(10)} | URL: ${jd.applicationLink || 'None'} ${dealbreaker}`);
  } catch (err: any) {
    console.error(`[EXTRACTION ERROR] #${i + 1}: ${err.message}`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total Chunks: ${chunks.length}`);
console.log(`Valid Jobs Extracted: ${validJobsCount}`);
console.log(`Spam / Educational Promo Ads Filtered: ${filteredSpamCount}`);
