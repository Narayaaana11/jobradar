import { store } from './store';
import { IJob, IJobSource, IAiProvenance } from './types';
import { splitBulkChatText } from './bulkSplitter';
import { extractJobDetails, extractJobDetailsWithAi, IExtractedJD } from './extractor';
import { scoreJobAgainstProfile, scoreJobAgainstProfileWithAi, auditBlockGLegitimacy } from './scorer';
import { analyzeAtsCompliance } from './atsMatcher';
import { generateReferralContacts, generateReferralContactsWithAi } from './referralGenerator';
import { generateInterviewPrep, generateInterviewPrepWithAi } from './interviewPrep';
import { generateCoverLetter, generateCoverLetterWithAi } from './coverLetterGenerator';
import { generateOutreachSuite, generateOutreachSuiteWithAi } from './outreachAgent';
import { generateInterviewMasterGuide, generateInterviewMasterGuideWithAi } from './interviewMasterGuide';
import { generateFollowupCadence } from './followupCadence';
import { applicationAnswers } from './applicationAnswers';
import { salaryNegotiation } from './salaryNegotiation';
import { linkResolver } from './linkResolver';
import { atsOptimizer } from './atsOptimizer';
import { isWebUrl, fetchAndExtractJobFromUrl } from './webFetcher';
import { evaluateNoiseTriage } from './noiseFilter';
import { llmClient } from './llmClient';

export interface IngestionResult {
  totalExtracted: number;
  jobs: IJob[];
  queueIds: string[];
}

/**
 * 9-Step AI-Native JobRadar Ingestion Pipeline.
 * Orchestrates dump segmentation, link resolution, extraction, scoring, ATS optimization, and downstream asset generation.
 */
export async function processIngestion(
  input: string,
  channelName: string = 'WhatsApp Ingest',
  platform: IJobSource['platform'] = 'whatsapp',
  useLlm: boolean = true
): Promise<IngestionResult> {
  const profile = store.getProfile();
  const trimmedInput = input.trim();
  const processedJobs: IJob[] = [];
  const queueIds: string[] = [];

  // ──────────────────────────────────────────────────────────────────
  // CASE A: Direct Single Web URL Ingestion
  // ──────────────────────────────────────────────────────────────────
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
      // Step 3 & 4: Link Resolution Agent
      const resolvedLink = await linkResolver.resolveLink(trimmedInput, '', { profile });
      const targetUrl = resolvedLink.canonicalUrl || trimmedInput;

      // Step 5: JD Extraction (Live text + AI structured parser)
      let extracted: IExtractedJD;
      if (resolvedLink.extractedText && resolvedLink.extractedText.length > 100) {
        extracted = await extractJobDetailsWithAi(resolvedLink.extractedText, profile);
        extracted.applicationLink = targetUrl;
      } else {
        extracted = await fetchAndExtractJobFromUrl(targetUrl);
        if (useLlm) {
          extracted = await extractJobDetailsWithAi(extracted.rawDescription, profile);
          extracted.applicationLink = targetUrl;
        }
      }

      // Step 6: AI Eligibility & Fit Evaluation
      const scoreResult = useLlm
        ? await scoreJobAgainstProfileWithAi(extracted, profile)
        : scoreJobAgainstProfile(extracted, profile);

      // Step 7: ATS Resume Gap Analysis & Iterative Optimization Loop
      const atsOpt = await atsOptimizer.optimizeResumeForJob(extracted, profile);
      const atsAnalysis = analyzeAtsCompliance(extracted, profile);
      atsAnalysis.overallAtsScore = Math.max(atsAnalysis.overallAtsScore ?? 0, atsOpt.finalScore);

      // Step 8: Downstream AI Asset Generators
      let referrals = generateReferralContacts(extracted, profile);
      let interviewPrep = generateInterviewPrep(extracted, profile);
      let coverLetter = generateCoverLetter(extracted, profile);
      let outreach = generateOutreachSuite(extracted as IJob, profile);
      let masterGuide = generateInterviewMasterGuide(extracted as IJob, profile);
      let appAnswers = applicationAnswers.generateAnswersDeterministic(extracted as IJob, profile);
      let salaryNeg = salaryNegotiation.generateNegotiationSuite(extracted as IJob, profile);

      if (useLlm) {
        try {
          const [refRes, prepRes, letterRes, outRes, guideRes, ansRes, salRes] = await Promise.allSettled([
            generateReferralContactsWithAi(extracted, profile),
            generateInterviewPrepWithAi(extracted, profile),
            generateCoverLetterWithAi(extracted, profile),
            generateOutreachSuiteWithAi(extracted as IJob, profile),
            generateInterviewMasterGuideWithAi(extracted as IJob, profile),
            applicationAnswers.generateAnswersWithAi(extracted as IJob, profile),
            salaryNegotiation.generateNegotiationWithAi(extracted as IJob, profile),
          ]);

          if (refRes.status === 'fulfilled') referrals = refRes.value;
          if (prepRes.status === 'fulfilled') interviewPrep = prepRes.value;
          if (letterRes.status === 'fulfilled') coverLetter = letterRes.value;
          if (outRes.status === 'fulfilled') outreach = outRes.value;
          if (guideRes.status === 'fulfilled') masterGuide = guideRes.value;
          if (ansRes.status === 'fulfilled') appAnswers = ansRes.value;
          if (salRes.status === 'fulfilled') salaryNeg = salRes.value;
        } catch {
          // Keep parameter-driven fallbacks
        }
      }

      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const provenance: IAiProvenance = {
        modelUsed: scoreResult.structuredFitReport ? 'multi_provider_ai_gateway' : 'local_heuristic',
        provider: 'openrouter',
        generatedAt: new Date().toISOString(),
        taskType: 'ingestion_pipeline',
      };

      // Step 9: Final Job Feed Card Assembly
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
        applicationLink: targetUrl,
        applicationDeadline: extracted.applicationDeadline,
        skillsRequired: extracted.skillsRequired,
        experienceRequired: extracted.experienceRequired,
        rawDescription: extracted.rawDescription,
        sources: [
          {
            platform: 'web',
            channelName: channelName || 'Web URL Scraper',
            messageId,
            url: targetUrl,
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
        atsAnalysis,
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
        outreachSuite: outreach,
        interviewMasterGuide: masterGuide,
        followupCadence: generateFollowupCadence(extracted as IJob, profile),
        applicationAnswers: appAnswers,
        salaryNegotiation: salaryNeg,
        provenance,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.addJobs([job]);
      store.updateQueueItem(queueItem.id, { processed: true });
      processedJobs.push(job);
    } catch (err: any) {
      console.error(`Failed to ingest web URL "${trimmedInput}":`, err);
    }

    return {
      totalExtracted: processedJobs.length,
      jobs: processedJobs,
      queueIds,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // CASE B: Bulk Dump Ingestion (WhatsApp / Telegram / Raw Text)
  // ──────────────────────────────────────────────────────────────────
  const messageId = `bulk-${Date.now()}`;
  const queueItem = store.addQueueItem({
    platform,
    channelName,
    rawMessageId: messageId,
    rawText: trimmedInput,
    processed: false,
  });
  queueIds.push(queueItem.id);

  // Step 2: Cleaning & Segmentation
  let candidateChunks: string[] = splitBulkChatText(trimmedInput);

  if (candidateChunks.length === 1 && trimmedInput.length > 600 && useLlm) {
    try {
      const segRes = await llmClient.segmentDumpWithAi(trimmedInput, profile);
      if (segRes.success && segRes.data?.postings && segRes.data.postings.length > 1) {
        candidateChunks = segRes.data.postings;
      }
    } catch {
      // Retain heuristic chunks
    }
  }

  for (let i = 0; i < candidateChunks.length; i++) {
    const chunk = candidateChunks[i].trim();
    if (!chunk || chunk.length < 25) continue;

    // Noise Pre-Filter
    const triage = evaluateNoiseTriage(chunk);
    if (!triage.isJobPosting) {
      continue;
    }

    try {
      // Step 3 & 4: Link Extraction and Deep Resolution
      const rawExtracted = extractJobDetails(chunk);
      let canonicalApplyLink = rawExtracted.applicationLink;

      if (rawExtracted.applicationLink) {
        const resolved = await linkResolver.resolveLink(rawExtracted.applicationLink, chunk, { profile });
        if (resolved.isJobPage && resolved.canonicalUrl) {
          canonicalApplyLink = resolved.canonicalUrl;
        }
      }

      // Step 5: AI Structured Extraction
      let extracted: IExtractedJD;
      if (useLlm) {
        extracted = await extractJobDetailsWithAi(chunk, profile);
        if (canonicalApplyLink) extracted.applicationLink = canonicalApplyLink;
      } else {
        extracted = rawExtracted;
        if (canonicalApplyLink) extracted.applicationLink = canonicalApplyLink;
      }

      // Deduplication Check
      const isDuplicate = store.getJobs().some((j) => j.dedupHash === extracted.dedupHash);
      if (isDuplicate) {
        continue;
      }

      // Step 6: AI Eligibility & Fit Evaluation
      const scoreResult = useLlm
        ? await scoreJobAgainstProfileWithAi(extracted, profile)
        : scoreJobAgainstProfile(extracted, profile);

      // Step 7: ATS Resume Gap Analysis & Iterative Optimization Loop
      const atsOpt = await atsOptimizer.optimizeResumeForJob(extracted, profile);
      const atsAnalysis = analyzeAtsCompliance(extracted, profile);
      atsAnalysis.overallAtsScore = Math.max(atsAnalysis.overallAtsScore ?? 0, atsOpt.finalScore);

      // Step 8: Downstream AI Asset Generators
      let referrals = generateReferralContacts(extracted, profile);
      let interviewPrep = generateInterviewPrep(extracted, profile);
      let coverLetter = generateCoverLetter(extracted, profile);
      let outreach = generateOutreachSuite(extracted as IJob, profile);
      let masterGuide = generateInterviewMasterGuide(extracted as IJob, profile);
      let appAnswers = applicationAnswers.generateAnswersDeterministic(extracted as IJob, profile);
      let salaryNeg = salaryNegotiation.generateNegotiationSuite(extracted as IJob, profile);

      if (useLlm) {
        try {
          const [refRes, prepRes, letterRes, outRes, guideRes, ansRes, salRes] = await Promise.allSettled([
            generateReferralContactsWithAi(extracted, profile),
            generateInterviewPrepWithAi(extracted, profile),
            generateCoverLetterWithAi(extracted, profile),
            generateOutreachSuiteWithAi(extracted as IJob, profile),
            generateInterviewMasterGuideWithAi(extracted as IJob, profile),
            applicationAnswers.generateAnswersWithAi(extracted as IJob, profile),
            salaryNegotiation.generateNegotiationWithAi(extracted as IJob, profile),
          ]);

          if (refRes.status === 'fulfilled') referrals = refRes.value;
          if (prepRes.status === 'fulfilled') interviewPrep = prepRes.value;
          if (letterRes.status === 'fulfilled') coverLetter = letterRes.value;
          if (outRes.status === 'fulfilled') outreach = outRes.value;
          if (guideRes.status === 'fulfilled') masterGuide = guideRes.value;
          if (ansRes.status === 'fulfilled') appAnswers = ansRes.value;
          if (salRes.status === 'fulfilled') salaryNeg = salRes.value;
        } catch {
          // Keep parameter-driven fallbacks
        }
      }

      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const provenance: IAiProvenance = {
        modelUsed: scoreResult.structuredFitReport ? 'multi_provider_ai_gateway' : 'local_heuristic',
        provider: 'openrouter',
        generatedAt: new Date().toISOString(),
        taskType: 'ingestion_pipeline',
      };

      // Step 9: Final Job Feed Card Assembly
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
        applicationLink: canonicalApplyLink || null,
        applicationDeadline: extracted.applicationDeadline,
        skillsRequired: extracted.skillsRequired,
        experienceRequired: extracted.experienceRequired,
        rawDescription: extracted.rawDescription,
        sources: [
          {
            platform,
            channelName,
            messageId,
            url: canonicalApplyLink || undefined,
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
        atsAnalysis,
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
        outreachSuite: outreach,
        interviewMasterGuide: masterGuide,
        followupCadence: generateFollowupCadence(extracted as IJob, profile),
        applicationAnswers: appAnswers,
        salaryNegotiation: salaryNeg,
        provenance,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.addJobs([job]);
      processedJobs.push(job);
    } catch (err: any) {
      console.error(`Failed to process chunk #${i + 1}:`, err);
    }
  }

  store.updateQueueItem(queueItem.id, { processed: true });

  return {
    totalExtracted: processedJobs.length,
    jobs: processedJobs,
    queueIds,
  };
}

export const runTargetAiPipeline = processIngestion;
