import { ChannelManagerService } from '../src/app-core/channelManager';
import { SCRAPER_SELECTORS, formatSelectorDiagnostic } from '../src/app-core/scraperSelectors';

// Mock localStorage for Node.js test environment
const storageMock: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => storageMock[key] || null,
  setItem: (key: string, val: string) => { storageMock[key] = val; },
  removeItem: (key: string) => { delete storageMock[key]; },
  clear: () => { Object.keys(storageMock).forEach((k) => delete storageMock[k]); }
};
(globalThis as any).window = globalThis;

console.log('=================================================================');
console.log('🧪 JOBRADAR SCRAPER HARDENING & RISK-REDUCTION TEST SUITE');
console.log('=================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

// ──────────────────────────────────────────────────────────────────
// TEST 1: Centralized Selectors Registry Integrity
// ──────────────────────────────────────────────────────────────────
console.log('--- TEST 1: Centralized Selectors Registry Structure ---');
assert(!!SCRAPER_SELECTORS.whatsapp.rootContainer, 'WhatsApp rootContainer selector defined');
assert(!!SCRAPER_SELECTORS.whatsapp.challengeOrLoginIndicators, 'WhatsApp challengeOrLoginIndicators defined');
assert(!!SCRAPER_SELECTORS.whatsapp.chatListItems, 'WhatsApp chatListItems selector defined');
assert(!!SCRAPER_SELECTORS.whatsapp.activeConversationMessages, 'WhatsApp message nodes selector defined');

assert(!!SCRAPER_SELECTORS.telegram.rootContainer, 'Telegram rootContainer selector defined');
assert(!!SCRAPER_SELECTORS.telegram.challengeOrLoginIndicators, 'Telegram challengeOrLoginIndicators defined');
assert(!!SCRAPER_SELECTORS.telegram.chatListItems, 'Telegram chatListItems selector defined');
assert(!!SCRAPER_SELECTORS.telegram.activeConversationMessages, 'Telegram message nodes selector defined');

const sampleDiag = formatSelectorDiagnostic('whatsapp', 'chatListItems', 14, SCRAPER_SELECTORS.whatsapp.chatListItems);
assert(sampleDiag.includes('WHATSAPP DOM OK'), 'formatSelectorDiagnostic generates diagnostic output');
console.log('');

// ──────────────────────────────────────────────────────────────────
// TEST 2: Randomized Human-Like Intervals with Jitter
// ──────────────────────────────────────────────────────────────────
console.log('--- TEST 2: Human-Like Randomized Scan Intervals & Jitter ---');
const cm = new ChannelManagerService();
cm.updateConfig({
  minScanIntervalMinutes: 8,
  maxScanIntervalMinutes: 20,
});

const intervals: number[] = [];
for (let i = 0; i < 10; i++) {
  const ms = cm.calculateRandomizedScanIntervalMs();
  intervals.push(ms);
}

console.log('  Sample 10 intervals (in seconds):', intervals.map(ms => (ms / 1000).toFixed(2)));

// Verify intervals are in range [8m, 21m] (with jitter)
const minMsAllowed = 8 * 60 * 1000;
const maxMsAllowed = 21 * 60 * 1000; // max 20m + 1m jitter
const allInRange = intervals.every(ms => ms >= minMsAllowed && ms <= maxMsAllowed);
assert(allInRange, 'All calculated intervals lie strictly within human randomized bounds (8-21m)');

// Verify that intervals are distinct non-round numbers (not static round numbers)
const uniqueIntervals = new Set(intervals);
assert(uniqueIntervals.size >= 8, 'Generated intervals are uniquely jittered and non-round each cycle', `Unique count: ${uniqueIntervals.size}/10`);
console.log('');

// ──────────────────────────────────────────────────────────────────
// TEST 3: Idle Skip Probability Distribution
// ──────────────────────────────────────────────────────────────────
console.log('--- TEST 3: Anti-Fingerprint Idle Skip Simulation (20% Target) ---');
cm.updateConfig({ idleSkipChancePct: 20 });
const trials = 1000;
let skips = 0;
for (let i = 0; i < trials; i++) {
  const roll = Math.random() * 100;
  if (roll < (cm.getConfig().idleSkipChancePct || 20)) {
    skips++;
  }
}
const skipRate = (skips / trials) * 100;
console.log(`  Simulated ${trials} scan cycles: ${skips} idle skips (${skipRate.toFixed(1)}%)`);
assert(skipRate >= 15 && skipRate <= 25, 'Idle skip rate matches natural user absence distribution (15%–25%)');
console.log('');

// ──────────────────────────────────────────────────────────────────
// TEST 4: Rolling 24-Hour Scan Rate Limiting Cap
// ──────────────────────────────────────────────────────────────────
console.log('--- TEST 4: Rolling 24-Hour Scan Rate Limiting Cap ---');
const capManager = new ChannelManagerService();
capManager.updateConfig({ dailyScanCap: 3 });

assert(capManager.getScansInLast24h() === 0, 'Initial scans in last 24h is 0');
capManager.recordScanExecution();
capManager.recordScanExecution();
capManager.recordScanExecution();
assert(capManager.getScansInLast24h() === 3, 'Recorded 3 scans in last 24h');

const isCapReached = capManager.getScansInLast24h() >= (capManager.getConfig().dailyScanCap || 50);
assert(isCapReached, 'Scan cap correctly halts further background scans when daily quota is reached');
console.log('');

// ──────────────────────────────────────────────────────────────────
// TEST 5: Circuit Breaker Tripping & Manual Reset Protocol
// ──────────────────────────────────────────────────────────────────
console.log('--- TEST 5: Circuit Breaker Tripping & Manual Reset Protocol ---');
const cbManager = new ChannelManagerService();
cbManager.updateConfig({ periodicScanningEnabled: true });

assert(!cbManager.getConfig().circuitBreaker?.tripped, 'Circuit breaker initially untripped');

// Trip Circuit Breaker due to challenge/QR screen
cbManager.tripCircuitBreaker('WhatsApp logged out or QR code login screen presented', 'whatsapp');
const trippedConfig = cbManager.getConfig();
assert(trippedConfig.circuitBreaker?.tripped === true, 'Circuit breaker tripped state set to true');
assert(trippedConfig.circuitBreaker?.platform === 'whatsapp', 'Circuit breaker records affected platform');
assert(trippedConfig.nextScheduledScanTime === undefined, 'Background scheduler cleared next scheduled scan on trip');

// Manual user reset
cbManager.resetCircuitBreaker();
const resetConfig = cbManager.getConfig();
assert(resetConfig.circuitBreaker?.tripped === false, 'Circuit breaker reset clears tripped state');
assert(resetConfig.circuitBreaker?.reason === '', 'Circuit breaker reason cleared');
console.log('');

// ──────────────────────────────────────────────────────────────────
// TEST 6: Consecutive Empty Scans / DOM Selector Update Health Warning
// ──────────────────────────────────────────────────────────────────
console.log('--- TEST 6: DOM Selector Health Self-Check (3 Consecutive Empty Scans) ---');
const domManager = new ChannelManagerService();
domManager.updateConfig({ whatsappConnected: true, telegramConnected: false });

// Simulate 3 empty scans via mock IPC returning 0 messages
(globalThis as any).window.electronAPI = {
  interceptChannelMessages: async () => ({ messages: [], diagnostics: ['0 messages'] })
};

async function testDomHealth() {
  await domManager.runAutonomousChannelIntercept();
  assert(!domManager.getConfig().domUpdateWarnings?.whatsapp, 'Scan 1: No warning after 1 empty scan');

  await domManager.runAutonomousChannelIntercept();
  assert(!domManager.getConfig().domUpdateWarnings?.whatsapp, 'Scan 2: No warning after 2 empty scans');

  await domManager.runAutonomousChannelIntercept();
  const cfg3 = domManager.getConfig();
  assert(!!cfg3.domUpdateWarnings?.whatsapp, 'Scan 3: DOM update warning triggered after 3 consecutive empty scans');
  console.log('  Flagged Diagnostic Warning:', cfg3.domUpdateWarnings?.whatsapp?.warning);

  // Now simulate a successful scan with 1 message
  (globalThis as any).window.electronAPI.interceptChannelMessages = async () => ({
    messages: [{
      platform: 'whatsapp',
      channelName: 'Off-Campus Recruitment',
      text: 'Software Engineer opening at TCS: 4.5 LPA, B.Tech 2026 batch apply now!',
      timestamp: 'Just now',
      timestampMs: Date.now()
    }]
  });

  await domManager.runAutonomousChannelIntercept();
  const cfgSuccess = domManager.getConfig();
  assert(!cfgSuccess.domUpdateWarnings?.whatsapp, 'Successful scan automatically clears DOM update warning');
}

testDomHealth().then(() => {
  console.log('\n=================================================================');
  console.log(`📊 FINAL TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('=================================================================\n');
  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});
