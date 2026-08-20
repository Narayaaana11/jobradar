import { auditBlockGLegitimacy, auditBlockGLegitimacyWithAi } from '../src/app-core/scorer';
import { generateFollowupCadence, generateFollowupCadenceWithAi } from '../src/app-core/followupCadence';
import { replyMatcher } from '../src/app-core/replyMatcher';
import { applicationAnswers } from '../src/app-core/applicationAnswers';
import { salaryNegotiation } from '../src/app-core/salaryNegotiation';
import { scrapingOverseer } from '../src/app-core/scrapingOverseer';
import { llmClient } from '../src/app-core/llmClient';
import { store } from '../src/app-core/store';
import { IJob } from '../src/app-core/types';

async function main() {
  console.log('================================================================');
  console.log('🚀 JOB-RADAR: FULL CAREER INTELLIGENCE & QUALITY GATE AUDIT');
  console.log('================================================================');

  const sampleJob: IJob = {
    id: 'test-jobradar-1',
    companyName: 'Google',
    jobTitle: 'Software Engineer III - Frontend',
    rawDescription: 'We are looking for a Software Engineer III with 3+ years experience in React, TypeScript, and modern web architectures. Must have strong understanding of web performance and state management. Salary: ₹32,00,000 - ₹45,00,000 INR.',
    skillsRequired: ['React', 'TypeScript', 'Node.js', 'System Design'],
    applicationLink: 'https://careers.google.com/jobs/results/12345',
    matchScore: 94,
    matchConfidence: 0.95,
    gapAnalysis: { missingKeywords: [], strongMatches: ['React', 'TypeScript'] },
    fitBreakdown: { techFitScore: 95, experienceFitScore: 90, locationFitScore: 100 },
    rubricScores: {
      overallRubricRating: 4.8,
      letterGrade: 'A',
      recommendation: 'APPLY',
      skillsScore: 4.8,
      techStackScore: 4.8,
      experienceScore: 4.7,
      cultureFitScore: 5.0,
      rubricTier: 'Tier 1 - Strong Fit',
    },
    atsAnalysis: {
      overallAtsScore: 92,
      keywordDensityScore: 90,
      bulletImpactScore: 92,
      atsFormatScore: 95,
      hardSkillsFound: ['React', 'TypeScript'],
      hardSkillsMissing: [],
      recommendations: [],
    } as any,
    scoreFlag: 'auto',
    skillMatched: true,
    stage: 'approved',
    approvalStatus: 'approved',
    applicationStatus: 'applied',
    appliedAt: new Date().toISOString(),
    referralContacts: [],
    interviewPrep: { roleOverview: '', technicalTopics: [], questions: [] },
    coverLetterText: '',
    sources: [],
    dedupHash: 'test-hash-1',
    ctcMentioned: true,
    ctcRange: '₹32,00,000 - ₹45,00,000 INR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const profile = store.getProfile();

  // 1. Test Block G Legitimacy & Ghost Job Audit
  console.log('\n--- [Test 1/8] Block G Legitimacy & Ghost Job Audit ---');
  const blockGAudit = auditBlockGLegitimacy(sampleJob);
  console.log(`✓ Legitimacy Score: ${blockGAudit.legitimacyScore}% | Verdict: "${blockGAudit.verdict}"`);
  console.log(`  Signals: ${blockGAudit.signalsFound.join(', ')}`);
  if (blockGAudit.verdict !== 'Verified Legitimate') {
    throw new Error(`Expected Verified Legitimate, got: ${blockGAudit.verdict}`);
  }

  // 2. Test Automated Follow-up Cadence Generator
  console.log('\n--- [Test 2/8] Automated Follow-up Cadence Generator ---');
  const cadence = generateFollowupCadence(sampleJob, profile);
  console.log(`✓ Generated ${cadence.items.length} follow-up milestones:`);
  cadence.items.forEach(item => {
    console.log(`  - [${item.milestone}] scheduled for ${item.scheduledDate} (Target: ${item.targetPersona})`);
  });
  if (cadence.items.length !== 4) {
    throw new Error(`Expected 4 follow-up steps, got ${cadence.items.length}`);
  }

  // 3. Test Recruiter Reply Matcher
  console.log('\n--- [Test 3/8] Inbound Recruiter Reply Classifier & Auto-Responder ---');
  const recruiterEmail = `Hi Narayana, thank you for applying to the Software Engineer III role at Google. We were very impressed by your background and would love to invite you for a 45-minute technical screen next Tuesday at 3:00 PM IST. Please let us know if this time works for you.`;
  const classified = replyMatcher.classifyHeuristic(recruiterEmail, sampleJob, profile);
  console.log(`✓ Classified Intent: "${classified.intent}" (Confidence: ${classified.confidence}%)`);
  console.log(`  Recommended Action: "${classified.suggestedNextAction}"`);
  console.log(`  Drafted Email Response:\n"${classified.draftedResponse.slice(0, 120)}..."`);
  if (classified.intent !== 'interview_invite') {
    throw new Error(`Expected interview_invite, got ${classified.intent}`);
  }

  // 4. Test Application QA Form Generator
  console.log('\n--- [Test 4/8] Application QA Form Generator (JobRadar) ---');
  const qaSuite = applicationAnswers.generateAnswersDeterministic(sampleJob, profile);
  console.log(`✓ Generated ${qaSuite.items.length} tailored application answers:`);
  qaSuite.items.forEach(item => {
    console.log(`  - [${item.category}] Q: "${item.question}" (Answer length: ${item.suggestedAnswer.length} chars)`);
  });
  if (qaSuite.items.length < 4) {
    throw new Error(`Expected at least 4 QA items, got ${qaSuite.items.length}`);
  }

  // 5. Test Salary Gap & Negotiation Suite
  console.log('\n--- [Test 5/8] Salary Gap & Negotiation Engine ---');
  const negotiation = salaryNegotiation.generateNegotiationSuite(sampleJob, profile);
  console.log(`✓ Target CTC: ${negotiation.targetCtc} | Market Baseline: ${negotiation.marketBenchmark}`);
  console.log(`  Counter-Offer Script (Length: ${negotiation.counterOfferEmailScript.length} chars)`);
  console.log(`  Remote Comp Pushback (Length: ${negotiation.remoteCompPushbackScript.length} chars)`);

  // 6. Test Scraping Overseer Quality Gate
  console.log('\n--- [Test 6/8] Scraping Overseer Quality Gate & Navigation Filter ---');
  const junkJob: IJob = {
    ...sampleJob,
    id: 'junk-1',
    jobTitle: 'Careers',
    companyName: 'Jobs At Stripe',
    rawDescription: 'Explore open roles at Stripe. Home About Careers Contact Us Privacy Policy',
  };
  const isValidJunk = scrapingOverseer.isLegitimateJobTitle(junkJob.jobTitle);
  const isValidReal = scrapingOverseer.isLegitimateJobTitle(sampleJob.jobTitle);
  const sanitized = scrapingOverseer.sanitizeJobsList([junkJob, sampleJob]);

  console.log(`✓ Junk Navigation Title check: ${isValidJunk.valid ? 'VALID' : 'REJECTED'} (Reason: "${isValidJunk.reason}")`);
  console.log(`✓ Real Job Title check: ${isValidReal.valid ? 'VALID' : 'REJECTED'} (Reason: "${isValidReal.reason}")`);
  console.log(`✓ Sanitizer purged ${sanitized.removedCount} junk entries and retained ${sanitized.cleanJobs.length} clean job.`);

  if (isValidJunk.valid || !isValidReal.valid || sanitized.removedCount !== 1 || sanitized.cleanJobs.length !== 1) {
    throw new Error('Scraping Overseer failed validation test');
  }

  // 7. Test AI-Augmented Cadence & Block G Audit Signatures
  console.log('\n--- [Test 7/8] AI Cadence & Block G Audit Endpoints ---');
  const aiCadenceFallback = await generateFollowupCadenceWithAi(sampleJob, profile);
  const aiBlockGFallback = await auditBlockGLegitimacyWithAi(sampleJob);
  console.log(`✓ AI Cadence fallback generated ${aiCadenceFallback.items.length} items`);
  console.log(`✓ AI Block G fallback evaluated score: ${aiBlockGFallback.legitimacyScore}%`);

  // 8. Test AI Knowledge Vault Story Synthesizer Signature
  console.log('\n--- [Test 8/8] AI Knowledge Vault STAR Synthesizer Signature ---');
  if (typeof llmClient.synthesizeKnowledgeVaultWithAi !== 'function') {
    throw new Error('Missing synthesizeKnowledgeVaultWithAi on llmClient');
  }
  console.log('✓ synthesizeKnowledgeVaultWithAi method verified on llmClient.');

  console.log('\n================================================================');
  console.log('🎉 ALL 8 JOBRADAR CAREER INTELLIGENCE & AI AGENT MODULES OPERATIONAL!');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
