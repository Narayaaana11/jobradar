import sql from 'mssql';
import { getMSSQLPool } from '../config/mssql';
import { s3Service } from '../services/s3Service';

export interface IJobItem {
  id: string;
  _id?: string;
  rawQueueId?: string | null;
  companyName: string;
  jobTitle: string;
  jobType?: string | null;
  location?: string | null;
  isRemote?: boolean | null;
  ctcMentioned: boolean;
  ctcRange?: string | null;
  applicationLink?: string | null;
  skillsRequired: string[];
  experienceRequired?: string | null;
  rawDescription: string;
  dedupHash: string;
  isDuplicate: boolean;
  matchScore: number;
  matchConfidence: number;
  gapAnalysis?: any | null;
  fitBreakdown?: any | null;
  rubricScores?: any | null;
  atsAnalysis?: any | null;
  autoApplyDetails?: any | null;
  stage?: string;
  scoreFlag: string;
  approvalStatus: string;
  applicationStatus: string;
  resumeVersionUrl?: string | null;
  resumeNotes?: string | null;
  coverLetterText?: string | null;
  referralContacts?: any[] | null;
  interviewPrep?: any | null;
  highMatchAlert?: boolean;
  skillMatched?: boolean;
  createdAt: Date;
  updatedAt: Date;
  save?: () => Promise<any>;
}

// Global In-Memory S3 Cache for ultra-fast response across processes
const memoryJobStore: Map<string, IJobItem> = new Map();
let isSynced = false;
let syncInProgress = false;

const JOBS_INDEX_KEY = 'jobs_index/all_jobs.json';

function startBackgroundSync() {
  if (isSynced || syncInProgress) return;
  syncInProgress = true;

  const doSync = async () => {
    try {
      // Try fast single-file index first (O(1) instead of O(n) individual S3 reads)
      const indexData = await s3Service.getJson<{ jobs: IJobItem[] }>(JOBS_INDEX_KEY);
      if (indexData && Array.isArray(indexData.jobs) && indexData.jobs.length > 0) {
        for (const job of indexData.jobs) {
          if (job && job.id) memoryJobStore.set(job.id, job);
        }
        isSynced = true;
        syncInProgress = false;
        console.log(`[JobRepository] Synced ${memoryJobStore.size} job items from S3 index.`);
        return;
      }
    } catch {}

    // Fallback: list individual files
    try {
      const keys = await s3Service.listKeys('jobs/');
      let count = 0;
      for (const key of keys) {
        if (!key.endsWith('.json')) continue;
        const job = await s3Service.getJson<IJobItem>(key);
        if (job && job.id) {
          memoryJobStore.set(job.id, job);
          count++;
        }
      }
      isSynced = true;
      syncInProgress = false;
      console.log(`[JobRepository] Synced ${count} job items from S3 datastore.`);

      // Save as index for next startup (fast path)
      await saveJobsIndex();
    } catch (e: any) {
      console.warn(`[JobRepository] S3 Sync Warning:`, e.message);
      syncInProgress = false;
    }
  };

  // Use setImmediate so the server can finish starting before sync begins
  setImmediate(() => doSync());
}

async function saveJobsIndex(): Promise<void> {
  const allJobs = Array.from(memoryJobStore.values());
  await s3Service.putJson(JOBS_INDEX_KEY, { jobs: allJobs, updatedAt: new Date().toISOString() });
}

// Start background sync immediately when module loads
startBackgroundSync();

export class JobRepository {
  private async ensureSynced(): Promise<void> {
    if (isSynced) return;

    // Return immediately if we have some data (partial sync is fine)
    if (memoryJobStore.size > 0) return;

    // Wait for sync to start (up to 6 seconds)
    await new Promise<void>((resolve) => {
      let waited = 0;
      const check = setInterval(() => {
        waited += 250;
        if (isSynced || memoryJobStore.size > 0 || waited >= 6000) {
          clearInterval(check);
          resolve();
        }
      }, 250);
    });
  }


  public async create(data: Partial<IJobItem>): Promise<IJobItem> {
    await this.ensureSynced();
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const jobItem: IJobItem = {
      id,
      _id: id,
      rawQueueId: data.rawQueueId || null,
      companyName: data.companyName || 'Unknown',
      jobTitle: data.jobTitle || 'Role',
      jobType: data.jobType || null,
      location: data.location || null,
      isRemote: Boolean(data.isRemote),
      ctcMentioned: Boolean(data.ctcMentioned),
      ctcRange: data.ctcRange || null,
      applicationLink: data.applicationLink || null,
      skillsRequired: data.skillsRequired || [],
      experienceRequired: data.experienceRequired || null,
      rawDescription: data.rawDescription || '',
      dedupHash: data.dedupHash || '',
      isDuplicate: Boolean(data.isDuplicate),
      matchScore: data.matchScore || 0,
      matchConfidence: data.matchConfidence || 0.0,
      gapAnalysis: data.gapAnalysis || {},
      fitBreakdown: data.fitBreakdown || {},
      rubricScores: data.rubricScores || null,
      atsAnalysis: data.atsAnalysis || null,
      stage: data.stage || 'pending_approval',
      autoApplyDetails: data.autoApplyDetails || null,
      scoreFlag: data.scoreFlag || 'auto',
      approvalStatus: data.approvalStatus || 'pending',
      applicationStatus: data.applicationStatus || 'not_applied',
      resumeVersionUrl: data.resumeVersionUrl || null,
      resumeNotes: data.resumeNotes || null,
      coverLetterText: data.coverLetterText || null,
      referralContacts: data.referralContacts || [],
      interviewPrep: data.interviewPrep || null,
      highMatchAlert: Boolean(data.highMatchAlert),
      skillMatched: data.skillMatched !== undefined ? Boolean(data.skillMatched) : true,
      createdAt: now,
      updatedAt: now,
    };

    // Save to S3 Datastore (s3://jobsprep/jobs/job_xxx.json)
    await s3Service.putJson(`jobs/${id}.json`, jobItem);
    memoryJobStore.set(id, jobItem);

    try {
      const pool = await getMSSQLPool();
      if (pool) {
        const request = pool.request();
        request.input('id', sql.NVarChar(50), id);
        request.input('rawQueueId', sql.NVarChar(50), jobItem.rawQueueId);
        request.input('companyName', sql.NVarChar(200), jobItem.companyName);
        request.input('jobTitle', sql.NVarChar(200), jobItem.jobTitle);
        request.input('jobType', sql.NVarChar(100), jobItem.jobType);
        request.input('location', sql.NVarChar(200), jobItem.location);
        request.input('isRemote', sql.Bit, jobItem.isRemote ? 1 : 0);
        request.input('ctcMentioned', sql.Bit, jobItem.ctcMentioned ? 1 : 0);
        request.input('ctcRange', sql.NVarChar(100), jobItem.ctcRange);
        request.input('applicationLink', sql.NVarChar(sql.MAX), jobItem.applicationLink);
        request.input('skillsRequired', sql.NVarChar(sql.MAX), JSON.stringify(jobItem.skillsRequired));
        request.input('experienceRequired', sql.NVarChar(100), jobItem.experienceRequired);
        request.input('rawDescription', sql.NVarChar(sql.MAX), jobItem.rawDescription);
        request.input('dedupHash', sql.NVarChar(64), jobItem.dedupHash);
        request.input('isDuplicate', sql.Bit, jobItem.isDuplicate ? 1 : 0);
        request.input('matchScore', sql.Int, jobItem.matchScore);
        request.input('matchConfidence', sql.Float, jobItem.matchConfidence);
        request.input('gapAnalysis', sql.NVarChar(sql.MAX), JSON.stringify(jobItem.gapAnalysis));
        request.input('fitBreakdown', sql.NVarChar(sql.MAX), JSON.stringify(jobItem.fitBreakdown));
        request.input('scoreFlag', sql.NVarChar(50), jobItem.scoreFlag);
        request.input('approvalStatus', sql.NVarChar(50), jobItem.approvalStatus);
        request.input('applicationStatus', sql.NVarChar(50), jobItem.applicationStatus);
        request.input('resumeVersionUrl', sql.NVarChar(sql.MAX), jobItem.resumeVersionUrl);
        request.input('resumeNotes', sql.NVarChar(sql.MAX), jobItem.resumeNotes);
        request.input('coverLetterText', sql.NVarChar(sql.MAX), jobItem.coverLetterText);
        request.input('referralContacts', sql.NVarChar(sql.MAX), JSON.stringify(jobItem.referralContacts));

        await request.query(`
          INSERT INTO Jobs (
            id, rawQueueId, companyName, jobTitle, jobType, location, isRemote, ctcMentioned, ctcRange,
            applicationLink, skillsRequired, experienceRequired, rawDescription, dedupHash, isDuplicate,
            matchScore, matchConfidence, gapAnalysis, fitBreakdown, scoreFlag, approvalStatus, applicationStatus,
            resumeVersionUrl, resumeNotes, coverLetterText, referralContacts, createdAt, updatedAt
          ) VALUES (
            @id, @rawQueueId, @companyName, @jobTitle, @jobType, @location, @isRemote, @ctcMentioned, @ctcRange,
            @applicationLink, @skillsRequired, @experienceRequired, @rawDescription, @dedupHash, @isDuplicate,
            @matchScore, @matchConfidence, @gapAnalysis, @fitBreakdown, @scoreFlag, @approvalStatus, @applicationStatus,
            @resumeVersionUrl, @resumeNotes, @coverLetterText, @referralContacts, SYSDATETIME(), SYSDATETIME()
          );
        `);
      }
    } catch (e: any) {}
    await saveJobsIndex().catch(() => {});
    return jobItem;
  }

  public async findById(id: string): Promise<IJobItem | null> {
    await this.ensureSynced();
    if (memoryJobStore.has(id)) {
      return memoryJobStore.get(id)!;
    }

    const s3Item = await s3Service.getJson<IJobItem>(`jobs/${id}.json`);
    if (s3Item) {
      memoryJobStore.set(id, s3Item);
      return s3Item;
    }

    return null;
  }

  public async findByDedupHash(dedupHash: string): Promise<IJobItem | null> {
    await this.ensureSynced();
    for (const item of memoryJobStore.values()) {
      if (item.dedupHash === dedupHash) return item;
    }
    return null;
  }

  public async getPaginatedJobs(options: {
    page?: number;
    limit?: number;
    search?: string;
    approvalStatus?: string;
    applicationStatus?: string;
    skillFilter?: string;
  }): Promise<{ jobs: IJobItem[]; total: number; page: number; totalPages: number }> {
    await this.ensureSynced();

    try {
      const pool = await getMSSQLPool();
      if (pool) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.max(1, options.limit || 100);
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const request = pool.request();

        if (options.search) {
          whereClause += ' AND (companyName LIKE @search OR jobTitle LIKE @search OR location LIKE @search)';
          request.input('search', sql.NVarChar(200), `%${options.search}%`);
        }

        if (options.approvalStatus) {
          whereClause += ' AND approvalStatus = @approvalStatus';
          request.input('approvalStatus', sql.NVarChar(50), options.approvalStatus);
        }

        if (options.applicationStatus) {
          whereClause += ' AND applicationStatus = @applicationStatus';
          request.input('applicationStatus', sql.NVarChar(50), options.applicationStatus);
        }

        const countResult = await request.query(`SELECT COUNT(*) as total FROM Jobs ${whereClause}`);
        const total = countResult.recordset[0].total;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, limit);

        const query = `
          SELECT * FROM Jobs
          ${whereClause}
          ORDER BY createdAt DESC
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        `;

        const dataResult = await request.query(query);
        const jobs = dataResult.recordset.map((row) => this.mapRow(row));

        return { jobs, total, page, totalPages: Math.ceil(total / limit) };
      }
    } catch (e) {}

    // AWS S3 Datastore Mode
    let allJobs = Array.from(memoryJobStore.values());

    if (options.search) {
      const s = options.search.toLowerCase();
      allJobs = allJobs.filter(
        (j) => j.companyName.toLowerCase().includes(s) || j.jobTitle.toLowerCase().includes(s) || (j.location || '').toLowerCase().includes(s)
      );
    }

    if (options.approvalStatus) {
      allJobs = allJobs.filter((j) => j.approvalStatus === options.approvalStatus);
    }

    if (options.applicationStatus) {
      allJobs = allJobs.filter((j) => j.applicationStatus === options.applicationStatus);
    }

    if (options.skillFilter === 'matched') {
      allJobs = allJobs.filter((j) => j.skillMatched !== false);
    } else if (options.skillFilter === 'unmatched') {
      allJobs = allJobs.filter((j) => j.skillMatched === false);
    }

    allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 100);
    const start = (page - 1) * limit;
    const paginated = allJobs.slice(start, start + limit);

    return {
      jobs: paginated,
      total: allJobs.length,
      page,
      totalPages: Math.ceil(allJobs.length / limit) || 1,
    };
  }

  public async updateApprovalStatus(id: string, status: string): Promise<IJobItem | null> {
    const item = await this.findById(id);
    if (item) {
      item.approvalStatus = status;
      item.updatedAt = new Date();
      await s3Service.putJson(`jobs/${id}.json`, item);
      memoryJobStore.set(id, item);
      await saveJobsIndex().catch(() => {});
    }

    try {
      const pool = await getMSSQLPool();
      if (pool) {
        const request = pool.request();
        request.input('id', sql.NVarChar(50), id);
        request.input('status', sql.NVarChar(50), status);
        await request.query('UPDATE Jobs SET approvalStatus = @status, updatedAt = SYSDATETIME() WHERE id = @id');
      }
    } catch (e) {}

    return item;
  }

  public async updateApplicationStatus(id: string, status: string): Promise<IJobItem | null> {
    const item = await this.findById(id);
    if (item) {
      item.applicationStatus = status;
      item.updatedAt = new Date();
      await s3Service.putJson(`jobs/${id}.json`, item);
      memoryJobStore.set(id, item);
      await saveJobsIndex().catch(() => {});
    }

    try {
      const pool = await getMSSQLPool();
      if (pool) {
        const request = pool.request();
        request.input('id', sql.NVarChar(50), id);
        request.input('status', sql.NVarChar(50), status);
        await request.query('UPDATE Jobs SET applicationStatus = @status, updatedAt = SYSDATETIME() WHERE id = @id');
      }
    } catch (e) {}

    return item;
  }

  public async getStats(): Promise<any> {
    await this.ensureSynced();
    try {
      const pool = await getMSSQLPool();
      if (pool) {
        const result = await pool.request().query(`
          SELECT
            COUNT(*) as totalJobs,
            SUM(CASE WHEN approvalStatus = 'pending' THEN 1 ELSE 0 END) as pendingApproval,
            SUM(CASE WHEN approvalStatus = 'approved' THEN 1 ELSE 0 END) as approvedJobs,
            SUM(CASE WHEN applicationStatus = 'applied' THEN 1 ELSE 0 END) as appliedJobs,
            AVG(CAST(matchScore AS FLOAT)) as avgMatchScore
          FROM Jobs;
        `);
        const row = result.recordset[0];
        return {
          totalJobs: row.totalJobs || 0,
          pendingApproval: row.pendingApproval || 0,
          approvedJobs: row.approvedJobs || 0,
          appliedJobs: row.appliedJobs || 0,
          avgMatchScore: Math.round(row.avgMatchScore || 0),
        };
      }
    } catch (e) {}

    const jobs = Array.from(memoryJobStore.values());
    const totalJobs = jobs.length;
    const pendingApproval = jobs.filter((j) => j.approvalStatus === 'pending').length;
    const approvedJobs = jobs.filter((j) => j.approvalStatus === 'approved').length;
    const appliedJobs = jobs.filter((j) => j.applicationStatus === 'applied').length;
    const totalScore = jobs.reduce((sum, j) => sum + (j.matchScore || 0), 0);

    return {
      totalJobs,
      pendingApproval,
      approvedJobs,
      appliedJobs,
      avgMatchScore: totalJobs > 0 ? Math.round(totalScore / totalJobs) : 0,
    };
  }

  private mapRow(row: any): IJobItem {
    return {
      id: row.id,
      _id: row.id,
      rawQueueId: row.rawQueueId,
      companyName: row.companyName,
      jobTitle: row.jobTitle,
      jobType: row.jobType,
      location: row.location,
      isRemote: Boolean(row.isRemote),
      ctcMentioned: Boolean(row.ctcMentioned),
      ctcRange: row.ctcRange,
      applicationLink: row.applicationLink,
      skillsRequired: row.skillsRequired ? JSON.parse(row.skillsRequired) : [],
      experienceRequired: row.experienceRequired,
      rawDescription: row.rawDescription,
      dedupHash: row.dedupHash,
      isDuplicate: Boolean(row.isDuplicate),
      matchScore: row.matchScore,
      matchConfidence: row.matchConfidence,
      gapAnalysis: row.gapAnalysis ? JSON.parse(row.gapAnalysis) : null,
      fitBreakdown: row.fitBreakdown ? JSON.parse(row.fitBreakdown) : null,
      scoreFlag: row.scoreFlag,
      approvalStatus: row.approvalStatus,
      applicationStatus: row.applicationStatus,
      resumeVersionUrl: row.resumeVersionUrl,
      resumeNotes: row.resumeNotes,
      coverLetterText: row.coverLetterText,
      referralContacts: row.referralContacts ? JSON.parse(row.referralContacts) : [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  public async clearAll(): Promise<void> {
    memoryJobStore.clear();
    await saveJobsIndex();
  }
}

export const jobRepository = new JobRepository();
