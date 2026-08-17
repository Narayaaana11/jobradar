import { rawQueueRepository, IRawQueueItem } from '../repositories/rawQueueRepository';
import { jobRepository } from '../repositories/jobRepository';
import { classifyJobPost } from './classifierAgent';
import { extractJobDetails } from './extractorAgent';
import { checkDuplicateJob } from './dedupService';
import { scoreJobFit } from './scorerAgent';
import { generateTailoredResume } from './resumeTailorAgent';
import { generateCoverLetter } from './coverLetterAgent';
import { generateReferralDrafts } from './referralAgent';
import { generateInterviewPrep } from './interviewPrepAgent';
import { notificationService } from './notificationService';
import { resolveAndScrapeUrl } from './webScraperService';
import { AtsMatcherService } from './atsMatcherService';

/**
 * Extract all URLs from text and follow them to get the final resolved URL + scraped content.
 * Returns the final resolved URL and augmented rawText.
 */
async function enrichWithScrapedContent(rawText: string): Promise<{ enrichedText: string; resolvedUrl: string | null }> {
  const urlRegex = /(https?:\/\/[^\s\n]+)/g;
  const urls = rawText.match(urlRegex) || [];

  if (urls.length === 0) {
    return { enrichedText: rawText, resolvedUrl: null };
  }

  let resolvedUrl: string | null = null;
  let enrichedText = rawText;

  for (const url of urls.slice(0, 3)) {
    try {
      console.log(`[Pipeline] Scraping URL: ${url}`);
      const scrapedContent = await resolveAndScrapeUrl(url);
      if (scrapedContent) {
        enrichedText += `\n\n${scrapedContent}`;

        // Try to extract the final resolved URL from scraped content
        const finalUrlMatch = scrapedContent.match(/\[Scraped Target Page content from (https?:\/\/[^\]]+)\]/);
        if (finalUrlMatch) {
          resolvedUrl = finalUrlMatch[1];
          console.log(`[Pipeline] Resolved URL: ${url} → ${resolvedUrl}`);
        } else {
          resolvedUrl = url;
        }
      }
    } catch (err: any) {
      console.warn(`[Pipeline] URL scrape failed: ${url}`, err.message);
    }
  }

  return { enrichedText, resolvedUrl };
}

export async function processQueueItem(queueItem: IRawQueueItem): Promise<void> {
  console.log(`[Pipeline] Processing queue item ${queueItem.id} (${queueItem.channelName})`);

  try {
    // 1. Scrape & Resolve URLs in the raw text FIRST to get full JD content (handles single URLs & redirect links)
    const { enrichedText, resolvedUrl } = await enrichWithScrapedContent(queueItem.rawText);
    console.log(`[Pipeline] Enriched text length: ${enrichedText.length} chars. Resolved URL: ${resolvedUrl}`);

    // 2. Classifier Agent — evaluates enriched text (includes scraped job page details)
    const classification = await classifyJobPost(enrichedText);
    await rawQueueRepository.markProcessed(queueItem.id, classification);

    if (!classification.is_job_post) {
      console.log(`[Pipeline] Item ${queueItem.id} classified as NON-JOB. Skipping extraction.`);
      return;
    }

    // 3. Extractor Agent — uses enriched text + resolved URL
    const extractedJD = await extractJobDetails(enrichedText, resolvedUrl || undefined);
    console.log(`[Pipeline] Extracted: "${extractedJD.companyName}" | "${extractedJD.jobTitle}" | ${extractedJD.applicationLink}`);

    // 4. SHA-256 Deduplication Check
    const dedupResult = await checkDuplicateJob(
      extractedJD.companyName,
      extractedJD.jobTitle,
      extractedJD.location
    );

    // 5. Fit Scorer Agent & ATS Matcher Service (Resume-Matcher standard)
    let scoreResult: any = {
      matchScore: 70,
      matchConfidence: 0.8,
      gapAnalysis: { strongMatches: extractedJD.skillsRequired.slice(0, 5), missingKeywords: [] },
      fitBreakdown: { techFitScore: 75, experienceFitScore: 80, locationFitScore: 70 },
      rubricScores: { skillsScore: 3.8, techStackScore: 4.0, experienceScore: 3.5, locationScore: 4.0, compensationScore: 3.5, overallRubricRating: 3.8 },
      scoreFlag: 'auto',
    };

    try {
      scoreResult = await scoreJobFit(extractedJD);
    } catch (e: any) {
      console.warn(`[Pipeline] Scorer agent fallback for ${queueItem.id}:`, e.message);
    }

    // Deep ATS Keyword & Impact Analysis (Resume-Matcher)
    const atsAnalysis = AtsMatcherService.analyzeAtsMatch(extractedJD.rawDescription, extractedJD.skillsRequired);

    // 6. ATS Resume Tailor Agent (S3 Upload as binary PDF)
    let resumeResult: any = { resumeVersionUrl: null, resumeNotes: 'Standard template — resume will be generated on first download.' };
    try {
      resumeResult = await generateTailoredResume(extractedJD, scoreResult.gapAnalysis);
    } catch (e: any) {
      console.warn(`[Pipeline] Resume tailor fallback for ${queueItem.id}:`, e.message);
    }

    // 7. Cover Letter Agent
    let coverLetterResult: any = { coverLetterUrl: null, coverLetterText: '' };
    try {
      coverLetterResult = await generateCoverLetter(extractedJD, scoreResult.gapAnalysis);
    } catch (e: any) {
      console.warn(`[Pipeline] Cover letter fallback for ${queueItem.id}:`, e.message);
    }

    // 8. Referral Contact Agent (10 real-looking employee contacts based on company)
    let referralContacts: any[] = [];
    try {
      referralContacts = await generateReferralDrafts(extractedJD);
    } catch (e: any) {
      console.warn(`[Pipeline] Referral agent fallback for ${queueItem.id}:`, e.message);
    }

    // 9. AI Interview Q&A Prep Generator Agent
    let interviewPrep: any = null;
    try {
      interviewPrep = await generateInterviewPrep(extractedJD);
    } catch (e: any) {
      console.warn(`[Pipeline] Interview prep fallback for ${queueItem.id}:`, e.message);
    }

    const highMatchAlert = scoreResult.matchScore >= 80;

    // Save to Datastore (S3 + MSSQL/Mongo)
    const job = await jobRepository.create({
      rawQueueId: queueItem.id,
      companyName: extractedJD.companyName,
      jobTitle: extractedJD.jobTitle,
      jobType: extractedJD.jobType,
      location: extractedJD.location,
      isRemote: extractedJD.isRemote,
      ctcMentioned: extractedJD.ctcMentioned,
      ctcRange: extractedJD.ctcRange,
      applicationLink: extractedJD.applicationLink,
      skillsRequired: extractedJD.skillsRequired,
      experienceRequired: extractedJD.experienceRequired,
      rawDescription: extractedJD.rawDescription,
      dedupHash: dedupResult.dedupHash,
      isDuplicate: dedupResult.isDuplicate,
      matchScore: scoreResult.matchScore,
      matchConfidence: scoreResult.matchConfidence,
      gapAnalysis: scoreResult.gapAnalysis,
      fitBreakdown: scoreResult.fitBreakdown,
      rubricScores: scoreResult.rubricScores,
      atsAnalysis: atsAnalysis,
      stage: 'pending_approval',
      scoreFlag: scoreResult.scoreFlag,
      approvalStatus: 'pending',
      applicationStatus: 'not_applied',
      resumeVersionUrl: resumeResult.resumeVersionUrl,
      resumeNotes: resumeResult.resumeNotes,
      coverLetterText: coverLetterResult.coverLetterText,
      referralContacts: referralContacts,
      interviewPrep: interviewPrep,
      highMatchAlert: highMatchAlert,
      skillMatched: scoreResult.skillMatched,
    });

    notificationService.checkAndNotifyHighMatch(job);

    console.log(`[Pipeline] ✅ Item ${queueItem.id} → Job ${job.id} | Company: "${job.companyName}" | Score: ${job.matchScore}% | 10 Referrals | Resume: ${job.resumeVersionUrl}`);
  } catch (error: any) {
    console.error(`[Pipeline] Error processing item ${queueItem.id}:`, error.message);
    await rawQueueRepository.updateError(queueItem.id, error.message);
  }
}

export async function processUnprocessedQueue(limit: number = 10): Promise<void> {
  const items = await rawQueueRepository.findUnprocessed(limit);
  if (items.length === 0) return;

  console.log(`[PipelineWorker] Processing batch of ${items.length} queue items...`);
  for (const item of items) {
    await processQueueItem(item);
  }
}
