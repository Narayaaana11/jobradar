import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env';

export class S3Service {
  private s3Client: S3Client | null = null;
  private localFallbackDir = path.resolve(process.cwd(), 'data_s3_fallback');

  constructor() {
    if (ENV.AWS_ACCESS_KEY_ID && ENV.AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new S3Client({
        region: ENV.AWS_REGION,
        credentials: {
          accessKeyId: ENV.AWS_ACCESS_KEY_ID,
          secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
        },
      });
    }

    if (!fs.existsSync(this.localFallbackDir)) {
      fs.mkdirSync(this.localFallbackDir, { recursive: true });
    }
  }

  /**
   * Delete a single object by key from S3 or local fallback.
   */
  public async deleteKey(key: string): Promise<boolean> {
    const bucketName = ENV.AWS_S3_BUCKET || 'jobsprep';
    if (this.s3Client) {
      try {
        await this.s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
      } catch (e: any) {}
    }
    const safeFileName = key.replace(/[/\\]/g, '_');
    const localPath = path.join(this.localFallbackDir, safeFileName);
    if (fs.existsSync(localPath)) {
      try { fs.unlinkSync(localPath); } catch (e: any) {}
    }
    return true;
  }

  /**
   * Delete all objects under a prefix or entire bucket.
   */
  public async deleteAllObjects(): Promise<{ deletedCount: number }> {
    const bucketName = ENV.AWS_S3_BUCKET || 'jobsprep';
    let totalDeleted = 0;

    if (this.s3Client) {
      try {
        let continuationToken: string | undefined = undefined;
        do {
          const listCmd = new ListObjectsV2Command({
            Bucket: bucketName,
            ContinuationToken: continuationToken,
          });
          const listRes: any = await this.s3Client.send(listCmd);
          const objects = listRes.Contents || [];
          if (objects.length > 0) {
            const delCmd = new DeleteObjectsCommand({
              Bucket: bucketName,
              Delete: {
                Objects: objects.map((o: any) => ({ Key: o.Key })),
                Quiet: true,
              },
            });
            await this.s3Client.send(delCmd);
            totalDeleted += objects.length;
          }
          continuationToken = listRes.NextContinuationToken;
        } while (continuationToken);
      } catch (err: any) {
        console.warn('[S3Service] Error during AWS S3 purge:', err.message);
      }
    }

    // Clear local fallback directory files
    if (fs.existsSync(this.localFallbackDir)) {
      try {
        const files = fs.readdirSync(this.localFallbackDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.localFallbackDir, file));
        }
      } catch (e: any) {}
    }

    console.log(`[S3Service] Purged ${totalDeleted} object(s) from AWS S3 '${bucketName}' and cleared local fallback.`);
    return { deletedCount: totalDeleted };
  }

  /**
   * Upload a file to S3. Supports both string (JSON/text) and Buffer (binary PDF) content.
   * For PDF/binary files, pass a Buffer directly — never convert to base64 string.
   */
  public async uploadFile(key: string, content: string | Buffer, contentType: string = 'text/markdown'): Promise<string> {
    const bucketName = ENV.AWS_S3_BUCKET || 'jobsprep';

    // Prepare body: if string content, convert to Buffer for consistency
    const body: Buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

    if (this.s3Client) {
      try {
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Make object publicly readable if it's a PDF resume
          ...(contentType === 'application/pdf' ? {} : {}),
        });

        await this.s3Client.send(command);
        const url = `https://${bucketName}.s3.${ENV.AWS_REGION}.amazonaws.com/${key}`;
        console.log(`[S3Service] Uploaded to AWS S3 '${bucketName}/${key}' (${body.length} bytes, ${contentType})`);
        return url;
      } catch (error: any) {
        console.warn(`[S3Service] AWS S3 upload error (${error.message}). Saving to local fallback.`);
      }
    }

    // Local file fallback
    const safeFileName = key.replace(/[/\\]/g, '_');
    const localPath = path.join(this.localFallbackDir, safeFileName);
    fs.writeFileSync(localPath, body);
    console.log(`[S3Service] Saved to local fallback: ${localPath}`);
    return `local://${localPath}`;
  }

  public async putJson(key: string, data: any): Promise<string> {
    const jsonStr = JSON.stringify(data, null, 2);
    return this.uploadFile(key, jsonStr, 'application/json');
  }

  public async getJson<T>(key: string): Promise<T | null> {
    const bucketName = ENV.AWS_S3_BUCKET || 'jobsprep';

    if (this.s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
        const response = await this.s3Client.send(command);
        if (response.Body) {
          const bodyStr = await response.Body.transformToString();
          return JSON.parse(bodyStr) as T;
        }
      } catch (err: any) {}
    }

    // Check local fallback
    const safeFileName = key.replace(/[/\\]/g, '_');
    const localPath = path.join(this.localFallbackDir, safeFileName);
    if (fs.existsSync(localPath)) {
      return JSON.parse(fs.readFileSync(localPath, 'utf-8')) as T;
    }

    return null;
  }

  /**
   * Get raw binary Buffer of a stored object (for PDF streaming).
   * Returns null if the object does not exist.
   */
  public async getObjectBuffer(key: string): Promise<Buffer | null> {
    const bucketName = ENV.AWS_S3_BUCKET || 'jobsprep';

    if (this.s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
        const response = await this.s3Client.send(command);
        if (response.Body) {
          const byteArray = await response.Body.transformToByteArray();
          return Buffer.from(byteArray);
        }
      } catch (err: any) {
        console.warn(`[S3Service] getObjectBuffer failed for key '${key}':`, err.message);
      }
    }

    // Check local fallback
    const safeFileName = key.replace(/[/\\]/g, '_');
    const localPath = path.join(this.localFallbackDir, safeFileName);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }
    return null;
  }

  public async listKeys(prefix: string): Promise<string[]> {
    const bucketName = ENV.AWS_S3_BUCKET || 'jobsprep';

    if (this.s3Client) {
      try {
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
        });
        const response = await this.s3Client.send(command);
        return (response.Contents || []).map((obj) => obj.Key || '').filter(Boolean);
      } catch (err: any) {}
    }

    // Local fallback list
    const files = fs.readdirSync(this.localFallbackDir);
    const prefixSafe = prefix.replace(/\//g, '_');
    return files
      .filter((f) => f.startsWith(prefixSafe))
      .map((f) => f.replace(/_/g, '/').replace(/^resumes\//, 'resumes/'));
  }

  /**
   * Check if a key exists in S3 or local fallback.
   */
  public async exists(key: string): Promise<boolean> {
    const buf = await this.getObjectBuffer(key);
    return buf !== null;
  }
}

export const s3Service = new S3Service();
