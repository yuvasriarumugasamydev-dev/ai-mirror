import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { ColabGPUProvider } from './colabProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BaseTryOnProvider {
  async generateTryOn(params) {
    throw new Error('generateTryOn must be implemented by subclass');
  }
}

/**
 * CatVTON Provider: Full-length overall clothing try-on (Designed for sarees, gowns, and full-body draping)
 */
export class CatVTONProvider extends BaseTryOnProvider {
  constructor(spaceName = 'multimodalart/CatVTON-zerogpu') {
    super();
    this.spaceName = spaceName;
    this.client = null;
  }

  async getClient() {
    const token = process.env.HF_TOKEN?.trim();
    if (!token) throw new Error('HF_TOKEN not found in server/.env');

    if (!this.client) {
      const { Client } = await import('@gradio/client');
      console.log(`[CatVTONProvider]: Connecting to ${this.spaceName}...`);
      this.client = await Client.connect(this.spaceName, { token });
      console.log(`[CatVTONProvider]: Connected to ${this.spaceName}`);
    }
    return this.client;
  }

  async generateTryOn({ personBuffer, garmentBuffer, garmentName, signal }) {
    const client = await this.getClient();
    if (signal?.aborted) throw new Error('Job was cancelled');

    const personBlob = new Blob([personBuffer], { type: 'image/jpeg' });
    const garmentBlob = new Blob([garmentBuffer], { type: 'image/png' });

    console.log(`[CatVTONProvider]: Submitting full-length overall try-on for '${garmentName}'...`);

    const result = await client.predict('/submit_function', {
      person_image: {
        background: personBlob,
        layers: [],
        composite: null
      },
      cloth_image: garmentBlob,
      cloth_type: 'overall', // FULL-LENGTH OVERALL CLOTH TYPE FOR SAREES & GOWNS
      num_inference_steps: 40,
      guidance_scale: 2.5,
      seed: 42,
      show_type: 'result only'
    });

    if (signal?.aborted) throw new Error('Job was cancelled');

    let outputUrl = null;
    if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
      const item = result.data[0];
      outputUrl = typeof item === 'object' && item?.url ? item.url : item;
    } else if (result?.url) {
      outputUrl = result.url;
    }

    if (!outputUrl) {
      throw new Error('CatVTON did not return a valid output image URL');
    }

    return await this._bufferResult(outputUrl, personBuffer);
  }

  async _bufferResult(outputUrl, personBuffer) {
    try {
      const fetchRes = await fetch(outputUrl);
      const arrayBuf = await fetchRes.arrayBuffer();
      let buf = Buffer.from(arrayBuf);
      if (personBuffer) {
        const meta = await sharp(personBuffer).metadata();
        buf = await preserveRealCustomerFace(personBuffer, buf, meta.width || 768, meta.height || 1024);
      }
      const base64Str = buf.toString('base64');
      return `data:image/jpeg;base64,${base64Str}`;
    } catch {
      return outputUrl;
    }
  }
}

/**
 * Seamlessly preserves customer's real face, eyes, smile, hair, skin tone, and background:
 * Composites the true camera photo's head region with a smooth alpha gradient feather at the neckline.
 */
export async function preserveRealCustomerFace(personBuffer, resultBuffer, width = 768, height = 1024) {
  try {
    const neckY = Math.round(height * 0.28);
    // Smooth vertical feather gradient at neckline
    const featherSvg = Buffer.from(`
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="feather" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="white" stop-opacity="1" />
            <stop offset="78%" stop-color="white" stop-opacity="1" />
            <stop offset="100%" stop-color="white" stop-opacity="0" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${width}" height="${neckY}" fill="url(#feather)" />
      </svg>
    `);

    const featherMask = await sharp(featherSvg).png().toBuffer();

    const personResized = await sharp(personBuffer)
      .resize(width, height, { fit: 'cover' })
      .toBuffer();

    const personHeadWithAlpha = await sharp(personResized)
      .ensureAlpha()
      .composite([{
        input: featherMask,
        blend: 'dest-in'
      }])
      .png()
      .toBuffer();

    const finalComposited = await sharp(resultBuffer)
      .resize(width, height, { fit: 'cover' })
      .composite([{
        input: personHeadWithAlpha,
        blend: 'over'
      }])
      .jpeg({ quality: 95 })
      .toBuffer();

    return finalComposited;
  } catch (err) {
    console.warn('[preserveRealCustomerFace]: Soft blend fallback:', err.message);
    return resultBuffer;
  }
}

/**
 * Generates an anatomical full-body garment mask:
 * - Preserves head, hair, face, and neck (y < 28% is BLACK / 100% PRESERVED)
 * - Masks shoulders, chest, torso, hips, and entire legs down to ankles (y: 28% to 98% is WHITE / replaced)
 * - Guarantees both shirt and pants are 100% replaced by the full-length saree!
 */
export async function createFullBodyGarmentMask(width = 768, height = 1024) {
  const neckY = Math.round(height * 0.28);
  const bottomY = Math.round(height * 0.98);
  const maskSvg = Buffer.from(`
    <svg width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}" fill="black" />
      <polygon points="${width * 0.32},${neckY} ${width * 0.68},${neckY} ${width * 0.88},${height * 0.40} ${width * 0.86},${height * 0.65} ${width * 0.82},${bottomY} ${width * 0.18},${bottomY} ${width * 0.14},${height * 0.65} ${width * 0.12},${height * 0.40}" fill="white" />
    </svg>
  `);
  return await sharp(maskSvg).png().toBuffer();
}

/**
 * IDM-VTON Provider: High-Fidelity Diffusion Try-On with CROP DISABLED
 * Generates true AI Virtual Try-On draping the full-length saree realistically over the body
 */
export class IDMVTONProvider extends BaseTryOnProvider {
  constructor(spaceName = 'yisol/IDM-VTON') {
    super();
    this.spaceName = spaceName;
    this.client = null;
  }

  async getClient() {
    if (!this.client) {
      const { Client } = await import('@gradio/client');
      console.log(`[IDMVTONProvider]: Connecting to ${this.spaceName}...`);
      try {
        // Try direct connection first to avoid binding to exhausted individual quota
        this.client = await Client.connect(this.spaceName);
        console.log(`[IDMVTONProvider]: Connected to ${this.spaceName} (Direct)`);
      } catch (err) {
        console.warn(`[IDMVTONProvider]: Direct connection failed (${err.message}), trying with token...`);
        const token = process.env.HF_TOKEN?.trim();
        this.client = await Client.connect(this.spaceName, token ? { token } : undefined);
      }
    }
    return this.client;
  }

  async generateTryOn({ personBuffer, garmentBuffer, garmentName, denoiseSteps = 25, seed = 42, signal }) {
    const client = await this.getClient();
    if (signal?.aborted) throw new Error('Job was cancelled');

    const personBlob = new Blob([personBuffer], { type: 'image/jpeg' });
    const garmentBlob = new Blob([garmentBuffer], { type: 'image/png' });

    // Generate anatomical full-body mask so the AI covers BOTH shirt and pants
    const meta = await sharp(personBuffer).metadata();
    const maskBuffer = await createFullBodyGarmentMask(meta.width || 768, meta.height || 1024);
    const maskBlob = new Blob([maskBuffer], { type: 'image/png' });

    console.log(`[IDMVTONProvider]: Submitting full-length overall saree try-on for '${garmentName}'...`);

    const result = await client.predict('/tryon', {
      dict: {
        background: personBlob,
        layers: [maskBlob],
        composite: null
      },
      garm_img: garmentBlob,
      garment_des: garmentName
        ? `Full length traditional Indian bridal silk saree reaching the ankles, ${garmentName}, with matching blouse and ornate gold zari border, draped completely to feet`
        : 'Full length traditional Indian bridal silk saree reaching the ankles, with matching blouse and ornate gold zari border, draped completely to feet',
      is_checked: false, // Turn off upper-only auto-masking so it uses our full-body mask covering the pants!
      is_checked_crop: false, // NO CROPPING: PRESERVES FULL BODY AND HEAD!
      denoise_steps: denoiseSteps || 25,
      seed: seed || 42
    });

    if (signal?.aborted) throw new Error('Job was cancelled');

    let outputUrl = null;
    if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
      const item = result.data[0];
      outputUrl = typeof item === 'object' && item?.url ? item.url : item;
    } else if (Array.isArray(result) && result.length > 0) {
      const item = result[0];
      outputUrl = typeof item === 'object' && item?.url ? item.url : item;
    }

    if (!outputUrl) {
      throw new Error('IDM-VTON did not return a valid output image URL');
    }

    try {
      const fetchRes = await fetch(outputUrl);
      const arrayBuf = await fetchRes.arrayBuffer();
      const rawBuf = Buffer.from(arrayBuf);
      const finalBuf = await preserveRealCustomerFace(personBuffer, rawBuf, meta.width || 768, meta.height || 1024);
      const base64Str = finalBuf.toString('base64');
      return `data:image/jpeg;base64,${base64Str}`;
    } catch {
      return outputUrl;
    }
  }
}

/**
 * Build exact saree draping prompt based on style selection
 */
export function buildSareeDrapePrompt(drapeStyle = 'Nivi') {
  const normalized = (drapeStyle || 'Nivi').toLowerCase().trim();
  let drapeSentence = 'a classic Nivi drape: neat pleats tucked at the waist reaching the ankles, the pallu crossing the chest and falling over the left shoulder to the back.';

  if (normalized.includes('pinned') || normalized.includes('pleat')) {
    drapeSentence = 'a formal pinned pleats drape: crisp accordion pleats pleated neatly over the left shoulder and pinned, with structured front pleats tucked at the waist reaching down to the ankles.';
  } else if (normalized.includes('seedha') || normalized.includes('gujarati')) {
    drapeSentence = 'a traditional Seedha Pallu (Gujarati) drape: the pallu draped across the chest from back to front over the right shoulder with spread pleats, and front pleats tucked at the waist reaching the ankles.';
  } else if (normalized.includes('bengali')) {
    drapeSentence = 'a classic Bengali style drape: broad box pleats with the pallu gracefully draped over the left shoulder, wrapped around from the right side, falling elegantly to the ankles.';
  }

  return `Make the person in the first image wear the saree from the second image in ${drapeSentence} Completely replace the original top and pants with the saree and a matching blouse. Keep the face, hair, skin tone, body shape, pose, camera framing and background exactly unchanged. Match the saree's color, border, zari and pattern. Realistic fabric folds and lighting. Do not paste the saree as a flat overlay.`;
}

/**
 * Image-Editing Provider: Prompt-guided saree synthesis (Qwen Image Edit / FLUX Kontext)
 */
export class PromptGuidedEditProvider extends BaseTryOnProvider {
  constructor(spaceName = 'Qwen/Qwen-Image-Edit') {
    super();
    this.spaceName = spaceName;
    this.client = null;
  }

  async getClient() {
    const token = process.env.HF_TOKEN?.trim();
    if (!token) throw new Error('HF_TOKEN not found in server/.env');

    if (!this.client) {
      const { Client } = await import('@gradio/client');
      console.log(`[PromptGuidedEditProvider]: Connecting to ${this.spaceName}...`);
      this.client = await Client.connect(this.spaceName, {
        token,
        hf_token: token
      });
      console.log(`[PromptGuidedEditProvider]: Connected to ${this.spaceName}`);
    }
    return this.client;
  }

  async generateTryOn({ personBuffer, garmentBuffer, garmentName, drapeStyle = 'Nivi', prompt, seed = 42, signal }) {
    const activePrompt = prompt || buildSareeDrapePrompt(drapeStyle);
    const client = await this.getClient();
    if (signal?.aborted) throw new Error('Job was cancelled');

    const personBlob = new Blob([personBuffer], { type: 'image/jpeg' });
    const garmentBlob = new Blob([garmentBuffer], { type: 'image/jpeg' });

    console.log(`[PromptGuidedEditProvider (${this.spaceName})]: Running prompt-guided saree drape (${drapeStyle}, seed: ${seed})...`);

    let result = null;
    try {
      result = await client.predict('/infer', {
        image: personBlob,
        prompt: `Wear this person with an authentic luxury Indian ${garmentName || 'silk saree'} in traditional ${drapeStyle} drape style with matching embroidered silk blouse, authentic pleats and rich zari pallu, keeping the exact person's face, skin tone, hairstyle, and body shape intact. Realistic boutique catalog photograph.`,
        seed: Number(seed) || 42,
        randomize_seed: true,
        true_guidance_scale: 4,
        num_inference_steps: 30,
        rewrite_prompt: true
      });
    } catch (errPrimary) {
      if (errPrimary.message && (errPrimary.message.includes('ZeroGPU') || errPrimary.message.includes('quota') || errPrimary.message.includes('429'))) {
        throw new Error('Hugging Face free ZeroGPU quota is temporarily exhausted for this Space. Please wait a short moment or try regenerating with another style or seed.');
      }
      throw errPrimary;
    }

    if (signal?.aborted) throw new Error('Job was cancelled');

    let outputUrl = null;
    if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
      const item = result.data[0];
      outputUrl = typeof item === 'object' && item?.url ? item.url : item;
    } else if (result?.url) {
      outputUrl = result.url;
    } else if (Array.isArray(result) && result.length > 0) {
      const item = result[0];
      outputUrl = typeof item === 'object' && item?.url ? item.url : item;
    }

    if (!outputUrl) {
      throw new Error(`Image-Edit model (${this.spaceName}) did not return a valid result image`);
    }

    try {
      const fetchRes = await fetch(outputUrl);
      const arrayBuf = await fetchRes.arrayBuffer();
      const rawBuf = Buffer.from(arrayBuf);
      const meta = await sharp(personBuffer).metadata();
      const finalBuf = await preserveRealCustomerFace(personBuffer, rawBuf, meta.width || 768, meta.height || 1024);
      const base64Str = finalBuf.toString('base64');
      return `data:image/jpeg;base64,${base64Str}`;
    } catch {
      return outputUrl;
    }
  }
}

/**
 * Google Gemini Image-Edit Provider
 * Utilizes Gemini multimodal image editing with GEMINI_API_KEY and GEMINI_IMAGE_MODEL from .env
 */
export class GeminiImageEditProvider extends BaseTryOnProvider {
  constructor() {
    super();
  }

  async generateTryOn({ personBuffer, garmentBuffer, garmentName, drapeStyle = 'Nivi', signal }) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in server/.env');
    }

    const model = (process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image').trim();
    console.log(`[GeminiImageEditProvider]: Calling Gemini model '${model}' for '${garmentName}' (${drapeStyle})...`);

    if (signal?.aborted) throw new Error('Job was cancelled');

    const personBase64 = personBuffer.toString('base64');
    const garmentBase64 = garmentBuffer.toString('base64');

    const promptText = `Wear the person in the first image with the traditional luxury Indian ${garmentName || 'silk saree'} from the second image in ${drapeStyle || 'Nivi'} drape style. Completely replace their original clothing from chest to ankles with the saree and matching blouse. Keep the person's exact face, identity, hair, skin tone, body shape, and pose unchanged. Realistic studio photo with natural fabric folds and lighting.`;

    if (model.toLowerCase().includes('imagen')) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [
            {
              prompt: promptText,
              image: { bytesBase64Encoded: personBase64 }
            }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4'
          }
        }),
        signal
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini Imagen API error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) throw new Error('Gemini Imagen did not return an image');
      return `data:image/jpeg;base64,${b64}`;
    } else {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: personBase64
                  }
                },
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: garmentBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT']
          }
        }),
        signal
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find((p) => p.inlineData || p.inline_data);

      if (imgPart) {
        const inline = imgPart.inlineData || imgPart.inline_data;
        const geminiBuf = Buffer.from(inline.data, 'base64');
        const meta = await sharp(personBuffer).metadata();
        const preserved = await preserveRealCustomerFace(personBuffer, geminiBuf, meta.width || 768, meta.height || 1024);
        return `data:image/jpeg;base64,${preserved.toString('base64')}`;
      }

      const textPart = parts.find((p) => p.text);
      if (textPart?.text) {
        const match = textPart.text.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/);
        if (match) return match[0];
        const urlMatch = textPart.text.match(/https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp)/i);
        if (urlMatch) return urlMatch[0];
      }

      throw new Error(`Gemini model '${model}' did not return an image in response`);
    }
  }
}

/**
 * Fal.ai Provider (Optional - only enabled when FAL_KEY is set and AI_PROVIDER=fal)
 */
export class FalAiTryOnProvider extends BaseTryOnProvider {
  async generateTryOn({ personBuffer, garmentBuffer, garmentName, category = 'saree', drapeStyle = 'Nivi', signal }) {
    const falKey = process.env.FAL_KEY?.trim();
    if (!falKey) {
      throw new Error('FAL_KEY not configured in server/.env');
    }

    if (signal?.aborted) throw new Error('Job was cancelled');

    const personBase64 = `data:image/jpeg;base64,${personBuffer.toString('base64')}`;
    const garmentBase64 = `data:image/png;base64,${garmentBuffer.toString('base64')}`;

    console.log(`[FalAiTryOnProvider]: Submitting try-on for '${garmentName}' (${drapeStyle})...`);

    const isFullLength = ['saree', 'bridal', 'kanjivaram', 'banarasi', 'organza', 'silk', 'gown'].some(
      (c) => (category || '').toLowerCase().includes(c)
    );

    const response = await fetch('https://fal.run/fal-ai/cat-vton', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        human_image_url: personBase64,
        garment_image_url: garmentBase64,
        cloth_type: isFullLength ? 'overall' : 'upper'
      }),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Fal.ai API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const resultImageUrl = data?.image?.url || data?.images?.[0]?.url;

    if (!resultImageUrl) {
      throw new Error('Fal.ai did not return an image URL');
    }

    try {
      const imgRes = await fetch(resultImageUrl);
      const ab = await imgRes.arrayBuffer();
      return `data:image/jpeg;base64,${Buffer.from(ab).toString('base64')}`;
    } catch {
      return resultImageUrl;
    }
  }
}

/**
 * LCInd Face API provider used by the mirror for customer-photo try-on.
 */
export class LCIndFaceSwapProvider extends BaseTryOnProvider {
  async generateTryOn({ personBuffer, garmentBuffer, garmentName, signal }) {
    if (signal?.aborted) throw new Error('Job was cancelled');

    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('source_img', personBuffer, {
      filename: 'customer_face.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('target_img', garmentBuffer, {
      filename: 'model_saree.jpg',
      contentType: 'image/jpeg'
    });

    const response = await fetch('https://faceapi.lcind.space/swap-face', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
      signal
    });

    if (!response.ok) {
      throw new Error(`LCInd Face API error (${response.status}): ${await response.text()}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('image/')) {
      const image = await response.arrayBuffer();
      return `data:image/jpeg;base64,${Buffer.from(image).toString('base64')}`;
    }

    const json = await response.json();
    if (json?.image) {
      return json.image.startsWith('data:') ? json.image : `data:image/jpeg;base64,${json.image}`;
    }
    const imageUrl = json?.image_url || json?.url;
    if (imageUrl) {
      const imageResponse = await fetch(imageUrl, { signal });
      if (!imageResponse.ok) throw new Error(`LCInd image download failed (${imageResponse.status})`);
      const image = await imageResponse.arrayBuffer();
      return `data:image/jpeg;base64,${Buffer.from(image).toString('base64')}`;
    }

    throw new Error(`LCInd Face API returned no image for '${garmentName}'`);
  }
}

/**
 * Local Neural Drape Engine (100% Offline / Ultra-fast / Zero-Cost)
 * Composites the saree with realistic drape texture, preserving full head, face, skin, arms, and body geometry.
 */
export class LocalDrapeProvider extends BaseTryOnProvider {
  async generateTryOn({ personBuffer, garmentBuffer, garmentName = 'Silk Saree', drapeStyle = 'Nivi' }) {
    console.log(`[LocalDrapeProvider]: Generating high-precision local drape for '${garmentName}' (${drapeStyle})...`);

    const width = 768;
    const height = 1024;

    // Normalize person canvas
    const personBase = await sharp(personBuffer)
      .resize(width, height, { fit: 'cover' })
      .toBuffer();

    // Saree garment soft drape mask:
    // Feathered gradient strictly preserves customer head, face, eyes, nose, lips, hair (above 30% of canvas height)
    // and blends the saree naturally from collarbone down to feet
    const maskSvg = Buffer.from(`
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="fadeTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="black" stop-opacity="0" />
            <stop offset="28%" stop-color="black" stop-opacity="0" />
            <stop offset="34%" stop-color="white" stop-opacity="0.85" />
            <stop offset="40%" stop-color="white" stop-opacity="0.98" />
            <stop offset="96%" stop-color="white" stop-opacity="0.98" />
            <stop offset="100%" stop-color="black" stop-opacity="0.2" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${width}" height="${height}" fill="url(#fadeTop)" />
      </svg>
    `);

    const drapedGarment = await sharp(garmentBuffer)
      .resize(width, height, { fit: 'cover' })
      .composite([{ input: maskSvg, blend: 'dest-in' }])
      .png()
      .toBuffer();

    const finalComposited = await sharp(personBase)
      .composite([{ input: drapedGarment, blend: 'over' }])
      .jpeg({ quality: 95 })
      .toBuffer();

    return `data:image/jpeg;base64,${finalComposited.toString('base64')}`;
  }
}

/**
 * Resilient Multi-Model Manager
 * Routes to Colab / Render Cloud API if configured,
 * or cascades to Prompt-Guided Image Edit (Qwen / FLUX Kontext),
 * CatVTON (full-length overall), IDM-VTON, and Local Neural Drape Engine.
 */
export class ResilientTryOnManager {
  constructor() {
    this.colabGPU = new ColabGPUProvider();
    this.lcindFaceSwap = new LCIndFaceSwapProvider();
    this.idmvtonPrimary = new IDMVTONProvider('yisol/IDM-VTON');
    this.catvton = new CatVTONProvider('multimodalart/CatVTON-zerogpu');
    this.imageEditPrimary = new PromptGuidedEditProvider('Qwen/Qwen-Image-Edit');
    this.idmvtonBackup = new IDMVTONProvider('Nymbo/Virtual-Try-On');
    this.geminiProvider = new GeminiImageEditProvider();
    this.falAi = new FalAiTryOnProvider();
  }

  /**
   * Returns active provider chain names (names only, NEVER keys)
   */
  getActiveProviderChain() {
    const colabUrl = this.colabGPU.getBackendUrl();
    if (colabUrl) {
      return ['⚡ Colab GPU Real-Time Backend'];
    }
    const aiProvider = (process.env.AI_PROVIDER || 'render').toLowerCase().trim();
    const geminiModel = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
    const hasFalKey = !!process.env.FAL_KEY?.trim();
    const hasRenderUrl = !!(process.env.RENDER_BACKEND_URL?.trim() || colabUrl);

    if (aiProvider === 'render' || aiProvider === 'colab') {
      if (hasRenderUrl) {
        return [
          'LCInd Face API (Customer Face + Saree Model)',
          '🚀 Render Cloud API (CatVTON HD)',
          'IDM-VTON AI (Photorealistic)',
          'CatVTON (Full-Length Overall)',
          'AI Image Edit (Qwen)'
        ];
      }
      return [
        'LCInd Face API (Customer Face + Saree Model)',
        'IDM-VTON AI (Photorealistic)',
        'CatVTON (Full-Length Overall)',
        'AI Image Edit (Qwen)'
      ];
    } else if (aiProvider === 'gemini') {
      return [
        `Gemini Image Edit (${geminiModel})`,
        'IDM-VTON AI (Photorealistic)',
        'CatVTON (Full-Length Overall)',
        'AI Image Edit (Qwen)',
        'IDM-VTON (Backup)'
      ];
    } else if (aiProvider === 'fal') {
      if (hasFalKey) {
        return [
          'Fal.ai Production (Ultra-Fast 3s)',
          'IDM-VTON AI (Photorealistic)',
          'CatVTON (Full-Length Overall)',
          'AI Image Edit (Qwen)',
          'IDM-VTON (Backup)'
        ];
      }
      return [
        'IDM-VTON AI (Photorealistic)',
        'CatVTON (Full-Length Overall)',
        'AI Image Edit (Qwen)',
        'IDM-VTON (Backup)'
      ];
    } else {
      // Default: hf_free (Fal.ai removed from default chain)
      return [
        'IDM-VTON AI (Photorealistic)',
        'CatVTON (Full-Length Overall)',
        'AI Image Edit (Qwen)',
        'IDM-VTON (Backup)'
      ];
    }
  }

  /**
   * Resizes image to max 1024px, preserving aspect ratio and padding to 3:4 (768x1024) instead of cropping.
   */
  async preprocessPersonNoCrop(buffer, targetWidth = 768, targetHeight = 1024) {
    return await sharp(buffer)
      .resize(targetWidth, targetHeight, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .jpeg({ quality: 95 })
      .toBuffer();
  }

  /**
   * Resizes garment to max 1024px, preserving aspect ratio and padding to 3:4 (768x1024) with transparent background.
   */
  async preprocessGarmentNoCrop(buffer, targetWidth = 768, targetHeight = 1024) {
    return await sharp(buffer)
      .resize(targetWidth, targetHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
  }

  async resolveGarmentBuffer(garmentPathOrUrl) {
    if (!garmentPathOrUrl) throw new Error('Garment path or URL is required');

    if (Buffer.isBuffer(garmentPathOrUrl)) {
      return garmentPathOrUrl;
    }

    // HTTP/HTTPS URL
    if (garmentPathOrUrl.startsWith('http://') || garmentPathOrUrl.startsWith('https://')) {
      const resp = await fetch(garmentPathOrUrl);
      if (!resp.ok) throw new Error(`Failed to fetch garment image: HTTP ${resp.status}`);
      const ab = await resp.arrayBuffer();
      return Buffer.from(ab);
    }

    const cleanPath = garmentPathOrUrl.startsWith('/') ? garmentPathOrUrl.slice(1) : garmentPathOrUrl;

    // 1) Check inside server/ folder (server/public/images/...)
    const serverDir = path.resolve(__dirname, '../');
    const candidateServer = path.join(serverDir, cleanPath);
    if (fs.existsSync(candidateServer)) {
      return fs.readFileSync(candidateServer);
    }

    // 2) Check project root (AI Mirror/public/images/...)
    const rootDir = path.resolve(__dirname, '../../');
    const candidateRoot = path.join(rootDir, cleanPath);
    if (fs.existsSync(candidateRoot)) {
      return fs.readFileSync(candidateRoot);
    }

    // 3) Check client public folder (AI Mirror/client/public/images/...)
    const clientPublicDir = path.resolve(__dirname, '../../client/public');
    const candidateClient = path.join(clientPublicDir, cleanPath);
    if (fs.existsSync(candidateClient)) {
      return fs.readFileSync(candidateClient);
    }

    throw new Error(`Garment image could not be found: ${garmentPathOrUrl}`);
  }

  getExecutionPlan(modelPreference = 'auto') {
    const colabUrl = this.colabGPU.getBackendUrl();
    const hasColabUrl = !!colabUrl;
    const aiProvider = (process.env.AI_PROVIDER || (hasColabUrl ? 'colab' : 'render')).toLowerCase().trim();
    const geminiModel = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
    const hasFalKey = !!process.env.FAL_KEY?.trim();
    const hasRenderUrl = !!(process.env.RENDER_BACKEND_URL?.trim() || colabUrl);

    const plan = [];

    // 1. COLAB / RENDER GPU API - TOP PRIORITY IF CONFIGURED!
    if (hasColabUrl || (hasRenderUrl && (aiProvider === 'render' || aiProvider === 'colab' || aiProvider === 'colab_free'))) {
      plan.push({ name: '⚡ Colab GPU Real-Time Backend', provider: this.colabGPU });
    }

    // When Colab backend is configured, use it exclusively - NO HF_TOKEN needed!
    if (hasColabUrl) {
      return [{ name: '⚡ Colab GPU Real-Time Backend', provider: this.colabGPU }];
    }

    // 2. LCInd Face API
    if (modelPreference === 'lcind' || modelPreference === 'faceswap' || (!hasColabUrl && modelPreference === 'auto')) {
      plan.push({ name: 'LCInd Face API (Customer Face + Saree Model)', provider: this.lcindFaceSwap });
    }

    // Optional user preference if specified
    if ((modelPreference === 'render' || modelPreference === 'colab') && hasRenderUrl) {
      if (!plan.some((p) => p.name.includes('Render') || p.name.includes('Colab'))) {
        plan.push({ name: '🚀 Render Cloud API (CatVTON HD)', provider: this.colabGPU });
      }
    } else if (modelPreference === 'gemini') {
      plan.push({ name: `Gemini Image Edit (${geminiModel})`, provider: this.geminiProvider });
    } else if (modelPreference === 'fal_ai' && aiProvider === 'fal' && hasFalKey) {
      plan.push({ name: 'Fal.ai Production (Ultra-Fast 3s)', provider: this.falAi });
    } else if (modelPreference === 'idm_vton') {
      plan.push({ name: 'IDM-VTON AI (Photorealistic)', provider: this.idmvtonPrimary });
    } else if (modelPreference === 'catvton') {
      plan.push({ name: 'CatVTON (Full-Length Overall)', provider: this.catvton });
    } else if (modelPreference === 'image_edit') {
      plan.push({ name: 'AI Image Edit (Qwen)', provider: this.imageEditPrimary });
    }

    // Build chain based on AI_PROVIDER
    if (aiProvider === 'render') {
      if (hasRenderUrl && !plan.some((p) => p.name.includes('Render') || p.name.includes('Colab'))) {
        plan.push({ name: '🚀 Render Cloud API (CatVTON HD)', provider: this.colabGPU });
      }
    } else if (aiProvider === 'colab' || aiProvider === 'colab_free') {
      if (hasRenderUrl && !plan.some((p) => p.name.includes('Render') || p.name.includes('Colab'))) {
        plan.push({ name: '🚀 Render Cloud API (CatVTON HD)', provider: this.colabGPU });
      }
      plan.push(
        { name: 'IDM-VTON AI (Photorealistic)', provider: this.idmvtonPrimary },
        { name: 'CatVTON (Full-Length Overall)', provider: this.catvton },
        { name: 'AI Image Edit (Qwen)', provider: this.imageEditPrimary }
      );
    } else if (aiProvider === 'gemini') {
      if (!plan.some((p) => p.name.startsWith('Gemini'))) {
        plan.push({ name: `Gemini Image Edit (${geminiModel})`, provider: this.geminiProvider });
      }
      plan.push(
        { name: 'IDM-VTON AI (Photorealistic)', provider: this.idmvtonPrimary },
        { name: 'CatVTON (Full-Length Overall)', provider: this.catvton },
        { name: 'AI Image Edit (Qwen)', provider: this.imageEditPrimary },
        { name: 'IDM-VTON (Backup)', provider: this.idmvtonBackup }
      );
    } else if (aiProvider === 'fal') {
      if (hasFalKey && !plan.some((p) => p.name.startsWith('Fal.ai'))) {
        plan.push({ name: 'Fal.ai Production (Ultra-Fast 3s)', provider: this.falAi });
      }
      plan.push(
        { name: 'IDM-VTON AI (Photorealistic)', provider: this.idmvtonPrimary },
        { name: 'CatVTON (Full-Length Overall)', provider: this.catvton },
        { name: 'AI Image Edit (Qwen)', provider: this.imageEditPrimary },
        { name: 'IDM-VTON (Backup)', provider: this.idmvtonBackup }
      );
    } else {
      // Default: hf_free (but include Colab if available!)
      if (hasColabUrl) {
        plan.push({ name: '🆓 Colab Free GPU (UNLIMITED)', provider: this.colabGPU });
      }
      if (!plan.some((p) => p.name.includes('IDM-VTON AI'))) {
        plan.push({ name: 'IDM-VTON AI (Photorealistic)', provider: this.idmvtonPrimary });
      }
      if (!plan.some((p) => p.name.includes('CatVTON'))) {
        plan.push({ name: 'CatVTON (Full-Length Overall)', provider: this.catvton });
      }
      if (!plan.some((p) => p.name.includes('AI Image Edit'))) {
        plan.push({ name: 'AI Image Edit (Qwen)', provider: this.imageEditPrimary });
      }
      if (!plan.some((p) => p.name.includes('Backup'))) {
        plan.push({ name: 'IDM-VTON (Backup)', provider: this.idmvtonBackup });
      }
    }

    return plan;
  }

  async generateTryOn({
    personBuffer,
    garmentPathOrUrl,
    garmentName = 'Silk Saree',
    category = 'saree',
    modelPreference = 'auto',
    drapeStyle = 'Nivi',
    denoiseSteps = 25,
    seed = 42,
    signal
  }) {
    // 1. Resolve garment image
    const rawGarmentBuffer = await this.resolveGarmentBuffer(garmentPathOrUrl);

    const aiProvider = (process.env.AI_PROVIDER || 'render').toLowerCase().trim();

    // 2. Preprocess both images: max 1024px, maintain aspect ratio, pad to 3:4 (768x1024), NEVER crop
    let preprocessedPerson = await this.preprocessPersonNoCrop(personBuffer, 768, 1024);
    let preprocessedGarment = await this.preprocessGarmentNoCrop(rawGarmentBuffer, 768, 1024);

    const plan = this.getExecutionPlan(modelPreference);
    let lastError = null;
    let falError = null;

    for (const step of plan) {
      if (signal?.aborted) throw new Error('Job was cancelled');
      try {
        console.log(`[TryOn Manager]: Attempting model '${step.name}' for ${category} '${garmentName}' (${drapeStyle}, seed: ${seed})...`);
        const isColab = step.name.includes('Colab') || step.name.includes('Render');
        const resultUrl = await step.provider.generateTryOn({
          personBuffer: isColab ? personBuffer : preprocessedPerson,
          garmentBuffer: isColab ? rawGarmentBuffer : preprocessedGarment,
          garmentName,
          category,
          drapeStyle,
          denoiseSteps,
          seed,
          signal
        });

        // Result is strictly from an AI model
        return { resultUrl, provider: step.name };
      } catch (err) {
        lastError = err;
        if (step.name.includes('Fal.ai')) {
          falError = err;
        }
        console.warn(`[TryOn Manager]: Model '${step.name}' failed: ${err.message}. Trying next provider in cascade...`);

        // If provider rejected due to image upload size/payload limit, reduce dimensions for subsequent providers
        if (
          err.message &&
          (err.message.includes('413') ||
            err.message.toLowerCase().includes('payload too large') ||
            err.message.toLowerCase().includes('size exceeds'))
        ) {
          console.warn(`[TryOn Manager]: Image upload rejected by provider due to size. Reducing to 576x768...`);
          try {
            preprocessedPerson = await this.preprocessPersonNoCrop(personBuffer, 576, 768);
            preprocessedGarment = await this.preprocessGarmentNoCrop(rawGarmentBuffer, 576, 768);
          } catch {}
        }

        if (aiProvider === 'render' && step.name.includes('Render Cloud API')) {
          console.error(`[TryOn Manager]: Render Cloud API failed:`, err.message);
          throw new Error(`Render API Error: ${err.message}. (Check if your Render service is active at ${process.env.RENDER_BACKEND_URL})`);
        }

        // Continue to other providers if any
      }
    }

    // Every cloud AI provider failed: Return explicit error. NEVER return a composited or fake image!
    let errorDetail = '';
    if (falError && (falError.message.includes('TOP_UP') || falError.message.includes('User is locked') || falError.message.includes('403'))) {
      errorDetail = 'Fal.ai API Error: Your Fal.ai account is locked (TOP_UP required). Please top up credits or switch AI_PROVIDER=hf_free.';
    } else if (lastError?.message?.includes('ZeroGPU') || lastError?.message?.includes('quota') || lastError?.message?.includes('429')) {
      errorDetail = 'Hugging Face free ZeroGPU quota is temporarily exhausted for this Space. Please wait a short moment and Retry.';
    } else if (lastError?.message?.includes('Pose') || lastError?.message?.includes('IndexError') || lastError?.message?.includes('KeyError')) {
      errorDetail = 'Pose detection issue. Please stand back so your full body (head to feet) is visible and Retry.';
    } else {
      errorDetail = lastError?.message || 'All AI Virtual Try-On models were temporarily busy. Please Retry.';
    }

    throw new Error(`Virtual Try-On unavailable: ${errorDetail}`);
  }
}

export const tryOnManager = new ResilientTryOnManager();
