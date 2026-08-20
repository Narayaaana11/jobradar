import { store } from './store';
import { IJob, IJobSource, IJobGenerationStatusMap, IReferralContact, IInterviewPrep, IInterviewMasterGuide, IColdOutreachSuite, IApplicationAnswersSuite, ISalaryNegotiationSuite } from './types';
import { splitBulkChatText } from './bulkSplitter';
import { extractJobDetails, extractJobDetailsWithAi, IExtractedJD } from './extractor';
import { scoreJobAgainstProfile, scoreJobAgainstProfileWithAi, auditBlockGLegitimacy, auditBlockGLegitimacyWithAi, IScoreResult } from './scorer';
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
import { aiConcurrencyLimiter } from './concurrency';

export interface IIngestProgress {
  currentJob: number;
  totalJobs: number;
  jobTitle: string;
  stage: string;
  inFlightAiCount?: number;
}

export interface IngestionResult {
  totalExtracted: number;
  jobs: IJob[];
  queueIds: string[];
}

export interface IDownstreamAssetResult {
  referralContacts?: IReferralContact[];
  interviewPrep?: IInterviewPrep;
  coverLetterText?: string;
  outreachSuite?: IColdOutreachSuite;
  interviewMasterGuide?: IInterviewMasterGuide;
  applicationAnswers?: IApplicationAnswersSuite;
  salaryNegotiation?: ISalaryNegotiationSuite;
  generationStatus: IJobGenerationStatusMap;
}

/**
 * Generates downstream assets for an extracted job.
 * In AI mode: each call independently succeeds or explicitly records failure (never silently backfilled with templates).
 * In explicit Offline mode: marks status as 'offline_template'.
 */
export async function generateDownstreamAssets(
  extracted: IExtractedJD,
  profile: any,
  useLlm: boolean
): Promise<IDownstreamAssetResult> {
  const generationStatus: IJobGenerationStatusMap = {};
  const mockJob = extracted as IJob;

  if (!useLlm) {
    // Explicit Offline / Heuristic Template Mode
    return {
      referralContacts: generateReferralContacts(extracted, profile),
      interviewPrep: generateInterviewPrep(extracted, profile),
      coverLetterText: generateCoverLetter(extracted, profile),
      outreachSuite: generateOutreachSuite(mockJob, profile),
      interviewMasterGuide: generateInterviewMasterGuide(mockJob, profile),
      applicationAnswers: applicationAnswers.generateAnswersDeterministic(mockJob, profile),
      salaryNegotiation: salaryNegotiation.generateNegotiationSuite(mockJob, profile),
      generationStatus: {
        referralContacts: { status: 'offline_template' },
        interviewPrep: { status: 'offline_template' },
        coverLetterText: { status: 'offline_template' },
        outreachSuite: { status: 'offline_template' },
        interviewMasterGuide: { status: 'offline_template' },
        applicationAnswers: { status: 'offline_template' },
        salaryNegotiation: { status: 'offline_template' },
      },
    };
  }

  // AI-Native Generation with Concurrency Limiting across independent tasks
  const [refRes, prepRes, letterRes, outRes, guideRes, ansRes, salRes] = await Promise.allSettled([
    aiConcurrencyLimiter.run(() => generateReferralContactsWithAi(extracted, profile)),
    aiConcurrencyLimiter.run(() => generateInterviewPrepWithAi(extracted, profile)),
    aiConcurrencyLimiter.run(() => generateCoverLetterWithAi(extracted, profile)),
    aiConcurrencyLimiter.run(() => generateOutreachSuiteWithAi(mockJob, profile)),
    aiConcurrencyLimiter.run(() => generateInterviewMasterGuideWithAi(mockJob, profile)),
    aiConcurrencyLimiter.run(() => applicationAnswers.generateAnswersWithAi(mockJob, profile)),
    aiConcurrencyLimiter.run(() => salaryNegotiation.generateNegotiationWithAi(mockJob, profile)),
  ]);

  let referralContacts: IReferralContact[] | undefined;
  if (refRes.status === 'fulfilled') {
    referralContacts = refRes.value;
    generationStatus.referralContacts = { status: 'ai_generated', generatedAt: new Date().toISOString() };
  } else {
    generationStatus.referralContacts = { status: 'failed', error: refRes.reason?.message || 'Referral AI generation failed' };
  }

  let interviewPrep: IInterviewPrep | undefined;
  if (prepRes.status === 'fulfilled') {
    interviewPrep = prepRes.value;
    generationStatus.interviewPrep = { status: 'ai_generated', generatedAt: new Date().toISOString() };
  } else {
    generationStatus.interviewPrep = { status: 'failed', error: prepRes.reason?.message || 'Interview prep AI generation failed' };
  }

  let coverLetterText: string | undefined;
  if (letterRes.status === 'fulfilled') {
    coverLetterText = letterRes.value;
    generationStatus.coverLetterText = { status: 'ai_generated', generatedAt: new Date().toISOString() };
  } else {
    generationStatus.coverLetterText = { status: 'failed', error: letterRes.reason?.message || 'Cover letter AI generation failed' };
  }

  let outreachSuite: IColdOutreachSuite | undefined;
  if (outRes.status === 'fulfilled') {
    outreachSuite = outRes.value;
    generationStatus.outreachSuite = { status: 'ai_generated', generatedAt: new Date().toISOString() };
  } else {
    generationStatus.outreachSuite = { status: 'failed', error: outRes.reason?.message || 'Outreach suite AI generation failed' };
  }

  let interviewMasterGuide: IInterviewMasterGuide | undefined;
  if (guideRes.status === 'fulfilled') {
    interviewMasterGuide = guideRes.value;
    generationStatus.interviewMasterGuide = { status: 'ai_generated', generatedAt: new Date().toISOString() };
  } else {
    generationStatus.interviewMasterGuide = { status: 'failed', error: guideRes.reason?.message || 'Interview guide AI generation failed' };
  }

  let appAnswers: IApplicationAnswersSuite | undefined;
  if (ansRes.status === 'fulfilled') {
    appAnswers = ansRes.value;
    generationStatus.applicationAnswers = { status: 'ai_generated', generatedAt: new Date().toISOString() };
  } else {
    generationStatus.applicationAnswers = { status: 'failed', error: ansRes.reason?.message || 'Application answers AI generation failed' };
  }

  let salaryNeg: ISalaryNegotiationSuite | undefined;
  if (salRes.status === 'fulfilled') {
    salaryNeg = salRes.value;
    generationStatus.salaryNegotiation = { status: 'ai_generated', generatedAt: new Date().toISOString() };
  } else {
    generationStatus.salaryNegotiation = { status: 'failed', error: salRes.reason?.message || 'Salary negotiation AI generation failed' };
  }

  return {
    referralContacts,
    interviewPrep,
    coverLetterText,
    outreachSuite,
    interviewMasterGuide,
    applicationAnswers: appAnswers,
    salaryNegotiation: salaryNeg,
    generationStatus,
  };
}

/**
 * 9-Step AI-Native JobRadar Ingestion Pipeline.
 * Orchestrates dump segmentation, link resolution, extraction, scoring, ATS optimization, and downstream asset generation.
 */
export async function processIngestion(
  input: string,
  channelName: string = 'WhatsApp Ingest',
  platform: IJobSource['platform'] = 'whatsapp',
  useLlm: boolean = true,
  onProgress?: (progress: IIngestProgress) => void
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
      onProgress?.({
        currentJob: 1,
        totalJobs: 1,
        jobTitle: 'Resolving Job URL',
        stage: 'Resolving multi-hop redirects and canonical apply URL...',
        inFlightAiCount: aiConcurrencyLimiter.activeJobs,
      });

      // Step 3 & 4: Link Resolution Agent
      const resolvedLink = await linkResolver.resolveLink(trimmedInput, '', { profile });
      const targetUrl = resolvedLink.canonicalUrl || trimmedInput;

      // Step 5: JD Extraction (Live text + AI structured parser)
      let extracted: IExtractedJD;
      let extractionStatus: IJobGenerationStatusMap['extraction'];
      if (!useLlm) {
        extracted = await fetchAndExtractJobFromUrl(targetUrl);
        extractionStatus = { status: 'offline_template' };
      } else {
        try {
          if (resolvedLink.extractedText && resolvedLink.extractedText.length > 100) {
            extracted = await aiConcurrencyLimiter.run(() => extractJobDetailsWithAi(resolvedLink.extractedText!, profile));
          } else {
            const initial = await fetchAndExtractJobFromUrl(targetUrl);
            extracted = await aiConcurrencyLimiter.run(() => extractJobDetailsWithAi(initial.rawDescription, profile));
          }
          extracted.applicationLink = targetUrl;
          extractionStatus = {
            status: 'ai_generated',
            modelUsed: llmClient.getLastModelUsed('extraction') || 'AI Model',
            provider: llmClient.getLastProviderUsed('extraction') || 'gateway',
            generatedAt: new Date().toISOString(),
          };
        } catch (extractErr: any) {
          extracted = await fetchAndExtractJobFromUrl(targetUrl);
          extracted.applicationLink = targetUrl;
          extractionStatus = {
            status: 'failed',
            error: extractErr.message || 'AI Extraction failed',
          };
        }
      }

      onProgress?.({
        currentJob: 1,
        totalJobs: 1,
        jobTitle: `${extracted.companyName} — ${extracted.jobTitle}`,
        stage: 'Scoring match and optimizing ATS resume...',
        inFlightAiCount: aiConcurrencyLimiter.activeJobs,
      });

      // Step 6: AI Eligibility & Fit Evaluation
      let scoreResult: IScoreResult;
      let scoringStatus: IJobGenerationStatusMap['scoring'];
      if (!useLlm) {
        scoreResult = scoreJobAgainstProfile(extracted, profile);
        scoringStatus = { status: 'offline_template' };
      } else {
        try {
          scoreResult = await aiConcurrencyLimiter.run(() => scoreJobAgainstProfileWithAi(extracted, profile));
          scoringStatus = {
            status: 'ai_generated',
            modelUsed: llmClient.getLastModelUsed('scoring') || 'AI Model',
            provider: llmClient.getLastProviderUsed('scoring') || 'gateway',
            generatedAt: new Date().toISOString(),
          };
        } catch (scoreErr: any) {
          scoreResult = scoreJobAgainstProfile(extracted, profile);
          scoringStatus = {
            status: 'failed',
            error: scoreErr.message || 'AI Scoring failed',
          };
        }
      }

      // Step 7: ATS Resume Gap Analysis & Iterative Optimization Loop
      const atsOpt = await atsOptimizer.optimizeResumeForJob(extracted, profile);
      const atsAnalysis = analyzeAtsCompliance(extracted, profile);
      atsAnalysis.overallAtsScore = Math.max(atsAnalysis.overallAtsScore ?? 0, atsOpt.finalScore);

      // Block G Legitimacy Audit
      let blockGAudit: import('./types').IBlockGAudit;
      let legitimacyStatus: IJobGenerationStatusMap['legitimacyAudit'];
      if (!useLlm) {
        blockGAudit = auditBlockGLegitimacy(extracted);
        legitimacyStatus = { status: 'offline_template' };
      } else {
        try {
          blockGAudit = await aiConcurrencyLimiter.run(() => auditBlockGLegitimacyWithAi(extracted, profile));
          legitimacyStatus = {
            status: 'ai_generated',
            modelUsed: llmClient.getLastModelUsed('block_g_audit') || llmClient.getLastModelUsed('cheap_fast') || 'AI Model',
            provider: llmClient.getLastProviderUsed('block_g_audit') || llmClient.getLastProviderUsed('cheap_fast') || 'gateway',
            generatedAt: new Date().toISOString(),
          };
        } catch (auditErr: any) {
          blockGAudit = auditBlockGLegitimacy(extracted);
          legitimacyStatus = {
            status: 'failed',
            error: auditErr.message || 'AI Legitimacy Audit failed',
          };
        }
      }

      onProgress?.({
        currentJob: 1,
        totalJobs: 1,
        jobTitle: `${extracted.companyName} — ${extracted.jobTitle}`,
        stage: 'Generating tailored interview guide, referrals, and outreach assets...',
        inFlightAiCount: aiConcurrencyLimiter.activeJobs,
      });

      // Step 8: Downstream AI Asset Generators (Zero silent backfill)
      const downstream = await generateDownstreamAssets(extracted, profile, useLlm);
      downstream.generationStatus.extraction = extractionStatus;
      downstream.generationStatus.scoring = scoringStatus;
      downstream.generationStatus.legitimacyAudit = legitimacyStatus;

      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

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
        referralContacts: downstream.referralContacts,
        interviewPrep: downstream.interviewPrep,
        coverLetterText: downstream.coverLetterText,
        resumeNotes: `Tailored resume for ${extracted.companyName} (${extracted.jobTitle})`,
        blockGAudit,
        outreachSuite: downstream.outreachSuite,
        interviewMasterGuide: downstream.interviewMasterGuide,
        followupCadence: generateFollowupCadence(extracted as IJob, profile),
        applicationAnswers: downstream.applicationAnswers,
        salaryNegotiation: downstream.salaryNegotiation,
        generationStatus: downstream.generationStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.addJobs([job]);
      store.updateQueueItem(queueItem.id, { processed: true });
      processedJobs.push(job);
    } catch (err: any) {
      console.error('Failed to process single URL job:', err);
    }

    return {
      totalExtracted: processedJobs.length,
      jobs: processedJobs,
      queueIds,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // CASE B: Bulk Chat Dump Ingestion (WhatsApp / Telegram)
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

  // Step 1: Segmentation & Cleaning
  let rawChunks: string[] = [];
  if (useLlm) {
    try {
      const segRes = await llmClient.segmentDumpWithAi(trimmedInput, profile);
      if (segRes.success && segRes.data?.postings && segRes.data.postings.length > 0) {
        rawChunks = segRes.data.postings;
      } else {
        rawChunks = splitBulkChatText(trimmedInput);
      }
    } catch {
      rawChunks = splitBulkChatText(trimmedInput);
    }
  } else {
    rawChunks = splitBulkChatText(trimmedInput);
  }

  const totalChunks = rawChunks.length;

  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i];

    // Step 2: Heuristic & AI Noise Filter Pre-Pass
    const noiseCheck = evaluateNoiseTriage(chunk);
    if (!noiseCheck.isJobPosting) {
      continue;
    }

    try {
      onProgress?.({
        currentJob: i + 1,
        totalJobs: totalChunks,
        jobTitle: `Job #${i + 1}`,
        stage: 'Extracting job posting metadata...',
        inFlightAiCount: aiConcurrencyLimiter.activeJobs,
      });

      // Extract raw details first for links and quick fields
      const rawExtracted = extractJobDetails(chunk);

      // Step 3 & 4: Link Classification & Resolution Agent
      let canonicalApplyLink = rawExtracted.applicationLink;
      if (canonicalApplyLink) {
        try {
          const resolved = await linkResolver.resolveLink(canonicalApplyLink, chunk, { profile });
          if (resolved.isJobPage && resolved.canonicalUrl) {
            canonicalApplyLink = resolved.canonicalUrl;
          }
        } catch {
          // Keep raw apply link if resolution network fails
        }
      }

      // Step 5: AI Structured Extraction
      let extracted: IExtractedJD;
      let extractionStatus: IJobGenerationStatusMap['extraction'];
      if (useLlm) {
        try {
          extracted = await aiConcurrencyLimiter.run(() => extractJobDetailsWithAi(chunk, profile));
          if (canonicalApplyLink) extracted.applicationLink = canonicalApplyLink;
          extractionStatus = {
            status: 'ai_generated',
            modelUsed: llmClient.getLastModelUsed('extraction') || 'AI Model',
            provider: llmClient.getLastProviderUsed('extraction') || 'gateway',
            generatedAt: new Date().toISOString(),
          };
        } catch (extractErr: any) {
          extracted = rawExtracted;
          if (canonicalApplyLink) extracted.applicationLink = canonicalApplyLink;
          extractionStatus = {
            status: 'failed',
            error: extractErr.message || 'AI Extraction failed',
          };
        }
      } else {
        extracted = rawExtracted;
        if (canonicalApplyLink) extracted.applicationLink = canonicalApplyLink;
        extractionStatus = { status: 'offline_template' };
      }

      // Deduplication Check
      const isDuplicate = store.getJobs().some((j) => j.dedupHash === extracted.dedupHash);
      if (isDuplicate) {
        continue;
      }

      onProgress?.({
        currentJob: i + 1,
        totalJobs: totalChunks,
        jobTitle: `${extracted.companyName} — ${extracted.jobTitle}`,
        stage: 'Scoring match and calculating ATS optimization...',
        inFlightAiCount: aiConcurrencyLimiter.activeJobs,
      });

      // Step 6: AI Eligibility & Fit Evaluation
      let scoreResult: IScoreResult;
      let scoringStatus: IJobGenerationStatusMap['scoring'];
      if (useLlm) {
        try {
          scoreResult = await aiConcurrencyLimiter.run(() => scoreJobAgainstProfileWithAi(extracted, profile));
          scoringStatus = {
            status: 'ai_generated',
            modelUsed: llmClient.getLastModelUsed('scoring') || 'AI Model',
            provider: llmClient.getLastProviderUsed('scoring') || 'gateway',
            generatedAt: new Date().toISOString(),
          };
        } catch (scoreErr: any) {
          scoreResult = scoreJobAgainstProfile(extracted, profile);
          scoringStatus = {
            status: 'failed',
            error: scoreErr.message || 'AI Scoring failed',
          };
        }
      } else {
        scoreResult = scoreJobAgainstProfile(extracted, profile);
        scoringStatus = { status: 'offline_template' };
      }

      // Step 7: ATS Resume Gap Analysis & Iterative Optimization Loop
      const atsOpt = await atsOptimizer.optimizeResumeForJob(extracted, profile);
      const atsAnalysis = analyzeAtsCompliance(extracted, profile);
      atsAnalysis.overallAtsScore = Math.max(atsAnalysis.overallAtsScore ?? 0, atsOpt.finalScore);

      // Block G Legitimacy Audit
      let blockGAudit: import('./types').IBlockGAudit;
      let legitimacyStatus: IJobGenerationStatusMap['legitimacyAudit'];
      if (!useLlm) {
        blockGAudit = auditBlockGLegitimacy(extracted);
        legitimacyStatus = { status: 'offline_template' };
      } else {
        try {
          blockGAudit = await aiConcurrencyLimiter.run(() => auditBlockGLegitimacyWithAi(extracted, profile));
          legitimacyStatus = {
            status: 'ai_generated',
            modelUsed: llmClient.getLastModelUsed('block_g_audit') || llmClient.getLastModelUsed('cheap_fast') || 'AI Model',
            provider: llmClient.getLastProviderUsed('block_g_audit') || llmClient.getLastProviderUsed('cheap_fast') || 'gateway',
            generatedAt: new Date().toISOString(),
          };
        } catch (auditErr: any) {
          blockGAudit = auditBlockGLegitimacy(extracted);
          legitimacyStatus = {
            status: 'failed',
            error: auditErr.message || 'AI Legitimacy Audit failed',
          };
        }
      }

      onProgress?.({
        currentJob: i + 1,
        totalJobs: totalChunks,
        jobTitle: `${extracted.companyName} — ${extracted.jobTitle}`,
        stage: 'Generating tailored interview guide, referrals, and outreach assets...',
        inFlightAiCount: aiConcurrencyLimiter.activeJobs,
      });

      // Step 8: Downstream AI Asset Generators (Zero silent backfill)
      const downstream = await generateDownstreamAssets(extracted, profile, useLlm);
      downstream.generationStatus.extraction = extractionStatus;
      downstream.generationStatus.scoring = scoringStatus;
      downstream.generationStatus.legitimacyAudit = legitimacyStatus;

      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

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
        referralContacts: downstream.referralContacts,
        interviewPrep: downstream.interviewPrep,
        coverLetterText: downstream.coverLetterText,
        resumeNotes: `Tailored resume for ${extracted.companyName} (${extracted.jobTitle})`,
        blockGAudit,
        outreachSuite: downstream.outreachSuite,
        interviewMasterGuide: downstream.interviewMasterGuide,
        followupCadence: generateFollowupCadence(extracted as IJob, profile),
        applicationAnswers: downstream.applicationAnswers,
        salaryNegotiation: downstream.salaryNegotiation,
        generationStatus: downstream.generationStatus,
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
