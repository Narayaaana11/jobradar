import { store } from './store';
import { IJob, IProfile, ICareerWatchlistSite, ICareerSyncReport } from './types';
import { fetchWebPageHtml, cleanHtmlToText, extractHtmlMetadata } from './webFetcher';
import { extractJobDetails, extractJobDetailsWithAi, IExtractedJD, extractValidApplicationLink } from './extractor';
import { scoreJobAgainstProfile, scoreJobAgainstProfileWithAi, auditBlockGLegitimacy, auditBlockGLegitimacyWithAi } from './scorer';
import { analyzeAtsCompliance } from './atsMatcher';
import { atsOptimizer } from './atsOptimizer';
import { generateDownstreamAssets } from './pipeline';
import { generateFollowupCadence } from './followupCadence';
import { ragAugmentor } from './rag/ragAugmentor';
import { scrapingOverseer } from './scrapingOverseer';
import { atsAdapters } from './atsAdapters';
import { playwrightScraper } from './playwrightScraper';
import { aiConcurrencyLimiter } from './concurrency';

export interface IDiscoveredJobListing {
  title: string;
  url: string;
  location?: string;
  department?: string;
  snippet?: string;
  descriptionHtml?: string;
  plainText?: string;
}

/**
 * Parses raw career page HTML using the Scraping Overseer Agent to discover genuine job openings only.
 */
export function discoverJobsFromCareerHtml(html: string, baseUrl: string): IDiscoveredJobListing[] {
  const discovered: IDiscoveredJobListing[] = [];
  const seenUrls = new Set<string>();

  if (!html) return discovered;

  // 1. Look for anchor tags that point to specific job openings
  const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  const jobUrlPatterns = [
    /\/jobs?\//i,
    /\/career[s]?\//i,
    /\/position[s]?\//i,
    /\/opening[s]?\//i,
    /\/vacancy\//i,
    /\/requisition\//i,
    /\/viewjob\b/i,
    /gh_jid=/i,
    /lever\.co/i,
    /greenhouse\.io/i,
    /ashbyhq\.com/i,
    /workable\.com/i,
    /myworkdayjobs\.com/i,
    /smartrecruiters\.com/i,
  ];

  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1];
    const rawAnchorText = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) continue;

    // Resolve relative URLs to absolute
    let fullUrl = rawHref;
    try {
      fullUrl = new URL(rawHref, baseUrl).href;
    } catch {
      continue;
    }

    if (seenUrls.has(fullUrl)) continue;

    // Gate 1: URL Structure Check (Block generic non-job portal sub-paths & homepage hashes)
    if (!scrapingOverseer.isValidJobRequisitionUrl(fullUrl, baseUrl)) {
      continue;
    }

    // Gate 2: Semantic Title Check (Block "Jobs", "Home", "Support", "Careers", "How we Hire", "I'm Interested")
    const titleAudit = scrapingOverseer.isLegitimateJobTitle(rawAnchorText);
    if (!titleAudit.valid) {
      continue;
    }

    const isJobUrl = jobUrlPatterns.some((pattern) => pattern.test(fullUrl));

    if (isJobUrl || titleAudit.valid) {
      seenUrls.add(fullUrl);
      discovered.push({
        title: titleAudit.cleaned,
        url: fullUrl,
        location: 'India / Remote',
      });
    }
  }

  // 2. Structured job cards check (if no direct anchor tags passed)
  if (discovered.length === 0) {
    const cleanText = cleanHtmlToText(html);
    const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineAudit = scrapingOverseer.isLegitimateJobTitle(line);

      if (lineAudit.valid && line.length < 80) {
        discovered.push({
          title: lineAudit.cleaned,
          url: baseUrl,
          location: lines[i + 1] && lines[i + 1].length < 40 ? lines[i + 1] : 'India / Remote',
          snippet: lines.slice(i, i + 6).join('\n'),
        });
        i += 4;
      }
    }
  }

  return discovered.slice(0, 20);
}

export class CareerPageCrawlerService {
  /**
   * Crawls a single career site using high-speed ATS Adapters (Greenhouse, Lever, Ashby, Workable)
   * with Playwright headless rendering, Scraping Overseer validation, and AI-native reasoning.
   */
  public async crawlCareerSite(
    site: ICareerWatchlistSite,
    profile: IProfile,
    masterResumeText: string
  ): Promise<{ site: ICareerWatchlistSite; jobsFound: number; suitableAdded: number; jobs: IJob[]; error?: string }> {
    store.setCareerSiteSyncStatus(site.id, 'syncing');
    const hasAiKey = Boolean(profile.apiKey || profile.groqApiKey || profile.geminiApiKey);
    const useLlm = hasAiKey;
    const activeKey = profile.apiKey || profile.groqApiKey || profile.geminiApiKey || '';

    try {
      let discovered: IDiscoveredJobListing[] = [];

      // Step 1: Direct High-Speed ATS Adapter (Greenhouse / Lever / Ashby / Workable / SmartRecruiters)
      const atsRes = await atsAdapters.fetchUniversalAtsJobs(site.careerUrl, site.companyName, site.atsProvider);
      if (atsRes.success && atsRes.jobs.length > 0) {
        discovered = atsRes.jobs.map((j) => ({
          title: j.title,
          url: j.url,
          location: j.location || 'India / Remote',
          department: j.department,
          descriptionHtml: j.descriptionHtml,
          plainText: j.plainText,
        }));
      }

      // Step 2: Fallback to Headless Browser / Live HTML Scraping (Playwright concurrency limited)
      if (discovered.length === 0) {
        const scrapeRes = await playwrightScraper.scrapePortalHtml(site.careerUrl);
        if (scrapeRes.success && scrapeRes.html) {
          discovered = discoverJobsFromCareerHtml(scrapeRes.html, site.careerUrl);
        }
      }

      // Step 3: AI Overseer Discovery Fallback
      if (discovered.length === 0 && activeKey) {
        const html = await fetchWebPageHtml(site.careerUrl);
        const pageText = cleanHtmlToText(html);
        const aiOpenings = await scrapingOverseer.auditCareerPageWithAi(pageText, site.careerUrl, site.companyName, activeKey);
        if (aiOpenings && aiOpenings.length > 0) {
          discovered = aiOpenings.map((op) => ({
            title: op.jobTitle,
            url: op.applicationLink || site.careerUrl,
            location: op.location || 'India / Remote',
            snippet: op.rawDescription,
          }));
        }
      }

      const suitableJobs: IJob[] = [];

      // 2. Audit each candidate opening with deep extraction and AI scoring
      if (discovered.length > 0) {
        for (const disc of discovered) {
          try {
            // Overseer Agent audits opening and performs deep-page extraction with AI
            let extracted = await scrapingOverseer.auditAndDeepExtractJob(
              disc.title,
              disc.url,
              site.companyName,
              site.searchKeywords,
              activeKey
            );

            if (!extracted) {
              continue; // Discard non-technical or boilerplate listings
            }

            // If LLM is active and we have rich description, refine extracted JD with AI
            if (useLlm && (disc.descriptionHtml || disc.plainText || disc.snippet)) {
              try {
                const refined = await aiConcurrencyLimiter.run(() =>
                  extractJobDetailsWithAi(disc.descriptionHtml || disc.plainText || disc.snippet || extracted!.rawDescription, profile)
                );
                if (refined && refined.jobTitle) {
                  extracted = { ...extracted, ...refined, applicationLink: extracted.applicationLink || disc.url };
                }
              } catch {
                // Retain base extracted JD
              }
            }

            // Check duplicate
            if (store.getJobs().some((j) => j.dedupHash === extracted.dedupHash)) {
              continue;
            }

            // AI-Native / Rubric Fit Evaluation (concurrency limited)
            const scoreResult = useLlm
              ? await aiConcurrencyLimiter.run(() => scoreJobAgainstProfileWithAi(extracted!, profile))
              : scoreJobAgainstProfile(extracted, profile);

            // ATS Resume Gap Analysis & Iterative Optimization Loop
            const atsOpt = await atsOptimizer.optimizeResumeForJob(extracted, profile);
            const atsResult = analyzeAtsCompliance(extracted, profile);
            atsResult.overallAtsScore = Math.max(atsResult.overallAtsScore ?? 0, atsOpt.finalScore);

            // Compute RAG vector similarity to candidate's real project case studies
            const ragContext = ragAugmentor.getRagContextForJob(extracted, { topK: 3 });

            // Suitability gate: match score >= 55% or high technical keyword overlap
            const isSuitable =
              scoreResult.matchScore >= 55 ||
              scoreResult.rubricScores.skillsScore >= 3.5 ||
              ragContext.confidenceScore >= 0.35;

            if (isSuitable) {
              const jobId = `job-web-${site.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
              const messageId = `web-crawl-${site.id}-${Date.now()}`;

              // Block G Legitimacy Audit with AI
              const blockGAudit = useLlm
                ? await aiConcurrencyLimiter.run(() => auditBlockGLegitimacyWithAi(extracted!, profile))
                : auditBlockGLegitimacy(extracted);

              // Downstream AI Assets Generation (Concurrency-limited & zero silent fallback)
              const downstream = await generateDownstreamAssets(extracted, profile, useLlm);

              const job: IJob = {
                id: jobId,
                companyName: site.companyName,
                companyPageUrl: site.careerUrl,
                jobTitle: extracted.jobTitle,
                jobType: extracted.jobType || 'Full-Time',
                location: extracted.location || 'India / Remote',
                isRemote: extracted.isRemote,
                ctcMentioned: extracted.ctcMentioned,
                ctcRange: extracted.ctcRange,
                applicationLink: extracted.applicationLink || disc.url || site.careerUrl,
                applicationDeadline: extracted.applicationDeadline,
                skillsRequired: extracted.skillsRequired,
                experienceRequired: extracted.experienceRequired || 'Freshers / 2024-2026 MCA/B.Tech eligible',
                rawDescription: extracted.rawDescription,
                sources: [
                  {
                    platform: 'web',
                    channelName: `${site.companyName} Career Portal`,
                    messageId,
                    url: disc.url || site.careerUrl,
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
                referralContacts: downstream.referralContacts,
                interviewPrep: downstream.interviewPrep,
                coverLetterText: downstream.coverLetterText,
                resumeNotes: `Verified by Overseer Agent from ${site.companyName} Career Portal. ATS Match: ${scoreResult.matchScore}%`,
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

              store.addOrUpdateJob(job);
              suitableJobs.push(job);
            }
          } catch (itemErr) {
            console.warn(`[CareerCrawler] Error parsing role ${disc.title} on ${site.companyName}:`, itemErr);
          }
        }
      }

      store.setCareerSiteSyncStatus(site.id, suitableJobs.length > 0 ? 'success' : 'idle', suitableJobs.length);
      return {
        site,
        jobsFound: discovered.length,
        suitableAdded: suitableJobs.length,
        jobs: suitableJobs,
      };
    } catch (err: any) {
      console.error(`[CareerCrawler] Failed to crawl ${site.companyName}:`, err);
      store.setCareerSiteSyncStatus(site.id, 'error', 0, err.message);
      return {
        site,
        jobsFound: 0,
        suitableAdded: 0,
        jobs: [],
        error: err.message,
      };
    }
  }

  /**
   * Crawls all enabled sites in the career watchlist sequentially with live progress callbacks.
   */
  public async syncAllCareerWatchlist(
    onProgress?: (statusMsg: string, current: number, total: number) => void
  ): Promise<ICareerSyncReport> {
    const profile = store.getProfile();
    const masterResume = store.getMasterResume();
    const sites = store.getCareerWatchlist().filter((s) => s.enabled);

    const report: ICareerSyncReport = {
      totalSitesCrawled: 0,
      totalJobsDiscovered: 0,
      suitableJobsAdded: 0,
      durationMs: 0,
      syncedAt: new Date().toISOString(),
      siteResults: [],
    };

    const startTime = Date.now();

    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      if (onProgress) {
        onProgress(`[${i + 1}/${sites.length}] Crawling ${site.companyName} with Overseer Agent...`, i + 1, sites.length);
      }

      try {
        const result = await this.crawlCareerSite(site, profile, masterResume);
        report.totalSitesCrawled++;
        report.totalJobsDiscovered += result.jobsFound;
        report.suitableJobsAdded += result.suitableAdded;
        report.siteResults.push({
          siteId: site.id,
          companyName: site.companyName,
          status: result.error ? 'error' : 'success',
          jobsFound: result.jobsFound,
          suitableAdded: result.suitableAdded,
          error: result.error,
        });
      } catch (err: any) {
        report.siteResults.push({
          siteId: site.id,
          companyName: site.companyName,
          status: 'error',
          jobsFound: 0,
          suitableAdded: 0,
          error: err.message,
        });
      }

      // Polite delay between domains to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    report.durationMs = Date.now() - startTime;
    return report;
  }
}

export const careerCrawler = new CareerPageCrawlerService();
