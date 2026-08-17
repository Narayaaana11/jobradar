import crypto from 'crypto';
import { jobRepository, IJobItem } from '../repositories/jobRepository';

export interface IDedupCheckResult {
  isDuplicate: boolean;
  dedupHash: string;
  existingJobId?: string | null;
}

export function computeDedupHash(companyName: string, jobTitle: string, location?: string | null): string {
  const normCompany = (companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normTitle = (jobTitle || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normLoc = (location || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const payload = `${normCompany}:${normTitle}:${normLoc}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export async function checkDuplicateJob(
  companyName: string,
  jobTitle: string,
  location?: string | null
): Promise<IDedupCheckResult> {
  const dedupHash = computeDedupHash(companyName, jobTitle, location);
  const existingJob: IJobItem | null = await jobRepository.findByDedupHash(dedupHash);

  if (existingJob) {
    return {
      isDuplicate: true,
      dedupHash,
      existingJobId: existingJob.id,
    };
  }

  return {
    isDuplicate: false,
    dedupHash,
    existingJobId: null,
  };
}
