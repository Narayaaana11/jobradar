import { AtsPlatform, IAtsJobRaw, IAtsAdapterResult } from './types';
import { fetchWebPageHtml, cleanHtmlToText } from './webFetcher';

/**
 * JobRadar Automated ATS Headless & API Connector Suite
 * 
 * Specialized high-speed zero-token adapters for major ATS platforms:
 * 1. Greenhouse (boards-api.greenhouse.io & HTML embed)
 * 2. Lever (api.lever.co & HTML listings)
 * 3. Ashby (api.ashbyhq.com & React hydration)
 * 4. Workable (apply.workable.com API & HTML)
 * 5. SmartRecruiters (api.smartrecruiters.com)
 * 6. Universal ATS Auto-Detector & Requisition Parser
 */

export class AtsAdaptersService {
  /**
   * Detects the ATS provider from a target URL
   */
  public detectAtsPlatform(url: string): AtsPlatform {
    if (!url) return 'generic';
    const lower = url.toLowerCase();

    if (lower.includes('greenhouse.io') || lower.includes('gh_jid=') || lower.includes('boards.greenhouse')) {
      return 'greenhouse';
    }
    if (lower.includes('lever.co') || lower.includes('jobs.lever')) {
      return 'lever';
    }
    if (lower.includes('ashbyhq.com') || lower.includes('jobs.ashbyhq')) {
      return 'ashby';
    }
    if (lower.includes('workable.com') || lower.includes('apply.workable')) {
      return 'workable';
    }
    if (lower.includes('smartrecruiters.com')) {
      return 'smartrecruiters';
    }
    if (lower.includes('myworkdayjobs.com') || lower.includes('workday.com')) {
      return 'workday';
    }

    return 'generic';
  }

  /**
   * Extracts company or board slug from standard ATS URLs
   */
  public extractAtsSlug(url: string, platform?: AtsPlatform): string | null {
    if (!url) return null;
    const detected = platform || this.detectAtsPlatform(url);

    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.replace(/^\/+|\/+$/g, '');
      const segments = pathname.split('/');

      switch (detected) {
        case 'greenhouse': {
          // e.g., https://boards.greenhouse.io/stripe or https://boards-api.greenhouse.io/v1/boards/stripe/jobs
          if (parsed.hostname.includes('boards-api.greenhouse.io')) {
            const bIdx = segments.indexOf('boards');
            if (bIdx !== -1 && segments[bIdx + 1]) return segments[bIdx + 1];
          }
          if (parsed.searchParams.has('for')) {
            return parsed.searchParams.get('for');
          }
          return segments[0] || null;
        }

        case 'lever': {
          // e.g., https://jobs.lever.co/postman or https://api.lever.co/v0/postings/postman
          if (parsed.hostname.includes('api.lever.co')) {
            const pIdx = segments.indexOf('postings');
            if (pIdx !== -1 && segments[pIdx + 1]) return segments[pIdx + 1];
          }
          return segments[0] || null;
        }

        case 'ashby': {
          // e.g., https://jobs.ashbyhq.com/vercel or https://api.ashbyhq.com/posting-api/job-board/vercel
          if (parsed.hostname.includes('api.ashbyhq.com')) {
            const jIdx = segments.indexOf('job-board');
            if (jIdx !== -1 && segments[jIdx + 1]) return segments[jIdx + 1];
          }
          return segments[0] || null;
        }

        case 'workable': {
          // e.g., https://apply.workable.com/resend/
          return segments[0] || null;
        }

        case 'smartrecruiters': {
          // e.g., https://careers.smartrecruiters.com/Visa
          return segments[0] || null;
        }

        default:
          return segments[0] || null;
      }
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. GREENHOUSE ADAPTER
  // ─────────────────────────────────────────────────────────────
  public async fetchGreenhouseJobs(boardSlugOrUrl: string, companyName: string): Promise<IAtsAdapterResult> {
    const slug = this.extractAtsSlug(boardSlugOrUrl, 'greenhouse') || boardSlugOrUrl;
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;

    try {
      // Try boards API first
      try {
        const rawJsonText = await fetchWebPageHtml(apiUrl);
        if (rawJsonText) {
          const json = JSON.parse(rawJsonText);
          if (json && Array.isArray(json.jobs)) {
            const rawJobs: IAtsJobRaw[] = json.jobs.map((item: any) => ({
              id: `gh-${slug}-${item.id}`,
              requisitionId: String(item.id),
              title: (item.title || '').trim(),
              url: item.absolute_url || `https://boards.greenhouse.io/${slug}/jobs/${item.id}`,
              location: item.location?.name || 'Remote / Unspecified',
              department: item.departments?.[0]?.name || item.offices?.[0]?.name || 'Engineering',
              descriptionHtml: item.content || '',
              plainText: cleanHtmlToText(item.content || ''),
              postedAt: item.updated_at || new Date().toISOString(),
              atsPlatform: 'greenhouse' as AtsPlatform,
            }));

            if (rawJobs.length > 0) {
              return {
                success: true,
                companyName,
                provider: 'greenhouse',
                totalJobs: rawJobs.length,
                jobs: rawJobs,
              };
            }
          }
        }
      } catch (apiErr) {
        // API error, try HTML scraping
      }

      // Fallback: Scrape standard Greenhouse HTML page
      const htmlUrl = boardSlugOrUrl.startsWith('http') ? boardSlugOrUrl : `https://boards.greenhouse.io/${slug}`;
      const html = await fetchWebPageHtml(htmlUrl);
      if (html) {
        const jobs = this.parseGreenhouseHtml(html, htmlUrl, slug);
        return {
          success: true,
          companyName,
          provider: 'greenhouse',
          totalJobs: jobs.length,
          jobs,
        };
      }

      return {
        success: false,
        companyName,
        provider: 'greenhouse',
        totalJobs: 0,
        jobs: [],
        error: 'No jobs found on Greenhouse board',
      };
    } catch (err: any) {
      return {
        success: false,
        companyName,
        provider: 'greenhouse',
        totalJobs: 0,
        jobs: [],
        error: err.message,
      };
    }
  }

  private parseGreenhouseHtml(html: string, baseUrl: string, slug: string): IAtsJobRaw[] {
    const jobs: IAtsJobRaw[] = [];
    const openingRegex = /<div\b[^>]*class=["'][^"']*opening[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
    let match: RegExpExecArray | null;

    while ((match = openingRegex.exec(html)) !== null) {
      const block = match[1];
      const linkMatch = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(block);
      const locMatch = /<span\b[^>]*class=["'][^"']*location[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(block);

      if (linkMatch) {
        const rawHref = linkMatch[1];
        const title = linkMatch[2].replace(/<[^>]+>/g, '').trim();
        const location = locMatch ? locMatch[1].replace(/<[^>]+>/g, '').trim() : 'India / Remote';

        let fullUrl = rawHref;
        try {
          fullUrl = new URL(rawHref, baseUrl).href;
        } catch {
          fullUrl = rawHref;
        }

        const idMatch = /\/jobs\/(\d+)/i.exec(fullUrl);
        const reqId = idMatch ? idMatch[1] : `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        if (title) {
          jobs.push({
            id: `gh-${slug}-${reqId}`,
            requisitionId: reqId,
            title,
            url: fullUrl,
            location,
            department: 'Engineering',
            atsPlatform: 'greenhouse',
            postedAt: new Date().toISOString(),
          });
        }
      }
    }

    return jobs;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. LEVER ADAPTER
  // ─────────────────────────────────────────────────────────────
  public async fetchLeverJobs(companySlugOrUrl: string, companyName: string): Promise<IAtsAdapterResult> {
    const slug = this.extractAtsSlug(companySlugOrUrl, 'lever') || companySlugOrUrl;
    const apiUrl = `https://api.lever.co/v0/postings/${slug}?mode=json`;

    try {
      try {
        const rawJsonText = await fetchWebPageHtml(apiUrl);
        if (rawJsonText) {
          const postings = JSON.parse(rawJsonText);
          if (Array.isArray(postings)) {
            const rawJobs: IAtsJobRaw[] = postings.map((item: any) => ({
              id: `lever-${slug}-${item.id}`,
              requisitionId: item.id,
              title: (item.text || item.title || '').trim(),
              url: item.hostedUrl || item.applyUrl || `https://jobs.lever.co/${slug}/${item.id}`,
              location: item.categories?.location || item.workplaceType || 'Remote',
              department: item.categories?.team || item.categories?.department || 'Engineering',
              descriptionHtml: item.description || item.descriptionPlain || '',
              plainText: item.descriptionPlain || cleanHtmlToText(item.description || ''),
              compensation: item.salaryDescription || (item.salaryRange?.min ? `${item.salaryRange.min} - ${item.salaryRange.max}` : undefined),
              postedAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
              atsPlatform: 'lever' as AtsPlatform,
            }));

            if (rawJobs.length > 0) {
              return {
                success: true,
                companyName,
                provider: 'lever',
                totalJobs: rawJobs.length,
                jobs: rawJobs,
              };
            }
          }
        }
      } catch (apiErr) {
        // API error, fallback to HTML
      }

      // Fallback: Scrape Lever HTML page
      const htmlUrl = companySlugOrUrl.startsWith('http') ? companySlugOrUrl : `https://jobs.lever.co/${slug}`;
      const html = await fetchWebPageHtml(htmlUrl);
      if (html) {
        const jobs = this.parseLeverHtml(html, htmlUrl, slug);
        return {
          success: true,
          companyName,
          provider: 'lever',
          totalJobs: jobs.length,
          jobs,
        };
      }

      return {
        success: false,
        companyName,
        provider: 'lever',
        totalJobs: 0,
        jobs: [],
        error: 'No postings found on Lever portal',
      };
    } catch (err: any) {
      return {
        success: false,
        companyName,
        provider: 'lever',
        totalJobs: 0,
        jobs: [],
        error: err.message,
      };
    }
  }

  private parseLeverHtml(html: string, baseUrl: string, slug: string): IAtsJobRaw[] {
    const jobs: IAtsJobRaw[] = [];
    const postingRegex = /<div\b[^>]*class=["'][^"']*posting[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
    let match: RegExpExecArray | null;

    while ((match = postingRegex.exec(html)) !== null) {
      const block = match[1];
      const linkMatch = /<a\b[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*posting-title[^"']*["'][^>]*>([\s\S]*?)<\/a>/i.exec(block) ||
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(block);

      const locMatch = /<span\b[^>]*class=["'][^"']*location[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(block) ||
        /<span\b[^>]*class=["'][^"']*workplaceTypes[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(block);

      if (linkMatch) {
        const rawHref = linkMatch[1];
        const title = linkMatch[2].replace(/<[^>]+>/g, '').trim();
        const location = locMatch ? locMatch[1].replace(/<[^>]+>/g, '').trim() : 'Remote / Hybrid';

        let fullUrl = rawHref;
        try {
          fullUrl = new URL(rawHref, baseUrl).href;
        } catch {
          fullUrl = rawHref;
        }

        const idSegments = fullUrl.split('/');
        const reqId = idSegments[idSegments.length - 1] || `${Date.now()}`;

        if (title && !title.toLowerCase().includes('filter')) {
          jobs.push({
            id: `lever-${slug}-${reqId}`,
            requisitionId: reqId,
            title,
            url: fullUrl,
            location,
            department: 'Engineering',
            atsPlatform: 'lever',
            postedAt: new Date().toISOString(),
          });
        }
      }
    }

    return jobs;
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ASHBY ADAPTER
  // ─────────────────────────────────────────────────────────────
  public async fetchAshbyJobs(companySlugOrUrl: string, companyName: string): Promise<IAtsAdapterResult> {
    const slug = this.extractAtsSlug(companySlugOrUrl, 'ashby') || companySlugOrUrl;
    const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${slug}`;

    try {
      try {
        const rawJsonText = await fetchWebPageHtml(apiUrl);
        if (rawJsonText) {
          const data = JSON.parse(rawJsonText);
          if (data && Array.isArray(data.jobs)) {
            const rawJobs: IAtsJobRaw[] = data.jobs.map((item: any) => ({
              id: `ashby-${slug}-${item.id}`,
              requisitionId: item.id,
              title: (item.title || '').trim(),
              url: item.jobUrl || `https://jobs.ashbyhq.com/${slug}/${item.id}`,
              location: item.location || item.secondaryLocations?.[0] || 'Remote',
              department: item.department || item.team || 'Engineering',
              descriptionHtml: item.descriptionHtml || item.descriptionPlain || '',
              plainText: item.descriptionPlain || cleanHtmlToText(item.descriptionHtml || ''),
              compensation: item.compensation?.compensationTierSummary || undefined,
              postedAt: item.publishedAt || new Date().toISOString(),
              atsPlatform: 'ashby' as AtsPlatform,
            }));

            if (rawJobs.length > 0) {
              return {
                success: true,
                companyName,
                provider: 'ashby',
                totalJobs: rawJobs.length,
                jobs: rawJobs,
              };
            }
          }
        }
      } catch (apiErr) {
        // API fallback
      }

      // Fallback: Scrape Ashby page & extract next/data or direct links
      const htmlUrl = companySlugOrUrl.startsWith('http') ? companySlugOrUrl : `https://jobs.ashbyhq.com/${slug}`;
      const html = await fetchWebPageHtml(htmlUrl);
      if (html) {
        const jobs = this.parseAshbyHtml(html, htmlUrl, slug);
        return {
          success: true,
          companyName,
          provider: 'ashby',
          totalJobs: jobs.length,
          jobs,
        };
      }

      return {
        success: false,
        companyName,
        provider: 'ashby',
        totalJobs: 0,
        jobs: [],
        error: 'No jobs found on Ashby portal',
      };
    } catch (err: any) {
      return {
        success: false,
        companyName,
        provider: 'ashby',
        totalJobs: 0,
        jobs: [],
        error: err.message,
      };
    }
  }

  private parseAshbyHtml(html: string, baseUrl: string, slug: string): IAtsJobRaw[] {
    const jobs: IAtsJobRaw[] = [];

    // Try finding JSON hydration blobs e.g. __NEXT_DATA__
    const nextDataMatch = /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
    if (nextDataMatch) {
      try {
        const json = JSON.parse(nextDataMatch[1]);
        const jobList = json.props?.pageProps?.jobBoard?.jobs || json.props?.pageProps?.jobs;
        if (Array.isArray(jobList)) {
          return jobList.map((item: any) => ({
            id: `ashby-${slug}-${item.id}`,
            requisitionId: item.id,
            title: (item.title || '').trim(),
            url: `https://jobs.ashbyhq.com/${slug}/${item.id}`,
            location: item.location || 'Remote',
            department: item.department || 'Engineering',
            atsPlatform: 'ashby' as AtsPlatform,
            postedAt: new Date().toISOString(),
          }));
        }
      } catch {
        // Fallback to regex
      }
    }

    // Link regex for Ashby job cards
    const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      const rawHref = match[1];
      const text = match[2].replace(/<[^>]+>/g, '').trim();

      if (rawHref.includes(`/${slug}/`) && !rawHref.endsWith(`/${slug}`) && text.length > 3) {
        let fullUrl = rawHref;
        try {
          fullUrl = new URL(rawHref, baseUrl).href;
        } catch {
          fullUrl = rawHref;
        }

        const segments = fullUrl.split('/');
        const reqId = segments[segments.length - 1];

        jobs.push({
          id: `ashby-${slug}-${reqId}`,
          requisitionId: reqId,
          title: text,
          url: fullUrl,
          location: 'Remote / Global',
          department: 'Engineering',
          atsPlatform: 'ashby',
          postedAt: new Date().toISOString(),
        });
      }
    }

    return jobs;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. WORKABLE ADAPTER
  // ─────────────────────────────────────────────────────────────
  public async fetchWorkableJobs(companySlugOrUrl: string, companyName: string): Promise<IAtsAdapterResult> {
    const slug = this.extractAtsSlug(companySlugOrUrl, 'workable') || companySlugOrUrl;
    const apiUrl = `https://apply.workable.com/api/v3/accounts/${slug}/jobs`;

    try {
      try {
        const rawJsonText = await fetchWebPageHtml(apiUrl);
        if (rawJsonText) {
          const data = JSON.parse(rawJsonText);
          if (data && Array.isArray(data.results)) {
            const rawJobs: IAtsJobRaw[] = data.results.map((item: any) => ({
              id: `workable-${slug}-${item.shortcode || item.id}`,
              requisitionId: item.shortcode || item.id,
              title: (item.title || '').trim(),
              url: `https://apply.workable.com/${slug}/j/${item.shortcode || item.id}/`,
              location: `${item.city || ''} ${item.country || ''}`.trim() || (item.telecommuting ? 'Remote' : 'On-site'),
              department: item.department || 'Engineering',
              descriptionHtml: item.description || '',
              plainText: cleanHtmlToText(item.description || ''),
              postedAt: item.published_on || new Date().toISOString(),
              atsPlatform: 'workable' as AtsPlatform,
            }));

            if (rawJobs.length > 0) {
              return {
                success: true,
                companyName,
                provider: 'workable',
                totalJobs: rawJobs.length,
                jobs: rawJobs,
              };
            }
          }
        }
      } catch (apiErr) {
        // Fallback to HTML
      }

      // Fallback to HTML scraping
      const htmlUrl = companySlugOrUrl.startsWith('http') ? companySlugOrUrl : `https://apply.workable.com/${slug}/`;
      const html = await fetchWebPageHtml(htmlUrl);
      const jobs: IAtsJobRaw[] = [];

      if (html) {
        const linkRegex = /<a\b[^>]*href=["'](\/[^"']*\/j\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match: RegExpExecArray | null;
        while ((match = linkRegex.exec(html)) !== null) {
          const rawHref = match[1];
          const text = match[2].replace(/<[^>]+>/g, '').trim();
          if (text) {
            jobs.push({
              id: `workable-${slug}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              title: text,
              url: `https://apply.workable.com${rawHref}`,
              location: 'Remote / Global',
              department: 'Engineering',
              atsPlatform: 'workable',
              postedAt: new Date().toISOString(),
            });
          }
        }
      }

      return {
        success: true,
        companyName,
        provider: 'workable',
        totalJobs: jobs.length,
        jobs,
      };
    } catch (err: any) {
      return {
        success: false,
        companyName,
        provider: 'workable',
        totalJobs: 0,
        jobs: [],
        error: err.message,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. UNIVERSAL ATS DISPATCHER
  // ─────────────────────────────────────────────────────────────
  public async fetchUniversalAtsJobs(
    careerUrl: string,
    companyName: string,
    forcedPlatform?: AtsPlatform
  ): Promise<IAtsAdapterResult> {
    const platform = forcedPlatform && forcedPlatform !== 'generic'
      ? forcedPlatform
      : this.detectAtsPlatform(careerUrl);

    switch (platform) {
      case 'greenhouse':
        return this.fetchGreenhouseJobs(careerUrl, companyName);
      case 'lever':
        return this.fetchLeverJobs(careerUrl, companyName);
      case 'ashby':
        return this.fetchAshbyJobs(careerUrl, companyName);
      case 'workable':
        return this.fetchWorkableJobs(careerUrl, companyName);
      default:
        return {
          success: false,
          companyName,
          provider: 'generic',
          totalJobs: 0,
          jobs: [],
          error: 'Generic portal: use standard crawler engine',
        };
    }
  }
}

export const atsAdapters = new AtsAdaptersService();
