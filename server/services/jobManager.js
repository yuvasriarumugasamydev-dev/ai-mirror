import { tryOnManager } from './tryonProvider.js';

class TryOnJobManager {
  constructor() {
    this.jobs = new Map();
    this.JOB_TTL_MS = 24 * 60 * 60 * 1000; // Preserved for the entire active session
  }

  createJob({
    personBuffer,
    garmentPathOrUrl,
    garmentName,
    category = 'saree',
    modelPreference = 'auto',
    drapeStyle = 'Nivi',
    denoiseSteps,
    seed
  }) {
    const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const abortController = new AbortController();

    const job = {
      id: jobId,
      status: 'queued', // queued | processing | completed | failed | cancelled
      garmentName: garmentName || 'Selected Saree',
      category,
      modelPreference,
      drapeStyle,
      seed,
      result_image_url: null,
      error: null,
      createdAt: Date.now(),
      abortController
    };

    this.jobs.set(jobId, job);

    // Run job asynchronously in background (non-blocking)
    this._executeJob(jobId, {
      personBuffer,
      garmentPathOrUrl,
      garmentName,
      category,
      modelPreference,
      drapeStyle,
      denoiseSteps,
      seed,
      signal: abortController.signal
    });

    return jobId;
  }

  async _executeJob(jobId, params) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    console.log(`[JobManager]: Job ${jobId} status -> processing`);

    try {
      const { resultUrl, provider } = await tryOnManager.generateTryOn(params);

      // Verify job was not cancelled while processing
      if (job.status === 'cancelled') {
        console.log(`[JobManager]: Job ${jobId} was cancelled before completion.`);
        return;
      }

      job.status = 'completed';
      job.result_image_url = resultUrl;
      job.provider = provider;
      console.log(`[JobManager]: Job ${jobId} status -> completed via ${provider}`);
    } catch (err) {
      if (job.status === 'cancelled') return;
      job.status = 'failed';
      job.error = err.message || 'AI try-on generation failed. Please try again.';
      console.error(`[JobManager]: Job ${jobId} status -> failed: ${job.error}`);
    } finally {
      // Clear sensitive buffer references for customer privacy
      params.personBuffer = null;
      params.garmentPathOrUrl = null;
    }
  }

  getJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      id: job.id,
      status: job.status,
      garmentName: job.garmentName,
      provider: job.provider,
      drapeStyle: job.drapeStyle,
      seed: job.seed,
      result_image_url: job.result_image_url,
      error: job.error,
      elapsedMs: Date.now() - job.createdAt
    };
  }

  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.status = 'cancelled';
    if (job.abortController) {
      job.abortController.abort();
    }
    this.jobs.delete(jobId);
    console.log(`[JobManager]: Job ${jobId} cancelled and removed from queue.`);
    return true;
  }

  cleanupExpiredJobs() {
    const now = Date.now();
    for (const [id, job] of this.jobs.entries()) {
      if (now - job.createdAt > this.JOB_TTL_MS) {
        console.log(`[JobManager]: Purging expired job ${id} (TTL exceeded).`);
        this.jobs.delete(id);
      }
    }
  }
}

export const jobManager = new TryOnJobManager();
