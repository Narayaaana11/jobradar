import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { ENV } from './config/env';
import { getMSSQLPool } from './config/mssql';
import { telegramService } from './services/telegramService';
import { processUnprocessedQueue } from './services/pipelineProcessor';

import jobsRouter from './routes/jobs';
import queueRouter from './routes/queue';
import statsRouter from './routes/stats';

async function bootstrap() {
  const mssqlPool = await getMSSQLPool();
  if (mssqlPool) {
    console.log('[Datastore] Hybrid Mode Active: MSSQL + AWS S3 Cloud Bucket');
  } else {
    console.log(`[Datastore] Pure AWS S3 Cloud Mode Active: Bucket '${ENV.AWS_S3_BUCKET || 'jobsprep'}'`);
  }

  const app = express();
  app.use(cors());
  app.use(express.json());

  // REST API Routes
  app.use('/api/jobs', jobsRouter);
  app.use('/api/queue', queueRouter);
  app.use('/api/stats', statsRouter);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start Express Server
  const PORT = Number(ENV.PORT) || 5000;
  app.listen(PORT, () => {
    console.log(`[JobRadar Server] Running on http://localhost:${PORT}`);
  });

  // Start Telegram Bot Poller
  telegramService.init();

  // Schedule Cron Pipeline Worker (Runs every 5 minutes for active polling)
  cron.schedule('*/5 * * * *', () => {
    console.log('[Cron] Triggering pipeline worker cycle...');
    // Use setImmediate to defer processing to next tick, preventing event loop blocking
    setImmediate(() => {
      processUnprocessedQueue(5).catch((e) => console.error('[Cron Error]', e.message));
    });
  });

  // Run initial worker check on startup with 10s delay to let server warm up first
  setTimeout(() => {
    processUnprocessedQueue(3).catch((e) => console.error('[Startup Error]', e.message));
  }, 10000);
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Critical Error]', err);
});
