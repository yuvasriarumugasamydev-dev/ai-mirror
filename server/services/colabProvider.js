import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Google Colab Free GPU Provider
 * 100% FREE | UNLIMITED | HIGH QUALITY
 */
export class ColabGPUProvider {
  getBackendUrl() {
    try {
      const envPath = path.resolve(__dirname, '../.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/(?:COLAB_BACKEND_URL|TRYON_API_URL)\s*=\s*(https?:\/\/[^\r\n#\s]+)/);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    } catch {}
    return (process.env.TRYON_API_URL || process.env.RENDER_BACKEND_URL || process.env.COLAB_BACKEND_URL || '').trim();
  }

  async checkHealth() {
    const backendUrl = this.getBackendUrl();
    if (!backendUrl) return { status: 'no_url' };
    try {
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          'bypass-tunnel-reminder': 'true'
        },
        signal: AbortSignal.timeout(8000)
      });
      
      if (!response.ok) {
        console.warn(`[ColabGPUProvider]: Health check returned status ${response.status}`);
        return { status: 'ok' };
      }
      
      const data = await response.json();
      console.log('[ColabGPUProvider]: Backend is healthy', data);
      return data;
    } catch (err) {
      console.warn('[ColabGPUProvider]: Health check warning:', err.message);
      return { status: 'ok' };
    }
  }

  async generateTryOn({ personBuffer, garmentBuffer, garmentName, drapeStyle = 'Nivi', signal }) {
    const backendUrl = this.getBackendUrl();
    if (!backendUrl) {
      throw new Error('COLAB_BACKEND_URL is not configured in server/.env.');
    }

    // Optional health check (non-blocking)
    try {
      await this.checkHealth();
    } catch (err) {
      console.warn(`[ColabGPUProvider]: Health check warning: ${err.message}. Proceeding to /tryon directly...`);
    }

    if (signal?.aborted) throw new Error('Job was cancelled');

    // Optimize images with sharp (max 1024x1024, quality 85) to ensure ultra-fast transfer over tunnel
    let optPersonBuffer = personBuffer;
    let optGarmentBuffer = garmentBuffer;
    try {
      optPersonBuffer = await sharp(personBuffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (e) {
      console.warn('[ColabGPUProvider]: Person image optimize notice:', e.message);
    }

    try {
      optGarmentBuffer = await sharp(garmentBuffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (e) {
      console.warn('[ColabGPUProvider]: Garment image optimize notice:', e.message);
    }

    // Convert buffers to base64
    const personBase64 = `data:image/jpeg;base64,${optPersonBuffer.toString('base64')}`;
    const garmentBase64 = `data:image/jpeg;base64,${optGarmentBuffer.toString('base64')}`;

    console.log(`[ColabGPUProvider]: Submitting FREE try-on to ${backendUrl}/tryon for '${garmentName}' (${drapeStyle})...`);

    try {
      const response = await fetch(`${backendUrl}/tryon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          'bypass-tunnel-reminder': 'true',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify({
          personImage: personBase64,
          garmentImage: garmentBase64,
          garmentName: garmentName,
          drapeStyle: drapeStyle
        }),
        signal
      });

      if (!response.ok) {
        let errMessage = `HTTP ${response.status}`;
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errJson = await response.json();
            errMessage = errJson.message || errJson.error || JSON.stringify(errJson);
          } else {
            const raw = await response.text();
            if (raw.includes('<title>')) {
              const match = raw.match(/<title>(.*?)<\/title>/i);
              errMessage = match ? match[1] : `HTTP ${response.status} Error`;
            } else {
              errMessage = raw.slice(0, 150);
            }
          }
        } catch {}
        throw new Error(errMessage);
      }

      const contentType = response.headers.get('content-type') || '';
      let rawImageBase64 = null;

      if (contentType.includes('application/json')) {
        const data = await response.json();
        rawImageBase64 = data.resultImage || data.image || data.result_image || (Array.isArray(data.data) ? data.data[0] : null);
        if (!rawImageBase64 && data.status === 'error') {
          throw new Error(data.message || 'Colab backend returned an error');
        }
      } else {
        // Direct image binary response
        const arrayBuf = await response.arrayBuffer();
        rawImageBase64 = `data:image/jpeg;base64,${Buffer.from(arrayBuf).toString('base64')}`;
      }

      if (!rawImageBase64) {
        throw new Error('Colab backend did not return a valid result image');
      }

      console.log('✅ [ColabGPUProvider]: Try-on completed successfully (FREE GPU)!');
      return rawImageBase64;

    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Job was cancelled');
      }
      
      console.error('[ColabGPUProvider]: Error:', err.message, err.cause ? `(Cause: ${err.cause?.message || err.cause?.code})` : '');
      
      if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
        const causeDetail = err.cause?.message || err.cause?.code || '';
        throw new Error(`Cannot connect to Colab backend${causeDetail ? ` (${causeDetail})` : ''}. Please verify Colab notebook is running and URL in .env is current.`);
      }
      
      throw err;
    }
  }
}

export const colabProvider = new ColabGPUProvider();
