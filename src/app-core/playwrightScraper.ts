import { IDiscoveredJobListing } from './careerCrawler';
import { fetchWebPageHtml, cleanHtmlToText } from './webFetcher';
import { scrapingOverseer } from './scrapingOverseer';
import { atsAdapters } from './atsAdapters';

/**
 * JobRadar Headless & Playwright Browser Scraping Engine
 * 
 * Supports headless browser rendering for complex Single Page Application (SPA)
 * career sites, with automatic fallback to zero-CORS native web fetcher.
 */

export interface IPlaywrightScrapeOptions {
  timeoutMs?: number;
  waitForSelector?: string;
  headless?: boolean;
  userAgent?: string;
}

export class PlaywrightScraperService {
  private hasPlaywrightCache: boolean | null = null;

  /**
   * Checks if Playwright is available in the current runtime environment
   */
  public async isPlaywrightAvailable(): Promise<boolean> {
    if (this.hasPlaywrightCache !== null) {
      return this.hasPlaywrightCache;
    }

    try {
      // Dynamic require check without hard crashing if not installed
      if (typeof require !== 'undefined') {
        const pw = require('playwright');
        if (pw && (pw.chromium || pw.firefox || pw.webkit)) {
          this.hasPlaywrightCache = true;
          return true;
        }
      }
    } catch {
      // Playwright not installed
    }

    this.hasPlaywrightCache = false;
    return false;
  }

  /**
   * Scrapes dynamic SPA portals using headless Playwright if available,
   * falling back to high-speed native zero-CORS HTTP fetching.
   */
  public async scrapePortalHtml(
    url: string,
    options: IPlaywrightScrapeOptions = {}
  ): Promise<{ success: boolean; html: string; method: 'playwright' | 'native_fetch'; error?: string }> {
    const timeout = options.timeoutMs || 15000;

    // 1. Try Playwright if installed
    if (await this.isPlaywrightAvailable()) {
      try {
        const { chromium } = require('playwright');
        const browser = await chromium.launch({
          headless: options.headless !== false,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });

        const context = await browser.newContext({
          userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          viewport: { width: 1440, height: 900 },
        });

        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

        if (options.waitForSelector) {
          await page.waitForSelector(options.waitForSelector, { timeout: 5000 }).catch(() => {});
        } else {
          // Wait briefly for client-side frameworks (React/Vue/Next.js) to hydrate
          await page.waitForTimeout(1500).catch(() => {});
        }

        const html = await page.content();
        await browser.close();

        return {
          success: true,
          html,
          method: 'playwright',
        };
      } catch (err: any) {
        console.warn(`[PlaywrightScraper] Playwright run failed (${err.message}). Falling back to native fetch.`);
      }
    }

    // 2. High-speed native zero-CORS fetch fallback
    try {
      const html = await fetchWebPageHtml(url);
      return {
        success: true,
        html: html || '',
        method: 'native_fetch',
      };
    } catch (err: any) {
      return {
        success: false,
        html: '',
        method: 'native_fetch',
        error: err.message,
      };
    }
  }

  /**
   * Extracts job openings from any portal using ATS adapters + Headless DOM engine
   */
  public async scrapeAndExtractJobs(
    portalUrl: string,
    companyName: string
  ): Promise<{
    companyName: string;
    jobs: IDiscoveredJobListing[];
    method: 'ats_api' | 'playwright' | 'native_fetch';
  }> {
    // 1. Check if direct ATS adapter handles this URL
    const atsResult = await atsAdapters.fetchUniversalAtsJobs(portalUrl, companyName);
    if (atsResult.success && atsResult.jobs.length > 0) {
      return {
        companyName,
        jobs: atsResult.jobs.map((j) => ({
          title: j.title,
          url: j.url,
          location: j.location,
          department: j.department,
        })),
        method: 'ats_api',
      };
    }

    // 2. Otherwise render page via Playwright / Native fetch
    const scrapeRes = await this.scrapePortalHtml(portalUrl);
    if (!scrapeRes.success || !scrapeRes.html) {
      return {
        companyName,
        jobs: [],
        method: scrapeRes.method,
      };
    }

    // 3. Extract listings using Scraping Overseer and link extractors
    const discovered = scrapingOverseer.extractJobLinksFromHtml(scrapeRes.html, portalUrl);
    return {
      companyName,
      jobs: discovered.map((d) => ({
        title: d.title,
        url: d.url,
        location: d.location || 'India / Remote',
      })),
      method: scrapeRes.method,
    };
  }
}

export const playwrightScraper = new PlaywrightScraperService();
