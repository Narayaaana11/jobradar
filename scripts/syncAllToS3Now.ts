import { s3Cloud } from '../src/app-core/s3Client';
import { store } from '../src/app-core/store';
import { buildAtsResumePdf, cleanFilenameSlug } from '../src/app-core/resumeGenerator';

async function syncAll() {
  console.log('=== SYNCING ALL INITIAL DATA & RESUMES TO S3 BUCKET ===');

  const jobs = store.getJobs();
  const queue = store.getQueueItems();
  const profile = store.getProfile();
  const masterResume = store.getMasterResume();

  console.log(`Syncing ${jobs.length} jobs and profile to S3...`);
  const ok = await s3Cloud.syncAllToS3(jobs, queue, profile, masterResume);
  if (!ok) throw new Error('Data sync failed');

  // Upload initial seed PDF resumes to S3
  for (const job of jobs) {
    const cleanCompany = cleanFilenameSlug(job.companyName || 'Company');
    const cleanRole = cleanFilenameSlug(job.jobTitle || 'Role');
    const filename = `Narayana_Thota_${cleanRole}_${cleanCompany}.pdf`;

    const doc = buildAtsResumePdf(job, profile);
    const pdfArrayBuffer = doc.output('arraybuffer');
    const url = await s3Cloud.uploadResumePdf(filename, new Uint8Array(pdfArrayBuffer));
    console.log(`[✓] Uploaded Resume PDF to S3: ${url}`);
  }

  console.log('=== ALL JOBS, RESUMES & ASSETS ARE NOW SECURELY STORED IN S3! ===');
}

syncAll().catch(err => {
  console.error('[!] Sync failed:', err.message);
});
