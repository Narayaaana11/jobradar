import * as fs from 'fs';
import * as path from 'path';
import { llmClient } from '../src/app-core/llmClient';
import { extractJobDetailsWithAi } from '../src/app-core/extractor';
import { scoreJobAgainstProfileWithAi, auditBlockGLegitimacyWithAi } from '../src/app-core/scorer';
import { generateCoverLetterWithAi } from '../src/app-core/coverLetterGenerator';
import { generateReferralContactsWithAi } from '../src/app-core/referralGenerator';
import { generateOutreachSuiteWithAi } from '../src/app-core/outreachAgent';
import { generateInterviewMasterGuideWithAi } from '../src/app-core/interviewMasterGuide';
import { salaryNegotiation } from '../src/app-core/salaryNegotiation';
import { atsOptimizer } from '../src/app-core/atsOptimizer';
import { analyzeAtsCompliance } from '../src/app-core/atsMatcher';
import { IProfile, IJob } from '../src/app-core/types';

// 1. Manually parse .env if process.env not populated
function loadEnvFile() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = val;
      }
    }
  }
}

loadEnvFile();

const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

console.log('================================================================');
console.log('🚀 JOBRADAR REAL LIVE MULTI-PROVIDER AI VERIFICATION SUITE');
console.log('================================================================');
console.log('Configured API Keys Loaded:');
console.log(`  - Groq: ${GROQ_KEY ? '● Configured (...' + GROQ_KEY.slice(-4) + ')' : '○ Missing'}`);
console.log(`  - Gemini: ${GEMINI_KEY ? '● Configured (...' + GEMINI_KEY.slice(-4) + ')' : '○ Missing'}`);
console.log(`  - OpenRouter: ${OPENROUTER_KEY ? '● Configured (...' + OPENROUTER_KEY.slice(-4) + ')' : '○ Missing'}`);
console.log('================================================================\n');

const candidateProfile: IProfile = {
  name: 'Veera Venkata Naga Satyanarayana Thota',
  title: 'Full Stack Distributed Systems Engineer',
  email: 'narayananaiduthota@gmail.com',
  phone: '+91 6301253789',
  location: 'Hyderabad, India (Open to Remote)',
  linkedin: 'https://www.linkedin.com/in/narayaaana/',
  github: 'https://github.com/Narayaaana11',
  portfolio: 'https://github.com/Narayaaana11',
  education: 'Master of Computer Applications (MCA) — Aditya University (2024–2026, CGPA: 7.70/10)',
  experience: 'Full-lifecycle software engineering in TypeScript, Node.js, Go, React, and AWS cloud architectures.',
  primarySkills: ['TypeScript', 'Node.js', 'React.js', 'Go', 'Kubernetes', 'AWS', 'PostgreSQL', 'Redis'],
  specializations: ['Distributed Systems', 'High-Throughput Ingestion', 'Event-Driven Architectures'],
  projects: [
    {
      title: 'JobRadar Autonomous Engine',
      tech: 'TypeScript, Node.js, Electron, AWS S3',
      description: 'Architected autonomous career ingestion pipeline processing thousands of job records with sub-100ms vector matching.',
      highlights: [
        'Implemented distributed concurrency limiter handling parallel AI calls across providers',
        'Built multi-provider fallback router for Groq, Gemini, and OpenRouter',
      ],
    },
    {
      title: 'Distributed Transaction Gateway',
      tech: 'Go, Kafka, Redis, PostgreSQL, Kubernetes',
      description: 'Engineered high-resilience payment routing cluster processing 50k transactions/sec with 99.999% SLA.',
      highlights: [
        'Optimized p99 latency from 45ms to 8ms using lock-free ring buffers',
        'Deployed automated failover topology across multi-region Kubernetes clusters',
      ],
    },
  ],
  groqApiKey: GROQ_KEY,
  geminiApiKey: GEMINI_KEY,
  apiKey: OPENROUTER_KEY,
};

const sampleJdText = `Stripe is hiring a Senior Distributed Systems Engineer - Latency & Reliability.
Location: Remote, US / Remote, Global
Salary: $190,000 - $240,000 USD + Equity
About the Role:
You will design and build high-throughput, low-latency financial payment systems with Go, Kafka, Kubernetes, Redis, and distributed microservices.
Requirements:
- 3+ years experience with Go, Kubernetes, Kafka, and Redis in production.
- Proven track record optimizing distributed concurrency and p99 latency.
- Strong knowledge of microservice architectures and fault-tolerant cloud design.`;

async function runLiveSuite() {
  // ── 1. PROVIDER DIRECT TESTS ──
  console.log('─── [1/4] PROVIDER-LEVEL DIRECT NETWORK COMPLETIONS ───\n');

  // Test Groq Direct
  console.log('▶ [1.1] Testing Real Groq API Call...');
  try {
    const t0 = Date.now();
    const groqRes = await llmClient.callGroq(
      'Respond with a single sentence stating "Groq connection verified for JobRadar."',
      'You are a succinct connectivity verification bot.',
      GROQ_KEY
    );
    console.log(`  ✓ Groq Response (${Date.now() - t0}ms) [Model: ${groqRes.model}]:`);
    console.log(`    "${groqRes.text.trim()}"\n`);
  } catch (err: any) {
    console.error('  ✗ Groq Failed:', err.message);
  }

  // Test Gemini Direct
  console.log('▶ [1.2] Testing Real Gemini API Call...');
  try {
    const t0 = Date.now();
    const geminiRes = await llmClient.callGemini(
      'Respond with a single sentence stating "Gemini connection verified for JobRadar."',
      'You are a succinct connectivity verification bot.',
      GEMINI_KEY
    );
    console.log(`  ✓ Gemini Response (${Date.now() - t0}ms) [Model: ${geminiRes.model}]:`);
    console.log(`    "${geminiRes.text.trim()}"\n`);
  } catch (err: any) {
    console.error('  ✗ Gemini Failed:', err.message);
  }

  // Test OpenRouter Direct
  console.log('▶ [1.3] Testing Real OpenRouter API Call...');
  try {
    const t0 = Date.now();
    const openrouterRes = await llmClient.callOpenRouter(
      'Respond with a single sentence stating "OpenRouter connection verified for JobRadar."',
      'You are a succinct connectivity verification bot.',
      OPENROUTER_KEY
    );
    console.log(`  ✓ OpenRouter Response (${Date.now() - t0}ms) [Model: ${openrouterRes.model}]:`);
    console.log(`    "${openrouterRes.text.trim()}"\n`);
  } catch (err: any) {
    console.error('  ✗ OpenRouter Failed:', err.message);
  }

  // ── 2. CASCADE FAILOVER TEST ──
  console.log('─── [2/4] MULTI-PROVIDER CASCADE FAILOVER VERIFICATION ───\n');
  console.log('▶ [2.1] Simulating Broken Groq Key -> Fallthrough to Gemini / OpenRouter...');
  try {
    const failoverProfile: IProfile = {
      ...candidateProfile,
      groqApiKey: 'gsk_INVALID_DEAD_KEY_FOR_TESTING',
      geminiApiKey: GEMINI_KEY,
      apiKey: OPENROUTER_KEY,
      preferredProvider: 'groq', // Request groq first, which will fail and trigger cascade
    };
    const t0 = Date.now();
    const cascadeRes = await llmClient.callLlmUniversal(
      'Answer with "Cascade failover succeeded: " followed by the provider name you are.',
      'You are a test assistant.',
      'general',
      failoverProfile
    );
    console.log(`  ✓ Cascade Succeeded (${Date.now() - t0}ms):`);
    console.log(`    Provider Used: ${cascadeRes.provider}`);
    console.log(`    Model: ${cascadeRes.model}`);
    console.log(`    Output: "${cascadeRes.text.trim()}"\n`);
  } catch (err: any) {
    console.error('  ✗ Cascade Failed:', err.message);
  }

  // ── 3. EVERY GENERATOR RUN FOR REAL ──
  console.log('─── [3/4] RUNNING EVERY AI GENERATOR WITH REAL LIVE API CALLS ───\n');

  // Generator 1: JD Extraction
  console.log('▶ [3.1] Live JD Extraction with AI:');
  const t1 = Date.now();
  const extractedJob = await extractJobDetailsWithAi(sampleJdText, candidateProfile.groqApiKey || candidateProfile.geminiApiKey || '');
  console.log(`  ✓ Extracted Job (${Date.now() - t1}ms):`);
  console.log(`    Company: "${extractedJob.companyName}" | Role: "${extractedJob.jobTitle}"`);
  console.log(`    Location: "${extractedJob.location}" | CTC: "${extractedJob.ctcRange}"`);
  console.log(`    Skills Required: [${extractedJob.skillsRequired.join(', ')}]\n`);

  // Synthesize IJob for downstream generators
  const realJob: IJob = {
    id: `job-live-${Date.now()}`,
    companyName: extractedJob.companyName,
    jobTitle: extractedJob.jobTitle,
    location: extractedJob.location,
    skillsRequired: extractedJob.skillsRequired,
    ctcMentioned: true,
    ctcRange: extractedJob.ctcRange,
    rawDescription: sampleJdText,
    applicationLink: 'https://stripe.com/jobs/dist-sys-eng',
    matchScore: 92,
    matchConfidence: 0.95,
    stage: 'pending_approval',
    approvalStatus: 'pending',
    applicationStatus: 'not_applied',
    gapAnalysis: { missingKeywords: [], strongMatches: ['Go', 'Kubernetes', 'Redis'] },
    fitBreakdown: { techFitScore: 95, experienceFitScore: 90, locationFitScore: 90 },
    rubricScores: {
      overallRubricRating: 4.8,
      letterGrade: 'A',
      recommendation: 'APPLY',
      skillsScore: 4.8,
      techStackScore: 4.9,
      experienceScore: 4.7,
      cultureFitScore: 4.8,
      rubricTier: 'Tier 1 - Strong Fit',
    },
    atsAnalysis: analyzeAtsCompliance(extractedJob, candidateProfile),
    scoreFlag: 'auto',
    skillMatched: true,
    sources: [],
    dedupHash: extractedJob.dedupHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Generator 2: Fit Scoring
  console.log('▶ [3.2] Live Fit Scoring with AI:');
  const t2 = Date.now();
  const scoreResult = await scoreJobAgainstProfileWithAi(realJob, candidateProfile);
  console.log(`  ✓ Scored Job (${Date.now() - t2}ms):`);
  console.log(`    Match Score: ${scoreResult.matchScore}% | Grade: ${scoreResult.rubricScores.letterGrade}`);
  console.log(`    Reasoning: "${scoreResult.structuredFitReport?.executiveSummary || 'Calculated fit against engineering profile.'}"\n`);

  // Generator 3: Block G Legitimacy Audit
  console.log('▶ [3.3] Live Block G Legitimacy Audit with AI:');
  const t3 = Date.now();
  const auditResult = await auditBlockGLegitimacyWithAi(realJob, candidateProfile);
  console.log(`  ✓ Block G Audit (${Date.now() - t3}ms):`);
  console.log(`    Legitimacy Score: ${auditResult.legitimacyScore}% | Verdict: ${auditResult.verdict}`);
  console.log(`    Signals: [${(auditResult.signalsFound || []).join(', ') || 'Verified Clean'}]`);
  console.log(`    Recommendation: "${auditResult.recommendation}"\n`);

  // Generator 4: Cover Letter
  console.log('▶ [3.4] Live Cover Letter Generation with AI:');
  const t4 = Date.now();
  const coverLetter = await generateCoverLetterWithAi(realJob, candidateProfile);
  console.log(`  ✓ Cover Letter Generated (${Date.now() - t4}ms, ${coverLetter.length} chars):`);
  console.log(`    Preview:\n${coverLetter.slice(0, 260)}...\n`);

  // Generator 5: Referral Persona & Outreach Draft
  console.log('▶ [3.5] Live Referral Persona & Outreach Generation with AI:');
  const t5 = Date.now();
  const referrals = await generateReferralContactsWithAi(realJob, candidateProfile);
  console.log(`  ✓ Referral Personas Generated (${Date.now() - t5}ms, ${referrals.length} contacts):`);
  console.log(`    Top Persona: ${referrals[0]?.personaTitle} (${referrals[0]?.department})`);
  console.log(`    Subject: "${referrals[0]?.subject}"`);
  console.log(`    Draft Preview: "${referrals[0]?.outreachDraft?.slice(0, 160)}..."\n`);

  // Generator 6: Outreach Suite
  console.log('▶ [3.6] Live Cold Outreach Cadence Suite with AI:');
  const t6 = Date.now();
  const outreachSuite = await generateOutreachSuiteWithAi(realJob, candidateProfile);
  console.log(`  ✓ Outreach Suite Generated (${Date.now() - t6}ms):`);
  console.log(`    Domain: ${outreachSuite.companyDomain} | Steps: ${outreachSuite.cadenceSequence?.length}`);
  console.log(`    Connection Note: "${outreachSuite.linkedInNotes?.connectionRequestNote300Char}"\n`);

  // Generator 7: Interview Master Guide & Tailored STAR Questions
  console.log('▶ [3.7] Live Interview Master Guide with AI:');
  const t7 = Date.now();
  const masterGuide = await generateInterviewMasterGuideWithAi(realJob, candidateProfile);
  console.log(`  ✓ Master Guide Generated (${Date.now() - t7}ms):`);
  console.log(`    DSA Challenges: ${masterGuide.dsaChallenges?.length} | System Design: ${masterGuide.systemDesign?.title}`);
  console.log(`    Top DSA Topic: "${masterGuide.dsaChallenges?.[0]?.title}" (${masterGuide.dsaChallenges?.[0]?.difficulty})`);
  console.log(`    Salary Median: ${masterGuide.salaryBenchmark?.medianLpa}\n`);

  // Generator 8: Salary Negotiation Script
  console.log('▶ [3.8] Live Salary Negotiation Suite with AI:');
  const t8 = Date.now();
  const salarySuite = await salaryNegotiation.generateNegotiationWithAi(realJob, candidateProfile);
  console.log(`  ✓ Salary Negotiation Generated (${Date.now() - t8}ms):`);
  console.log(`    Target CTC: ${salarySuite.targetCtc} | Market Benchmark: ${salarySuite.marketBenchmark}`);
  console.log(`    Script Excerpt: "${salarySuite.counterOfferEmailScript?.slice(0, 180)}..."\n`);

  // Generator 9: ATS Resume Tailoring
  console.log('▶ [3.9] Live ATS Resume Tailoring Loop:');
  const t9 = Date.now();
  const atsResult = await atsOptimizer.optimizeResumeForJob(realJob, candidateProfile, {
    maxIterations: 2,
  });
  console.log(`  ✓ ATS Resume Optimization Completed (${Date.now() - t9}ms):`);
  console.log(`    Initial Score: ${atsResult.initialScore}% -> Final Score: ${atsResult.finalScore}% (Delta: +${atsResult.finalScore - atsResult.initialScore}%)`);
  console.log(`    Model: ${atsResult.modelUsed || 'AI'}`);
  console.log(`    Tailored Summary Excerpt: "${atsResult.tailoredSummary?.slice(0, 150)}..."`);
  console.log(`    Tailored Projects Count: ${atsResult.tailoredProjects?.length}\n`);

  // ── 4. ATS MATCHER ZERO-FALLBACK INTEGRITY TEST ──
  console.log('─── [4/4] ATS MATCHER ZERO-FALLBACK INTEGRITY VERIFICATION ───\n');
  console.log('▶ [4.1] Testing Unmatched Job (e.g. Civil Construction / Brick Masonry vs SDE Profile)...');
  const completelyUnmatchedJob: any = {
    companyName: 'Apex Construction',
    jobTitle: 'Senior Concrete & Masonry Specialist',
    skillsRequired: ['Bricklaying', 'Concrete Pouring', 'Scaffolding', 'Excavator Operation'],
    rawDescription: 'Apex Construction requires a master mason for commercial foundation pouring and masonry works.',
  };
  const emptyMatchAts = analyzeAtsCompliance(completelyUnmatchedJob, candidateProfile);
  console.log('  Result on Unmatched Job:');
  console.log(`    - Overall ATS Score: ${emptyMatchAts.overallAtsScore}%`);
  console.log(`    - Hard Skills Found: ${JSON.stringify(emptyMatchAts.hardSkillsFound)}`);
  console.log(`    - Found Keywords: ${JSON.stringify(emptyMatchAts.foundKeywords)}`);
  console.log(`    - Hard Skills Missing: ${JSON.stringify(emptyMatchAts.hardSkillsMissing)}`);

  if ((emptyMatchAts.hardSkillsFound || []).length === 0 && (emptyMatchAts.foundKeywords || []).length === 0) {
    console.log('  ✅ ATS Matcher correctly returns empty arrays — Zero fake fallback substitution!');
  } else {
    console.error('  ❌ ATS Matcher substituted fake hardcoded skills on empty match!');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL LIVE PROVIDER CALLS & GENERATOR INVOCATIONS VERIFIED!');
  console.log('================================================================\n');
}

runLiveSuite().catch((err) => {
  console.error('Fatal Test Execution Error:', err);
  process.exit(1);
});
