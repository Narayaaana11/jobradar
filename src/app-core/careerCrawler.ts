import { store } from './store';
import { IJob, IProfile, ICareerWatchlistSite, ICareerSyncReport } from './types';
import { fetchWebPageHtml, cleanHtmlToText, extractHtmlMetadata } from './webFetcher';
import { extractJobDetails, IExtractedJD, extractValidApplicationLink } from './extractor';
import { scoreJobAgainstProfile } from './scorer';
import { analyzeAtsCompliance } from './atsMatcher';
import { generateReferralContacts } from './referralGenerator';
import { generateInterviewPrep } from './interviewPrep';
import { generateCoverLetter } from './coverLetterGenerator';
import { generateOutreachSuite } from './outreachAgent';
import { generateInterviewMasterGuide } from './interviewMasterGuide';
import { ragAugmentor } from './rag/ragAugmentor';

export interface IDiscoveredJobListing {
  title: string;
  url: string;
  location?: string;
  department?: string;
  snippet?: string;
}

/**
 * Parses raw career page HTML to discover individual job postings, cards, and links.
 */
export function discoverJobsFromCareerHtml(html: string, baseUrl: string): IDiscoveredJobListing[] {
  const discovered: IDiscoveredJobListing[] = [];
  const seenUrls = new Set<string>();

  if (!html) return discovered;

  // 1. Look for anchor tags that point to job openings
  // e.g. <a href="/jobs/12345" ...>Software Engineer</a>
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

    // Check if the URL or anchor text matches job posting indicators
    const isJobUrl = jobUrlPatterns.some((pattern) => pattern.test(fullUrl));
    const isJobText = /(?:Software|Developer|Engineer|Analyst|Associate|Consultant|Intern|Full\s*Stack|Frontend|Backend|Quality|MERN|Java|Python|Support|QA)\b/i.test(rawAnchorText);

    if ((isJobUrl || isJobText) && rawAnchorText.length >= 3 && rawAnchorText.length <= 120) {
      seenUrls.add(fullUrl);
      discovered.push({
        title: rawAnchorText,
        url: fullUrl,
        location: 'India / Remote',
      });
    }
  }

  // 2. If no anchor tags matched directly, parse structured job cards or list items
  if (discovered.length === 0) {
    const cleanText = cleanHtmlToText(html);
    const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/(?:Software\s*Engineer|Developer|Full\s*Stack|Frontend|Backend|Analyst|SDE|Associate)\b/i.test(line) && line.length < 80) {
        discovered.push({
          title: line,
          url: baseUrl,
          location: lines[i + 1] && lines[i + 1].length < 40 ? lines[i + 1] : 'India / Remote',
          snippet: lines.slice(i, i + 6).join('\n'),
        });
        i += 4; // skip ahead
      }
    }
  }

  return discovered.slice(0, 15); // Cap to top 15 most relevant openings per crawl
}

export class CareerPageCrawlerService {
  /**
   * Crawls a single career site, discovers openings, scores them against candidate's master resume,
   * and saves suitable jobs to the local store.
   */
  public async crawlCareerSite(
    site: ICareerWatchlistSite,
    profile: IProfile,
    masterResumeText: string
  ): Promise<{ site: ICareerWatchlistSite; jobsFound: number; suitableAdded: number; jobs: IJob[]; error?: string }> {
    store.setCareerSiteSyncStatus(site.id, 'syncing');

    try {
      // 1. Fetch live HTML of the career portal
      const html = await fetchWebPageHtml(site.careerUrl);
      const meta = extractHtmlMetadata(html, site.careerUrl);
      const discovered = discoverJobsFromCareerHtml(html, site.careerUrl);

      const suitableJobs: IJob[] = [];

      // 2. If individual jobs were discovered, process them
      if (discovered.length > 0) {
        for (const disc of discovered) {
          try {
            // Build rich JD text for extraction
            let rawJD = `*Company:* ${site.companyName}\n*Role:* ${disc.title}\n*Location:* ${disc.location || 'India / Remote'}\n*Application Link:* ${disc.url}\n\n`;
            if (disc.snippet) {
              rawJD += `${disc.snippet}\n\n`;
            }

            // If keywords were specified on the watchlist, include them
            if (site.searchKeywords && site.searchKeywords.length > 0) {
              rawJD += `*Key Focus Areas:* ${site.searchKeywords.join(', ')}\n`;
            }

            // Extract structured details
            const extracted = extractJobDetails(rawJD, disc.url);
            extracted.companyName = site.companyName;
            extracted.applicationLink = disc.url;

            // Score against profile & LaTeX master resume
            const scoreResult = scoreJobAgainstProfile(extracted, profile);
            const atsResult = analyzeAtsCompliance(extracted, profile);

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
                applicationLink: disc.url || site.careerUrl,
                applicationDeadline: extracted.applicationDeadline,
                skillsRequired: extracted.skillsRequired,
                experienceRequired: extracted.experienceRequired || 'Freshers / 2024-2026 MCA/B.Tech eligible',
                rawDescription: rawJD,
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
                atsAnalysis: atsResult,
                scoreFlag: scoreResult.scoreFlag,
                skillMatched: scoreResult.skillMatched,
                stage: scoreResult.matchScore >= 75 ? 'approved' : 'pending_approval',
                approvalStatus: scoreResult.matchScore >= 75 ? 'approved' : 'pending',
                applicationStatus: 'not_applied',
                referralContacts: generateReferralContacts(extracted, profile),
                interviewPrep: generateInterviewPrep(extracted, profile),
                coverLetterText: generateCoverLetter(extracted, profile),
                resumeNotes: `Auto-discovered from ${site.companyName} Career Portal. ATS Match: ${scoreResult.matchScore}%`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              job.outreachSuite = generateOutreachSuite(job, profile);
              job.interviewMasterGuide = generateInterviewMasterGuide(job, profile);

              store.addOrUpdateJob(job);
              suitableJobs.push(job);
            }
          } catch (itemErr) {
            console.warn(`[CareerCrawler] Error parsing role ${disc.title} on ${site.companyName}:`, itemErr);
          }
        }
      } else {
        // Fallback: If no distinct job cards were found, ingest the overall career portal summary
        const cleanText = cleanHtmlToText(html);
        const compositeJD = `*Company:* ${site.companyName}\n*Role:* Software Engineering Hiring\n*Career Portal:* ${site.careerUrl}\n\n${cleanText.substring(0, 1500)}`;
        const extracted = extractJobDetails(compositeJD, site.careerUrl);
        extracted.companyName = site.companyName;
        extracted.applicationLink = site.careerUrl;

        const scoreResult = scoreJobAgainstProfile(extracted, profile);
        if (scoreResult.matchScore >= 50) {
          const jobId = `job-web-${site.id}-${Date.now()}`;
          const job: IJob = {
            id: jobId,
            companyName: site.companyName,
            companyPageUrl: site.careerUrl,
            jobTitle: extracted.jobTitle,
            location: extracted.location || 'India / Remote',
            isRemote: extracted.isRemote,
            ctcMentioned: false,
            applicationLink: site.careerUrl,
            skillsRequired: extracted.skillsRequired,
            experienceRequired: 'Fresher / Early Career Eligible',
            rawDescription: compositeJD,
            sources: [{
              platform: 'web',
              channelName: `${site.companyName} Career Portal`,
              messageId: `web-summary-${site.id}-${Date.now()}`,
              url: site.careerUrl,
              scrapedAt: new Date().toISOString(),
            }],
            dedupHash: extracted.dedupHash,
            matchScore: scoreResult.matchScore,
            matchConfidence: scoreResult.matchConfidence,
            gapAnalysis: scoreResult.gapAnalysis,
            fitBreakdown: scoreResult.fitBreakdown,
            rubricScores: scoreResult.rubricScores,
            atsAnalysis: analyzeAtsCompliance(extracted, profile),
            scoreFlag: scoreResult.scoreFlag,
            skillMatched: scoreResult.skillMatched,
            stage: 'pending_approval',
            approvalStatus: 'pending',
            applicationStatus: 'not_applied',
            referralContacts: generateReferralContacts(extracted, profile),
            interviewPrep: generateInterviewPrep(extracted, profile),
            coverLetterText: generateCoverLetter(extracted, profile),
            resumeNotes: `Discovered from ${site.companyName} Careers Portal.`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          job.outreachSuite = generateOutreachSuite(job, profile);
          job.interviewMasterGuide = generateInterviewMasterGuide(job, profile);

          store.addOrUpdateJob(job);
          suitableJobs.push(job);
        }
      }

      store.setCareerSiteSyncStatus(site.id, 'success', discovered.length);

      return {
        site,
        jobsFound: discovered.length,
        suitableAdded: suitableJobs.length,
        jobs: suitableJobs,
      };
    } catch (err: any) {
      console.error(`[CareerCrawler] Crawl failed for ${site.companyName} (${site.careerUrl}):`, err.message);
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
   * Syncs all enabled career sites in the watchlist.
   * Compares each discovered opening with the user's master resume and profile.
   */
  public async syncAllCareerWatchlist(
    onProgress?: (statusMessage: string, currentIdx: number, totalSites: number) => void
  ): Promise<ICareerSyncReport> {
    const startTime = Date.now();
    const sites = store.getCareerWatchlist().filter((s) => s.enabled);
    const profile = store.getProfile();
    const masterResume = store.getMasterResume();

    let totalDiscovered = 0;
    let totalAdded = 0;
    const siteResults: ICareerSyncReport['siteResults'] = [];

    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      if (onProgress) {
        onProgress(`Crawling & matching ${site.companyName} career portal (${i + 1}/${sites.length})...`, i + 1, sites.length);
      }

      const res = await this.crawlCareerSite(site, profile, masterResume);
      totalDiscovered += res.jobsFound;
      totalAdded += res.suitableAdded;

      siteResults.push({
        siteId: site.id,
        companyName: site.companyName,
        status: res.error ? 'error' : 'success',
        jobsFound: res.jobsFound,
        suitableAdded: res.suitableAdded,
        error: res.error,
      });

      // Brief delay between requests to be polite to career portal servers
      await new Promise((r) => setTimeout(r, 400));
    }

    if (onProgress) {
      onProgress(`Completed sync across ${sites.length} career portals! Discovered ${totalDiscovered} roles, added ${totalAdded} suitable matches.`, sites.length, sites.length);
    }

    return {
      totalSitesCrawled: sites.length,
      totalJobsDiscovered: totalDiscovered,
      suitableJobsAdded: totalAdded,
      durationMs: Date.now() - startTime,
      syncedAt: new Date().toISOString(),
      siteResults,
    };
  }
}

export const careerCrawler = new CareerPageCrawlerService();
