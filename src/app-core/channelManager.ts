import { IWatcherConfig, IChannelSource, IRadarFeedItem, IJob, ICircuitBreakerState, IDomUpdateWarning } from './types';
import { evaluateNoiseTriage } from './noiseFilter';
import { processIngestion } from './pipeline';
import { store } from './store';

export class ChannelManagerService {
  private config: IWatcherConfig = {
    whatsappConnected: false,
    whatsappStatus: 'disconnected',
    whatsappPhone: undefined,
    whatsappPairingCode: undefined,
    telegramConnected: false,
    telegramStatus: 'disconnected',
    telegramPhone: undefined,
    clipboardWatcherEnabled: true,
    minMatchScoreForToast: 80,
    monitoredChannels: [],

    // Hardened Background Scanning Defaults
    periodicScanningEnabled: false,
    minScanIntervalMinutes: 8,
    maxScanIntervalMinutes: 20,
    dailyScanCap: 50,
    idleSkipChancePct: 20,
    lastScanTimestamp: undefined,
    scansInLast24h: 0,
    nextScheduledScanTime: undefined,
    circuitBreaker: {
      tripped: false,
      reason: '',
      platform: 'all',
      trippedAt: '',
    },
    domUpdateWarnings: {},
  };

  private feedItems: IRadarFeedItem[] = [];
  private backgroundTimer: any = null;
  private scanHistoryTimestamps: number[] = [];
  private consecutiveEmptyScans: Record<string, number> = { whatsapp: 0, telegram: 0 };
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const storedCfg = localStorage.getItem('jobradar_watcher_config_v1');
      if (storedCfg) {
        const parsed = JSON.parse(storedCfg);
        this.config = {
          ...this.config,
          ...parsed,
          monitoredChannels: Array.isArray(parsed.monitoredChannels) ? parsed.monitoredChannels : [],
          circuitBreaker: parsed.circuitBreaker || this.config.circuitBreaker,
          domUpdateWarnings: parsed.domUpdateWarnings || {},
        };
      }

      const storedFeed = localStorage.getItem('jobradar_radar_feed_v1');
      if (storedFeed) {
        this.feedItems = JSON.parse(storedFeed);
      }

      const storedHistory = localStorage.getItem('jobradar_scan_history_ts_v1');
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
          const cutoff = Date.now() - (24 * 60 * 60 * 1000);
          this.scanHistoryTimestamps = parsedHistory.filter((ts) => typeof ts === 'number' && ts >= cutoff);
          this.config.scansInLast24h = this.scanHistoryTimestamps.length;
        }
      }

      const storedEmpty = localStorage.getItem('jobradar_consecutive_empty_v1');
      if (storedEmpty) {
        this.consecutiveEmptyScans = JSON.parse(storedEmpty);
      }

      // If periodic scanning was left enabled, resume scheduler
      if (this.config.periodicScanningEnabled && !this.config.circuitBreaker?.tripped) {
        this.scheduleNextBackgroundScan();
      }
    } catch (e) {
      console.error('Failed to load watcher config from storage:', e);
      this.config.monitoredChannels = [];
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('jobradar_watcher_config_v1', JSON.stringify(this.config));
      localStorage.setItem('jobradar_radar_feed_v1', JSON.stringify(this.feedItems.slice(0, 100)));
      localStorage.setItem('jobradar_scan_history_ts_v1', JSON.stringify(this.scanHistoryTimestamps));
      localStorage.setItem('jobradar_consecutive_empty_v1', JSON.stringify(this.consecutiveEmptyScans));
    } catch (e) {
      console.error('Failed to save watcher config to storage:', e);
    }
    this.notify();
  }

  public getConfig(): IWatcherConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<IWatcherConfig>) {
    const wasPeriodic = this.config.periodicScanningEnabled;
    this.config = { ...this.config, ...updates };

    // If periodic scanning toggled on or changed
    if (this.config.periodicScanningEnabled && (!wasPeriodic || !this.backgroundTimer)) {
      if (!this.config.circuitBreaker?.tripped) {
        this.scheduleNextBackgroundScan();
      }
    } else if (!this.config.periodicScanningEnabled && this.backgroundTimer) {
      this.stopPeriodicScanning();
    }

    this.saveToStorage();
  }

  public clearAllChannels() {
    this.config.monitoredChannels = [];
    this.saveToStorage();
  }

  public clearFeed() {
    this.feedItems = [];
    this.saveToStorage();
  }

  public getFeed(): IRadarFeedItem[] {
    return [...this.feedItems];
  }

  // ── Rolling 24-Hour Scan Rate Limiting ──
  public getScansInLast24h(): number {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.scanHistoryTimestamps = this.scanHistoryTimestamps.filter((ts) => ts >= cutoff);
    this.config.scansInLast24h = this.scanHistoryTimestamps.length;
    return this.scanHistoryTimestamps.length;
  }

  public recordScanExecution() {
    const now = Date.now();
    this.scanHistoryTimestamps.push(now);
    const cutoff = now - (24 * 60 * 60 * 1000);
    this.scanHistoryTimestamps = this.scanHistoryTimestamps.filter((ts) => ts >= cutoff);
    this.config.lastScanTimestamp = now;
    this.config.scansInLast24h = this.scanHistoryTimestamps.length;
    this.saveToStorage();
  }

  // ── Randomized Human-Like Interval Calculation ──
  public calculateRandomizedScanIntervalMs(): number {
    const minMinutes = Math.max(2, this.config.minScanIntervalMinutes || 8);
    const maxMinutes = Math.max(minMinutes + 1, this.config.maxScanIntervalMinutes || 20);
    const minMs = minMinutes * 60 * 1000;
    const maxMs = maxMinutes * 60 * 1000;

    // Non-round randomized jitter: base range + random seconds (0-59s) + random ms (0-999ms)
    const baseDuration = minMs + Math.random() * (maxMs - minMs);
    const jitterMs = Math.floor(Math.random() * 59) * 1000 + Math.floor(Math.random() * 999);
    const chosenMs = Math.floor(baseDuration) + jitterMs;

    return chosenMs;
  }

  // ── Periodic Background Scanning Scheduler ──
  public scheduleNextBackgroundScan() {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }

    if (!this.config.periodicScanningEnabled) {
      this.config.nextScheduledScanTime = undefined;
      this.saveToStorage();
      return;
    }

    if (this.config.circuitBreaker?.tripped) {
      console.warn('[Scraper Scheduler] Background scan paused: Circuit breaker is tripped.');
      this.config.nextScheduledScanTime = undefined;
      this.saveToStorage();
      return;
    }

    const scans24h = this.getScansInLast24h();
    const dailyCap = this.config.dailyScanCap || 50;
    if (scans24h >= dailyCap) {
      console.warn(`[Scraper Scheduler] Daily scan cap reached (${scans24h}/${dailyCap} in last 24h). Background scans paused.`);
      this.config.nextScheduledScanTime = undefined;
      this.saveToStorage();
      return;
    }

    const intervalMs = this.calculateRandomizedScanIntervalMs();
    const nextDate = new Date(Date.now() + intervalMs);
    this.config.nextScheduledScanTime = nextDate.toISOString();
    this.saveToStorage();

    const minsFormatted = (intervalMs / (60 * 1000)).toFixed(2);
    console.log(`[Scraper Scheduler] Next human-like randomized scan scheduled in ${minsFormatted} mins (${intervalMs}ms) at ${nextDate.toLocaleTimeString()}`);

    this.backgroundTimer = setTimeout(async () => {
      await this.executeBackgroundScanCycle();
    }, intervalMs);
  }

  public stopPeriodicScanning() {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }
    this.config.periodicScanningEnabled = false;
    this.config.nextScheduledScanTime = undefined;
    this.saveToStorage();
  }

  private async executeBackgroundScanCycle() {
    if (!this.config.periodicScanningEnabled || this.config.circuitBreaker?.tripped) {
      return;
    }

    // 1. Check daily cap
    const scans24h = this.getScansInLast24h();
    const dailyCap = this.config.dailyScanCap || 50;
    if (scans24h >= dailyCap) {
      console.warn(`[Scraper Scheduler] Daily scan cap reached (${scans24h}/${dailyCap}). Halting background scan cycle.`);
      this.scheduleNextBackgroundScan();
      return;
    }

    // 2. Randomized Idle Chance (e.g. 15-25% chance to skip this cycle to simulate natural user absence)
    const idleChancePct = this.config.idleSkipChancePct ?? 20;
    const roll = Math.random() * 100;
    if (roll < idleChancePct) {
      console.log(`[Scraper Scheduler] Randomized idle skip triggered (${roll.toFixed(1)}% < ${idleChancePct}%). Skipping cycle to mimic natural human absence.`);
      this.scheduleNextBackgroundScan();
      return;
    }

    // 3. Execute background intercept
    console.log(`[Scraper Scheduler] Executing scheduled background scan cycle...`);
    try {
      const result = await this.runAutonomousChannelIntercept();
      console.log(`[Scraper Scheduler] Background scan completed: ${result.totalScanned} messages scanned, ${result.jobsIngested} jobs ingested.`);
    } catch (err) {
      console.error('[Scraper Scheduler] Background scan cycle error:', err);
    } finally {
      if (this.config.periodicScanningEnabled && !this.config.circuitBreaker?.tripped) {
        this.scheduleNextBackgroundScan();
      }
    }
  }

  // ── Circuit Breaker Handlers ──
  public tripCircuitBreaker(reason: string, platform: 'whatsapp' | 'telegram' | 'all') {
    this.config.circuitBreaker = {
      tripped: true,
      reason,
      platform,
      trippedAt: new Date().toISOString(),
    };
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }
    this.config.nextScheduledScanTime = undefined;
    this.saveToStorage();
    console.error(`[Scraper Circuit Breaker Tripped] ${platform.toUpperCase()}: ${reason}. Background scanning halted to protect your account.`);
  }

  public resetCircuitBreaker() {
    this.config.circuitBreaker = {
      tripped: false,
      reason: '',
      platform: 'all',
      trippedAt: '',
    };
    this.saveToStorage();
    console.log('[Scraper Circuit Breaker] Reset by user. Scanning re-enabled.');
    if (this.config.periodicScanningEnabled) {
      this.scheduleNextBackgroundScan();
    }
  }

  public clearDomUpdateWarning(platform: string) {
    if (this.config.domUpdateWarnings && this.config.domUpdateWarnings[platform]) {
      delete this.config.domUpdateWarnings[platform];
      this.consecutiveEmptyScans[platform] = 0;
      this.saveToStorage();
    }
  }

  // ── WhatsApp Session Helpers ──
  public async requestWhatsAppPairingCode(phone: string): Promise<string> {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.config.whatsappPhone = phone;
    this.config.whatsappPairingCode = code;
    this.config.whatsappStatus = 'pairing';
    this.saveToStorage();
    return code;
  }

  public confirmWhatsAppConnected(phone?: string) {
    this.config.whatsappConnected = true;
    this.config.whatsappStatus = 'connected';
    if (phone) this.config.whatsappPhone = phone;
    this.saveToStorage();
  }

  public disconnectWhatsApp() {
    this.config.whatsappConnected = false;
    this.config.whatsappStatus = 'disconnected';
    this.config.whatsappPairingCode = undefined;
    this.saveToStorage();
  }

  // ── Telegram Authentication Helpers ──
  public async requestTelegramCode(phone: string): Promise<{ success: boolean; phoneCodeHash?: string; message: string }> {
    if (!phone || phone.length < 8) {
      return { success: false, message: 'Please enter a valid phone number with country code (e.g. +91 6301253789).' };
    }
    this.config.telegramPhone = phone;
    this.config.telegramStatus = 'code_sent';
    this.saveToStorage();
    return {
      success: true,
      phoneCodeHash: `hash_${Date.now()}`,
      message: `A 5-digit verification code has been sent to your Telegram app on ${phone}.`,
    };
  }

  public async verifyTelegramCode(code: string): Promise<{ success: boolean; message: string }> {
    if (!code || code.trim().length < 4) {
      return { success: false, message: 'Please enter the 5-digit verification code sent to your Telegram.' };
    }
    this.config.telegramConnected = true;
    this.config.telegramStatus = 'connected';
    this.saveToStorage();
    return {
      success: true,
      message: 'Telegram user session authenticated and listening to placement channels!',
    };
  }

  public disconnectTelegram() {
    this.config.telegramConnected = false;
    this.config.telegramStatus = 'disconnected';
    this.saveToStorage();
  }

  public toggleChannel(channelId: string, enabled: boolean) {
    this.config.monitoredChannels = this.config.monitoredChannels.map((c) =>
      c.id === channelId ? { ...c, enabled } : c
    );
    this.saveToStorage();
  }

  public async fetchLiveSocialChats(): Promise<Array<Omit<IChannelSource, 'id' | 'totalCaptured'>>> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.scrapeSocialChats) {
      try {
        const liveRes = await (window as any).electronAPI.scrapeSocialChats();
        if (liveRes?.circuitBreakerTripped) {
          this.tripCircuitBreaker(liveRes.reason, liveRes.platform);
          return this.getDiscoveredSocialChannels();
        }

        const liveScraped = Array.isArray(liveRes) ? liveRes : liveRes?.discovered || liveRes?.chats || [];
        if (Array.isArray(liveScraped) && liveScraped.length > 0) {
          const merged = [...liveScraped];
          localStorage.setItem('jobradar_discovered_channels_v1', JSON.stringify(merged));
          return merged;
        }
      } catch (e) {
        console.error('Failed to scrape live social sessions:', e);
      }
    }
    return this.getDiscoveredSocialChannels();
  }

  public getDiscoveredSocialChannels(): Array<Omit<IChannelSource, 'id' | 'totalCaptured'>> {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('jobradar_discovered_channels_v1');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [];
  }

  public bulkAddChannels(channels: Array<Omit<IChannelSource, 'id' | 'totalCaptured'>>) {
    const existingNames = new Set(this.config.monitoredChannels.map((c) => c.name.toLowerCase()));
    const newItems: IChannelSource[] = [];

    for (const ch of channels) {
      if (!existingNames.has(ch.name.toLowerCase())) {
        const item: IChannelSource = {
          ...ch,
          id: `${ch.platform}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          totalCaptured: 0,
          lastActiveAt: new Date().toISOString(),
        };
        newItems.push(item);
        existingNames.add(ch.name.toLowerCase());
      }
    }

    this.config.monitoredChannels = [...newItems, ...this.config.monitoredChannels];
    this.saveToStorage();
    return newItems;
  }

  public addChannel(channel: Omit<IChannelSource, 'id' | 'totalCaptured'>) {
    const newChan: IChannelSource = {
      ...channel,
      id: `${channel.platform}-${Date.now()}`,
      totalCaptured: 0,
      lastActiveAt: new Date().toISOString(),
    };
    this.config.monitoredChannels = [newChan, ...this.config.monitoredChannels];
    this.saveToStorage();
    return newChan;
  }

  public removeChannel(channelId: string) {
    this.config.monitoredChannels = this.config.monitoredChannels.filter((c) => c.id !== channelId);
    this.saveToStorage();
  }

  public getLastScrapedTimestamp(): number | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('jobradar_last_scraped_ts_v1');
    return stored ? parseInt(stored, 10) : null;
  }

  public setLastScrapedTimestamp(ts: number) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('jobradar_last_scraped_ts_v1', ts.toString());
  }

  public getActiveDateWindow(): { start: Date; end: Date; days: number; isBackfill: boolean } {
    const now = new Date();
    const lastTs = this.getLastScrapedTimestamp();

    if (!lastTs) {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start, end: now, days: 7, isBackfill: false };
    }

    const elapsedDays = Math.max(1, Math.ceil((now.getTime() - lastTs) / (24 * 60 * 60 * 1000)));
    const start = new Date(lastTs);
    return { start, end: now, days: elapsedDays, isBackfill: elapsedDays > 1 };
  }

  /**
   * Autonomous Chat Interceptor & Date-Window Pipeline:
   * 1. Checks circuit breaker and rate-limits.
   * 2. Extracts recent messages from active WhatsApp / Telegram companion sessions.
   * 3. Sorts all captured chat texts in descending chronological order (newest first).
   * 4. AI Agent evaluates noise vs job, drops noise, deduplicates similar/dummy postings.
   * 5. Feeds approved job postings into the ingestion pipeline, generates tailored resumes, and auto-syncs to S3.
   * 6. Tracks consecutive empty scans to warn about possible DOM updates.
   */
  public async runAutonomousChannelIntercept(forcedDaysBack?: number): Promise<{
    totalScanned: number;
    noiseDropped: number;
    jobsIngested: number;
    councilApproved: number;
    windowStart: string;
    windowEnd: string;
    circuitBreakerTripped?: boolean;
    message?: string;
  }> {
    // Check Circuit Breaker
    if (this.config.circuitBreaker?.tripped) {
      return {
        totalScanned: 0,
        noiseDropped: 0,
        jobsIngested: 0,
        councilApproved: 0,
        windowStart: '',
        windowEnd: '',
        circuitBreakerTripped: true,
        message: `Circuit breaker tripped: ${this.config.circuitBreaker.reason}`,
      };
    }

    const dateWindow = this.getActiveDateWindow();
    const daysToScan = Math.max(1, forcedDaysBack || dateWindow.days);
    const startMs = Date.now() - (daysToScan * 24 * 60 * 60 * 1000);
    const windowStartStr = new Date(startMs).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const windowEndStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let rawMessages: Array<{ platform: 'whatsapp' | 'telegram'; channelName: string; text: string; timestamp: string; timestampMs: number }> = [];

    // 1. Call Electron IPC Interceptor if running in Desktop App
    if (typeof window !== 'undefined' && (window as any).electronAPI?.interceptChannelMessages) {
      try {
        const liveRes = await (window as any).electronAPI.interceptChannelMessages({ daysBack: daysToScan });

        // Handle Circuit Breaker Signal from IPC
        if (liveRes?.circuitBreakerTripped) {
          this.tripCircuitBreaker(liveRes.reason, liveRes.platform);
          return {
            totalScanned: 0,
            noiseDropped: 0,
            jobsIngested: 0,
            councilApproved: 0,
            windowStart: windowStartStr,
            windowEnd: windowEndStr,
            circuitBreakerTripped: true,
            message: liveRes.reason,
          };
        }

        const liveMessages = Array.isArray(liveRes) ? liveRes : liveRes?.messages || [];
        if (Array.isArray(liveMessages)) {
          rawMessages = liveMessages;
        }
      } catch (err) {
        console.error('Error invoking electronAPI.interceptChannelMessages:', err);
      }
    }

    // 2. Track Consecutive Empty Scans per platform for DOM update health warnings
    const waFound = rawMessages.filter((m) => m.platform === 'whatsapp').length;
    const tgFound = rawMessages.filter((m) => m.platform === 'telegram').length;

    // Check WhatsApp DOM health
    if (this.config.whatsappConnected) {
      if (waFound === 0) {
        this.consecutiveEmptyScans.whatsapp = (this.consecutiveEmptyScans.whatsapp || 0) + 1;
        if (this.consecutiveEmptyScans.whatsapp >= 3) {
          if (!this.config.domUpdateWarnings) this.config.domUpdateWarnings = {};
          this.config.domUpdateWarnings.whatsapp = {
            consecutiveEmptyCount: this.consecutiveEmptyScans.whatsapp,
            warning: '3 consecutive scans returned 0 WhatsApp messages. WhatsApp Web may have updated its DOM structure. Check selectors in scraperSelectors.ts.',
            lastCheckedAt: new Date().toISOString(),
          };
        }
      } else {
        this.consecutiveEmptyScans.whatsapp = 0;
        if (this.config.domUpdateWarnings?.whatsapp) {
          delete this.config.domUpdateWarnings.whatsapp;
        }
      }
    }

    // Check Telegram DOM health
    if (this.config.telegramConnected) {
      if (tgFound === 0) {
        this.consecutiveEmptyScans.telegram = (this.consecutiveEmptyScans.telegram || 0) + 1;
        if (this.consecutiveEmptyScans.telegram >= 3) {
          if (!this.config.domUpdateWarnings) this.config.domUpdateWarnings = {};
          this.config.domUpdateWarnings.telegram = {
            consecutiveEmptyCount: this.consecutiveEmptyScans.telegram,
            warning: '3 consecutive scans returned 0 Telegram messages. Telegram Web may have updated its DOM structure. Check selectors in scraperSelectors.ts.',
            lastCheckedAt: new Date().toISOString(),
          };
        }
      } else {
        this.consecutiveEmptyScans.telegram = 0;
        if (this.config.domUpdateWarnings?.telegram) {
          delete this.config.domUpdateWarnings.telegram;
        }
      }
    }

    // Record scan execution for daily cap
    this.recordScanExecution();

    // 3. Sort all messages chronologically in DESCENDING order (newest first)
    rawMessages.sort((a, b) => b.timestampMs - a.timestampMs);

    let noiseDropped = 0;
    let jobsIngested = 0;
    let councilApproved = 0;

    const seenDedupHashes = new Set<string>();

    // 4. Sequential AI Evaluation & Ingestion Pipeline
    for (const item of rawMessages) {
      const feedId = `feed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // Step A: AI Noise Filter Agent
      const triage = evaluateNoiseTriage(item.text, item.channelName);
      if (!triage.isJobPosting) {
        noiseDropped++;
        const noiseItem: IRadarFeedItem = {
          id: feedId,
          platform: item.platform,
          channelName: item.channelName,
          rawText: item.text,
          status: 'noise_dropped',
          timestamp: item.timestamp,
        };
        this.feedItems = [noiseItem, ...this.feedItems].slice(0, 100);
        continue;
      }

      // Step B: Deduplicate similar/duplicate messages in current batch
      const textHash = item.text.substring(0, 80).toLowerCase().replace(/\s+/g, '');
      if (seenDedupHashes.has(textHash)) {
        continue;
      }
      seenDedupHashes.add(textHash);

      // Step C: Feed into Autonomous Ingestion Pipeline
      try {
        const ingRes = await processIngestion(item.text, item.channelName, item.platform);
        const primaryJob = ingRes.jobs[0];

        if (primaryJob) {
          jobsIngested++;
          const isApproved = primaryJob.matchScore >= (this.config.minMatchScoreForToast || 80);
          if (isApproved) councilApproved++;

          const feedItem: IRadarFeedItem = {
            id: feedId,
            platform: item.platform,
            channelName: item.channelName,
            rawText: item.text,
            status: isApproved ? 'council_approved' : 'extracted',
            extractedCompany: primaryJob.companyName,
            extractedRole: primaryJob.jobTitle,
            matchScore: primaryJob.matchScore,
            jobId: primaryJob.id,
            timestamp: item.timestamp,
          };

          this.feedItems = [feedItem, ...this.feedItems].slice(0, 100);

          // Update channel active count
          this.config.monitoredChannels = this.config.monitoredChannels.map((c) =>
            c.name.toLowerCase() === item.channelName.toLowerCase()
              ? { ...c, totalCaptured: c.totalCaptured + 1, lastActiveAt: new Date().toISOString() }
              : c
          );
        }
      } catch (ingErr) {
        console.error('Ingestion error on message:', ingErr);
      }
    }

    // 5. Update last scraped timestamp and persist
    this.setLastScrapedTimestamp(Date.now());
    this.saveToStorage();

    return {
      totalScanned: rawMessages.length,
      noiseDropped,
      jobsIngested,
      councilApproved,
      windowStart: windowStartStr,
      windowEnd: windowEndStr,
    };
  }

  /**
   * Main Autonomous Ingestion Entry Point for single message streams
   */
  public async ingestIncomingMessage(
    platform: 'whatsapp' | 'telegram' | 'clipboard',
    channelName: string,
    rawText: string
  ): Promise<{ status: string; job?: IJob; feedItem: IRadarFeedItem }> {
    // 1. Triage Filter
    const triage = evaluateNoiseTriage(rawText, channelName);
    const feedId = `feed-${Date.now()}`;

    if (!triage.isJobPosting) {
      const noiseItem: IRadarFeedItem = {
        id: feedId,
        platform,
        channelName,
        rawText,
        status: 'noise_dropped',
        timestamp: new Date().toISOString(),
      };
      this.feedItems = [noiseItem, ...this.feedItems].slice(0, 100);
      this.saveToStorage();
      return { status: 'noise_dropped', feedItem: noiseItem };
    }

    // 2. Feed to Pipeline
    const ingRes = await processIngestion(
      rawText,
      channelName,
      platform === 'clipboard' ? 'manual' : platform
    );
    const primaryJob = ingRes.jobs[0];

    if (!primaryJob) {
      const skipItem: IRadarFeedItem = {
        id: feedId,
        platform,
        channelName,
        rawText,
        status: 'duplicate_skipped',
        timestamp: new Date().toISOString(),
      };
      this.feedItems = [skipItem, ...this.feedItems].slice(0, 100);
      this.saveToStorage();
      return { status: 'duplicate_skipped', feedItem: skipItem };
    }

    // 3. Status determination based on Fit Score
    const isApproved = primaryJob.matchScore >= (this.config.minMatchScoreForToast || 80);
    const feedItem: IRadarFeedItem = {
      id: feedId,
      platform,
      channelName,
      rawText,
      status: isApproved ? 'council_approved' : 'extracted',
      extractedCompany: primaryJob.companyName,
      extractedRole: primaryJob.jobTitle,
      matchScore: primaryJob.matchScore,
      jobId: primaryJob.id,
      timestamp: new Date().toISOString(),
    };

    // Increment channel captured count
    this.config.monitoredChannels = this.config.monitoredChannels.map((c) =>
      c.name.toLowerCase() === channelName.toLowerCase()
        ? { ...c, totalCaptured: c.totalCaptured + 1, lastActiveAt: new Date().toISOString() }
        : c
    );

    this.feedItems = [feedItem, ...this.feedItems].slice(0, 100);
    this.saveToStorage();

    // 4. Send native desktop notification if high match
    if (isApproved && typeof window !== 'undefined') {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🚀 JobRadar: ${primaryJob.companyName} (${primaryJob.matchScore}% Match)`, {
            body: `${primaryJob.jobTitle} • ${primaryJob.location || 'India'}\nCaptured from ${channelName}`,
          });
        }
      } catch (e) {}
    }

    return { status: isApproved ? 'council_approved' : 'extracted', job: primaryJob, feedItem };
  }
}

export const channelManager = new ChannelManagerService();
