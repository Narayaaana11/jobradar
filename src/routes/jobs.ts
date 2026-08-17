import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { jobRepository } from '../repositories/jobRepository';
import { s3Service } from '../services/s3Service';
import { generateTailoredResume } from '../services/resumeTailorAgent';

const router = Router();

// GET /api/jobs — SQL Paginated & Filtered Feed
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '100', 10);
    const search = (req.query.search as string) || '';
    const approvalStatus = (req.query.approvalStatus as string) || '';
    const applicationStatus = (req.query.applicationStatus as string) || '';
    const skillFilter = (req.query.skillFilter as string) || '';

    const result = await jobRepository.getPaginatedJobs({
      page,
      limit,
      search,
      approvalStatus,
      applicationStatus,
      skillFilter,
    });

    res.json(result.jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/jobs/analytics — Application Funnel Stats & Conversion Rates
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const paginated = await jobRepository.getPaginatedJobs({ page: 1, limit: 1000 });
    const jobs = paginated.jobs || [];
    const totalTracked = jobs.length;
    const pendingApproval = jobs.filter(j => j.approvalStatus === 'pending').length;
    const approvedJobs = jobs.filter(j => j.approvalStatus === 'approved').length;
    const appliedJobs = jobs.filter(j => j.applicationStatus === 'applied' || j.applicationStatus === 'interview').length;
    const interviewingJobs = jobs.filter(j => j.applicationStatus === 'interview').length;
    const rejectedJobs = jobs.filter(j => j.applicationStatus === 'rejected').length;
    const highMatchJobs = jobs.filter(j => j.matchScore >= 80).length;
    const avgMatchScore = totalTracked > 0 ? Math.round(jobs.reduce((acc, j) => acc + j.matchScore, 0) / totalTracked) : 0;
    const responseRatePct = appliedJobs > 0 ? Math.round((interviewingJobs / appliedJobs) * 100) : 0;

    res.json({
      totalTracked,
      pendingApproval,
      approvedJobs,
      appliedJobs,
      interviewingJobs,
      rejectedJobs,
      highMatchJobs,
      avgMatchScore,
      responseRatePct,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/jobs/notifications — Retrieve High-Match Alerts
router.get('/notifications', (req: Request, res: Response) => {
  try {
    const { notificationService } = require('../services/notificationService');
    res.json(notificationService.getNotifications());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jobs/:id/download-resume
 * Streams the tailored ATS PDF directly from S3 or generates it on-demand.
 * Never returns an S3 redirect (no AccessDenied errors).
 */
router.get('/:id/download-resume', async (req: Request, res: Response) => {
  try {
    const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = await jobRepository.findById(jobId);
    if (!job) return res.status(404).send('Job not found');

    const cleanSlug = (str: string) => str.replace(/[^\w]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    const cleanCompany = cleanSlug(job.companyName || 'Company');
    const cleanRole = cleanSlug(job.jobTitle || 'Role');
    const filename = `Narayana_Thota_${cleanRole}_${cleanCompany}.pdf`;
    
    // Extract key from job.resumeVersionUrl if available
    let s3Key = `resumes/${filename}`;
    if (job.resumeVersionUrl && job.resumeVersionUrl.includes('resumes/')) {
      s3Key = `resumes/` + job.resumeVersionUrl.split('resumes/')[1];
    }

    // 1. Try to get from S3 as raw binary buffer
    let buffer = await s3Service.getObjectBuffer(s3Key);

    // 2. If not in S3, check local resumes directory
    if (!buffer) {
      const localPath = path.resolve(process.cwd(), 'resumes', filename);
      if (fs.existsSync(localPath)) {
        buffer = fs.readFileSync(localPath);
        console.log(`[DownloadResume] Serving from local file: ${localPath}`);
      }
    }

    // 3. If still not found, generate it on-demand
    if (!buffer || buffer.length < 100) {
      console.log(`[DownloadResume] PDF not found for ${filename}. Generating on-demand...`);
      try {
        const resumeResult = await generateTailoredResume(job, job.gapAnalysis || {});
        // Try to get the newly generated PDF
        buffer = await s3Service.getObjectBuffer(s3Key);
        // Also check local
        const localPath = path.resolve(process.cwd(), 'resumes', filename);
        if ((!buffer || buffer.length < 100) && fs.existsSync(localPath)) {
          buffer = fs.readFileSync(localPath);
        }
      } catch (genErr: any) {
        console.warn(`[DownloadResume] On-demand generation failed:`, genErr.message);
      }
    }

    // 4. If we have a valid PDF buffer, stream it
    if (buffer && buffer.length > 100) {
      // Verify it starts with PDF magic bytes or is at least non-empty
      const isPdf = buffer.slice(0, 4).toString('ascii') === '%PDF';
      if (isPdf || buffer.length > 1000) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        return res.send(buffer);
      }
    }

    // 5. Final fallback: Generate a minimal valid PDF with resume text
    console.warn(`[DownloadResume] Generating minimal fallback PDF for ${filename}`);
    const fallbackPdf = generateMinimalPdf(job.jobTitle, job.companyName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(fallbackPdf);

  } catch (error: any) {
    console.error('[DownloadResume] Error:', error.message);
    res.status(500).send(`Error serving PDF: ${error.message}`);
  }
});

/**
 * Generate a minimal valid PDF buffer with basic info.
 * Used only as a last resort fallback.
 */
function generateMinimalPdf(jobTitle: string, company: string): Buffer {
  const text = `Narayana Thota - ATS Tailored Resume for ${jobTitle || 'Software Engineer'} at ${company || 'Company'} | Please regenerate via the pipeline.`;
  const content = `BT /F1 12 Tf 50 700 Td (${text.replace(/[()\\]/g, ' ')}) Tj ET`;
  const pdfStr = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length ${content.length}>>stream
${content}
endstream endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000345 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
${400 + content.length}
%%EOF`;
  return Buffer.from(pdfStr, 'utf-8');
}

// GET /api/jobs/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = await jobRepository.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/jobs/:id/approval
router.patch('/:id/approval', async (req: Request, res: Response) => {
  try {
    const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { approvalStatus } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ error: 'Invalid approvalStatus value' });
    }

    const updatedJob = await jobRepository.updateApprovalStatus(jobId, approvalStatus);
    if (!updatedJob) return res.status(404).json({ error: 'Job not found' });

    res.json(updatedJob);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/jobs/:id/application
router.patch('/:id/application', async (req: Request, res: Response) => {
  try {
    const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { applicationStatus } = req.body;
    const validStatuses = ['not_applied', 'referral_pending', 'applied', 'interview', 'rejected'];
    if (!validStatuses.includes(applicationStatus)) {
      return res.status(400).json({ error: 'Invalid applicationStatus value' });
    }
    const updatedJob = await jobRepository.updateApplicationStatus(jobId, applicationStatus);
    if (!updatedJob) return res.status(404).json({ error: 'Job not found' });

    res.json(updatedJob);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/jobs/:id/stage — Update career-ops lifecycle stage
router.post('/:id/stage', async (req: Request, res: Response) => {
  try {
    const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { stage } = req.body;
    const validStages = ['discovered', 'classified', 'scored', 'tailored', 'pending_approval', 'applying', 'applied', 'interviewing', 'offered', 'rejected'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: 'Invalid stage value' });
    }

    const job = await jobRepository.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    job.stage = stage as any;
    if (stage === 'applied') {
      job.applicationStatus = 'applied';
    } else if (stage === 'interviewing') {
      job.applicationStatus = 'interview';
    } else if (stage === 'rejected') {
      job.applicationStatus = 'rejected';
    }
    if (typeof job.save === 'function') await job.save();

    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/jobs/:id/ats-report — Retrieve Resume-Matcher ATS keyword analysis
router.get('/:id/ats-report', async (req: Request, res: Response) => {
  try {
    const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = await jobRepository.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const { AtsMatcherService } = require('../services/atsMatcherService');
    const atsReport = job.atsAnalysis || AtsMatcherService.analyzeAtsMatch(job.rawDescription, job.skillsRequired || []);

    res.json({
      jobId: job.id,
      companyName: job.companyName,
      jobTitle: job.jobTitle,
      atsReport,
      rubricScores: job.rubricScores || {
        skillsScore: 3.8,
        techStackScore: 4.0,
        experienceScore: 3.5,
        locationScore: 4.0,
        compensationScore: 3.5,
        overallRubricRating: 3.8
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/jobs/:id/auto-apply — Launch Playwright Auto-Form Pre-fill Helper (AIHawk Engine)
router.post('/:id/auto-apply', async (req: Request, res: Response) => {
  try {
    const { AutoApplyService } = require('../services/autoApplyService');
    const autoApplyService = new AutoApplyService();
    const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = await jobRepository.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const result = await autoApplyService.prefillApplication(job);
    job.stage = 'applying';
    if (job.autoApplyDetails) {
      job.autoApplyDetails.fieldsFilled = result.fieldsFilled;
      job.autoApplyDetails.prefillScreenshot = result.screenshotPath;
      job.autoApplyDetails.status = 'prefilled';
    }
    if (typeof job.save === 'function') await job.save();

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
