import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

function s3DevProxyPlugin(): Plugin {
  return {
    name: 's3-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/s3-sync', async (req, res) => {
        if (req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => (bodyStr += chunk));
          req.on('end', async () => {
            try {
              const { config, jobs, queue, profile, masterResume } = JSON.parse(bodyStr);
              const client = new S3Client({
                region: config.region || 'us-east-1',
                credentials: {
                  accessKeyId: config.accessKeyId,
                  secretAccessKey: config.secretAccessKey,
                },
              });

              // 1. data/jobs.json
              await client.send(new PutObjectCommand({
                Bucket: config.bucket,
                Key: 'data/jobs.json',
                Body: Buffer.from(JSON.stringify(jobs, null, 2), 'utf-8'),
                ContentType: 'application/json',
              }));

              // 2. data/queue.json
              await client.send(new PutObjectCommand({
                Bucket: config.bucket,
                Key: 'data/queue.json',
                Body: Buffer.from(JSON.stringify(queue, null, 2), 'utf-8'),
                ContentType: 'application/json',
              }));

              // 3. data/profile.json & data/master_resume.md
              await client.send(new PutObjectCommand({
                Bucket: config.bucket,
                Key: 'data/profile.json',
                Body: Buffer.from(JSON.stringify(profile, null, 2), 'utf-8'),
                ContentType: 'application/json',
              }));

              await client.send(new PutObjectCommand({
                Bucket: config.bucket,
                Key: 'data/master_resume.md',
                Body: Buffer.from(masterResume || '', 'utf-8'),
                ContentType: 'text/markdown',
              }));

              // 4. data/backup_latest.json
              const backupPayload = {
                jobs,
                queue,
                profile,
                masterResume,
                syncedAt: new Date().toISOString(),
              };
              await client.send(new PutObjectCommand({
                Bucket: config.bucket,
                Key: 'data/backup_latest.json',
                Body: Buffer.from(JSON.stringify(backupPayload, null, 2), 'utf-8'),
                ContentType: 'application/json',
              }));

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end();
        }
      });

      server.middlewares.use('/api/s3-pull', async (req, res) => {
        if (req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => (bodyStr += chunk));
          req.on('end', async () => {
            try {
              const { config } = JSON.parse(bodyStr);
              const client = new S3Client({
                region: config.region || 'us-east-1',
                credentials: {
                  accessKeyId: config.accessKeyId,
                  secretAccessKey: config.secretAccessKey,
                },
              });

              const command = new GetObjectCommand({
                Bucket: config.bucket,
                Key: 'data/backup_latest.json',
              });

              const response = await client.send(command);
              const text = await response.Body?.transformToString();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, data: text ? JSON.parse(text) : null }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), s3DevProxyPlugin()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
