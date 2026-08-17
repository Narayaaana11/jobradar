import { s3Service } from '../src/services/s3Service';
import { connectDB } from '../src/config/database';
import { Job } from '../src/models/Job';
import { RawQueue } from '../src/models/RawQueue';
import { jobRepository } from '../src/repositories/jobRepository';

async function clearAllData() {
  console.log('[ClearS3] Starting complete AWS S3 & datastore purge...');

  // Connect to DB if MongoDB is active
  await connectDB().catch(() => {});

  // 1. Purge S3 Objects and local fallback
  const result = await s3Service.deleteAllObjects();
  console.log(`[ClearS3] Purged ${result.deletedCount} S3 objects.`);

  // 2. Clear MongoDB collections
  try {
    await Job.deleteMany({});
    await RawQueue.deleteMany({});
    console.log('[ClearS3] Cleared MongoDB Job and RawQueue collections.');
  } catch (err: any) {
    console.warn('[ClearS3] MongoDB clear warning:', err.message);
  }

  // 3. Clear In-Memory Repository
  await jobRepository.clearAll();

  console.log('[ClearS3] ✅ All S3 and datastore items purged successfully.');
  process.exit(0);
}

clearAllData().catch((err) => {
  console.error('[ClearS3 Error]', err);
  process.exit(1);
});
