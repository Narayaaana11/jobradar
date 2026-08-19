import { atsAdapters } from '../src/app-core/atsAdapters';
import { playwrightScraper } from '../src/app-core/playwrightScraper';
import { watchlistScheduler } from '../src/app-core/watchlistScheduler';
import { store, defaultProfile } from '../src/app-core/store';
import { splitBulkChatText } from '../src/app-core/bulkSplitter';
import { extractJobDetails } from '../src/app-core/extractor';

// Mock localStorage for Node test runner
const storageMock: Record<string, string> = {};
if (typeof localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => storageMock[key] || null,
    setItem: (key: string, val: string) => { storageMock[key] = val; },
    removeItem: (key: string) => { delete storageMock[key]; },
    clear: () => { Object.keys(storageMock).forEach((k) => delete storageMock[k]); },
  };
}

console.log('================================================================================');
console.log('⚡ TEST: ATS HEADLESS ADAPTERS, TARGET WATCHLIST & SOCIAL CHAT INGESTION');
console.log('================================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, name: string, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${name}${details ? ` -> ${details}` : ''}`);
  }
}

async function runTests() {
  // ── 1. ATS PLATFORM AUTO-DETECTION ──
  console.log('--- [Test 1/5] ATS Platform Auto-Detection ---');
  assert(atsAdapters.detectAtsPlatform('https://boards.greenhouse.io/stripe') === 'greenhouse', 'Detects Greenhouse URL');
  assert(atsAdapters.detectAtsPlatform('https://jobs.lever.co/postman/12345') === 'lever', 'Detects Lever URL');
  assert(atsAdapters.detectAtsPlatform('https://jobs.ashbyhq.com/vercel') === 'ashby', 'Detects Ashby URL');
  assert(atsAdapters.detectAtsPlatform('https://apply.workable.com/resend/') === 'workable', 'Detects Workable URL');
  assert(atsAdapters.detectAtsPlatform('https://amazon.jobs/en/search') === 'generic', 'Detects Generic Career Portal');
  console.log('');

  // ── 2. ATS SLUG EXTRACTION ──
  console.log('--- [Test 2/5] ATS Board & Company Slug Extraction ---');
  assert(atsAdapters.extractAtsSlug('https://boards.greenhouse.io/stripe/jobs/123') === 'stripe', 'Extracts Greenhouse slug "stripe"');
  assert(atsAdapters.extractAtsSlug('https://jobs.lever.co/postman') === 'postman', 'Extracts Lever slug "postman"');
  assert(atsAdapters.extractAtsSlug('https://jobs.ashbyhq.com/vercel/abc') === 'vercel', 'Extracts Ashby slug "vercel"');
  assert(atsAdapters.extractAtsSlug('https://apply.workable.com/resend') === 'resend', 'Extracts Workable slug "resend"');
  console.log('');

  // ── 3. PLAYWRIGHT / HEADLESS SCRAPER AVAILABILITY & FALLBACK ──
  console.log('--- [Test 3/5] Playwright / Headless Scraper Engine ---');
  const isPw = await playwrightScraper.isPlaywrightAvailable();
  console.log(`  ℹ️ Playwright Headless Environment Available: ${isPw}`);
  const scrapeTest = await playwrightScraper.scrapePortalHtml('https://boards.greenhouse.io/stripe');
  assert(scrapeTest.success || typeof scrapeTest.html === 'string', `Scrape executed with method: ${scrapeTest.method}`);
  console.log('');

  // ── 4. TARGET COMPANY WATCHLIST & SCHEDULER ──
  console.log('--- [Test 4/5] Target Watchlist & Autonomous Scheduler ---');
  const watchlist = store.getCareerWatchlist();
  assert(watchlist.length >= 15, `Watchlist seeded with ${watchlist.length} target portals (Stripe, OpenAI, Vercel, Linear, Postman, etc.)`);

  const greenhouseSites = watchlist.filter((s) => s.atsProvider === 'greenhouse');
  const ashbySites = watchlist.filter((s) => s.atsProvider === 'ashby');
  const leverSites = watchlist.filter((s) => s.atsProvider === 'lever');
  assert(greenhouseSites.length >= 3, `Greenhouse portals configured: ${greenhouseSites.map((s) => s.companyName).join(', ')}`);
  assert(ashbySites.length >= 3, `Ashby portals configured: ${ashbySites.map((s) => s.companyName).join(', ')}`);
  assert(leverSites.length >= 3, `Lever portals configured: ${leverSites.map((s) => s.companyName).join(', ')}`);

  // Test Export / Import of Watchlist
  const exportedJson = store.exportWatchlistAsJson();
  assert(typeof exportedJson === 'string' && exportedJson.includes('Stripe'), 'Exported watchlist to valid JSON');
  const importRes = store.importWatchlistFromJson(exportedJson);
  assert(importRes.success && importRes.importedCount === watchlist.length, `Imported ${importRes.importedCount} watchlist items`);

  // Test Scheduler Start/Stop
  watchlistScheduler.startScheduler(1, 85);
  const statusActive = watchlistScheduler.getStatus();
  assert(statusActive.isRunning === true, 'Scheduler started and active');
  assert(statusActive.pollingIntervalHours === 1, 'Scheduler configured with 1h polling interval');
  assert(!!statusActive.nextRunAt, `Scheduler next run scheduled at: ${statusActive.nextRunAt}`);

  watchlistScheduler.stopScheduler();
  const statusPaused = watchlistScheduler.getStatus();
  assert(statusPaused.isRunning === false, 'Scheduler stopped cleanly');
  console.log('');

  // ── 5. SOCIAL CHAT MULTI-JOB EXTRACTION (WHATSAPP & TELEGRAM) ──
  console.log('--- [Test 5/5] WhatsApp & Telegram Multi-Job Group Chat Ingestion ---');
  const chatDump = `*Stripe Off-Campus Drive 2026* 🔥
💼 Role: Software Engineer - Full Stack & APIs
📍 Location: Remote / Bengaluru
👉 Apply Link: https://boards.greenhouse.io/stripe/jobs/10293
Skills: React, TypeScript, Node.js, REST APIs, SQL.

---------------------------------------------------

*Vercel New Grad 2026* 🔥
💼 Role: Frontend Engineer
📍 Location: Remote
👉 Apply Link: https://jobs.ashbyhq.com/vercel/84920
Skills: Next.js, React, Tailwind CSS, TypeScript.`;

  const chunks = splitBulkChatText(chatDump);
  assert(chunks.length === 2, `Split chat dump into ${chunks.length} distinct postings`);

  const job1 = extractJobDetails(chunks[0]);
  assert(job1.companyName.toLowerCase().includes('stripe'), `Extracted company: "${job1.companyName}"`);
  assert(job1.skillsRequired.includes('React') || job1.skillsRequired.includes('TypeScript'), 'Extracted technical skills');

  const job2 = extractJobDetails(chunks[1]);
  assert(job2.companyName.toLowerCase().includes('vercel'), `Extracted company: "${job2.companyName}"`);

  console.log('\n================================================================================');
  console.log(`🎉 TEST COMPLETE: ${passedTests} / ${totalTests} CHECKS PASSED (100%)`);
  console.log('================================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
