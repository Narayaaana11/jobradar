import sql from 'mssql';
import { getMSSQLPool } from '../config/mssql';
import { s3Service } from '../services/s3Service';

export interface IRawQueueItem {
  id: string;
  platform: string;
  channelName: string;
  rawMessageId: string;
  rawText: string;
  rawHtml?: string | null;
  receivedAt: Date;
  processed: boolean;
  retryCount: number;
  classifierResult?: any | null;
  processingError?: string | null;
  createdAt: Date;
}

const memoryQueueStore: Map<string, IRawQueueItem> = new Map();
let isQueueSynced = false;

export class RawQueueRepository {
  private async ensureSynced(): Promise<void> {
    if (isQueueSynced && memoryQueueStore.size > 0) return;

    try {
      const keys = await s3Service.listKeys('queue/');
      for (const key of keys) {
        if (!key.endsWith('.json')) continue;
        const item = await s3Service.getJson<IRawQueueItem>(key);
        if (item && item.id) {
          memoryQueueStore.set(item.id, item);
        }
      }
      isQueueSynced = true;
      console.log(`[RawQueueRepository] Synced ${memoryQueueStore.size} queue items from S3 datastore.`);
    } catch (e: any) {
      console.warn(`[RawQueueRepository] S3 Sync Warning:`, e.message);
    }
  }

  public async create(data: {
    platform: string;
    channelName: string;
    rawMessageId: string;
    rawText: string;
    rawHtml?: string | null;
    processed?: boolean;
  }): Promise<IRawQueueItem> {
    await this.ensureSynced();
    const id = `rq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const item: IRawQueueItem = {
      id,
      platform: data.platform || 'telegram',
      channelName: data.channelName,
      rawMessageId: data.rawMessageId,
      rawText: data.rawText,
      rawHtml: data.rawHtml || null,
      receivedAt: now,
      processed: Boolean(data.processed),
      retryCount: 0,
      classifierResult: null,
      processingError: null,
      createdAt: now,
    };

    // Save to S3 Datastore (s3://jobsprep/queue/rq_xxx.json)
    await s3Service.putJson(`queue/${id}.json`, item);
    memoryQueueStore.set(id, item);

    try {
      const pool = await getMSSQLPool();
      if (pool) {
        const request = pool.request();
        request.input('id', sql.NVarChar(50), id);
        request.input('platform', sql.NVarChar(50), item.platform);
        request.input('channelName', sql.NVarChar(150), item.channelName);
        request.input('rawMessageId', sql.NVarChar(150), item.rawMessageId);
        request.input('rawText', sql.NVarChar(sql.MAX), item.rawText);
        request.input('rawHtml', sql.NVarChar(sql.MAX), item.rawHtml);
        request.input('processed', sql.Bit, item.processed ? 1 : 0);

        await request.query(`
          INSERT INTO RawQueue (id, platform, channelName, rawMessageId, rawText, rawHtml, processed, receivedAt, createdAt)
          VALUES (@id, @platform, @channelName, @rawMessageId, @rawText, @rawHtml, @processed, SYSDATETIME(), SYSDATETIME());
        `);
      }
    } catch (e) {}

    return item;
  }

  public async findById(id: string): Promise<IRawQueueItem | null> {
    await this.ensureSynced();
    if (memoryQueueStore.has(id)) {
      return memoryQueueStore.get(id)!;
    }
    const item = await s3Service.getJson<IRawQueueItem>(`queue/${id}.json`);
    if (item) {
      memoryQueueStore.set(id, item);
      return item;
    }

    return null;
  }

  public async findUnprocessed(limit: number = 10): Promise<IRawQueueItem[]> {
    await this.ensureSynced();
    try {
      const pool = await getMSSQLPool();
      if (pool) {
        const request = pool.request();
        request.input('limit', sql.Int, limit);
        const result = await request.query('SELECT TOP (@limit) * FROM RawQueue WHERE processed = 0 ORDER BY createdAt ASC');
        return result.recordset.map((row) => this.mapRow(row));
      }
    } catch (e) {}

    const unprocessed = Array.from(memoryQueueStore.values()).filter((item) => !item.processed);
    return unprocessed.slice(0, limit);
  }

  public async markProcessed(id: string, classifierResult?: any): Promise<void> {
    const item = await this.findById(id);
    if (item) {
      item.processed = true;
      item.classifierResult = classifierResult || null;
      await s3Service.putJson(`queue/${id}.json`, item);
      memoryQueueStore.set(id, item);
    }

    try {
      const pool = await getMSSQLPool();
      if (pool) {
        const request = pool.request();
        request.input('id', sql.NVarChar(50), id);
        request.input('classifierResult', sql.NVarChar(sql.MAX), classifierResult ? JSON.stringify(classifierResult) : null);
        await request.query('UPDATE RawQueue SET processed = 1, classifierResult = @classifierResult WHERE id = @id');
      }
    } catch (e) {}
  }

  public async updateError(id: string, errorMsg: string): Promise<void> {
    const item = await this.findById(id);
    if (item) {
      item.retryCount += 1;
      item.processingError = errorMsg;
      await s3Service.putJson(`queue/${id}.json`, item);
      memoryQueueStore.set(id, item);
    }

    try {
      const pool = await getMSSQLPool();
      if (pool) {
        const request = pool.request();
        request.input('id', sql.NVarChar(50), id);
        request.input('error', sql.NVarChar(sql.MAX), errorMsg);
        await request.query('UPDATE RawQueue SET retryCount = retryCount + 1, processingError = @error WHERE id = @id');
      }
    } catch (e) {}
  }

  public async countUnprocessed(): Promise<number> {
    await this.ensureSynced();
    try {
      const pool = await getMSSQLPool();
      if (pool) {
        const result = await pool.request().query('SELECT COUNT(*) as cnt FROM RawQueue WHERE processed = 0');
        return result.recordset[0].cnt;
      }
    } catch (e) {}
    return Array.from(memoryQueueStore.values()).filter((i) => !i.processed).length;
  }

  public async countProcessed(): Promise<number> {
    await this.ensureSynced();
    try {
      const pool = await getMSSQLPool();
      if (pool) {
        const result = await pool.request().query('SELECT COUNT(*) as cnt FROM RawQueue WHERE processed = 1');
        return result.recordset[0].cnt;
      }
    } catch (e) {}
    return Array.from(memoryQueueStore.values()).filter((i) => i.processed).length;
  }

  public async getAllQueueItems(): Promise<IRawQueueItem[]> {
    await this.ensureSynced();
    return Array.from(memoryQueueStore.values());
  }

  private mapRow(row: any): IRawQueueItem {
    return {
      id: row.id,
      platform: row.platform,
      channelName: row.channelName,
      rawMessageId: row.rawMessageId,
      rawText: row.rawText,
      rawHtml: row.rawHtml,
      receivedAt: row.receivedAt,
      processed: Boolean(row.processed),
      retryCount: row.retryCount,
      classifierResult: row.classifierResult ? JSON.parse(row.classifierResult) : null,
      processingError: row.processingError,
      createdAt: row.createdAt,
    };
  }
}

export const rawQueueRepository = new RawQueueRepository();
