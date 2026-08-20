import { store, defaultProfile } from '../src/app-core/store';
import { careerCrawler } from '../src/app-core/careerCrawler';
import { atsAdapters } from '../src/app-core/atsAdapters';
import { s3Cloud } from '../src/app-core/s3Client';
import { ICareerWatchlistSite, AtsPlatform, IJob } from '../src/app-core/types';

// Mock localStorage if running in pure Node environment
const storageMock: Record<string, string> = {};
if (typeof localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => storageMock[key] || null,
    setItem: (key: string, val: string) => { storageMock[key] = val; },
    removeItem: (key: string) => { delete storageMock[key]; },
    clear: () => { Object.keys(storageMock).forEach((k) => delete storageMock[k]); },
  };
}

/**
 * JobRadar CLI Headless Portal & ATS Scanner
 * 
 * Usage:
 *   npx tsx scripts/scanPortals.ts [options]
 * 
 * Options:
 *   --ats <type>       Filter by ATS platform: 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'all' (default: all)
 *   --company <name>   Scan specific target company name
 *   --limit <number>   Limit number of company sites to scan (default: all)
 *   --min-score <num>  Minimum match score threshold (default: 60)
 *   --auto-approve     Auto-approve high fit jobs (score >= 80)
 *   --sync-s3          Push discovered jobs and state to AWS S3 after scan
 *   --dry-run          Preview discoveries without saving to store
 */

async function main() {
  const args = process.argv.slice(2);
  let atsFilter: string = 'all';
  let companyFilter: string | null = null;
  let limit: number = 999;
  let minScore: number = 60;
  let autoApprove: boolean = false;
  let syncS3: boolean = false;
  let dryRun: boolean = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--ats' && args[i + 1]) {
      atsFilter = args[++i].toLowerCase();
    } else if (arg === '--company' && args[i + 1]) {
      companyFilter = args[++i].toLowerCase();
    } else if (arg === '--limit' && args[i + 1]) {
      limit = parseInt(args[++i], 10) || 999;
    } else if (arg === '--min-score' && args[i + 1]) {
      minScore = parseInt(args[++i], 10) || 60;
    } else if (arg === '--auto-approve') {
      autoApprove = true;
    } else if (arg === '--sync-s3') {
      syncS3 = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
JobRadar Autonomous ATS & Career Portal CLI Scanner

Usage:
  npx tsx scripts/scanPortals.ts [options]

Options:
  --ats <platform>    Target specific ATS: 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'all'
  --company <name>    Target specific company name (e.g. 'Stripe', 'Vercel', 'Figma')
  --limit <number>    Limit maximum companies to scan
  --min-score <num>   Minimum match fit percentage to include (default: 60)
  --auto-approve      Automatically promote jobs with score >= 80% to 'approved'
  --sync-s3           Synchronize newly discovered jobs to AWS S3
  --dry-run           Scan and print results without persisting
`);
      process.exit(0);
    }
  }

  console.log('================================================================================');
  console.log('⚡ JOBRADAR AUTONOMOUS ATS & TARGET COMPANY PORTAL SCANNER (CLI MODE)');
  console.log('================================================================================\n');
  console.log(`[Config] ATS Filter: ${atsFilter} | Min Score: ${minScore}% | Auto-Approve: ${autoApprove} | Dry Run: ${dryRun}\n`);

  const profile = store.getProfile() || defaultProfile;
  const masterResume = store.getMasterResume();
  let watchlist = store.getCareerWatchlist().filter((s) => s.enabled);

  if (atsFilter !== 'all') {
    watchlist = watchlist.filter((s) => (s.atsProvider || atsAdapters.detectAtsPlatform(s.careerUrl)) === atsFilter);
  }

  if (companyFilter) {
    watchlist = watchlist.filter((s) => s.companyName.toLowerCase().includes(companyFilter));
  }

  watchlist = watchlist.slice(0, limit);

  if (watchlist.length === 0) {
    console.log('⚠️ No matching career watchlist sites found with current filter criteria.');
    process.exit(0);
  }

  console.log(`📡 Commencing scan across ${watchlist.length} target company portals...\n`);

  let totalDiscovered = 0;
  let totalSuitable = 0;
  const startTime = Date.now();
  const resultsTable: Array<{
    Company: string;
    ATS: string;
    Status: string;
    Discovered: number;
    Suitable: number;
    TopRole: string;
    TopScore: string;
  }> = [];

  for (let idx = 0; idx < watchlist.length; idx++) {
    const site = watchlist[idx];
    const detectedAts = site.atsProvider || atsAdapters.detectAtsPlatform(site.careerUrl);
    process.stdout.write(`[${idx + 1}/${watchlist.length}] Scanning ${site.companyName.padEnd(16)} (${detectedAts.toUpperCase()})... `);

    try {
      const res = await careerCrawler.crawlCareerSite(site, profile, masterResume);
      totalDiscovered += res.jobsFound;

      const suitableFiltered = res.jobs.filter((j) => (j.matchScore || 0) >= minScore);
      totalSuitable += suitableFiltered.length;

      if (autoApprove) {
        suitableFiltered.forEach((j) => {
          if (j.matchScore >= 80) {
            store.updateApproval(j.id, 'approved');
          }
        });
      }

      const topJob = suitableFiltered[0];

      resultsTable.push({
        Company: site.companyName,
        ATS: detectedAts.toUpperCase(),
        Status: '✅ SUCCESS',
        Discovered: res.jobsFound,
        Suitable: suitableFiltered.length,
        TopRole: topJob ? topJob.jobTitle.substring(0, 32) : 'None',
        TopScore: topJob ? `${topJob.matchScore}% (Rubric: ${topJob.rubricScores?.overallRubricRating || 'N/A'})` : '-',
      });

      console.log(`Found: ${res.jobsFound} | Suitable: ${suitableFiltered.length}${topJob ? ` | Top: ${topJob.jobTitle} (${topJob.matchScore}%)` : ''}`);
    } catch (err: any) {
      resultsTable.push({
        Company: site.companyName,
        ATS: detectedAts.toUpperCase(),
        Status: '❌ ERROR',
        Discovered: 0,
        Suitable: 0,
        TopRole: '-',
        TopScore: '-',
      });
      console.log(`Failed: ${err.message}`);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n================================================================================');
  console.log('📊 ATS PORTALS SCAN SUMMARY');
  console.log('================================================================================');
  console.table(resultsTable);

  console.log(`\n🎉 Scan Finished in ${durationSec}s`);
  console.log(`   - Portals Scanned: ${watchlist.length}`);
  console.log(`   - Total Requisitions Discovered: ${totalDiscovered}`);
  console.log(`   - Candidate Matches Added (Score >= ${minScore}%): ${totalSuitable}`);
  console.log(`   - Total Active Jobs in Pipeline: ${store.getJobs().length}`);

  if (syncS3 && !dryRun) {
    console.log('\n☁️ Synchronizing pipeline state and new jobs to AWS S3...');
    try {
      const s3Success = await s3Cloud.syncAllToS3(
        store.getJobs(),
        store.getQueueItems(),
        store.getProfile(),
        store.getMasterResume(),
        store.getCareerWatchlist()
      );
      if (s3Success) {
        console.log('   ✅ AWS S3 Synchronized Successfully!');
      } else {
        console.warn('   ⚠️ S3 Sync Warning: Sync returned false (S3 not configured or skipped)');
      }
    } catch (s3Err: any) {
      console.warn(`   ⚠️ S3 Sync Failed: ${s3Err.message}`);
    }
  }

  console.log('================================================================================\n');
}

main().catch((err) => {
  console.error('Fatal CLI Scanner Error:', err);
  process.exit(1);
});
