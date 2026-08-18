import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { IJob, IRawQueueItem, IProfile } from './types';

const S3_CONFIG_KEY = 'jobradar_s3_config_v1';

export interface IS3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  autoSync: boolean;
}

export const defaultS3Config: IS3Config = {
  region: (typeof process !== 'undefined' && process.env?.AWS_REGION) || 'us-east-1',
  accessKeyId: (typeof process !== 'undefined' && process.env?.AWS_ACCESS_KEY_ID) || '',
  secretAccessKey: (typeof process !== 'undefined' && process.env?.AWS_SECRET_ACCESS_KEY) || '',
  bucket: (typeof process !== 'undefined' && process.env?.AWS_S3_BUCKET) || 'jobsprep',
  autoSync: true,
};

export type S3SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

class S3CloudService {
  private config: IS3Config = defaultS3Config;
  private client: S3Client | null = null;
  private syncStatus: S3SyncStatus = 'idle';
  private lastSyncTime: string | null = null;
  private syncError: string | null = null;
  private listeners: Set<(status: S3SyncStatus) => void> = new Set();

  constructor() {
    this.loadConfig();
    this.initClient();
  }

  private loadConfig() {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(S3_CONFIG_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.config = {
            ...defaultS3Config,
            ...parsed,
            accessKeyId: parsed.accessKeyId || defaultS3Config.accessKeyId,
            secretAccessKey: parsed.secretAccessKey || defaultS3Config.secretAccessKey,
            bucket: parsed.bucket || defaultS3Config.bucket,
            autoSync: parsed.autoSync !== undefined ? parsed.autoSync : true,
          };
        } else {
          this.config = defaultS3Config;
          localStorage.setItem(S3_CONFIG_KEY, JSON.stringify(defaultS3Config));
        }
      }
    } catch (err) {
      console.warn('Error reading S3 config from storage:', err);
      this.config = defaultS3Config;
    }
  }

  public getConfig(): IS3Config {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<IS3Config>) {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== 'undefined') {
      localStorage.setItem(S3_CONFIG_KEY, JSON.stringify(this.config));
    }
    this.initClient();
  }

  private initClient() {
    if (this.config.accessKeyId && this.config.secretAccessKey && this.config.region) {
      try {
        this.client = new S3Client({
          region: this.config.region,
          credentials: {
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey,
          },
        });
      } catch (err) {
        console.error('Failed to initialize AWS S3 Client:', err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  public getStatus(): { status: S3SyncStatus; lastSyncTime: string | null; error: string | null } {
    return {
      status: this.syncStatus,
      lastSyncTime: this.lastSyncTime,
      error: this.syncError,
    };
  }

  public subscribe(listener: (status: S3SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: S3SyncStatus, error: string | null = null) {
    this.syncStatus = status;
    this.syncError = error;
    if (status === 'synced') {
      this.lastSyncTime = new Date().toLocaleTimeString();
    }
    this.listeners.forEach((l) => l(status));
  }

  /**
   * Uploads arbitrary text or binary data directly to AWS S3 bucket.
   * Uses Native Electron IPC bridge (Zero CORS) when running on Desktop.
   */
  public async putObject(key: string, body: Uint8Array | string, contentType: string = 'application/json'): Promise<string> {
    const electronApi = typeof window !== 'undefined' ? (window as any)?.electronAPI : null;

    if (electronApi?.s3PutObject) {
      const res = await electronApi.s3PutObject({
        config: this.config,
        key,
        body: typeof body === 'string' ? body : Array.from(body),
        contentType,
      });

      if (!res.success) {
        throw new Error(res.error || 'S3 PutObject failed');
      }
      return res.url || `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
    }

    if (!this.client) {
      this.initClient();
      if (!this.client) throw new Error('AWS S3 Client credentials not configured.');
    }

    const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    });

    await this.client.send(command);
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  /**
   * Syncs all JobRadar data (jobs, queue, profile, master resume, watchlist, and full archive) to S3.
   * Utilizes Electron native bridge for Zero-CORS reliability.
   */
  public async syncAllToS3(
    jobs: IJob[],
    queue: IRawQueueItem[],
    profile: IProfile,
    masterResume: string,
    careerWatchlist?: any[]
  ): Promise<boolean> {
    this.setStatus('syncing');
    try {
      const electronApi = typeof window !== 'undefined' ? (window as any)?.electronAPI : null;

      if (electronApi?.s3SyncAll) {
        const res = await electronApi.s3SyncAll({
          config: this.config,
          jobs,
          queue,
          profile,
          masterResume,
          careerWatchlist: careerWatchlist || [],
        });

        if (!res.success) {
          throw new Error(res.error || 'S3 native sync failed');
        }

        this.setStatus('synced');
        console.log(`[S3Sync] Successfully synced all data (${jobs.length} jobs) via Native Desktop Bridge to S3 bucket '${this.config.bucket}'.`);
        return true;
      }

      // 2. Dev Server Proxy Fallback (Vite Node.js Proxy when running in browser)
      if (typeof window !== 'undefined') {
        try {
          const proxyRes = await fetch('/api/s3-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: this.config, jobs, queue, profile, masterResume }),
          });
          if (proxyRes.ok) {
            const proxyData = await proxyRes.json();
            if (proxyData.success) {
              this.setStatus('synced');
              console.log(`[S3Sync] Successfully synced all data (${jobs.length} jobs) via Dev Server Proxy to S3 bucket '${this.config.bucket}'.`);
              return true;
            } else {
              throw new Error(proxyData.error || 'Dev server proxy S3 sync failed');
            }
          }
        } catch (proxyErr: any) {
          if (!proxyErr.message.includes('404') && !proxyErr.message.includes('Failed to fetch')) {
            throw proxyErr;
          }
        }
      }

      // 3. Direct AWS SDK Fallback
      await this.putObject('data/jobs.json', JSON.stringify(jobs, null, 2), 'application/json');
      await this.putObject('data/queue.json', JSON.stringify(queue, null, 2), 'application/json');
      await this.putObject('data/profile.json', JSON.stringify(profile, null, 2), 'application/json');
      await this.putObject('data/master_resume.md', masterResume, 'text/markdown');

      const backupPayload = {
        jobs,
        queue,
        profile,
        masterResume,
        syncedAt: new Date().toISOString(),
      };
      await this.putObject('data/backup_latest.json', JSON.stringify(backupPayload, null, 2), 'application/json');

      this.setStatus('synced');
      console.log(`[S3Sync] Successfully synced all jobs (${jobs.length}) and assets to S3 bucket '${this.config.bucket}'.`);
      return true;
    } catch (err: any) {
      const errMsg = err.message === 'Failed to fetch'
        ? 'Direct browser CORS blocked by AWS S3. Run via JobRadar Desktop App or configure S3 bucket CORS.'
        : err.message;
      console.error('[S3Sync] Error syncing data to S3:', errMsg);
      this.setStatus('error', errMsg);
      return false;
    }
  }

  /**
   * Tests connection and write permissions to an AWS S3 bucket.
   * Enables SaaS users to test their own custom bucket name and credentials in 1 click.
   */
  public async testConnection(customConfig?: Partial<IS3Config>): Promise<{ success: boolean; message: string }> {
    const configToTest: IS3Config = { ...this.config, ...customConfig };
    if (!configToTest.bucket || !configToTest.accessKeyId || !configToTest.secretAccessKey) {
      return { success: false, message: 'Please enter Bucket Name, Access Key ID, and Secret Access Key.' };
    }

    try {
      const payload = {
        test: true,
        timestamp: new Date().toISOString(),
        testedBucket: configToTest.bucket,
        app: 'JobRadar SaaS Engine',
      };

      const electronApi = typeof window !== 'undefined' ? (window as any)?.electronAPI : null;
      if (electronApi?.s3PutObject) {
        const res = await electronApi.s3PutObject({
          config: configToTest,
          key: 'data/connection_test.json',
          body: JSON.stringify(payload, null, 2),
          contentType: 'application/json',
        });
        if (res.success) {
          return { success: true, message: `Successfully connected and verified write permissions for S3 bucket '${configToTest.bucket}'!` };
        }
        return { success: false, message: res.error || 'Connection failed.' };
      }

      const tempClient = new S3Client({
        region: configToTest.region || 'us-east-1',
        credentials: {
          accessKeyId: configToTest.accessKeyId,
          secretAccessKey: configToTest.secretAccessKey,
        },
      });

      const command = new PutObjectCommand({
        Bucket: configToTest.bucket,
        Key: 'data/connection_test.json',
        Body: new TextEncoder().encode(JSON.stringify(payload, null, 2)),
        ContentType: 'application/json',
      });

      await tempClient.send(command);
      return { success: true, message: `Successfully connected and verified write permissions for S3 bucket '${configToTest.bucket}'!` };
    } catch (err: any) {
      return { success: false, message: `S3 Error: ${err.message}` };
    }
  }

  /**
   * Upload an ATS PDF Resume directly to S3 under `resumes/[filename].pdf`.
   */
  public async uploadResumePdf(filename: string, pdfBytes: Uint8Array): Promise<string | null> {
    try {
      const s3Key = `resumes/${filename}`;
      const url = await this.putObject(s3Key, pdfBytes, 'application/pdf');
      console.log(`[S3Sync] Uploaded ATS PDF Resume to S3: ${s3Key}`);
      return url;
    } catch (err: any) {
      console.warn(`[S3Sync] Could not upload PDF to S3: ${err.message}`);
      return null;
    }
  }

  /**
   * Pulls the latest jobs and profile data from S3 if present.
   */
  public async pullFromS3(): Promise<{ jobs?: IJob[]; queue?: IRawQueueItem[]; profile?: IProfile; masterResume?: string } | null> {
    const electronApi = typeof window !== 'undefined' ? (window as any)?.electronAPI : null;

    if (electronApi?.s3PullAll) {
      const res = await electronApi.s3PullAll({ config: this.config });
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    }

    // Dev Server Proxy Fallback
    if (typeof window !== 'undefined') {
      try {
        const proxyRes = await fetch('/api/s3-pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: this.config }),
        });
        if (proxyRes.ok) {
          const proxyData = await proxyRes.json();
          if (proxyData.success && proxyData.data) {
            return proxyData.data;
          }
        }
      } catch {
        // Fall through to direct SDK
      }
    }

    if (!this.client) return null;
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: 'data/backup_latest.json',
      });
      const response = await this.client.send(command);
      if (response.Body) {
        const text = await response.Body.transformToString();
        return JSON.parse(text);
      }
      return null;
    } catch (err: any) {
      console.warn(`[S3Sync] Could not pull from S3: ${err.message}`);
      return null;
    }
  }
}

export const s3Cloud = new S3CloudService();
