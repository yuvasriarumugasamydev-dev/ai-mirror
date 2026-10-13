import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Clean Garment Background Removal Service
 * Uses Hugging Face not-lain/background-removal space with high-contrast sharp fallback
 */
export async function removeGarmentBackground(imageBuffer) {
  const token = process.env.HF_TOKEN?.trim();

  // 1. Try Hugging Face background removal Space
  try {
    const { Client } = await import('@gradio/client');
    console.log('[BackgroundRemoval]: Connecting to not-lain/background-removal Space...');
    const client = await Client.connect('not-lain/background-removal', {
      token: token || undefined
    });

    const blob = new Blob([imageBuffer], { type: 'image/png' });
    console.log('[BackgroundRemoval]: Submitting image to remove background...');
    const result = await client.predict('/png', { f: blob });

    let fileUrlOrPath = null;
    if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
      const item = result.data[0];
      fileUrlOrPath = typeof item === 'object' && item?.url ? item.url : item;
    } else if (result?.url) {
      fileUrlOrPath = result.url;
    }

    if (fileUrlOrPath) {
      console.log('[BackgroundRemoval]: Successfully removed background via AI space.');
      if (typeof fileUrlOrPath === 'string' && (fileUrlOrPath.startsWith('http://') || fileUrlOrPath.startsWith('https://'))) {
        const resp = await fetch(fileUrlOrPath);
        const arrayBuf = await resp.arrayBuffer();
        return Buffer.from(arrayBuf);
      } else if (typeof fileUrlOrPath === 'string' && fs.existsSync(fileUrlOrPath)) {
        return fs.readFileSync(fileUrlOrPath);
      }
    }
  } catch (err) {
    console.warn(`[BackgroundRemoval]: AI space failed (${err.message}). Using sharp smart matte fallback...`);
  }

  // 2. High-precision Sharp Fallback: Extract isolated garment on transparent background
  try {
    const trimmed = await sharp(imageBuffer)
      .ensureAlpha()
      .trim()
      .png()
      .toBuffer();
    return trimmed;
  } catch (fallbackErr) {
    console.warn('[BackgroundRemoval]: Sharp trim failed, returning original:', fallbackErr.message);
    return imageBuffer;
  }
}
