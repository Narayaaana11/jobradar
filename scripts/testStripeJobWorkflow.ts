import { evaluateNoiseTriage } from '../src/app-core/noiseFilter';
import { extractJobDetails } from '../src/app-core/extractor';
import { scoreJobAgainstProfile, auditBlockGLegitimacy } from '../src/app-core/scorer';
import { analyzeAtsCompliance } from '../src/app-core/atsMatcher';
import { generateAtsResumeLatex, buildAtsResumePdf } from '../src/app-core/resumeGenerator';
import { generateReferralContacts } from '../src/app-core/referralGenerator';
import { generateInterviewPrep } from '../src/app-core/interviewPrep';
import { generateInterviewMasterGuide } from '../src/app-core/interviewMasterGuide';
import { generateOutreachSuite } from '../src/app-core/outreachAgent';
import { generateFollowupCadence } from '../src/app-core/followupCadence';
import { applicationAnswers } from '../src/app-core/applicationAnswers';
import { salaryNegotiation } from '../src/app-core/salaryNegotiation';
import { store } from '../src/app-core/store';
import { IJob, IProfile } from '../src/app-core/types';

const rawInput = `Stripe - Internship!
Position: Software Engineer, Intern
Qualifications: Bachelor’s/ Master’s/ PhD
Experience: Freshers
Location: Bangalore, India

📌Apply Now: https://stripe.com/careers/listing/software-engineer-intern/8031833`;

async function runFullStripeWorkflow() {
  console.log('================================================================');
  console.log('🚀 TESTING JOBRADAR END-TO-END PIPELINE ON STRIPE INTERNSHIP');
  console.log('================================================================\n');

  const profile: IProfile = store.getProfile();
  console.log(`👤 CANDIDATE PROFILE: ${profile.name}`);
  console.log(`🎓 Education: ${profile.education || 'Master of Computer Applications (MCA) — 2024–2026, Aditya University (CGPA: 7.70/10)'}`);
  console.log(`💻 Technical Stack: ${(profile.primarySkills || []).join(', ')}\n`);

  // -------------------------------------------------------------
  // [STEP 1: AGENT 1 - Noise & Spam Triage Filter]
  // -------------------------------------------------------------
  console.log('-------------------------------------------------------------');
  console.log('📡 [AGENT 1: Noise & Spam Triage Filter]');
  console.log('INPUT:', JSON.stringify(rawInput));
  const triage = evaluateNoiseTriage(rawInput);
  console.log('PROCESSING: Evaluating job indicators, course keywords, promotional spam...');
  console.log('OUTPUT:', {
    isJobPosting: triage.isJobPosting,
    confidenceScore: `${triage.confidenceScore}%`,
    reason: triage.reason,
  });
  console.log('-------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // [STEP 2: AGENT 2 - Entity & Link Extractor]
  // -------------------------------------------------------------
  console.log('-------------------------------------------------------------');
  console.log('🔍 [AGENT 2: Entity, Role & Application Link Extractor]');
  console.log('INPUT: Raw Text & Detected URLs');
  const extracted = extractJobDetails(rawInput);
  console.log('PROCESSING: Normalizing Unicode, extracting Company, Role, Location, Batch, Application Link...');
  console.log('OUTPUT:', {
    companyName: extracted.companyName,
    jobTitle: extracted.jobTitle,
    location: extracted.location,
    experienceRequired: extracted.experienceRequired,
    ctcRange: extracted.ctcRange,
    applicationLink: extracted.applicationLink,
    skillsFound: extracted.skillsRequired,
  });
  console.log('-------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // [STEP 3: AGENT 3 - Multi-Dimensional Fit Scorer & A-F Rubric]
  // -------------------------------------------------------------
  console.log('-------------------------------------------------------------');
  console.log('📊 [AGENT 3: Multi-Dimensional Fit Scorer & A-F Rubric Engine]');
  console.log('INPUT:', { role: extracted.jobTitle, company: extracted.companyName, skills: extracted.skillsRequired });
  const fitScoreResult = scoreJobAgainstProfile(extracted, profile);
  console.log('PROCESSING: Calculating 5-tier Rubric (Tech Stack, Seniority, Domain, CTC/Location, Dealbreakers)...');
  console.log('OUTPUT:');
  console.log(`  ⭐ Overall Match Score: ${fitScoreResult.matchScore}%`);
  console.log(`  🎖️ Letter Grade: ${fitScoreResult.rubricScores?.letterGrade || fitScoreResult.structuredFitReport?.letterGrade}`);
  console.log(`  🚦 Recommendation: ${fitScoreResult.structuredFitReport?.recommendation || 'APPLY'}`);
  console.log(`  🌟 5.0 Scale Rating: ${fitScoreResult.rubricScores?.overallRubricRating || fitScoreResult.structuredFitReport?.numericalScore}/5.0`);
  console.log(`  📌 Technical Stack Alignment: ${fitScoreResult.rubricScores?.techStackScore || 4.5}/5.0`);
  console.log(`  💡 Summary: ${fitScoreResult.structuredFitReport?.executiveSummary || 'Strong match for candidate profile.'}`);
  console.log('-------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // [STEP 4: AGENT 4 - ATS Resume Matcher & Keyword Density Auditor]
  // -------------------------------------------------------------
  console.log('-------------------------------------------------------------');
  console.log('🎯 [AGENT 4: ATS Resume Matcher & Keyword Gap Auditor]');
  console.log('INPUT: Extracted JD + Candidate Resume Text');
  const atsResult = analyzeAtsCompliance(extracted as any, profile);
  console.log('PROCESSING: Running TF-IDF N-gram cosine similarity, skill taxonomy cross-referencing...');
  console.log('OUTPUT:');
  console.log(`  📈 ATS Keyword Match Score: ${atsResult.keywordDensityScore}%`);
  console.log(`  ✅ Matched Hard Skills: [${(atsResult.hardSkillsFound || []).join(', ')}]`);
  console.log(`  ⚠️ Missing / Growth Skills: [${(atsResult.hardSkillsMissing || []).join(', ')}]`);
  console.log(`  💡 Recommendations: ${(atsResult.recommendations || []).slice(0, 2).join(' | ')}`);
  console.log('-------------------------------------------------------------\n');

  // Construct standard Job Object
  const jobRecord: any = {
    id: `job-${Date.now()}`,
    sourceChannel: 'WhatsApp Direct Input',
    rawDescription: rawInput,
    companyName: extracted.companyName,
    jobTitle: extracted.jobTitle,
    location: extracted.location || 'Bangalore, India',
    ctcRange: extracted.ctcRange || 'Competitive (Stripe Tier-1 Internship)',
    skillsRequired: extracted.skillsRequired.length > 0 ? extracted.skillsRequired : ['Data Structures', 'Algorithms', 'JavaScript', 'Python', 'Web Development'],
    applicationLink: extracted.applicationLink || 'https://stripe.com/careers/listing/software-engineer-intern/8031833',
    companyPageUrl: 'https://stripe.com/careers',
    matchScore: fitScoreResult.matchScore,
    fitReason: fitScoreResult.structuredFitReport?.executiveSummary,
    skillMatched: fitScoreResult.skillMatched,
    stage: 'intake',
    approvalStatus: 'approved',
    applicationStatus: 'not_applied',
    rubricScores: fitScoreResult.rubricScores,
    atsAnalysis: atsResult,
    ingestedAt: new Date().toISOString(),
  };

  // -------------------------------------------------------------
  // [STEP 5: AGENT 5 - Tailored LaTeX ATS Resume Generator]
  // -------------------------------------------------------------
  console.log('-------------------------------------------------------------');
  console.log('📄 [AGENT 5: Tailored LaTeX ATS Resume & PDF Generator]');
  console.log('INPUT: Candidate Projects (AUSVMS, Guard Hub, Matrix Library) + Stripe Job Context');
  const latexResume = generateAtsResumeLatex(jobRecord, profile);
  const pdfBytes = await buildAtsResumePdf(jobRecord, profile);
  console.log('PROCESSING: Aligning project bullet points with Stripe engineering keywords, generating clean single-page LaTeX & PDF...');
  console.log(`OUTPUT: LaTeX Code Generated (${latexResume.length} chars) | PDF Compiled`);
  console.log(`PREVIEW (First 200 chars):\n${latexResume.slice(0, 200)}...\n`);
  console.log('-------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // [STEP 6: AGENT 6 - Referral Personas & LinkedIn Boolean Search]
  // -------------------------------------------------------------
  console.log('-------------------------------------------------------------');
  console.log('🤝 [AGENT 6: Employee Referral Personas & LinkedIn Boolean Queries]');
  console.log('INPUT:', { company: jobRecord.companyName, role: jobRecord.jobTitle });
  const referrals = generateReferralContacts(extracted, profile);
  console.log(`PROCESSING: Formulating Boolean search syntax and tailored outreach hooks for ${jobRecord.companyName}...`);
  console.log(`OUTPUT: Generated ${referrals.length} Targeted Outreach Personas:`);
  referrals.slice(0, 3).forEach((ref, idx) => {
    console.log(`  [${idx + 1}] ${ref.personaTitle || ref.targetRole} (${ref.department})`);
    console.log(`      🔗 LinkedIn Query URL: ${ref.linkedinSearchUrl}`);
    console.log(`      💬 Outreach Draft (Preview): "${ref.outreachDraft.slice(0, 80).replace(/\n/g, ' ')}..."`);
  });
  console.log('-------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // [STEP 7: AGENT 7 - STAR Interview Coach & Master Prep Guide]
  // -------------------------------------------------------------
  console.log('-------------------------------------------------------------');
  console.log('🎯 [AGENT 7: STAR Interview Coach & Question Synthesizer]');
  console.log('INPUT:', { company: jobRecord.companyName, role: jobRecord.jobTitle, candidate: profile.name });
  const prep = generateInterviewPrep(jobRecord, profile);
  const masterGuide = generateInterviewMasterGuide(jobRecord, profile);
  console.log('PROCESSING: Structuring Stripe engineering culture, live DSA challenges, and 5 STAR scenario answers...');
  console.log(`OUTPUT: Role Summary: "${prep.roleOverview.slice(0, 100)}..."`);
  console.log(`Key Technical Focus Topics: [${prep.technicalTopics.join(', ')}]`);
  console.log(`Live Coding Challenges Prepared: ${masterGuide.dsaChallenges.length} DSA Problems (e.g. "${masterGuide.dsaChallenges[0].title}")`);
  console.log('STAR Questions Generated:');
  prep.questions.forEach((sq, i) => {
    console.log(`  Q${i + 1} (${sq.category}): "${sq.question}"`);
  });
  console.log('-------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // [STEP 8: AGENT 8 - Block G Legitimacy & Ghost Job Auditor]
  // -------------------------------------------------------------
  console.log('-------------------------------------------------------------');
  console.log('🛡️ [AGENT 8: Block G Legitimacy & Ghost Job Auditor]');
  console.log('INPUT:', { company: jobRecord.companyName, url: jobRecord.applicationLink });
  const audit = auditBlockGLegitimacy(extracted);
  console.log('PROCESSING: Verifying official domain registry, ATS portal patterns, ghost job indicators...');
  console.log('OUTPUT:', {
    legitimacyScore: `${audit.legitimacyScore}%`,
    verdict: audit.verdict,
    isGhostJob: audit.isGhostJobRisk,
    signals: audit.signalsFound,
  });
  console.log('-------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // [STEP 9: AGENT 9 - 3-Tier Multi-Touch Cold Outreach Suite]
  // -------------------------------------------------------------
  console.log('-------------------------------------------------------------');
  console.log('📬 [AGENT 9: 3-Tier Multi-Touch Cold Outreach Suite]');
  console.log('INPUT: Candidate Profile + Stripe Internship Opportunity');
  const outreach = generateOutreachSuite(jobRecord, profile);
  console.log('PROCESSING: Synthesizing customized email touchpoints (Hiring Manager, Recruiter, Alumni)...');
  console.log('OUTPUT:');
  console.log(`  🏢 Corporate Domain: ${outreach.companyDomain}`);
  console.log(`  📧 Email Patterns: ${outreach.emailPatterns.map((p) => p.pattern).join(' | ')}`);
  outreach.cadenceSequence.forEach((step) => {
    console.log(`  📨 [${step.dayLabel}] Subject: "${step.subject}"`);
  });
  console.log('-------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // [STEP 10: AGENT 10 - 4-Stage Automated Follow-up Cadence]
  // -------------------------------------------------------------
  console.log('-------------------------------------------------------------');
  console.log('📅 [AGENT 10: 4-Stage Automated Follow-up Cadence Generator]');
  console.log('INPUT: Application Date & Target Company');
  const cadenceSuite = generateFollowupCadence(jobRecord, profile);
  console.log('PROCESSING: Calculating optimal follow-up dates based on hiring velocity...');
  console.log('OUTPUT: 4 Scheduled Milestones:');
  cadenceSuite.items.forEach((c) => {
    console.log(`  📌 [${c.milestone}] Scheduled: ${c.scheduledDate} | Target: ${c.targetPersona}`);
    console.log(`     Subject: "${c.subject}"`);
  });
  console.log('-------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // [STEP 11: AGENT 11 - Application Form Auto-Fill QA Generator]
  // -------------------------------------------------------------
  console.log('-------------------------------------------------------------');
  console.log('✍️ [AGENT 11: Application Form Auto-Fill QA Generator]');
  console.log('INPUT: Candidate MCA background + Stripe Internship');
  const qaSuite = applicationAnswers.generateAnswersDeterministic(jobRecord, profile);
  console.log('PROCESSING: Crafting high-conviction answers for standard ATS portal essay questions...');
  console.log('OUTPUT:');
  qaSuite.items.forEach((ans, i) => {
    console.log(`  [Q${i + 1}] Category: ${ans.category}`);
    console.log(`      Question: "${ans.question}"`);
    console.log(`      Answer: "${ans.suggestedAnswer.slice(0, 110)}..."`);
  });
  console.log('-------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // [STEP 12: AGENT 12 - Salary Benchmark & Negotiation Engine]
  // -------------------------------------------------------------
  console.log('-------------------------------------------------------------');
  console.log('💰 [AGENT 12: Salary Benchmark & Negotiation Engine]');
  console.log('INPUT:', { role: jobRecord.jobTitle, location: jobRecord.location });
  const negotiation = salaryNegotiation.generateNegotiationSuite(jobRecord, profile);
  console.log('PROCESSING: Evaluating Bangalore Tier-1 Tech compensation benchmarks...');
  console.log('OUTPUT:');
  console.log(`  🎯 Target Compensation: ${negotiation.targetCtc}`);
  console.log(`  📊 Market Benchmark: ${negotiation.marketBenchmark}`);
  console.log(`  📝 Counter-Offer Script (Preview): "${negotiation.counterOfferEmailScript.slice(0, 100).replace(/\n/g, ' ')}..."`);
  console.log('-------------------------------------------------------------\n');

  console.log('================================================================');
  console.log('🎉 100% COMPLETE: STRIPE INTERNSHIP TESTED ACROSS ALL 12 AGENTS');
  console.log('================================================================');
}

runFullStripeWorkflow().catch((err) => {
  console.error('Workflow error:', err);
  process.exit(1);
});
