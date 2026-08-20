import { llmClient } from '../src/app-core/llmClient';
import { linkResolver } from '../src/app-core/linkResolver';
import { atsOptimizer } from '../src/app-core/atsOptimizer';
import { runTargetAiPipeline } from '../src/app-core/pipeline';
import { store } from '../src/app-core/store';
import { IProfile, IJob } from '../src/app-core/types';
import { generateInterviewMasterGuide } from '../src/app-core/interviewMasterGuide';
import { generateCoverLetter } from '../src/app-core/coverLetterGenerator';
import { generateReferralContacts } from '../src/app-core/referralGenerator';
import { generateOutreachSuite } from '../src/app-core/outreachAgent';
import { generateInterviewPrep } from '../src/app-core/interviewPrep';
import { salaryNegotiation } from '../src/app-core/salaryNegotiation';
import { applicationAnswers } from '../src/app-core/applicationAnswers';
import { generateAtsResumeLatex } from '../src/app-core/resumeGenerator';

async function runTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING JOBRADAR FULL AI-NATIVE REFACTOR VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✕ [FAIL] ${testName}`);
      failed++;
    }
  }

  const testProfile: IProfile = {
    name: 'Jane Candidate Doe',
    title: 'Senior Full Stack Cloud Engineer',
    email: 'jane.doe@example.com',
    phone: '+1 555-0199',
    location: 'Seattle, WA',
    education: 'M.S. in Computer Science (2026), Stanford University',
    experience: '3+ years full-lifecycle cloud architecture and React/Node engineering',
    linkedin: 'https://linkedin.com/in/janedoe',
    github: 'https://github.com/janedoe',
    portfolio: 'https://janedoe.dev',
    primarySkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Redis', 'GraphQL'],
    specializations: ['Distributed Systems', 'Cloud Scalability', 'Real-Time Messaging'],
    projects: [
      {
        title: 'Project Nimbus Stream',
        tech: 'TypeScript, React, WebSocket, AWS Lambda, Redis',
        description: 'Engineered high-throughput event processing engine handling 120k events/sec with sub-50ms latency.',
        highlights: [
          'Architected serverless ingestion pipeline reducing operational latency by 45%',
          'Designed fault-tolerant Redis pub/sub queue with automatic retry exponential backoff',
        ],
      },
      {
        title: 'Quantum Ledger Core',
        tech: 'Node.js, PostgreSQL, Docker, Kubernetes',
        description: 'Built idempotent financial transaction consensus service with 99.999% audit accuracy.',
        highlights: [
          'Implemented distributed locking mechanism eliminating race conditions in concurrent transfers',
          'Automated CI/CD deployment pipelines on Kubernetes cutting release overhead by 60%',
        ],
      },
    ],
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'llama3.2',
    preferredProvider: 'auto',
  };

  const testJob: Partial<IJob> = {
    id: 'test-job-001',
    companyName: 'CloudScale Inc',
    jobTitle: 'Senior Full Stack Engineer',
    location: 'Remote, US',
    skillsRequired: ['TypeScript', 'React', 'Node.js', 'AWS', 'Redis', 'Docker'],
    rawDescription: `CloudScale Inc is hiring a Senior Full Stack Engineer.
Must have strong experience in TypeScript, React, Node.js, AWS serverless architectures, and Redis caching.
Responsible for building mission-critical real-time cloud data pipelines and responsive UI interfaces.`,
  };

  // ── TEST 1: Link Resolution Agent URL Unwrapping ──
  console.log('1. Testing Link Resolution Agent Redirect Unwrapping:');
  const wrappedUrl = 'https://link.jobradar.internal/gate?redirect=https%3A%2F%2Fcareers.cloudscale.com%2Fjobs%2Fsenior-full-stack%3Fref%3Dboard';
  const unwrapped = linkResolver.unwrapEmbeddedUrl(wrappedUrl, '');
  assert(unwrapped === 'https://careers.cloudscale.com/jobs/senior-full-stack?ref=board', 'Unwraps nested redirect query parameter');

  const resolved = await linkResolver.resolveLink(
    'https://careers.cloudscale.com/apply/senior-dev',
    '<html><title>Apply at CloudScale</title><body><h1>Senior Full Stack</h1><a href="https://boards.greenhouse.io/cloudscale/jobs/401">Apply Online</a></body></html>'
  );
  assert(resolved.isJobPage === true, 'Classifies career link properly');
  assert(resolved.redirectHops.length >= 1, 'Tracks resolution trajectory hops');

  // ── TEST 2: Iterative ATS Resume Optimizer ──
  console.log('\n2. Testing Iterative ATS Resume Optimizer:');
  const atsResult = await atsOptimizer.optimizeResumeForJob(testJob, testProfile, { maxIterations: 2 });
  assert(typeof atsResult.finalScore === 'number' && atsResult.finalScore >= 70, `Calculates ATS compliance score (Score: ${atsResult.finalScore}%)`);
  assert(atsResult.tailoredSummary.includes(testProfile.name) || atsResult.tailoredSummary.includes(testJob.companyName || ''), 'Tailored summary is contextualized');
  assert(atsResult.latexResume.includes(testProfile.name), 'Generated LaTeX resume contains candidate name');
  assert(!atsResult.latexResume.includes('AUSVMS') && !atsResult.latexResume.includes('Guard Hub'), 'Zero static project hallucination in ATS generator');

  // ── TEST 3: Zero Hardcoded Personal Information in Heuristic Generators ──
  console.log('\n3. Testing Generator Parameterization (Zero Hardcoded Personal Details):');
  const guide = generateInterviewMasterGuide(testJob as IJob, testProfile);
  assert(guide.systemDesign.candidateProjectMapping.includes(testProfile.projects[0].title), 'Interview guide maps real candidate project');
  assert(guide.salaryBenchmark.negotiationScript.includes(testProfile.name), 'Salary negotiation script references candidate name');

  const letter = generateCoverLetter(testJob, testProfile);
  assert(letter.includes(testProfile.name), 'Cover letter signed with candidate name');
  assert(letter.includes(testProfile.education), 'Cover letter references candidate education');

  const referrals = generateReferralContacts(testJob, testProfile);
  assert(referrals.length >= 3, 'Generates full set of referral personas');
  assert(referrals[0].outreachDraft.includes(testProfile.name), 'Referral outreach draft personalized to candidate');

  const outreach = generateOutreachSuite(testJob as IJob, testProfile);
  assert(outreach.cadenceSequence[0].body.includes(testProfile.name), 'Cold email cadence personalized to candidate');

  const prep = generateInterviewPrep(testJob, testProfile);
  assert(prep.questions.length >= 3, 'Generates role-tailored STAR questions');

  const negSuite = salaryNegotiation.generateNegotiationSuite(testJob as IJob, testProfile);
  assert(negSuite.counterOfferEmailScript.includes(testProfile.name), 'Counter-offer script references candidate name');

  const answers = applicationAnswers.generateAnswersDeterministic(testJob as IJob, testProfile);
  assert(answers.items.length === 4, 'Generates 4 ATS application field answers');

  const latexResume = generateAtsResumeLatex(testJob, testProfile);
  assert(latexResume.includes('Project Nimbus Stream'), 'LaTeX resume includes candidate project');
  assert(latexResume.includes('jane.doe@example.com'), 'LaTeX resume includes candidate email');
  assert(!latexResume.includes('narayananaidu'), 'LaTeX resume has zero static candidate references');

  // ── TEST 4: Full Ingestion Pipeline Execution ──
  console.log('\n4. Testing Target Ingestion Pipeline Orchestration:');
  const chatDump = `
✨ CloudScale Inc is actively hiring!
Role: Senior Full Stack Engineer
Location: Remote (US / Global)
Skills: TypeScript, React, Node.js, AWS, Redis, Docker
Apply URL: https://careers.cloudscale.com/apply/senior-dev
Compensation: $160,000 - $190,000 USD
`;

  store.saveProfile(testProfile);
  const pipelineResult = await runTargetAiPipeline(chatDump, 'Tech Jobs Channel', 'telegram', false);
  assert(pipelineResult.totalExtracted >= 1, `Ingestion pipeline extracted ${pipelineResult.totalExtracted} job(s)`);
  if (pipelineResult.jobs.length > 0) {
    const job = pipelineResult.jobs[0];
    assert(job.companyName.toLowerCase().includes('cloudscale'), `Extracted company name "${job.companyName}"`);
    assert(job.skillsRequired.includes('TypeScript') || job.skillsRequired.includes('React'), 'Extracted skills correctly');
    assert(typeof job.matchScore === 'number' && job.matchScore >= 60, `Scored match (${job.matchScore}%)`);
    assert(job.atsAnalysis !== undefined, 'ATS analysis performed');
    assert(job.referralContacts !== undefined && job.referralContacts.length > 0, 'Referral contacts generated');
    assert(job.interviewPrep !== undefined, 'Interview prep generated');
    assert(job.coverLetterText !== undefined && job.coverLetterText.length > 100, 'Cover letter generated');
    assert(job.interviewMasterGuide !== undefined, 'Interview master guide generated');
    assert(job.outreachSuite !== undefined, 'Outreach suite generated');
    assert(job.generationStatus !== undefined, 'Feed card contains per-field generation status map');
  }

  // ── TEST 5: Telemetry Logging Verification ──
  console.log('\n5. Testing Gateway Telemetry & Provenance Logging:');
  const logs = llmClient.getRecentExecutions();
  assert(Array.isArray(logs), 'Gateway captures structured telemetry logs');

  // ── TEST 6: Zero Silent Fallback & Honest Status Tracking ──
  console.log('\n6. Testing Zero Silent Fallback in Scorer, Extractor, and Block G Audit:');
  const { scoreJobAgainstProfileWithAi, auditBlockGLegitimacyWithAi } = await import('../src/app-core/scorer');
  const { extractJobDetailsWithAi } = await import('../src/app-core/extractor');
  const { scrapingOverseer } = await import('../src/app-core/scrapingOverseer');

  // Empty profile (no API key configured, and offline) -> must throw error rather than silent fallback
  const emptyProfile: IProfile = { ...testProfile, apiKey: '', groqApiKey: '', geminiApiKey: '', ollamaEndpoint: 'http://localhost:99999' };
  
  let scoreThrew = false;
  try {
    await scoreJobAgainstProfileWithAi(testJob, emptyProfile);
  } catch (err: any) {
    scoreThrew = true;
    assert(err.message.length > 0, `scoreJobAgainstProfileWithAi throws on failure instead of silent fallback (${err.message})`);
  }
  assert(scoreThrew, 'scoreJobAgainstProfileWithAi throws when AI is unavailable');

  let auditThrew = false;
  try {
    await auditBlockGLegitimacyWithAi(testJob, emptyProfile);
  } catch (err: any) {
    auditThrew = true;
    assert(err.message.length > 0, `auditBlockGLegitimacyWithAi throws on failure instead of silent fallback (${err.message})`);
  }
  assert(auditThrew, 'auditBlockGLegitimacyWithAi throws when AI is unavailable');

  let extractThrew = false;
  try {
    await extractJobDetailsWithAi('Some short text', emptyProfile);
  } catch (err: any) {
    extractThrew = true;
    assert(err.message.length > 0, `extractJobDetailsWithAi throws on failure instead of silent fallback (${err.message})`);
  }
  assert(extractThrew, 'extractJobDetailsWithAi throws when AI is unavailable');

  // ── TEST 7: Scraping Overseer Returns Null on Bogus/Boilerplate Content (No Fabricated JDs) ──
  console.log('\n7. Testing Scraping Overseer Discards Bogus/Boilerplate Content (Zero Fabricated JDs):');
  const emptyExtraction = await scrapingOverseer.auditAndDeepExtractJob(
    'Random Non Job Link',
    'https://example.com/privacy-policy',
    'Example Corp',
    ['Software Engineer']
  );
  assert(emptyExtraction === null, 'Scraping overseer returns null on boilerplate/privacy policy without fabricating JDs');

  // ── TEST 8: Career Watchlist Crawler AI Pipeline Verification ──
  console.log('\n8. Testing Career Watchlist Crawler (Second Ingestion Pipeline):');
  const { careerCrawler } = await import('../src/app-core/careerCrawler');
  const mockSite = {
    id: 'site-test-openai',
    companyName: 'OpenAI Test',
    careerUrl: 'https://boards.greenhouse.io/openai',
    category: 'AI / Machine Learning' as const,
    enabled: true,
    searchKeywords: ['Software Engineer', 'Full Stack', 'Frontend', 'Platform'],
    createdAt: new Date().toISOString(),
  };

  const crawlResult = await careerCrawler.crawlCareerSite(mockSite, testProfile, 'Master resume text for test');
  assert(crawlResult !== undefined && Array.isArray(crawlResult.jobs), 'Career crawler returns structured crawl result');
  if (crawlResult.jobs.length > 0) {
    const crawledJob = crawlResult.jobs[0];
    assert(crawledJob.generationStatus !== undefined, 'Career crawler job contains per-field generationStatus map');
    assert(typeof crawledJob.matchScore === 'number', `Scored career portal job (${crawledJob.matchScore}%)`);
    assert(crawledJob.blockGAudit !== undefined, 'Career crawler job includes Block G legitimacy audit');
    assert(crawledJob.companyName === 'OpenAI Test', 'Preserves target watchlist company metadata');
  }

  // ── TEST 9: Ingestion Pipeline with useLlm=true Records Generation Status honestly ──
  console.log('\n9. Testing Ingestion Pipeline Per-Field Status Tracking Under AI Failures:');
  const freshDump = `
✨ Apex Security is actively hiring!
Role: Senior Staff Security Architect
Location: Austin, TX / Remote
Skills: Cryptography, Rust, Go, Kubernetes, Zero Trust, Cloud Security
Apply URL: https://careers.apexsecurity.io/jobs/sec-arch-99
Compensation: $190,000 - $230,000 USD
`;
  const brokenAiResult = await runTargetAiPipeline(freshDump, 'Security Jobs Channel', 'telegram', true);
  assert(brokenAiResult.jobs.length >= 1, `Ingestion pipeline processed ${brokenAiResult.jobs.length} unique job(s) with useLlm=true`);
  if (brokenAiResult.jobs.length > 0) {
    const job = brokenAiResult.jobs[0];
    assert(job.generationStatus?.scoring !== undefined, 'Scoring generation status is tracked in feed card');
    assert(job.generationStatus?.extraction !== undefined, 'Extraction generation status is tracked in feed card');
    assert(job.generationStatus?.legitimacyAudit !== undefined, 'Legitimacy audit generation status is tracked in feed card');
    assert(
      job.generationStatus?.scoring?.status === 'failed' || job.generationStatus?.scoring?.status === 'ai_generated',
      `Scoring status is honestly flagged as "${job.generationStatus?.scoring?.status}"`
    );
    assert(
      job.generationStatus?.coverLetterText?.status === 'failed' || job.generationStatus?.coverLetterText?.status === 'ai_generated',
      `Cover letter status is honestly flagged as "${job.generationStatus?.coverLetterText?.status}"`
    );
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
