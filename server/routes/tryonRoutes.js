import express from 'express';
import multer from 'multer';
import { jobManager } from '../services/jobManager.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

/**
 * POST /api/tryon - Submit asynchronous Virtual Saree Try-On Job
 */
router.post(
  '/',
  upload.fields([
    { name: 'person_image', maxCount: 1 },
    { name: 'garment_image', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const personFile = req.files?.person_image?.[0];
      const garmentFile = req.files?.garment_image?.[0];
      const {
        garment_url,
        try_on_image_url,
        garment_name,
        category,
        model_preference,
        drape_style,
        denoise_steps,
        seed
      } = req.body;

      if (!personFile) {
        return res.status(400).json({
          success: false,
          message: 'person_image is required (multipart file)'
        });
      }

      // Prioritize clean try_on_image_url without background if available
      const garmentTarget = garmentFile ? garmentFile.buffer : (try_on_image_url || garment_url);
      if (!garmentTarget) {
        return res.status(400).json({
          success: false,
          message: 'Either garment_image (file) or garment_url/try_on_image_url (string) must be provided'
        });
      }

      console.log(`[POST /api/tryon]: Creating job for '${garment_name || 'Selected Saree'}' (${category || 'saree'}, model: ${model_preference || 'auto'}, drape: ${drape_style || 'Nivi'})`);

      const jobId = jobManager.createJob({
        personBuffer: personFile.buffer,
        garmentPathOrUrl: garmentTarget,
        garmentName: garment_name || 'Traditional Silk Saree',
        category: category || 'saree',
        modelPreference: model_preference || 'auto',
        drapeStyle: drape_style || 'Nivi',
        denoiseSteps: Number(denoise_steps) || 30,
        seed: seed !== undefined && seed !== null && seed !== '' ? Number(seed) : Math.floor(Math.random() * 999999)
      });

      return res.status(202).json({
        success: true,
        jobId,
        status: 'queued',
        message: 'Virtual try-on job submitted successfully. Please poll /api/tryon/:jobId for progress.'
      });
    } catch (error) {
      console.error('[POST /api/tryon error]:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to initialize try-on job.',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/tryon/:jobId - Poll Status of Try-On Job
 */
router.get('/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job not found or has expired (10-minute session TTL).'
    });
  }

  return res.json({
    success: true,
    jobId: job.id,
    status: job.status,
    garment_name: job.garmentName,
    provider: job.provider || null,
    result_image_url: job.result_image_url,
    error: job.error,
    elapsedMs: job.elapsedMs
  });
});

/**
 * DELETE /api/tryon/:jobId - Cancel an Active Job
 */
router.delete('/:jobId', (req, res) => {
  const { jobId } = req.params;
  const cancelled = jobManager.cancelJob(jobId);

  return res.json({
    success: true,
    message: cancelled ? `Job ${jobId} was cancelled.` : `Job ${jobId} was not found.`
  });
});

export default router;
