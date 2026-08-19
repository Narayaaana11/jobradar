import { store } from './store';
import { IJob, IJobSource } from './types';
import { splitBulkChatText } from './bulkSplitter';
import { extractJobDetails, IExtractedJD } from './extractor';
import { scoreJobAgainstProfile, auditBlockGLegitimacy } from './scorer';
import { analyzeAtsCompliance } from './atsMatcher';
import { generateReferralContacts } from './referralGenerator';
import { generateInterviewPrep } from './interviewPrep';
import { generateCoverLetter } from './coverLetterGenerator';
import { generateOutreachSuite } from './outreachAgent';
import { generateInterviewMasterGuide } from './interviewMasterGuide';
import { generateFollowupCadence } from './followupCadence';
import { applicationAnswers } from './applicationAnswers';
import { salaryNegotiation } from './salaryNegotiation';
import { llmClient } from './llmClient';
import { isWebUrl, fetchAndExtractJobFromUrl } from './webFetcher';
import { evaluateNoiseTriage } from './noiseFilter';

export interface IngestionResult {
  totalExtracted: number;
  jobs: IJob[];
  queueIds: string[];
}

export async function processIngestion(
  input: string,
  channelName: string = 'WhatsApp Ingest',
  platform: IJobSource['platform'] = 'whatsapp',
  useLlm: boolean = false
): Promise<IngestionResult> {
  const profile = store.getProfile();
  const activeAiKey = profile.apiKey || profile.groqApiKey || profile.geminiApiKey || '';
  const hasAiKey = Boolean(activeAiKey);
  const shouldRunAi = useLlm || hasAiKey;
  const trimmedInput = input.trim();
  const processedJobs: IJob[] = [];
  const queueIds: string[] = [];

  // Special Case: Single Web URL Ingestion (live scraping)
  if (isWebUrl(trimmedInput) || (platform === 'web' && (trimmedInput.startsWith('http://') || trimmedInput.startsWith('https://')))) {
    const messageId = `web-${Date.now()}`;
    const queueItem = store.addQueueItem({
      platform: 'web',
      channelName: channelName || 'Web URL Scraper',
      rawMessageId: messageId,
      rawText: trimmedInput,
      processed: false,
    });
    queueIds.push(queueItem.id);

    try {
      // 1. Fetch & extract full JD content from live web page
      let extracted: IExtractedJD = await fetchAndExtractJobFromUrl(trimmedInput);

      if (shouldRunAi && activeAiKey) {
        const llmExtracted = await llmClient.extractJobWithLlm(extracted.rawDescription, activeAiKey);
        if (llmExtracted.success && llmExtracted.data) {
          extracted = {
            ...llmExtracted.data,
            applicationLink: trimmedInput,
            rawDescription: extracted.rawDescription,
          };
        }
      }

      // 2. Score against candidate profile (RAG-Augmented)
      let scoreResult = scoreJobAgainstProfile(extracted, profile);
      if (shouldRunAi && activeAiKey) {
        const llmScore = await llmClient.scoreJobWithLlm(extracted, profile, activeAiKey);
        if (llmScore.success && llmScore.data) {
          scoreResult = llmScore.data;
        }
      }

      // 3. ATS compliance analysis
      const atsResult = analyzeAtsCompliance(extracted, profile);

      // 4. Generate referrals
      const referrals = generateReferralContacts(extracted, profile);

      // 5. Generate AI interview prep (RAG-Augmented)
      let interviewPrep = generateInterviewPrep(extracted, profile);
      if (shouldRunAi && activeAiKey) {
        const llmPrep = await llmClient.generateAiInterviewPrep(extracted, profile, activeAiKey);
        if (llmPrep.success && llmPrep.data) {
          interviewPrep = llmPrep.data;
        }
      }

      // 6. Generate tailored cover letter (RAG-Augmented)
      let coverLetter = generateCoverLetter(extracted, profile);
      if (shouldRunAi && activeAiKey) {
        const llmLetter = await llmClient.generateAiCoverLetter(extracted, profile, activeAiKey);
        if (llmLetter.success && llmLetter.data) {
          coverLetter = llmLetter.data;
        }
      }

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
        applicationLink: trimmedInput,
        applicationDeadline: extracted.applicationDeadline,
        skillsRequired: extracted.skillsRequired,
        experienceRequired: extracted.experienceRequired,
        rawDescription: extracted.rawDescription,
        sources: [
          {
            platform: 'web',
            channelName: channelName || 'Web URL Scraper',
            messageId,
            url: trimmedInput,
            scrapedAt: new Date().toISOString(),
          },
        ],
        dedupHash: extracted.dedupHash,
        matchScore: scoreResult.matchScore,
        matchConfidence: scoreResult.matchConfidence,
        gapAnalysis: scoreResult.gapAnalysis,
        fitBreakdown: scoreResult.fitBreakdown,
        rubricScores: scoreResult.rubricScores,
        structuredFitReport: scoreResult.structuredFitReport,
        atsAnalysis: atsResult,
        scoreFlag: scoreResult.scoreFlag,
        skillMatched: scoreResult.skillMatched,
        stage: scoreResult.matchScore >= 75 ? 'approved' : 'pending_approval',
        approvalStatus: scoreResult.matchScore >= 75 ? 'approved' : 'pending',
        applicationStatus: 'not_applied',
        referralContacts: referrals,
        interviewPrep,
        coverLetterText: coverLetter,
        resumeNotes: `Tailored resume for ${extracted.companyName} (${extracted.jobTitle})`,
        blockGAudit: auditBlockGLegitimacy(extracted),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      job.outreachSuite = generateOutreachSuite(job, profile);
      job.interviewMasterGuide = generateInterviewMasterGuide(job, profile);
      job.followupCadence = generateFollowupCadence(job, profile);
      job.applicationAnswers = applicationAnswers.generateAnswersDeterministic(job, profile);
      job.salaryNegotiation = salaryNegotiation.generateNegotiationSuite(job, profile);

      if (shouldRunAi && activeAiKey) {
        try {
          const aiCadence = await llmClient.generateAiFollowupCadence(job, profile, activeAiKey);
          if (aiCadence.success && aiCadence.data) job.followupCadence = aiCadence.data;
        } catch {}

        try {
          const aiBlockG = await llmClient.auditBlockGLegitimacyWithAi(job, activeAiKey);
          if (aiBlockG.success && aiBlockG.data) job.blockGAudit = aiBlockG.data;
        } catch {}

        try {
          const aiAnswers = await applicationAnswers.generateAnswersWithAi(job, profile, activeAiKey);
          if (aiAnswers) job.applicationAnswers = aiAnswers;
        } catch {}

        try {
          const aiSal = await salaryNegotiation.generateNegotiationWithAi(job, profile, activeAiKey);
          if (aiSal) job.salaryNegotiation = aiSal;
        } catch {}
      }

      store.addOrUpdateJob(job);
      store.updateQueueItem(queueItem.id, { processed: true, jobId });
      processedJobs.push(job);

      return {
        totalExtracted: 1,
        jobs: processedJobs,
        queueIds,
      };
    } catch (err: any) {
      console.error('Web URL scraping failed:', err);
      store.updateQueueItem(queueItem.id, { processed: true, error: err.message });
      throw new Error(`Web scraping failed for ${trimmedInput}: ${err.message}`);
    }
  }

  // Standard Text / Bulk WhatsApp & Telegram dump processing
  const chunks = splitBulkChatText(input);

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

    // 2. Filter out promotional spam / educational courses
    const triage = evaluateNoiseTriage(rawPost, channelName);
    if (!triage.isJobPosting) {
      store.updateQueueItem(queueItem.id, { processed: true, error: triage.reason });
      continue;
    }

    try {
      // 3. Extract structured JD (Deterministic first, AI if key available)
      let extracted = extractJobDetails(rawPost);

      if (shouldRunAi && activeAiKey) {
        const llmExtracted = await llmClient.extractJobWithLlm(rawPost, activeAiKey);
        if (llmExtracted.success && llmExtracted.data) {
          extracted = llmExtracted.data;
        }
      }

      // 4. Score against candidate profile (RAG-Augmented AI)
      let scoreResult = scoreJobAgainstProfile(extracted, profile);
      if (shouldRunAi && activeAiKey) {
        const llmScore = await llmClient.scoreJobWithLlm(extracted, profile, activeAiKey);
        if (llmScore.success && llmScore.data) {
          scoreResult = llmScore.data;
        }
      }

      // 5. ATS compliance analysis
      const atsResult = analyzeAtsCompliance(extracted, profile);

      // 6. Generate employee referral personas & search queries
      const referrals = generateReferralContacts(extracted, profile);

      // 7. Generate AI interview prep (RAG-Augmented AI)
      let interviewPrep = generateInterviewPrep(extracted, profile);
      if (shouldRunAi && activeAiKey) {
        const llmPrep = await llmClient.generateAiInterviewPrep(extracted, profile, activeAiKey);
        if (llmPrep.success && llmPrep.data) {
          interviewPrep = llmPrep.data;
        }
      }

      // 8. Generate tailored cover letter (RAG-Augmented AI)
      let coverLetter = generateCoverLetter(extracted, profile);
      if (shouldRunAi && activeAiKey) {
        const llmLetter = await llmClient.generateAiCoverLetter(extracted, profile, activeAiKey);
        if (llmLetter.success && llmLetter.data) {
          coverLetter = llmLetter.data;
        }
      }

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
        structuredFitReport: scoreResult.structuredFitReport,
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
        blockGAudit: auditBlockGLegitimacy(extracted),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      job.outreachSuite = generateOutreachSuite(job, profile);
      job.interviewMasterGuide = generateInterviewMasterGuide(job, profile);
      job.followupCadence = generateFollowupCadence(job, profile);
      job.applicationAnswers = applicationAnswers.generateAnswersDeterministic(job, profile);
      job.salaryNegotiation = salaryNegotiation.generateNegotiationSuite(job, profile);

      if (shouldRunAi && activeAiKey) {
        try {
          const aiCadence = await llmClient.generateAiFollowupCadence(job, profile, activeAiKey);
          if (aiCadence.success && aiCadence.data) job.followupCadence = aiCadence.data;
        } catch {}

        try {
          const aiBlockG = await llmClient.auditBlockGLegitimacyWithAi(job, activeAiKey);
          if (aiBlockG.success && aiBlockG.data) job.blockGAudit = aiBlockG.data;
        } catch {}

        try {
          const aiAnswers = await applicationAnswers.generateAnswersWithAi(job, profile, activeAiKey);
          if (aiAnswers) job.applicationAnswers = aiAnswers;
        } catch {}

        try {
          const aiSal = await salaryNegotiation.generateNegotiationWithAi(job, profile, activeAiKey);
          if (aiSal) job.salaryNegotiation = aiSal;
        } catch {}
      }

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
