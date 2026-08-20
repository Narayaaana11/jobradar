import { watchlistScheduler } from '../src/app-core/watchlistScheduler';
import { store } from '../src/app-core/store';
import { ICareerWatchlistSite } from '../src/app-core/types';

async function verifyScheduler() {
  console.log('=== VERIFYING BACKGROUND WATCHLIST SCHEDULER ===');
  
  // 1. Configure a test site
  const testSite: ICareerWatchlistSite = {
    id: 'test-scheduler-site-01',
    companyName: 'Anthropic',
    careerUrl: 'https://boards.greenhouse.io/anthropic',
    atsPlatform: 'greenhouse',
    enabled: true,
    targetDepartments: ['Engineering'],
    syncStatus: 'idle',
    lastSyncTime: null,
    jobsCount: 0,
  };
  store.addCareerSite(testSite);

  // 2. Start scheduler
  watchlistScheduler.startScheduler(1, 80);
  const status1 = watchlistScheduler.getStatus();
  console.log('Scheduler Status after startScheduler(1, 80):', {
    isRunning: status1.isRunning,
    pollingIntervalHours: status1.pollingIntervalHours,
    nextRunAt: status1.nextRunAt,
  });

  // 3. Execute a polling cycle
  console.log('Triggering scheduled poll cycle...');
  const report = await watchlistScheduler.executeScheduledPoll((msg, curr, tot) => {
    console.log(`[Progress ${curr}/${tot}] ${msg}`);
  });

  console.log('Poll Report Summary:', {
    totalJobsDiscovered: report.totalJobsDiscovered,
    suitableJobsAdded: report.suitableJobsAdded,
    timestamp: report.timestamp,
  });

  // 4. Verify scheduler metrics updated
  const status2 = watchlistScheduler.getStatus();
  console.log('Scheduler Status after run:', {
    totalRunsCount: status2.totalRunsCount,
    lastRunJobsAdded: status2.lastRunJobsAdded,
    lastRunAt: status2.lastRunAt,
  });

  // 5. Stop scheduler
  watchlistScheduler.stopScheduler();
  const status3 = watchlistScheduler.getStatus();
  console.log('Scheduler Status after stop:', { isRunning: status3.isRunning });
}

verifyScheduler().catch(console.error);
