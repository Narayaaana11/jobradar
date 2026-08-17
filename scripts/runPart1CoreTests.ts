import { splitBulkChatText } from '../src/app-core/bulkSplitter';
import { extractJobDetails, IExtractedJD } from '../src/app-core/extractor';
import { evaluateNoiseTriage } from '../src/app-core/noiseFilter';
import { scoreJobAgainstProfile } from '../src/app-core/scorer';
import { analyzeAtsCompliance } from '../src/app-core/atsMatcher';
import { generateReferralContacts } from '../src/app-core/referralGenerator';
import { generateCoverLetter } from '../src/app-core/coverLetterGenerator';
import { generateInterviewPrep } from '../src/app-core/interviewPrep';
import { generateAtsResumeLatex, buildAtsResumePdf } from '../src/app-core/resumeGenerator';
import { IProfile } from '../src/app-core/types';
import * as fs from 'fs';
import * as path from 'path';

const candidateProfile: IProfile = {
  name: 'Veera Venkata Naga Satyanarayana Thota',
  email: 'narayananaiduthota@gmail.com',
  phone: '+91 6301253789',
  linkedin: 'https://linkedin.com/in/narayanathota',
  github: 'https://github.com/Narayaaana11',
  portfolio: 'https://www.narayanathota.me',
  location: 'Bhimavaram, Andhra Pradesh',
  title: 'Full Stack Developer | React.js, Node.js, Express, MongoDB',
  targetRoles: ['Full Stack Developer', 'Software Engineer', 'Frontend Developer', 'Backend Developer'],
  primarySkills: ['JavaScript', 'TypeScript', 'React.js', 'Node.js', 'Express.js', 'MongoDB', 'SQL', 'Git', 'REST APIs', 'Python', 'Tailwind CSS', 'Redux'],
  specializations: ['MERN Stack', 'RESTful API Architecture', 'Cloud Backups (AWS S3)'],
  preferredLocations: ['Hyderabad', 'Bengaluru', 'Remote', 'India'],
  expectedGraduation: '2026',
  education: 'Master of Computer Applications (MCA) — Aditya University (2024–2026)',
  experience: 'Full Stack Development Intern @ Technical Hub Pvt. Ltd. (May 2024 – Nov 2024)',
  autoApplyThreshold: 80,
  projects: [
    {
      title: 'AUSVMS — Autonomous Visitor Management System',
      tech: 'React.js, Node.js, Express.js, MongoDB, Tailwind CSS',
      description: 'Production-ready visitor management system handling visitor check-ins, QR passes, and automated host notifications.',
      highlights: [
        'Engineered responsive role-based admin and guard dashboards with <150ms state updates.',
        'Implemented secure JWT auth and MongoDB aggregation pipelines handling 1000+ daily visitor records.'
      ]
    },
    {
      title: 'Guard Hub — Security Duty Roster System',
      tech: 'React, Node.js, Express, MongoDB, Tailwind CSS',
      description: 'Security operations platform managing duty assignments, shift rotations, and real-time attendance logging.',
      highlights: [
        'Built automated shift scheduling algorithms reducing duty assignment overhead by 40%.',
        'Integrated real-time incident logging and emergency broadcast alerts.'
      ]
    }
  ]
};

async function runPart1CoreTests() {
  console.log('================================================================');
  console.log('🧪 PART 1 — CORE PIPELINE REAL EXECUTION AUDIT');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: BULK MULTI-JOB SPLITTER (5+ MESSY REAL FORMATS)
  // -------------------------------------------------------------
  console.log('▶ [TEST 1] Bulk Multi-Job Splitter across 5+ Messy Formats:');

  const format1_numbered = `1. Google is hiring Software Engineer 2026 batch. Location: Bangalore. Skills: React, TypeScript, Node.js. Apply: https://careers.google.com/job1
2. Amazon hiring SDE-1 (Off-Campus 2026). Location: Hyderabad. Skills: Java, AWS, Python. Link: https://amazon.jobs/job2
3. Flipkart Associate Product Engineer. Location: Bengaluru. Tech: React, Redux, Node. Apply here: https://flipkart.com/careers/3`;

  const format2_markdown = `### Cognizant Recruitment 2026
Batch: 2026 Passing out
Skills: Java, SQL, React
Location: Chennai/Hyderabad
Link: https://cognizant.com/genc

-----------------------------------------

### Infosys Recruitment 2026
CTC: 9.5 LPA
Location: Bangalore, Pune
Skills: Python, DSA, Web Dev
Apply: https://infy.com/careers/sp

-----------------------------------------

### Wipro Recruitment 2026
Role: Full Stack Engineer
Skills: Node.js, Express, MongoDB
Link: https://wipro.com/turbo`;

  const format3_whatsapp_forwarded = `*JOB ALERT 1* 🚨
Company: Swiggy
Role: Frontend Engineer - Web
Requirements: React.js, TypeScript, Next.js, Redux
CTC: 14-18 LPA
Location: Bengaluru (Hybrid)
Apply Link: https://swiggy.careers/frontend

=========================================

*JOB ALERT 2* 🚨
Company: Zomato
Role: Backend Engineer
Skills: Node.js, Express, PostgreSQL, Redis
Location: Gurgaon / Remote
Link: https://zomato.com/jobs/backend

=========================================

*JOB ALERT 3* 🚨
Company: Razorpay
Position: Software Engineer (Payments Core)
Tech: TypeScript, Go, React, Microservices
Apply: https://razorpay.com/jobs/sde1`;

  const format4_bulleted_mixed = `Google Hiring 2026
Role: Backend SDE 1. Requires Golang, Kafka, Distributed Systems. Location: Hyderabad. Apply: https://uber.com/sde1

-----------------------------------------

PhonePe Hiring 2026
Full Stack Engineer. Skills: React, Java, Spring Boot, MySQL. Bangalore. https://phonepe.com/careers

-----------------------------------------

CRED Hiring 2026
Backend Developer: Node.js, Redis, MongoDB. CTC: 20 LPA. Bangalore. https://cred.club/careers/sde`;

  const format5_emoji_noisy = `📌 Oracle Recruitment 2026
Cloud Engineer | OCI, Linux, Python, SQL | Bangalore | https://oracle.com/oci-job

📌 Cisco Recruitment 2026
Software Development Engineer | C++, Python, Networking | Bangalore | https://cisco.com/jobs/sde

📌 Atlassian Recruitment 2026
Graduate Software Developer | React, Java, TypeScript | Remote | https://atlassian.com/grad`;

  const splitterTestCases = [
    { name: 'Format 1: Numbered List (1., 2., 3.)', input: format1_numbered, expectedMin: 3 },
    { name: 'Format 2: Markdown / Horizontal Dashes (---)', input: format2_markdown, expectedMin: 3 },
    { name: 'Format 3: WhatsApp Forwarded Alerts (===)', input: format3_whatsapp_forwarded, expectedMin: 3 },
    { name: 'Format 4: Keyword Header Pattern ("Hiring")', input: format4_bulleted_mixed, expectedMin: 3 },
    { name: 'Format 5: Emoji Delimited Dump (📌)', input: format5_emoji_noisy, expectedMin: 3 },
  ];

  let splitterAllPass = true;
  for (const tc of splitterTestCases) {
    const chunks = splitBulkChatText(tc.input);
    const pass = chunks.length >= tc.expectedMin;
    if (!pass) splitterAllPass = false;
    console.log(`  ${pass ? '✅' : '❌'} [${tc.name}] -> Extracted ${chunks.length} distinct jobs (Expected >= ${tc.expectedMin})`);
    chunks.forEach((c, i) => console.log(`     [Chunk ${i+1}]: ${c.substring(0, 70).replace(/\n/g, ' ')}...`));
  }
  console.log(`Splitter Overall: ${splitterAllPass ? '✅ PASS' : '❌ FAIL'}\n`);

  // -------------------------------------------------------------
  // TEST 2: SINGLE-JOB EXTRACTOR (CLEAN & EDGE CASES)
  // -------------------------------------------------------------
  console.log('▶ [TEST 2] Single-Job Extractor Handling of Clean & Garbage Inputs:');
  const edgeCases = [
    { label: 'Empty string', text: '' },
    { label: 'Whitespace & tabs only', text: '   \n\t  \n   ' },
    { label: 'Emojis only', text: '🚀🔥💼✨💯🎉' },
    { label: 'Random garbage string', text: 'asdf kjhasdf lkjhasdf poiuyqwer zxcvbnm 12345678' },
    { label: 'Casual greeting sentence', text: 'Good morning everyone! Hope you all have a productive Monday.' },
    {
      label: 'Legitimate Full Job Description',
      text: `Google is hiring Full Stack Software Engineer (2026 Batch).
Location: Bengaluru / Hyderabad, India
Skills: React, TypeScript, Node.js, Express, MongoDB, Data Structures & Algorithms
CTC: 22-28 LPA
Apply: https://careers.google.com/jobs/results/12345`
    }
  ];

  for (const ec of edgeCases) {
    const isGarbage = ec.label !== 'Legitimate Full Job Description';
    try {
      const res = extractJobDetails(ec.text, 'Test Channel');
      if (isGarbage) {
        console.log(`  ❌ [${ec.label}] -> Fabricated a job: companyName="${res.companyName}", role="${res.jobTitle}"`);
      } else {
        const extractedProperly = res.companyName === 'Google' && res.skillsRequired.includes('React') && res.skillsRequired.includes('Node.js');
        console.log(`  ${extractedProperly ? '✅' : '❌'} [${ec.label}] -> Extracted: Company="${res.companyName}", Role="${res.jobTitle}", Skills=[${res.skillsRequired.join(', ')}], Link="${res.applicationLink}"`);
      }
    } catch (err: any) {
      if (isGarbage) {
        console.log(`  ✅ [${ec.label}] -> Cleanly rejected with error: "${err.message}"`);
      } else {
        console.log(`  ❌ [${ec.label}] -> Threw unexpected error: "${err.message}"`);
      }
    }
  }
  console.log('');

  // -------------------------------------------------------------
  // TEST 3: NOISE / SPAM FILTER CONFUSION MATRIX (15 REAL MESSAGES)
  // -------------------------------------------------------------
  console.log('▶ [TEST 3] Noise/Spam Filter 15-Message Triage Benchmark:');
  const noiseMessages = [
    // 5 REAL JOB POSTINGS (Ground Truth: isJob = true)
    { id: 1, text: 'Hiring React Developer at Paytm. 0-2 yrs exp, CTC: 8 LPA. Skills: React.js, TypeScript, Redux. Apply: https://paytm.com/jobs/1', isJob: true, desc: 'Real Job (Paytm)' },
    { id: 2, text: 'Microsoft Off-Campus 2026 Drive for Software Engineers. Location: Hyderabad. Required: Data Structures, Algorithms, C++, Python. Link: https://microsoft.com/careers', isJob: true, desc: 'Real Job (Microsoft 2026)' },
    { id: 3, text: 'Startup looking for Full Stack Intern (MERN Stack). Stipend: 25k/month. Work from Home. Node.js, React, MongoDB. Send resume to hr@techstartup.io', isJob: true, desc: 'Real Job (Internship)' },
    { id: 4, text: 'Amazon AWS Support Associate - 2025/2026 batch. Location: Bangalore. Skills: Linux, Networking, Python. Apply at amazon.jobs/en/jobs/2849102', isJob: true, desc: 'Real Job (Amazon AWS)' },
    { id: 5, text: 'Immediate Requirement: Backend Developer (Node.js/Express). 1+ yr exp or exceptional freshers with projects. Bangalore. https://angel.co/job/291', isJob: true, desc: 'Real Job (Backend Dev)' },

    // 4 SPAM / PROMOTIONAL (Ground Truth: isJob = false)
    { id: 6, text: 'Earn $500 daily working 2 hours from home! No experience required. Join our VIP crypto trading telegram channel now: t.me/fastmoneycrypto', isJob: false, desc: 'Spam (Crypto Scam)' },
    { id: 7, text: 'Instant personal loans approved in 5 minutes! No CIBIL check. Click http://quickcash-loan.in to claim your 50,000 INR loan today.', isJob: false, desc: 'Spam (Loan Promo)' },
    { id: 8, text: 'Academic essay and thesis writing service! Pay after completion. 100% plagiarism free. WhatsApp +91 9999988888 for quick quote.', isJob: false, desc: 'Spam (Essay Service)' },
    { id: 9, text: 'FREE USDT Giveaway! Claim 50 USDT by registering on this new exchange using referral code WINNER2026 http://airdrop-claim.xyz', isJob: false, desc: 'Spam (Crypto Airdrop)' },

    // 3 CASUAL CHAT / GREETINGS (Ground Truth: isJob = false)
    { id: 10, text: 'Good morning sir, when will the placement training aptitude class start today?', isJob: false, desc: 'Casual Chat (Class query)' },
    { id: 11, text: 'Hey bro, did you receive the assessment link for TCS NQT yet? Let me know.', isJob: false, desc: 'Casual Chat (Friend question)' },
    { id: 12, text: 'Thank you so much for sharing the study notes and resume template, really appreciate it!', isJob: false, desc: 'Casual Chat (Thank you message)' },

    // 3 FORWARDED JUNK / MEMES (Ground Truth: isJob = false)
    { id: 13, text: 'Wishing you and your family a very Happy and Prosperous New Year! May this year bring success and happiness into your life. 🎆🎊', isJob: false, desc: 'Forwarded Junk (Greeting message)' },
    { id: 14, text: 'Motivational Quote of the Day: "The only way to do great work is to love what you do." - Steve Jobs. Keep grinding developers! 💪', isJob: false, desc: 'Forwarded Junk (Motivational quote)' },
    { id: 15, text: 'Why do Java developers wear glasses? Because they don’t C#! 😂😂😂 share with 5 developer friends.', isJob: false, desc: 'Forwarded Junk (Programming joke)' },
  ];

  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (const m of noiseMessages) {
    const triage = evaluateNoiseTriage(m.text, 'Placement Group');
    const pred = triage.isJobPosting;
    if (pred && m.isJob) tp++;
    else if (!pred && !m.isJob) tn++;
    else if (pred && !m.isJob) fp++;
    else if (!pred && m.isJob) fn++;

    const pass = pred === m.isJob;
    console.log(`  ${pass ? '✅' : '❌'} [${m.desc}] -> Ground Truth: ${m.isJob ? 'JOB' : 'NOISE'}, Predicted: ${pred ? 'JOB' : 'NOISE'} (Reason: ${triage.reason})`);
  }

  const accuracy = ((tp + tn) / noiseMessages.length) * 100;
  const fpRate = (fp / (fp + tn)) * 100;
  const fnRate = (fn / (fn + tp)) * 100;

  console.log(`\n  --- Noise Filter Confusion Matrix (N=15) ---`);
  console.log(`  True Positives (Jobs detected):      ${tp}/5`);
  console.log(`  True Negatives (Noise rejected):     ${tn}/10`);
  console.log(`  False Positives (Noise hailed job):  ${fp}/10 (${fpRate.toFixed(1)}%)`);
  console.log(`  False Negatives (Job missed):        ${fn}/5 (${fnRate.toFixed(1)}%)`);
  console.log(`  Overall Accuracy:                    ${accuracy.toFixed(1)}%\n`);

  // -------------------------------------------------------------
  // TEST 4 & 7: HEURISTIC FIT SCORER & ATS MATCHER
  // -------------------------------------------------------------
  console.log('▶ [TEST 4 & 7] Heuristic Fit Scorer & ATS Matcher Execution:');
  const sampleJobJD: IExtractedJD = {
    companyName: 'Amazon Web Services',
    jobTitle: 'Full Stack Software Development Engineer',
    skillsRequired: ['React', 'TypeScript', 'Node.js', 'Express', 'MongoDB', 'SQL', 'REST APIs', 'Git', 'AWS'],
    experienceRequired: '0-2 years (2026 batch eligible)',
    location: 'Hyderabad, India',
    ctcMentioned: true,
    ctcRange: '20-24 LPA',
    rawDescription: `Amazon is looking for Full Stack SDEs. Experience: 0-2 yrs / 2026 MCA/B.Tech graduates.
Skills required: React, TypeScript, Node.js, Express, MongoDB, SQL, REST APIs, Git, AWS.
Role entails building high throughput web services and scalable React frontends.`,
    dedupHash: 'amazon-sde-hyd'
  };

  const fitScoreRes = scoreJobAgainstProfile(sampleJobJD, candidateProfile);
  console.log(`  Heuristic Fit Scorer Result:`);
  console.log(`    Match Score:       ${fitScoreRes.matchScore}%`);
  console.log(`    Score Flag:        ${fitScoreRes.scoreFlag}`);
  console.log(`    Matched Skills:    [${fitScoreRes.gapAnalysis.strongMatches.join(', ')}]`);
  console.log(`    Missing Skills:    [${fitScoreRes.gapAnalysis.missingKeywords.join(', ')}]`);

  const atsMatchRes = analyzeAtsCompliance(sampleJobJD, candidateProfile);
  console.log(`\n  Resume-Matcher ATS Result:`);
  console.log(`    Overall ATS Score: ${atsMatchRes.overallAtsScore}%`);
  console.log(`    Keyword Density:   ${atsMatchRes.keywordDensityScore}%`);
  console.log(`    ATS Format Score:  ${atsMatchRes.atsFormatScore}%`);
  console.log(`    Bullet Impact:     ${atsMatchRes.bulletImpactScore}%`);
  console.log(`    Action Verb Score: ${atsMatchRes.actionVerbScore}%`);
  console.log(`    Hard Skills Found: [${atsMatchRes.hardSkillsFound.join(', ')}]`);
  console.log(`    Hard Skills Miss:  [${atsMatchRes.hardSkillsMissing.join(', ')}]`);
  console.log(`    Key Recs:          "${atsMatchRes.recommendations[0]}"\n`);

  // -------------------------------------------------------------
  // TEST 8: RESUME PDF & LATEX GENERATION
  // -------------------------------------------------------------
  console.log('▶ [TEST 8] Resume PDF & LaTeX Generation:');
  const latexSource = generateAtsResumeLatex(sampleJobJD, candidateProfile);
  console.log(`  LaTeX Generated (${latexSource.length} chars).`);
  console.log(`  Includes Candidate Name: ${latexSource.includes(candidateProfile.name)}`);
  console.log(`  Tailored Target: ${latexSource.includes(sampleJobJD.companyName)}`);

  const pdfDoc = buildAtsResumePdf(sampleJobJD, candidateProfile);
  const pdfOutput = pdfDoc.output('arraybuffer');
  const pdfBuffer = Buffer.from(pdfOutput);
  const isPdfHeader = pdfBuffer.slice(0, 5).toString() === '%PDF-';
  console.log(`  PDF Generated Successfully: ${pdfBuffer.length} bytes compiled (valid PDF header: ${isPdfHeader ? '✅ %PDF-' : '❌ Broken'}).\n`);

  // -------------------------------------------------------------
  // TEST 9, 10, 11: COVER LETTER, INTERVIEW PREP, REFERRALS
  // -------------------------------------------------------------
  console.log('▶ [TEST 9, 10, 11] Heuristic Cover Letter, Interview Prep & Referral Generator:');
  const coverLetter = generateCoverLetter(sampleJobJD, candidateProfile);
  console.log(`  Cover Letter Generated (${coverLetter.length} chars):`);
  console.log(`    Snippet: "${coverLetter.substring(0, 120).replace(/\n/g, ' ')}..."`);

  const interviewPrep = generateInterviewPrep(sampleJobJD, candidateProfile);
  console.log(`  Interview Prep Generated (${interviewPrep.questions.length} questions):`);
  interviewPrep.questions.slice(0, 2).forEach((q, i) => {
    console.log(`    Q${i+1} [${q.category}]: "${q.question}"`);
  });

  const referrals = generateReferralContacts(sampleJobJD, candidateProfile);
  console.log(`  Referral Generator (${referrals.length} outreach personas):`);
  let hasFabricatedEmail = false;
  referrals.forEach((ref) => {
    console.log(`    Persona: ${ref.personaTitle}`);
    console.log(`    Target Role: ${ref.targetRole}`);
    console.log(`    Search URL: ${ref.linkedinSearchUrl}`);
    console.log(`    Message Snippet: "${ref.outreachDraft.substring(0, 80).replace(/\n/g, ' ')}..."`);
    if ((ref as any).email || ref.outreachDraft.includes('@amazon.com') || ref.outreachDraft.includes('@aws.com')) {
      hasFabricatedEmail = true;
    }
  });
  console.log(`  Zero Fabricated Names/Emails Check: ${!hasFabricatedEmail ? '✅ PASS (Only authentic LinkedIn boolean queries)' : '❌ FAIL (Fabricated emails found)'}\n`);
}

runPart1CoreTests().catch(console.error);
