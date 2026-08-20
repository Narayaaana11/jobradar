import { IResolvedLink, IProfile } from './types';
import { fetchWebPageHtml, cleanHtmlToText, extractHtmlMetadata } from './webFetcher';
import { llmClient } from './llmClient';

export interface ILinkResolverOptions {
  maxHops?: number;
  useAiClassification?: boolean;
  profile?: IProfile;
}

export class LinkResolverAgent {
  private static readonly KNOWN_SHORTENERS = [
    'bit.ly',
    'tinyurl.com',
    't.co',
    'goo.gl',
    'is.gd',
    'buff.ly',
    'ow.ly',
    'rebrand.ly',
    'cutt.ly',
    'shorturl.at',
    'kickcharm.com',
  ];

  private static readonly SPAM_DOMAINS = [
    'chat.whatsapp.com',
    't.me',
    'telegram.me',
    'youtube.com',
    'youtu.be',
    'instagram.com',
    'facebook.com',
    'twitter.com',
    'x.com',
  ];

  /**
   * Resolves a potentially wrapped, shortened, or JS-redirected link to its canonical target JD page.
   */
  public async resolveLink(
    inputUrl: string,
    surroundingContext: string = '',
    options: ILinkResolverOptions = {}
  ): Promise<IResolvedLink> {
    const maxHops = options.maxHops || 4;
    const redirectHops: string[] = [inputUrl];
    let currentUrl = inputUrl.trim();
    let finalHtml = '';
    let extractedText = '';
    let pageTitle = '';

    // Fast check: Is it an obvious spam/social link?
    if (LinkResolverAgent.SPAM_DOMAINS.some((d) => currentUrl.includes(d))) {
      return {
        originalUrl: inputUrl,
        canonicalUrl: currentUrl,
        linkType: 'social_spam',
        isJobPage: false,
        confidence: 99,
        redirectHops,
        extractedText: '',
      };
    }

    // Step 1: Follow HTTP and meta/JS redirects up to maxHops
    for (let hop = 0; hop < maxHops; hop++) {
      try {
        const html = await fetchWebPageHtml(currentUrl);
        finalHtml = html;
        extractedText = cleanHtmlToText(html);
        const meta = extractHtmlMetadata(html, currentUrl);
        if (meta.pageTitle || meta.ogTitle) pageTitle = meta.pageTitle || meta.ogTitle || '';

        // Check for client-side JS redirects or meta refresh
        const unwrapped = this.unwrapEmbeddedUrl(currentUrl, html);
        if (unwrapped && unwrapped !== currentUrl && !redirectHops.includes(unwrapped)) {
          currentUrl = unwrapped;
          redirectHops.push(currentUrl);
          continue;
        }

        // If we got sufficient content or no further redirect, stop loop
        break;
      } catch (err: any) {
        // If fetch fails, keep current URL
        break;
      }
    }

    // Step 2: Extract deeper target link if this page is a redirect landing gate (e.g. Kickcharm, link landing page)
    const applyTargetInHtml = this.findApplyButtonUrlInHtml(finalHtml, currentUrl);
    if (applyTargetInHtml && applyTargetInHtml !== currentUrl && !redirectHops.includes(applyTargetInHtml)) {
      redirectHops.push(applyTargetInHtml);
      currentUrl = applyTargetInHtml;
      // Try one quick fetch on target
      try {
        const targetHtml = await fetchWebPageHtml(currentUrl);
        finalHtml = targetHtml;
        extractedText = cleanHtmlToText(targetHtml);
        const meta = extractHtmlMetadata(targetHtml, currentUrl);
        if (meta.pageTitle || meta.ogTitle) pageTitle = meta.pageTitle || meta.ogTitle || '';
      } catch {
        // Keep prior content if target fetch fails
      }
    }

    // Step 3: Classify the resolved URL and content
    let linkType: 'direct_apply' | 'careers_portal' | 'redirect_wrapper' | 'job_board' | 'social_spam' = 'direct_apply';
    let isJobPage = true;
    let confidence = 85;

    if (options.useAiClassification !== false) {
      try {
        const aiClassify = await llmClient.classifyLinkWithAi(
          currentUrl,
          `${pageTitle}\n${surroundingContext}\n${extractedText.slice(0, 500)}`,
          options.profile
        );
        if (aiClassify.success && aiClassify.data) {
          linkType = aiClassify.data.linkType;
          isJobPage = aiClassify.data.isJobRelated;
          confidence = aiClassify.data.confidence;
        }
      } catch {
        // Use structural heuristic classification
        linkType = this.heuristicClassify(currentUrl, extractedText);
        isJobPage = linkType !== 'social_spam';
      }
    } else {
      linkType = this.heuristicClassify(currentUrl, extractedText);
      isJobPage = linkType !== 'social_spam';
    }

    return {
      originalUrl: inputUrl,
      canonicalUrl: currentUrl,
      linkType,
      pageTitle,
      isJobPage,
      confidence,
      redirectHops,
      extractedText: extractedText.slice(0, 10000),
    };
  }

  /**
   * Detects embedded redirect parameters in URLs or meta refresh / window.location in HTML.
   */
  public unwrapEmbeddedUrl(url: string, html: string): string | null {
    // 1. Query parameter search (e.g. ?url=https://..., ?redirect=..., ?target=...)
    try {
      const parsedUrl = new URL(url);
      for (const param of ['url', 'redirect', 'target', 'dest', 'destination', 'apply_url', 'job_url', 'link']) {
        const val = parsedUrl.searchParams.get(param);
        if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
          return val;
        }
      }
    } catch {
      // Invalid URL string
    }

    // 2. Meta refresh tag search
    const metaRefreshMatch = html.match(/<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?[0-9]*;\s*url=([^"'>]+)["']?/i);
    if (metaRefreshMatch && metaRefreshMatch[1]) {
      let target = metaRefreshMatch[1].trim();
      if (target.startsWith('http://') || target.startsWith('https://')) {
        return target;
      }
    }

    // 3. Simple JS location redirect search
    const jsLocationMatch = html.match(/(?:window\.location(?:\.href|\.replace)?|location\.href)\s*=\s*["'](https?:\/\/[^"']+)["']/i);
    if (jsLocationMatch && jsLocationMatch[1]) {
      return jsLocationMatch[1].trim();
    }

    return null;
  }

  /**
   * Inspects landing page HTML for explicit "Apply Now" or "Official Link" outbound anchor tags.
   */
  private findApplyButtonUrlInHtml(html: string, currentUrl: string): string | null {
    if (!html) return null;

    // Search for anchor tags containing "apply", "register", "official link", "career"
    const anchorRegex = /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = anchorRegex.exec(html)) !== null) {
      const href = match[1];
      const anchorText = match[2].toLowerCase();

      // Check if text indicates an apply button
      if (
        anchorText.includes('apply') ||
        anchorText.includes('register') ||
        anchorText.includes('careers') ||
        anchorText.includes('official link') ||
        anchorText.includes('submit application')
      ) {
        // Make sure it's not pointing back to the same wrapper domain
        if (!currentUrl.includes(new URL(href).hostname)) {
          return href;
        }
      }
    }

    return null;
  }

  /**
   * Structural heuristic classification fallback.
   */
  private heuristicClassify(
    url: string,
    text: string
  ): 'direct_apply' | 'careers_portal' | 'redirect_wrapper' | 'job_board' | 'social_spam' {
    const lowerUrl = url.toLowerCase();

    if (LinkResolverAgent.SPAM_DOMAINS.some((d) => lowerUrl.includes(d))) {
      return 'social_spam';
    }

    if (LinkResolverAgent.KNOWN_SHORTENERS.some((d) => lowerUrl.includes(d))) {
      return 'redirect_wrapper';
    }

    if (
      lowerUrl.includes('greenhouse.io') ||
      lowerUrl.includes('lever.co') ||
      lowerUrl.includes('ashbyhq.com') ||
      lowerUrl.includes('workable.com') ||
      lowerUrl.includes('smartrecruiters.com') ||
      lowerUrl.includes('myworkdayjobs.com') ||
      lowerUrl.includes('/apply') ||
      lowerUrl.includes('/job/') ||
      lowerUrl.includes('/jobs/')
    ) {
      return 'direct_apply';
    }

    if (
      lowerUrl.includes('linkedin.com/jobs') ||
      lowerUrl.includes('naukri.com') ||
      lowerUrl.includes('indeed.com') ||
      lowerUrl.includes('internshala.com') ||
      lowerUrl.includes('unstop.com') ||
      lowerUrl.includes('instahyre.com')
    ) {
      return 'job_board';
    }

    if (lowerUrl.includes('careers') || lowerUrl.includes('jobs')) {
      return 'careers_portal';
    }

    const lowerText = text.toLowerCase();
    if (lowerText.includes('apply now') || lowerText.includes('job description') || lowerText.includes('requirements')) {
      return 'direct_apply';
    }

    return 'careers_portal';
  }
}

export const linkResolver = new LinkResolverAgent();
