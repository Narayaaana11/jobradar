import { processIngestion } from '../src/app-core/pipeline';
import { fetchAndExtractJobFromUrl } from '../src/app-core/webFetcher';
import { generateAtsResumeLatex } from '../src/app-core/resumeGenerator';
import { store } from '../src/app-core/store';

async function testRazorpayAiBuilders() {
  console.log('================================================================');
  console.log('🧪 LIVE AUDIT: TESTING RAZORPAY AI BUILDERS APPLICATION PIPELINE');
  console.log('URL: https://razorpay.com/ai-builders/');
  console.log('================================================================\n');

  const url = 'https://razorpay.com/ai-builders/';
  const profile = store.getProfile();

  console.log('--- Step 1: Web Scraper & HTML Cleaner ---');
  const extracted = await fetchAndExtractJobFromUrl(url);
  console.log('Extracted Company:', extracted.companyName);
  console.log('Extracted Role:', extracted.jobTitle);
  console.log('Extracted Location:', extracted.location);
  console.log('Extracted Skills:', extracted.skillsRequired);
  console.log('Extracted Apply Link:', extracted.applicationLink);
  console.log('Clean Scraped Text Length:', extracted.rawDescription?.length, 'chars');
  console.log('Scraped Text Preview:', extracted.rawDescription?.slice(0, 300).replace(/\n/g, ' '));
  console.log('\n--- Step 2: Running Full 12-Agent Ingestion Pipeline ---');
  const result = await processIngestion(url, 'Web Ingestion', 'web', false);

  if (result.jobs.length === 0) {
    console.error('❌ Failed to process job!');
    return;
  }

  const job = result.jobs[0];
  console.log('✓ Pipeline Job Created:', job.id);
  console.log('✓ Company Name:', job.companyName);
  console.log('✓ Job Title:', job.jobTitle);
  console.log('✓ Fit Score:', job.matchScore + '%');
  console.log('✓ Rubric Rating:', job.rubricScores?.overallRubricRating, 'Grade:', job.rubricScores?.letterGrade);
  console.log('✓ ATS Score:', job.atsAnalysis?.overallAtsScore + '%');
  console.log('✓ Matched Skills:', job.atsAnalysis?.hardSkillsFound);
  console.log('✓ Missing Skills to Highlight:', job.atsAnalysis?.hardSkillsMissing);

  console.log('\n--- Step 3: Candidate Resume & Projects Alignment ---');
  const latex = generateAtsResumeLatex(job, profile);
  const hasAusvms = latex.includes('AUSVMS');
  const hasGuardHub = latex.includes('Guard Hub');
  const hasMatrix = latex.includes('Matrix Library');
  const hasJobRadar = latex.includes('JobRadar');
  console.log('✓ Real Candidate Project (AUSVMS) in Resume:', hasAusvms);
  console.log('✓ Real Candidate Project (Guard Hub) in Resume:', hasGuardHub);
  console.log('✓ Real Candidate Project (Matrix Library) in Resume:', hasMatrix);
  console.log('✓ Real Candidate Project (JobRadar) in Resume:', hasJobRadar);

  console.log('\n--- Step 4: Outreach & Referral Engine ---');
  console.log('✓ Outreach Personas Count:', job.referralContacts?.length || job.outreachSuite?.personas?.length);
  if (job.referralContacts?.[0]) {
    console.log('  Top Persona:', job.referralContacts[0].personaTitle, '(', job.referralContacts[0].targetRole, ')');
    console.log('  LinkedIn Search URL:', job.referralContacts[0].linkedinSearchUrl);
  }

  console.log('\n--- Step 5: Tailored Interview Prep & QA Answers ---');
  console.log('✓ Interview Questions Count:', job.interviewPrep?.questions?.length);
  if (job.interviewPrep?.questions?.[0]) {
    console.log('  Q1:', job.interviewPrep.questions[0].question);
    console.log('  A1 (Suggested Strategy):', job.interviewPrep.questions[0].suggestedAnswer?.slice(0, 140) + '...');
  }

  console.log('\n--- Step 6: Cover Letter Generation ---');
  console.log('✓ Cover Letter Length:', job.coverLetterText?.length, 'chars');
  console.log('  Preview:', job.coverLetterText?.slice(0, 200).replace(/\n/g, ' ') + '...');

  console.log('\n--- Step 7: Block G Legitimacy & Ghost Job Audit ---');
  console.log('✓ Legitimacy Score:', job.blockGAudit?.legitimacyScore + '%', '| Verdict:', job.blockGAudit?.verdict);
  console.log('  Signals:', job.blockGAudit?.signalsFound);

  console.log('\n================================================================');
  console.log('✅ AUDIT COMPLETE: RAZORPAY AI BUILDERS FULLY TESTED');
  console.log('================================================================\n');
}

testRazorpayAiBuilders().catch(console.error);
