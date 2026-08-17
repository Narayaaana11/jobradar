import { Router, Request, Response } from 'express';
import { rawQueueRepository } from '../repositories/rawQueueRepository';
import { processQueueItem } from '../services/pipelineProcessor';
import { ingestWebUrlOrText } from '../services/webScraperService';
import { splitBulkChatText } from '../services/bulkSplitterAgent';

const router = Router();

// GET /api/queue/status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const unprocessed = await rawQueueRepository.countUnprocessed();
    const processedTotal = await rawQueueRepository.countProcessed();

    res.json({
      unprocessed,
      processedTotal,
      errorsCount: 0,
      recentErrors: [],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/queue/ingest-url
router.post('/ingest-url', async (req: Request, res: Response) => {
  try {
    const { urlOrText, channelName } = req.body;
    if (!urlOrText || typeof urlOrText !== 'string') {
      return res.status(400).json({ error: 'urlOrText string field is required' });
    }

    const item = await ingestWebUrlOrText(urlOrText, channelName || 'Web Page Ingest');
    res.json({ message: 'Ingestion initiated', queueItem: item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/queue/ingest-bulk-text (Bulk WhatsApp Chat Ingestion)
router.post('/ingest-bulk-text', async (req: Request, res: Response) => {
  try {
    const { bulkText, channelName } = req.body;
    if (!bulkText || typeof bulkText !== 'string') {
      return res.status(400).json({ error: 'bulkText string field is required' });
    }

    // 1. Split bulk dump into individual job post strings using AI Agent
    const posts = await splitBulkChatText(bulkText);
    const sourceTag = channelName || 'WhatsApp Bulk Ingest';

    const queueItems = [];
    for (let i = 0; i < posts.length; i++) {
      const postText = posts[i];
      const item = await rawQueueRepository.create({
        platform: 'whatsapp_manual',
        channelName: sourceTag,
        rawMessageId: `wa-bulk-${Date.now()}-${i + 1}`,
        rawText: postText,
        processed: false,
      });
      queueItems.push(item);

      // Asynchronously process in background pipeline
      processQueueItem(item).catch((err) =>
        console.error(`[BulkIngest] Error processing bulk item ${item.id}:`, err.message)
      );
    }

    res.json({
      message: `Successfully analyzed bulk text and queued ${queueItems.length} distinct job posts.`,
      extractedCount: queueItems.length,
      queueItems,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/queue/reprocess/:id
router.post('/reprocess/:id', async (req: Request, res: Response) => {
  try {
    const queueId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const item = await rawQueueRepository.findById(queueId);
    if (!item) return res.status(404).json({ error: 'Queue item not found' });

    await processQueueItem(item);

    res.json({ message: 'Reprocess triggered successfully', item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
