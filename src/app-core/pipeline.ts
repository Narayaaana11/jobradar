import { store } from './store';
import { IJob, IJobSource } from './types';
import { splitBulkChatText } from './bulkSplitter';
import { extractJobDetails } from './extractor';
import { scoreJobAgainstProfile } from './scorer';
import { analyzeAtsCompliance } from './atsMatcher';
import { generateReferralContacts } from './referralGenerator';
import { generateInterviewPrep } from './interviewPrep';
import { generateCoverLetter } from './coverLetterGenerator';

export interface IngestionResult {
  totalExtracted: number;
  jobs: IJob[];
  queueIds: string[];
}

export async function processIngestion(
  input: string,
  channelName: string = 'WhatsApp Ingest',
  platform: IJobSource['platform'] = 'whatsapp'
): Promise<IngestionResult> {
  const profile = store.getProfile();
  const chunks = splitBulkChatText(input);
  const processedJobs: IJob[] = [];
  const queueIds: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const rawPost = chunks[i];
    const messageId = `${platform}-${Date.now()}-${i + 1}`;

    // 1. Add to local queue
    const queueItem = store.addQueueItem({
      platform,
      channelName,
      rawMessageId: messageId,
      rawText: rawPost,
      processed: false,
    });
    queueIds.push(queueItem.id);

    try {
      // 2. Extract structured JD
      const extracted = extractJobDetails(rawPost);

      // 3. Score against candidate profile
      const scoreResult = scoreJobAgainstProfile(extracted, profile);

      // 4. ATS compliance analysis
      const atsResult = analyzeAtsCompliance(extracted, profile);

      // 5. Generate 10 employee referrals
      const referrals = generateReferralContacts(extracted, profile);

      // 6. Generate AI interview prep
      const interviewPrep = generateInterviewPrep(extracted, profile);

      // 7. Generate tailored cover letter
      const coverLetter = generateCoverLetter(extracted, profile);

      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      const job: IJob = {
        id: jobId,
        companyName: extracted.companyName,
        companyPageUrl: extracted.companyPageUrl,
        jobTitle: extracted.jobTitle,
        jobType: extracted.jobType,
        location: extracted.location,
        isRemote: extracted.isRemote,
        ctcMentioned: extracted.ctcMentioned,
        ctcRange: extracted.ctcRange,
        applicationLink: extracted.applicationLink,
        applicationDeadline: extracted.applicationDeadline,
        skillsRequired: extracted.skillsRequired,
        experienceRequired: extracted.experienceRequired,
        rawDescription: extracted.rawDescription,
        sources: [
          {
            platform,
            channelName,
            messageId,
            url: extracted.applicationLink,
            scrapedAt: new Date().toISOString(),
          },
        ],
        dedupHash: extracted.dedupHash,

        matchScore: scoreResult.matchScore,
        matchConfidence: scoreResult.matchConfidence,
        gapAnalysis: scoreResult.gapAnalysis,
        fitBreakdown: scoreResult.fitBreakdown,
        rubricScores: scoreResult.rubricScores,
        atsAnalysis: atsResult,
        scoreFlag: scoreResult.scoreFlag,
        skillMatched: scoreResult.skillMatched,

        stage: scoreResult.matchScore >= 75 ? 'approved' : 'pending_approval',
        approvalStatus: scoreResult.matchScore >= 75 ? 'approved' : 'pending',
        applicationStatus: 'not_applied',

        referralContacts: referrals,
        interviewPrep,
        coverLetterText: coverLetter,
        resumeNotes: `Tailored master resume for ${extracted.companyName} (${extracted.jobTitle}) — highlighted ${extracted.skillsRequired.slice(0, 4).join(', ')} and MCA 2026 credentials.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to store
      store.addOrUpdateJob(job);
      store.updateQueueItem(queueItem.id, { processed: true, jobId });
      processedJobs.push(job);
    } catch (err: any) {
      console.error('Error processing post:', err);
      store.updateQueueItem(queueItem.id, { processed: true, error: err.message });
    }
  }

  return {
    totalExtracted: processedJobs.length,
    jobs: processedJobs,
    queueIds,
  };
}
