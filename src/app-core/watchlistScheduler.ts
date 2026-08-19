import { store } from './store';
import { careerCrawler } from './careerCrawler';
import { IWatchlistSchedulerStatus, ICareerSyncReport } from './types';

/**
 * JobRadar Target Company Watchlist Autonomous Background Scheduler
 * 
 * Automatically polls configured target company career portals at scheduled intervals
 * (e.g., 1h, 6h, 12h, 24h), extracts active requisitions via ATS adapters & headless DOM,
 * and automatically approves positions meeting the candidate's fit threshold.
 */

export class WatchlistSchedulerService {
  private timerId: any = null;
  private isRunning: boolean = false;
  private lastRunAt: string | null = null;
  private nextRunAt: string | null = null;
  private pollingIntervalHours: number = 6;
  private autoApproveThreshold: number = 85;
  private totalRunsCount: number = 0;
  private lastRunJobsAdded: number = 0;

  constructor() {
    // Attempt auto-start in electron or desktop if enabled
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isDesktop) {
      this.startScheduler(6, 85);
    }
  }

  /**
   * Starts or reconfigures the autonomous polling schedule
   */
  public startScheduler(intervalHours: number = 6, autoApproveThreshold: number = 85): void {
    this.pollingIntervalHours = Math.max(1, intervalHours);
    this.autoApproveThreshold = autoApproveThreshold;

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.isRunning = true;
    const intervalMs = this.pollingIntervalHours * 60 * 60 * 1000;
    this.nextRunAt = new Date(Date.now() + intervalMs).toISOString();

    this.timerId = setInterval(() => {
      this.executeScheduledPoll();
    }, intervalMs);

    console.log(`[WatchlistScheduler] Background scheduler active: every ${this.pollingIntervalHours}h (Next: ${new Date(this.nextRunAt).toLocaleTimeString()})`);
  }

  /**
   * Stops the background polling scheduler
   */
  public stopScheduler(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    this.nextRunAt = null;
    console.log('[WatchlistScheduler] Scheduler stopped.');
  }

  /**
   * Executes an immediate polling cycle across all enabled watchlist sites
   */
  public async executeScheduledPoll(
    onProgress?: (status: string, current: number, total: number) => void
  ): Promise<ICareerSyncReport> {
    console.log('[WatchlistScheduler] Executing watchlist polling cycle...');
    this.lastRunAt = new Date().toISOString();
    const intervalMs = this.pollingIntervalHours * 60 * 60 * 1000;
    this.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
    this.totalRunsCount++;

    try {
      const report = await careerCrawler.syncAllCareerWatchlist((msg, curr, tot) => {
        if (onProgress) onProgress(msg, curr, tot);
      });

      this.lastRunJobsAdded = report.suitableJobsAdded;
      console.log(`[WatchlistScheduler] Polling cycle complete: ${report.totalJobsDiscovered} discovered, ${report.suitableJobsAdded} added to pipeline.`);
      return report;
    } catch (err) {
      console.error('[WatchlistScheduler] Polling cycle encountered an error:', err);
      throw err;
    }
  }

  /**
   * Returns current scheduler health & run status
   */
  public getStatus(): IWatchlistSchedulerStatus {
    return {
      isRunning: this.isRunning,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.nextRunAt,
      pollingIntervalHours: this.pollingIntervalHours,
      autoApproveThreshold: this.autoApproveThreshold,
      totalRunsCount: this.totalRunsCount,
      lastRunJobsAdded: this.lastRunJobsAdded,
    };
  }
}

export const watchlistScheduler = new WatchlistSchedulerService();
