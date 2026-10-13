import 'dotenv/config';
// Using global built-in fetch (Node 18+)

/**
 * Google Colab Free GPU Provider
 * 100% FREE | UNLIMITED | HIGH QUALITY
 */
export class ColabGPUProvider {
  getBackendUrl() {
    return (process.env.RENDER_BACKEND_URL || process.env.COLAB_BACKEND_URL || '').trim();
  }

  async checkHealth() {
    const backendUrl = this.getBackendUrl();
    if (!backendUrl) return { status: 'no_url' };
    try {
      const response = await fetch(`${backendUrl}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[RenderGPUProvider]: Backend is healthy', data);
      return data;
    } catch (err) {
      console.warn('[RenderGPUProvider]: Health check warning:', err.message);
      return { status: 'ok' };
    }
  }

  async generateTryOn({ personBuffer, garmentBuffer, garmentName, drapeStyle = 'Nivi', signal }) {
    const backendUrl = this.getBackendUrl();
    if (!backendUrl) {
      throw new Error('RENDER_BACKEND_URL / COLAB_BACKEND_URL is not configured in server/.env.');
    }

    // Optional health check (non-blocking)
    try {
      await this.checkHealth();
    } catch (err) {
      console.warn(`[ColabGPUProvider]: Health check warning: ${err.message}. Proceeding to /tryon directly...`);
    }

    if (signal?.aborted) throw new Error('Job was cancelled');

    // Convert buffers to base64
    const personBase64 = `data:image/jpeg;base64,${personBuffer.toString('base64')}`;
    const garmentBase64 = `data:image/png;base64,${garmentBuffer.toString('base64')}`;

    console.log(`[ColabGPUProvider]: Submitting FREE unlimited try-on for '${garmentName}' (${drapeStyle})...`);

    try {
      const response = await fetch(`${backendUrl}/tryon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Supports both field naming formats
          personImage: personBase64,
          garmentImage: garmentBase64,
          person_image: personBase64,
          cloth_image: garmentBase64,
          cloth_type: 'overall',
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
      
      console.error('[ColabGPUProvider]: Error:', err.message);
      
      if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
        throw new Error('Cannot connect to Colab backend. Please ensure the Colab notebook is running and the ngrok URL is correct in .env file.');
      }
      
      throw err;
    }
  }
}

export const colabProvider = new ColabGPUProvider();
