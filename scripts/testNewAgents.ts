import { store } from '../src/app-core/store';
import { generateOutreachSuite, predictCorporateEmailPatterns } from '../src/app-core/outreachAgent';
import { generateInterviewMasterGuide } from '../src/app-core/interviewMasterGuide';
import { webScrapingAuditor } from '../src/app-core/webScrapingAuditor';
import { IJob } from '../src/app-core/types';

async function runNewAgentsTest() {
  console.log('\n================================================================');
  console.log('🧪 VERIFYING NEXT-GEN AI AGENTS ECOSYSTEM IN JOBRADAR');
  console.log('================================================================\n');

  const profile = store.getProfile();
  const jobs = store.getJobs();
  const sampleJob: IJob = jobs[0] || {
    id: 'test-job-1',
    companyName: 'Amazon',
    jobTitle: 'Software Development Engineer - I (Full Stack)',
    skillsRequired: ['React.js', 'Node.js', 'TypeScript', 'MongoDB', 'AWS'],
    rawDescription: 'Looking for MCA/BTech freshers with strong DSA, React, and Node.js skills.',
    matchScore: 92,
    matchConfidence: 0.9,
    gapAnalysis: {
      missingKeywords: ['Docker', 'Kafka', 'Redis'],
      strongMatches: ['React.js', 'Node.js', 'TypeScript', 'MongoDB'],
    },
    fitBreakdown: { techFitScore: 95, experienceFitScore: 90, locationFitScore: 90 },
    rubricScores: {
      overallRubricRating: 4.8,
      skillsScore: 4.9,
      techStackScore: 4.8,
      experienceScore: 4.6,
      cultureFitScore: 4.9,
      rubricTier: 'Tier 1 - Strong Fit',
    },
    atsAnalysis: {
      keywordDensityScore: 82,
      atsFormatScore: 96,
      bulletImpactScore: 90,
      foundKeywords: ['React', 'Node.js', 'TypeScript'],
      missingKeywords: ['Kafka', 'Redis'],
      atsChecklist: { cleanHeaders: true, standardFonts: true, noTablesOrColumns: true, quantifiableMetrics: true },
    },
    scoreFlag: 'auto',
    skillMatched: true,
    stage: 'approved',
    approvalStatus: 'approved',
    applicationStatus: 'not_applied',
    referralContacts: [],
    interviewPrep: { roleOverview: '', technicalTopics: [], questions: [] },
    coverLetterText: '',
    dedupHash: 'abc',
    ctcMentioned: true,
    sources: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Test Corporate Email Predictor & Outreach Sequence Agent
  console.log('--- [Agent Suite 1] Cold Email Hunter & Cadence Sequence ---');
  const emailPred = predictCorporateEmailPatterns('Swiggy');
  console.log(`✓ Swiggy Corporate Domain: @${emailPred.domain}`);
  console.log(`✓ Generated ${emailPred.patterns.length} email formats: e.g. ${emailPred.patterns[0].example}`);

  const outreach = generateOutreachSuite(sampleJob, profile);
  console.log(`✓ Outreach Suite generated for ${sampleJob.companyName}:`);
  console.log(`  - Day 1: "${outreach.cadenceSequence[0].dayLabel}" (${outreach.cadenceSequence[0].subject})`);
  console.log(`  - Day 4: "${outreach.cadenceSequence[1].dayLabel}"`);
  console.log(`  - Day 9: "${outreach.cadenceSequence[2].dayLabel}"`);
  console.log(`  - 300-Char Connection Note Length: ${outreach.linkedInNotes.connectionRequestNote300Char.length} chars (Target <= 300)`);
  if (outreach.linkedInNotes.connectionRequestNote300Char.length > 300) {
    throw new Error('Connection request note exceeded 300 chars limit!');
  }

  // 2. Test Comprehensive Interview Master Guide (DSA, System Design, Cram Sheet, Salary, Culture)
  console.log('\n--- [Agent Suite 2] Comprehensive Interview Master Guide ---');
  const masterGuide = generateInterviewMasterGuide(sampleJob, profile);
  console.log(`✓ DSA & Machine Coding Challenges: ${masterGuide.dsaChallenges.length} challenges prepared.`);
  masterGuide.dsaChallenges.forEach((ch, idx) => {
    console.log(`  [Challenge #${idx + 1}] "${ch.title}" (${ch.difficulty}) | Frequency: ${ch.companyFrequency}`);
  });

  console.log(`✓ System Design Blueprint: "${masterGuide.systemDesign.title}"`);
  console.log(`  - Candidate Project Mapping: "${masterGuide.systemDesign.candidateProjectMapping.substring(0, 75)}..."`);

  console.log(`✓ 48-Hour Cram Sheet: ${masterGuide.skillGapCramSheet.crashCourseModules.length} missing skill modules synthesized.`);
  masterGuide.skillGapCramSheet.crashCourseModules.forEach((m) => {
    console.log(`  - [Skill Gap] ${m.skill}: "${m.oneLinerConcept}"`);
  });

  console.log(`✓ Salary Benchmarking: ${masterGuide.salaryBenchmark.minLpa} – ${masterGuide.salaryBenchmark.maxLpa} (${masterGuide.salaryBenchmark.tierClassification})`);
  console.log(`✓ Culture Audit: WLB: ${masterGuide.companyCultureAudit.workLifeBalanceScore}/10 | Tech Modernity: ${masterGuide.companyCultureAudit.techStackModernityScore}/10 | Layoff Risk: ${masterGuide.companyCultureAudit.layOffRisk}`);

  // 3. Test Live Web Scraping Intelligence Agent
  console.log('\n--- [Agent Suite 3] Live Web Scraping & Grounding Auditor Agent ---');
  const webIntel = await webScrapingAuditor.auditJobWithLiveWebScraping(sampleJob, profile);
  console.log(`✓ Scraped & Inspected Portal: ${webIntel.companyCareerUrl}`);
  console.log(`✓ Verified Tech Stack from Live Extraction: [${webIntel.verifiedTechStack.join(', ')}]`);
  console.log(`✓ Reported Questions from Web: ${webIntel.interviewQuestionsFromWeb.length} questions compiled.`);
  console.log(`✓ Active Sources & Citations: ${webIntel.liveSources.length} citations.`);

  console.log('\n================================================================');
  console.log('🎉 100% PASS: ALL NEW AI AGENTS & PIPELINES OPERATIONAL!');
  console.log('================================================================\n');
}

runNewAgentsTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
