import { rawQueueRepository, IRawQueueItem } from '../repositories/rawQueueRepository';
import { processQueueItem } from './pipelineProcessor';

/**
 * Parses raw HTML to extract direct external apply links (e.g. careers.google.com, myworkdayjobs.com, etc.)
 */
function extractDirectApplyLinks(html: string, baseUrl: string): string[] {
  const applyLinks: string[] = [];
  const linkRegex = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  let currentDomain = '';
  try {
    currentDomain = new URL(baseUrl).hostname.toLowerCase().replace('www.', '');
  } catch {}

  const knownAtsKeywords = [
    'careers.google.com', 'google.com/about/careers', 'google.com/careers', 'amazon.jobs',
    'myworkdayjobs.com', 'lever.co', 'greenhouse.io', 'naukri.com', 'jobs.jobvite.com',
    'icims.com', 'taleo.net', 'smartrecruiters.com', 'workday.com', 'linkedin.com/jobs',
    'forms.gle', 'docs.google.com/forms', 'jobs.lever.co', 'boards.greenhouse.io',
    'careers.microsoft.com', 'careers.', 'jobs.'
  ];

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1].trim();
    const anchorText = match[2].replace(/<[^>]+>/g, '').trim().toLowerCase();

    // Decode HTML entities (e.g. &amp; -> &)
    href = href.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
      continue;
    }

    // Resolve relative URLs to absolute
    try {
      href = new URL(href, baseUrl).href;
    } catch {}

    try {
      const linkUrl = new URL(href);
      const linkDomain = linkUrl.hostname.toLowerCase().replace('www.', '');

      // Skip internal navigation links on the same site
      if (currentDomain && linkDomain === currentDomain) {
        continue;
      }

      // Filter out standard social media / sharing buttons
      const isSocial = /whatsapp\.com|telegram\.org|facebook\.com|twitter\.com|x\.com|instagram\.com|pinterest\.com/i.test(href);
      if (isSocial) continue;

      const isKnownAts = knownAtsKeywords.some((k) => href.toLowerCase().includes(k));
      const hasApplyAnchor = /apply|register|click here|official link|direct link|application/i.test(anchorText) || /apply|careers|job/i.test(href);

      if (isKnownAts || hasApplyAnchor) {
        if (!applyLinks.includes(href)) {
          applyLinks.push(href);
        }
      }
    } catch {}
  }

  return applyLinks;
}

export async function resolveAndScrapeUrl(urlStr: string): Promise<string | null> {
  try {
    console.log(`[WebScraper] Following redirects & scraping: ${urlStr}`);
    const res = await fetch(urlStr, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (res.ok) {
      const html = await res.text();
      const finalUrl = res.url;

      // Extract direct external apply links BEFORE stripping HTML tags
      const directApplyLinks = extractDirectApplyLinks(html, finalUrl);
      if (directApplyLinks.length > 0) {
        console.log(`[WebScraper] Found ${directApplyLinks.length} direct external apply link(s) on ${finalUrl}:`, directApplyLinks.slice(0, 2));
      }

      // Extract page title
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const titleText = titleMatch ? titleMatch[1].trim() : '';

      // Extract body text cleanly
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      let bodyText = '';
      if (bodyMatch) {
        bodyText = bodyMatch[1]
          .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
          .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      // Check if text is sparse or requires dynamic Puppeteer JS rendering (e.g. Accenture, Workday, JS SPAs)
      const isDynamicJsPortal = bodyText.length < 1000 || /accenture|workday|jobsearch|careers|app-root/i.test(finalUrl);

      if (isDynamicJsPortal) {
        console.log(`[WebScraper] Dynamic JS/Career Portal detected on ${finalUrl}. Launching Puppeteer browser...`);
        try {
          const puppeteer = require('puppeteer');
          const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
          const page = await browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          await page.goto(finalUrl, { waitUntil: 'networkidle2', timeout: 30000 });

          const renderedTitle = await page.title();
          const renderedText = await page.evaluate(() => document.body.innerText);

          // Discover deep job details links (e.g. accenture jobdetails?id=...)
          const discoveredJobLinks = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
              .map((a: any) => a.href)
              .filter((href: string) => /job-details|jobdetails|\/job\/|jobId=|job_id=/i.test(href));
          });

          console.log(`[WebScraper] Puppeteer rendered ${renderedText.length} chars text. Discovered ${discoveredJobLinks.length} deep job posting link(s).`);

          // If this is a search portal page and we discovered deep job links, scrape the top job link!
          let deepJobContent = '';
          if (discoveredJobLinks.length > 0) {
            const topJobLink = discoveredJobLinks[0];
            console.log(`[WebScraper] Auto-following top discovered job link: ${topJobLink}`);
            try {
              await page.goto(topJobLink, { waitUntil: 'networkidle2', timeout: 30000 });
              deepJobContent = await page.evaluate(() => document.body.innerText);
            } catch {}
          }

          await browser.close();

          let resultHeader = `[Scraped Target Page content from ${finalUrl}]: Title: ${renderedTitle}`;
          if (discoveredJobLinks.length > 0) {
            resultHeader += `\n[Found Direct Apply Link]: ${discoveredJobLinks[0]}`;
            for (let i = 1; i < Math.min(discoveredJobLinks.length, 5); i++) {
              resultHeader += `\n[Alternative Apply Link ${i + 1}]: ${discoveredJobLinks[i]}`;
            }
          }

          const combinedText = deepJobContent ? `${deepJobContent}\n\n[Portal Text]: ${renderedText}` : renderedText;
          return `${resultHeader}\nDetails: ${combinedText.slice(0, 4000)}`;
        } catch (pupErr: any) {
          console.warn(`[WebScraper] Puppeteer fallback failed for ${finalUrl}:`, pupErr.message);
        }
      }

      let resultHeader = `[Scraped Target Page content from ${finalUrl}]: Title: ${titleText}`;
      if (directApplyLinks.length > 0) {
        resultHeader += `\n[Found Direct Apply Link]: ${directApplyLinks[0]}`;
        for (let i = 1; i < directApplyLinks.length; i++) {
          resultHeader += `\n[Alternative Apply Link ${i + 1}]: ${directApplyLinks[i]}`;
        }
      }

      return `${resultHeader}\nDetails: ${bodyText.slice(0, 3000)}`;
    }
  } catch (err: any) {
    console.warn(`[WebScraper] Failed to resolve URL ${urlStr}:`, err.message);
  }
  return null;
}

export async function ingestWebUrlOrText(urlOrText: string, channelName: string = 'Web Ingest'): Promise<IRawQueueItem> {
  let text = urlOrText.trim();
  let html: string | null = null;

  // Extract all URLs from input text
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const foundUrls = text.match(urlRegex) || [];

  if (foundUrls.length > 0) {
    for (const urlStr of foundUrls.slice(0, 3)) {
      const scrapedContent = await resolveAndScrapeUrl(urlStr);
      if (scrapedContent) {
        text += `\n\n${scrapedContent}`;
      }
    }
  }

  const item = await rawQueueRepository.create({
    platform: 'career_page',
    channelName,
    rawMessageId: `web-${Date.now()}`,
    rawText: text,
    rawHtml: html,
    processed: false,
  });

  // Asynchronously process item
  processQueueItem(item).catch((err) =>
    console.error(`[WebScraper] Error processing web item ${item.id}:`, err.message)
  );

  return item;
}
