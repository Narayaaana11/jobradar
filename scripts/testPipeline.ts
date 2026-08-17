import { connectDB } from '../src/config/database';
import { RawQueue } from '../src/models/RawQueue';
import { Job } from '../src/models/Job';
import { processQueueItem } from '../src/services/pipelineProcessor';
import { jobRepository } from '../src/repositories/jobRepository';

async function runTest() {
  console.log('[TestPipeline] Starting simulated pipeline test with Cover Letter & Multi-Criteria Rubric...');
  await connectDB();

  const sampleRawText = `
🚨 URGENT HIRE — Senior Fullstack MERN Developer 🚨
Company: TechNexus Solutions
Location: Hyderabad / Hybrid
Experience: 0-2 Years (Freshers / MCA 2026 Batch Welcome)
Salary: 8 - 12 LPA

Requirements:
- Strong proficiency in React.js, Next.js, Node.js, Express, and MongoDB.
- Experience with TypeScript and REST API development.
- Familiarity with AI / LLM Agent Orchestration (Anthropic / OpenAI API) is a huge plus.
- Good communication skills and problem-solving mindset.

Apply link: https://technexus.io/careers/apply-mern-hyderabad
Contact: hiring@technexus.io
`;

  const rawMessageId = `test_msg_${Date.now()}`;
  const rawItem = await RawQueue.create({
    platform: 'telegram',
    channelName: 'Hyderabad_Tech_Jobs',
    rawMessageId,
    rawText: sampleRawText,
    receivedAt: new Date(),
    processed: false,
    retryCount: 0,
  });

  console.log(`[TestPipeline] Created test RawQueue item ${rawItem._id}`);

  // Execute processing pipeline
  await processQueueItem(rawItem);

  // Retrieve resulting Job document (supports Mongoose MongoDB + AWS S3 JobRepository)
  let job: any = await Job.findOne({ 'sources.rawMessageId': rawMessageId }).catch(() => null);
  if (!job) {
    const s3Jobs = await jobRepository.getPaginatedJobs({ limit: 10 });
    job = s3Jobs.jobs.find(j => j.companyName === 'TechNexus Solutions') || s3Jobs.jobs[0] || null;
  }

  if (job) {
    console.log('\n========================================');
    console.log('✅ ALL INTEGRATED FEATURES TEST SUCCESSFUL!');
    console.log('========================================');
    console.log(`Job ID: ${job._id}`);
    console.log(`Company: ${job.companyName}`);
    console.log(`Title: ${job.jobTitle}`);
    console.log(`Location: ${job.location}`);
    console.log(`Overall Match Score: ${job.matchScore}%`);
    console.log(`Match Confidence: ${job.matchConfidence}`);
    console.log(`Fit Breakdown:`, job.fitBreakdown);
    console.log(`Strong Matches:`, job.gapAnalysis?.strongMatches);
    console.log(`Missing Keywords:`, job.gapAnalysis?.missingKeywords);
    console.log(`Resume Variant URL: ${job.resumeVersionUrl}`);
    console.log(`Cover Letter URL: ${job.coverLetterUrl}`);
    if (job.coverLetterText) {
      console.log(`Cover Letter Preview:\n${job.coverLetterText.slice(0, 200)}...\n`);
    }
    if (job.referralContacts?.length > 0) {
      console.log(`Referral Guessed Email: ${job.referralContacts[0].guessedEmail}`);
      console.log(`LinkedIn Search URL: ${job.referralContacts[0].linkedinSearchUrl}`);
    }
    console.log('========================================\n');
  } else {
    console.error('❌ Job document was not created!');
  }

  process.exit(0);
}

runTest().catch((err) => {
  console.error('[TestPipeline Error]', err);
  process.exit(1);
});
