import express from 'express';
import { getSnapshotById } from '../controllers/snapshotController.js';
import { jobManager } from '../services/jobManager.js';

const router = express.Router();

/**
 * Helper to retrieve result image and metadata from either snapshot store or jobManager
 */
function findResult(id) {
  // 1. Check ephemeral snapshot store
  const snap = getSnapshotById(id);
  if (snap) {
    return {
      id: snap.snapshotId || id,
      name: snap.sareeName || 'Designer Saree',
      price: snap.sareePrice || 'Exclusive Collection',
      imageUrl: snap.imageDataUrl || snap.result_image_url || snap.dataUrl,
      station: snap.kioskStation || 'Mirror Station #1',
      date: snap.createdAt ? new Date(snap.createdAt).toLocaleDateString() : 'Today'
    };
  }

  // 2. Check try-on job store
  const job = jobManager.getJob(id);
  if (job && job.result_image_url) {
    return {
      id: job.id,
      name: job.garmentName || 'Virtual Try-On Look',
      price: 'Exclusive Collection',
      imageUrl: job.result_image_url,
      station: 'Mirror Station #1',
      date: 'Today'
    };
  }

  return null;
}

/**
 * GET /results/:id/image - Serve raw image binary for download or direct embedding
 */
router.get('/:id/image', (req, res) => {
  const { id } = req.params;
  const result = findResult(id);

  if (!result || !result.imageUrl) {
    return res.status(404).send('Result image not found or expired.');
  }

  const rawUrl = result.imageUrl;

  // Handle Base64 Data URI
  if (rawUrl.startsWith('data:')) {
    const matches = rawUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    }
  }

  // Handle direct HTTP/HTTPS URL
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return res.redirect(rawUrl);
  }

  return res.status(400).send('Unsupported image format.');
});

/**
 * GET /results/:id - Responsive mobile web landing page for phone camera QR scan
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const result = findResult(id);

  if (!result) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Look Expired | VASTRA AI Mirror</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0B2A5B; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; text-align: center; }
          .card { background: #fff; color: #0B2A5B; border-radius: 20px; padding: 2.5rem 1.5rem; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
          h2 { margin-bottom: 0.5rem; font-size: 1.4rem; }
          p { color: #64748B; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
          .btn { background: #FF7A1A; color: #fff; text-decoration: none; padding: 0.8rem 1.5rem; border-radius: 999px; font-weight: 700; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Look Expired or Not Found</h2>
          <p>This virtual try-on look is no longer active in memory. Please take a new snapshot on the Vastra AI Mirror Kiosk.</p>
          <a href="/" class="btn">Return to Boutique</a>
        </div>
      </body>
      </html>
    `);
  }

  const shareText = encodeURIComponent(`Take a look at my virtual saree drape on VASTRA AI Mirror: ${result.name}!`);
  const currentHost = req.get('host') || 'localhost:5050';
  const protocol = req.protocol;
  const directImageUrl = `${protocol}://${currentHost}/results/${id}/image`;
  const pageUrl = `${protocol}://${currentHost}/results/${id}`;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${result.name} | VASTRA AI Boutique</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #F3F8FF;
          color: #0B2A5B;
          min-height: 100vh;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .container {
          width: 100%;
          max-width: 480px;
          background: #FFFFFF;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(11, 42, 91, 0.12);
          border: 1px solid #DCE6F5;
        }
        .header {
          background: linear-gradient(135deg, #1E5EFF, #0B2A5B);
          color: #fff;
          padding: 1.5rem;
          text-align: center;
        }
        .badge {
          display: inline-block;
          background: rgba(255, 122, 26, 0.95);
          color: #fff;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 0.35rem 0.85rem;
          border-radius: 999px;
          margin-bottom: 0.5rem;
        }
        .title {
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: 0.02em;
        }
        .sub {
          font-size: 0.85rem;
          opacity: 0.85;
          margin-top: 0.2rem;
        }
        .image-box {
          position: relative;
          width: 100%;
          background: #0B2A5B;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 440px;
        }
        .image-box img {
          width: 100%;
          height: auto;
          max-height: 580px;
          object-fit: contain;
          display: block;
        }
        .body {
          padding: 1.5rem;
        }
        .saree-name {
          font-size: 1.2rem;
          font-weight: 800;
          color: #0B2A5B;
          margin-bottom: 0.25rem;
        }
        .saree-price {
          font-size: 1.1rem;
          font-weight: 800;
          color: #1E5EFF;
          margin-bottom: 1.25rem;
        }
        .action-stack {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          padding: 0.95rem;
          border-radius: 999px;
          font-size: 0.95rem;
          font-weight: 700;
          text-decoration: none;
          transition: transform 0.15s ease;
        }
        .btn:active {
          transform: scale(0.98);
        }
        .btn-download {
          background: #FF7A1A;
          color: #fff;
          box-shadow: 0 6px 18px rgba(255, 122, 26, 0.35);
        }
        .btn-whatsapp {
          background: #25D366;
          color: #fff;
          box-shadow: 0 6px 18px rgba(37, 211, 102, 0.35);
        }
        .footer-note {
          text-align: center;
          font-size: 0.78rem;
          color: #8A9EB7;
          margin-top: 1.25rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <span class="badge"><i class="fa-solid fa-sparkles"></i> AI Virtual Try-On</span>
          <h1 class="title">VASTRA BOUTIQUE</h1>
          <p class="sub">Mirror Station #1 &bull; ${result.date}</p>
        </div>

        <div class="image-box">
          <img src="/results/${id}/image" alt="${result.name}">
        </div>

        <div class="body">
          <h2 class="saree-name">${result.name}</h2>
          <div class="saree-price">${result.price}</div>

          <div class="action-stack">
            <a href="/results/${id}/image" download="Vastra_Look_${id}.jpg" class="btn btn-download">
              <i class="fa-solid fa-download"></i> Save High-Res Photo
            </a>
            <a href="https://api.whatsapp.com/send?text=${shareText}%20${encodeURIComponent(pageUrl)}" target="_blank" class="btn btn-whatsapp">
              <i class="fa-brands fa-whatsapp"></i> Share on WhatsApp
            </a>
          </div>

          <p class="footer-note">Captured via Vastra AI Smart Mirror &bull; Ephemeral Session Look</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

export default router;
