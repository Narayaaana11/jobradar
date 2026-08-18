import { IExtractedJD, extractJobDetails, extractValidApplicationLink } from './extractor';

/**
 * Checks if a string is a valid web URL.
 */
export function isWebUrl(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed) || (trimmed.startsWith('http://') || trimmed.startsWith('https://'));
}

/**
 * Strips scripts, styles, navigation, and boilerplate HTML, converting it into clean markdown/text.
 */
export function cleanHtmlToText(html: string): string {
  if (!html) return '';

  return html
    // 1. Remove comments, scripts, styles, SVGs, iframes, and noscript
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    // 2. Convert common semantic tags to line breaks and bullet points
    .replace(/<(?:h[1-6]|p|div|section|article|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<\/(?:h[1-6]|p|div|section|article|blockquote)>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<hr\b[^>]*>/gi, '\n---\n')
    // 3. Strip remaining HTML tags
    .replace(/<[^>]+>/g, ' ')
    // 4. Decode HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&bull;/gi, '•')
    // 5. Clean up duplicate whitespace and empty lines
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

/**
 * Extracts metadata (Title, Company, OG tags) from raw HTML.
 */
export function extractHtmlMetadata(html: string, url: string): {
  pageTitle?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogSiteName?: string;
} {
  const meta: {
    pageTitle?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogSiteName?: string;
  } = {};

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    meta.pageTitle = titleMatch[1].trim();
  }

  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  if (ogTitleMatch && ogTitleMatch[1]) {
    meta.ogTitle = ogTitleMatch[1].trim();
  }

  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (ogDescMatch && ogDescMatch[1]) {
    meta.ogDescription = ogDescMatch[1].trim();
  }

  const ogSiteMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  if (ogSiteMatch && ogSiteMatch[1]) {
    meta.ogSiteName = ogSiteMatch[1].trim();
  }

  return meta;
}

/**
 * Fetches the raw HTML content of a live job URL.
 * Uses Electron background bridge (CORS-free with browser UA) or direct fetch fallback.
 */
export async function fetchWebPageHtml(url: string): Promise<string> {
  const cleanUrl = url.trim();

  // 1. If in Electron Desktop, use the background IPC bridge for 100% CORS-free retrieval
  if (typeof window !== 'undefined' && window.electronAPI?.fetchWebPage) {
    try {
      const res = await window.electronAPI.fetchWebPage({ url: cleanUrl });
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.error || `HTTP ${res.status || 'Failed'}`);
    } catch (err: any) {
      console.warn('[WebFetcher] Electron fetch failed, trying direct fetch fallback:', err.message);
    }
  }

  // 2. Direct browser/Node fetch fallback
  const res = await fetch(cleanUrl, {
    method: 'GET',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch web page: HTTP ${res.status} (${res.statusText})`);
  }

  return await res.text();
}

/**
 * Fetches, scrapes, and parses a live job URL into a structured IExtractedJD.
 */
export async function fetchAndExtractJobFromUrl(url: string): Promise<IExtractedJD> {
  const cleanUrl = url.trim();
  const rawHtml = await fetchWebPageHtml(cleanUrl);
  const meta = extractHtmlMetadata(rawHtml, cleanUrl);
  const cleanText = cleanHtmlToText(rawHtml);

  // Construct a rich composite text including metadata tags
  let compositeText = '';
  if (meta.ogTitle || meta.pageTitle) {
    compositeText += `*Job Title:* ${meta.ogTitle || meta.pageTitle}\n`;
  }
  if (meta.ogSiteName) {
    compositeText += `*Company:* ${meta.ogSiteName}\n`;
  }
  if (meta.ogDescription) {
    compositeText += `*Summary:* ${meta.ogDescription}\n\n`;
  }
  compositeText += `*Application Link:* ${cleanUrl}\n\n`;
  compositeText += cleanText;

  // Extract structured JD from the composite scraped text
  const extracted = extractJobDetails(compositeText, cleanUrl);

  // Ensure application link points back to the original scraped URL
  extracted.applicationLink = cleanUrl;

  return extracted;
}
