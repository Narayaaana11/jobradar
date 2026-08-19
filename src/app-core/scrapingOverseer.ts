import { IJob, IProfile } from './types';
import { IExtractedJD, extractJobDetails } from './extractor';
import { fetchWebPageHtml, cleanHtmlToText } from './webFetcher';
import { llmClient } from './llmClient';

/**
 * Autonomous Scraping & Quality Overseer AI Agent
 * 
 * Powered by OpenRouter AI APIs + Local Semantic Heuristics:
 * 1. Inspects raw scraped career page HTML and text.
 * 2. Employs AI model reasoning to filter out UI buttons, menus, and boilerplate headers.
 * 3. Deeply analyzes target requisition URLs to extract structured JD details, responsibilities, and direct application links.
 * 4. Sanitizes the store database automatically to keep the job feed pristine.
 */

// Common generic navigation, menu, and boilerplate text that are NOT job openings
const JUNK_NAV_TITLES = new Set([
  'jobs',
  'careers',
  'home',
  'support',
  'about',
  'about us',
  'contact',
  'contact us',
  'privacy',
  'privacy policy',
  'terms',
  'terms of service',
  'menu',
  'login',
  'sign in',
  'register',
  'sign up',
  'apply',
  'apply now',
  'apply today',
  'see all jobs',
  'view all jobs',
  'explore jobs',
  'search jobs',
  'browse jobs',
  'all openings',
  'open positions',
  'current openings',
  'how we hire',
  'hiring process',
  'our culture',
  'life at',
  'join us',
  'work with us',
  "i'm interested",
  'im interested',
  'interested',
  'hiring ai builders',
  'early careers',
  'university hiring',
  'campus hiring',
  'students',
  'graduates',
  'departments',
  'locations',
  'teams',
  'benefits',
  'read more',
  'learn more',
  'click here',
  'share',
  'save job',
  'filter',
  'filters',
  'back to top',
]);

const JUNK_URL_SUBSTRINGS = [
  '#',
  '/terms',
  '/privacy',
  '/contact',
  '/about',
  '/support',
  '/help',
  '/login',
  '/signin',
  '/signup',
  '/register',
  '/faq',
  '/blog',
  '/news',
  '/press',
  '/legal',
  '/security',
  '/cookies',
  '/sitemap',
  '/events',
];

const VALID_ROLE_INDICATORS = [
  'engineer',
  'developer',
  'architect',
  'programmer',
  'sde',
  'swe',
  'frontend',
  'front-end',
  'backend',
  'back-end',
  'full stack',
  'fullstack',
  'mern',
  'software',
  'data scientist',
  'data analyst',
  'analyst',
  'consultant',
  'associate',
  'specialist',
  'qa',
  'quality assurance',
  'test engineer',
  'sdet',
  'devops',
  'cloud',
  'system engineer',
  'product manager',
  'ui/ux',
  'intern',
  'trainee',
  'apprentice',
  'graduate engineer',
];

export interface IScrapedAiOpening {
  jobTitle: string;
  location: string;
  skillsRequired: string[];
  experienceRequired: string;
  applicationLink?: string;
  rawDescription: string;
}

export class ScrapingOverseerAgent {
  /**
   * Evaluates if a discovered title represents a legitimate, individual technical job opening.
   */
  public isLegitimateJobTitle(rawTitle: string): { valid: boolean; reason: string; cleaned: string } {
    const cleaned = (rawTitle || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || cleaned.length < 4) {
      return { valid: false, reason: 'Title too short (< 4 chars)', cleaned };
    }

    if (cleaned.length > 120) {
      return { valid: false, reason: 'Title too long (> 120 chars, likely a paragraph snippet)', cleaned };
    }

    const lower = cleaned.toLowerCase();

    // 1. Check exact junk navigation phrases
    if (JUNK_NAV_TITLES.has(lower)) {
      return { valid: false, reason: `Matched generic UI navigation title: "${cleaned}"`, cleaned };
    }

    // 2. Check for boilerplate button phrases
    for (const junk of JUNK_NAV_TITLES) {
      if (lower === junk || lower.startsWith(`${junk} `) || lower.endsWith(` ${junk}`)) {
        if (junk.length > 5) {
          return { valid: false, reason: `Contains generic UI action phrase: "${junk}"`, cleaned };
        }
      }
    }

    // 3. Must contain at least one valid technical role indicator
    const hasRoleIndicator = VALID_ROLE_INDICATORS.some((ind) => {
      const regex = new RegExp(`\\b${ind.replace('-', '[- ]')}\\b`, 'i');
      return regex.test(lower);
    });

    if (!hasRoleIndicator) {
      return { valid: false, reason: 'Missing standard engineering role or title keyword', cleaned };
    }

    return { valid: true, reason: 'Verified engineering title', cleaned };
  }

  /**
   * Evaluates if a URL points to a specific requisition rather than a general portal homepage.
   */
  public isValidJobRequisitionUrl(url: string, baseUrl: string): boolean {
    if (!url || url.startsWith('javascript:') || url.startsWith('mailto:')) return false;

    const lower = url.toLowerCase();

    // Block hash anchors on homepages (e.g. https://company.com/careers/#jobs)
    if (url.includes('#') && url.split('#')[0] === baseUrl.split('#')[0]) {
      return false;
    }

    // Block generic non-job portal sub-paths
    for (const junk of JUNK_URL_SUBSTRINGS) {
      if (lower.includes(junk)) return false;
    }

    return true;
  }

  /**
   * AI-Powered Career Page Auditor:
   * Uses OpenRouter LLM reasoning to evaluate raw page text, reject UI buttons, and extract clean openings.
   */
  public async auditCareerPageWithAi(
    rawText: string,
    pageUrl: string,
    companyName: string,
    apiKey?: string
  ): Promise<IScrapedAiOpening[] | null> {
    if (!apiKey || !apiKey.trim()) return null;

    try {
      const res = await llmClient.auditAndExtractCareerPageWithAi(rawText, pageUrl, companyName, apiKey);
      if (res.success && res.data && res.data.openings.length > 0) {
        // Filter openings through role validation
        return res.data.openings.filter((op: { jobTitle: string }) => this.isLegitimateJobTitle(op.jobTitle).valid);
      }
    } catch (err) {
      console.warn(`[ScrapingOverseer] LLM Career Page audit fallback for ${companyName}:`, err);
    }

    return null;
  }

  /**
   * Deep-Page Web Inspector:
   * Follows candidate URL, fetches live page HTML, and uses AI / local extraction to build full JD.
   */
  public async auditAndDeepExtractJob(
    title: string,
    candidateUrl: string,
    companyName: string,
    fallbackKeywords: string[] = [],
    apiKey?: string
  ): Promise<IExtractedJD | null> {
    const titleCheck = this.isLegitimateJobTitle(title);
    if (!titleCheck.valid) {
      return null;
    }

    let deepHtml = '';
    let pageText = '';

    try {
      if (candidateUrl && !candidateUrl.includes('#jobs')) {
        deepHtml = await fetchWebPageHtml(candidateUrl);
        pageText = cleanHtmlToText(deepHtml);
      }
    } catch {
      // Fall through to structured text builder
    }

    // If deep page was fetched and API key is present, attempt AI extraction on the deep JD
    if (pageText && pageText.length > 250 && apiKey) {
      try {
        const aiRes = await llmClient.extractJobWithLlm(pageText.substring(0, 3000), apiKey);
        if (aiRes.success && aiRes.data) {
          const aiJD = aiRes.data;
          aiJD.companyName = companyName;
          aiJD.jobTitle = titleCheck.cleaned;
          aiJD.applicationLink = candidateUrl;
          return aiJD;
        }
      } catch {
        // Fall through to local extraction
      }
    }

    // Local deterministic extraction fallback
    if (pageText && pageText.length > 250) {
      const extracted = extractJobDetails(pageText, candidateUrl);
      extracted.companyName = companyName;
      extracted.jobTitle = titleCheck.cleaned;
      extracted.applicationLink = candidateUrl;

      if (extracted.skillsRequired.length > 0 || pageText.toLowerCase().includes('responsibilities') || pageText.toLowerCase().includes('requirements')) {
        return extracted;
      }
    }

    // Synthesized high-quality JD with verified role semantics
    let synthesizedJD = `*Company:* ${companyName}\n`;
    synthesizedJD += `*Role:* ${titleCheck.cleaned}\n`;
    synthesizedJD += `*Location:* India / Remote\n`;
    synthesizedJD += `*Application Link:* ${candidateUrl}\n\n`;
    synthesizedJD += `Official Engineering Opening at ${companyName}.\n`;
    synthesizedJD += `We are hiring a ${titleCheck.cleaned} to join our engineering and product development teams.\n\n`;

    if (fallbackKeywords.length > 0) {
      synthesizedJD += `*Key Technical Requirements:* ${fallbackKeywords.join(', ')}\n`;
    }

    const fallbackExtracted = extractJobDetails(synthesizedJD, candidateUrl);
    fallbackExtracted.companyName = companyName;
    fallbackExtracted.jobTitle = titleCheck.cleaned;
    fallbackExtracted.applicationLink = candidateUrl;

    return fallbackExtracted;
  }

  /**
   * Scans raw HTML and extracts candidate job links using overseer validation gates
   */
  public extractJobLinksFromHtml(html: string, baseUrl: string): Array<{ title: string; url: string; location?: string }> {
    const discovered: Array<{ title: string; url: string; location?: string }> = [];
    const seenUrls = new Set<string>();
    if (!html) return discovered;

    const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      const rawHref = match[1];
      const rawAnchorText = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) continue;

      let fullUrl = rawHref;
      try {
        fullUrl = new URL(rawHref, baseUrl).href;
      } catch {
        continue;
      }

      if (seenUrls.has(fullUrl)) continue;
      if (!this.isValidJobRequisitionUrl(fullUrl, baseUrl)) continue;

      const titleAudit = this.isLegitimateJobTitle(rawAnchorText);
      if (titleAudit.valid) {
        seenUrls.add(fullUrl);
        discovered.push({
          title: titleAudit.cleaned,
          url: fullUrl,
          location: 'India / Remote',
        });
      }
    }

    return discovered;
  }

  /**
   * Scans active jobs in storage and purges any junk/navigation entries.
   */
  public sanitizeJobsList(jobs: IJob[]): { cleanJobs: IJob[]; removedCount: number } {
    const cleanJobs: IJob[] = [];
    let removedCount = 0;

    for (const job of jobs) {
      const check = this.isLegitimateJobTitle(job.jobTitle);
      const isJunkUrl = job.applicationLink?.includes('#jobs') || job.jobTitle.toLowerCase() === 'jobs' || job.jobTitle.toLowerCase() === 'home';

      if (check.valid && !isJunkUrl) {
        cleanJobs.push(job);
      } else {
        removedCount++;
      }
    }

    return { cleanJobs, removedCount };
  }
}

export const scrapingOverseer = new ScrapingOverseerAgent();
