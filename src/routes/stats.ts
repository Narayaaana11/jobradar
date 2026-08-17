import { Router, Request, Response } from 'express';
import { jobRepository } from '../repositories/jobRepository';
import { rawQueueRepository } from '../repositories/rawQueueRepository';

const router = Router();

// GET /api/stats
router.get('/', async (req: Request, res: Response) => {
  try {
    const jobStats = await jobRepository.getStats();
    const unprocessedQueue = await rawQueueRepository.countUnprocessed();

    res.json({
      ...jobStats,
      unprocessedQueue,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
