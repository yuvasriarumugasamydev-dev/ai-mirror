import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

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

    return await this._bufferResult(outputUrl);
  }

  async _bufferResult(outputUrl) {
    try {
      const fetchRes = await fetch(outputUrl);
      const arrayBuf = await fetchRes.arrayBuffer();
      const base64Str = Buffer.from(arrayBuf).toString('base64');
      return `data:image/jpeg;base64,${base64Str}`;
    } catch {
      return outputUrl;
    }
  }
}

/**
 * IDM-VTON Provider: Upper-body try-on (Designed for tops, kurtas, shirts) with CROP DISABLED
 */
export class IDMVTONProvider extends BaseTryOnProvider {
  constructor(spaceName = 'Nymbo/Virtual-Try-On') {
    super();
    this.spaceName = spaceName;
    this.client = null;
  }

  async getClient() {
    const token = process.env.HF_TOKEN?.trim();
    if (!token) throw new Error('HF_TOKEN not found in server/.env');

    if (!this.client) {
      const { Client } = await import('@gradio/client');
      console.log(`[IDMVTONProvider]: Connecting to ${this.spaceName}...`);
      this.client = await Client.connect(this.spaceName, { token });
      console.log(`[IDMVTONProvider]: Connected to ${this.spaceName}`);
    }
    return this.client;
  }

  async generateTryOn({ personBuffer, garmentBuffer, garmentName, denoiseSteps = 30, seed = 42, signal }) {
    const client = await this.getClient();
    if (signal?.aborted) throw new Error('Job was cancelled');

    const personBlob = new Blob([personBuffer], { type: 'image/jpeg' });
    const garmentBlob = new Blob([garmentBuffer], { type: 'image/jpeg' });

    console.log(`[IDMVTONProvider]: Submitting try-on (crop OFF) for '${garmentName}'...`);

    const result = await client.predict('/tryon', {
      dict: {
        background: personBlob,
        layers: [],
        composite: null
      },
      garm_img: garmentBlob,
      garment_des: garmentName || 'Traditional Silk Saree',
      is_checked: true,
      is_checked_crop: false, // NO CROPPING: TURN CROP OFF AS REQUIRED
      denoise_steps: denoiseSteps || 30,
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
      const base64Str = Buffer.from(arrayBuf).toString('base64');
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
 * DEFAULT ENGINE FOR SAREES
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
      result = await client.predict('/predict', {
        image: personBlob,
        prompt: activePrompt,
        image_2: garmentBlob,
        seed: Number(seed) || 42
      });
    } catch (errPrimary) {
      // Check for ZeroGPU quota exhaustion
      if (errPrimary.message && (errPrimary.message.includes('ZeroGPU') || errPrimary.message.includes('quota') || errPrimary.message.includes('429'))) {
        throw new Error('Hugging Face free ZeroGPU quota is temporarily exhausted for this Space. Please wait a short moment or try regenerating with another style or seed.');
      }

      console.warn(`[PromptGuidedEditProvider]: /predict endpoint call failed, attempting fallback parameters...`);
      try {
        result = await client.predict(0, [
          personBlob,
          activePrompt,
          garmentBlob
        ]);
      } catch (errFallback) {
        if (errFallback.message && (errFallback.message.includes('ZeroGPU') || errFallback.message.includes('quota') || errFallback.message.includes('429'))) {
          throw new Error('Hugging Face free ZeroGPU quota is temporarily exhausted for this Space. Please wait a short moment or try regenerating with another style or seed.');
        }
        throw errPrimary;
      }
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
      const base64Str = Buffer.from(arrayBuf).toString('base64');
      return `data:image/jpeg;base64,${base64Str}`;
    } catch {
      return outputUrl;
    }
  }
}

/**
 * Resilient Multi-Model Manager
 * Routes sarees to Prompt-Guided Image Edit (Qwen / FLUX Kontext) by default,
 * gowns to CatVTON (full-length overall),
 * tops/kurtas/shirts to IDM-VTON,
 * with multi-space fallback chain.
 */
export class ResilientTryOnManager {
  constructor() {
    this.imageEditPrimary = new PromptGuidedEditProvider('Qwen/Qwen-Image-Edit');
    this.imageEditBackup = new PromptGuidedEditProvider('multimodalart/FLUX.1-Kontext');
    this.catvton = new CatVTONProvider('multimodalart/CatVTON-zerogpu');
    this.idmvtonPrimary = new IDMVTONProvider('Nymbo/Virtual-Try-On');
    this.idmvtonBackup = new IDMVTONProvider('yisol/IDM-VTON');
  }

  /**
   * NO CROPPING: Fit image inside 768x1024 portrait canvas by PADDING (never cropping)
   */
  async preprocessImageNoCrop(buffer, width = 768, height = 1024) {
    return await sharp(buffer)
      .resize(width, height, {
        fit: 'contain', // PADDING ONLY - PRESERVE FULL HEAD TO FEET!
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .jpeg({ quality: 95 })
      .toBuffer();
  }

  async resolveGarmentBuffer(garmentPathOrUrl) {
    if (!garmentPathOrUrl) throw new Error('Garment path or URL is required');

    if (Buffer.isBuffer(garmentPathOrUrl)) {
      return garmentPathOrUrl;
    }

    const cleanPath = garmentPathOrUrl.startsWith('/') ? garmentPathOrUrl.slice(1) : garmentPathOrUrl;
    const rootDir = path.resolve(__dirname, '../../');
    const candidateLocal = path.join(rootDir, cleanPath);

    if (fs.existsSync(candidateLocal)) {
      return fs.readFileSync(candidateLocal);
    } else if (garmentPathOrUrl.startsWith('http://') || garmentPathOrUrl.startsWith('https://')) {
      const resp = await fetch(garmentPathOrUrl);
      if (!resp.ok) throw new Error(`Failed to fetch garment image: HTTP ${resp.status}`);
      const ab = await resp.arrayBuffer();
      return Buffer.from(ab);
    }

    throw new Error(`Garment image could not be found: ${garmentPathOrUrl}`);
  }

  async generateTryOn({
    personBuffer,
    garmentPathOrUrl,
    garmentName = 'Silk Saree',
    category = 'saree',
    modelPreference = 'auto', // 'auto' | 'image_edit' | 'catvton' | 'idm_vton'
    drapeStyle = 'Nivi',
    denoiseSteps = 30,
    seed = 42,
    signal
  }) {
    const hfToken = process.env.HF_TOKEN?.trim();
    if (!hfToken) {
      throw new Error('HF_TOKEN not found in server/.env');
    }

    // 1. Resolve garment image (prioritizes clean tryOnImage without background)
    const rawGarmentBuffer = await this.resolveGarmentBuffer(garmentPathOrUrl);

    // 2. Preprocess both images by PADDING to 768x1024 (NO CROPPING)
    const preprocessedPerson = await this.preprocessImageNoCrop(personBuffer, 768, 1024);
    const preprocessedGarment = await this.preprocessImageNoCrop(rawGarmentBuffer, 768, 1024);

    const catLower = (category || '').toLowerCase().trim();
    const isSaree = ['saree', 'bridal', 'kanjivaram', 'banarasi', 'organza', 'silk'].some((s) => catLower.includes(s));
    const isGown = ['gown', 'lehenga', 'anarkali'].some((s) => catLower.includes(s));
    const isTop = ['top', 'shirt', 'kurta', 'tshirt', 'blouse'].some((s) => catLower.includes(s));

    // Determine execution plan
    // Requirement: For category "saree", Image-Edit is DEFAULT! CatVTON/IDM-VTON only for tops, kurtas, shirts, gowns.
    let plan = [];
    if (modelPreference === 'image_edit' || (modelPreference === 'auto' && isSaree)) {
      plan = [
        { name: 'AI Image Edit (Qwen)', provider: this.imageEditPrimary },
        { name: 'AI Image Edit (FLUX Kontext)', provider: this.imageEditBackup },
        { name: 'CatVTON (Full-Length Overall)', provider: this.catvton },
        { name: 'IDM-VTON (No Crop)', provider: this.idmvtonPrimary }
      ];
    } else if (modelPreference === 'catvton' || (modelPreference === 'auto' && isGown)) {
      plan = [
        { name: 'CatVTON (Full-Length Overall)', provider: this.catvton },
        { name: 'AI Image Edit (Qwen)', provider: this.imageEditPrimary },
        { name: 'IDM-VTON (No Crop)', provider: this.idmvtonPrimary }
      ];
    } else if (modelPreference === 'idm_vton' || (modelPreference === 'auto' && isTop)) {
      plan = [
        { name: 'IDM-VTON (Upper-Body)', provider: this.idmvtonPrimary },
        { name: 'IDM-VTON (Backup)', provider: this.idmvtonBackup },
        { name: 'CatVTON (Overall)', provider: this.catvton }
      ];
    } else {
      // Default fallback plan (saree first)
      plan = [
        { name: 'AI Image Edit (Qwen)', provider: this.imageEditPrimary },
        { name: 'AI Image Edit (FLUX Kontext)', provider: this.imageEditBackup },
        { name: 'CatVTON (Full-Length Overall)', provider: this.catvton },
        { name: 'IDM-VTON (No Crop)', provider: this.idmvtonPrimary }
      ];
    }

    let lastError = null;

    for (const step of plan) {
      if (signal?.aborted) throw new Error('Job was cancelled');
      try {
        console.log(`[TryOn Manager]: Attempting model '${step.name}' for ${category} '${garmentName}' (${drapeStyle}, seed: ${seed})...`);
        const resultUrl = await step.provider.generateTryOn({
          personBuffer: preprocessedPerson,
          garmentBuffer: preprocessedGarment,
          garmentName,
          drapeStyle,
          denoiseSteps,
          seed,
          signal
        });
        return { resultUrl, provider: step.name };
      } catch (err) {
        lastError = err;
        console.warn(`[TryOn Manager]: Model '${step.name}' failed: ${err.message}. Trying next provider in cascade...`);
        if (err.message.includes('HF_TOKEN not found in server/.env')) {
          throw err;
        }
      }
    }

    let errorDetail = lastError?.message || 'All AI Virtual Try-On models were temporarily busy';
    if (errorDetail.includes('ZeroGPU') || errorDetail.includes('quota') || errorDetail.includes('429')) {
      errorDetail = 'Hugging Face free ZeroGPU quota is temporarily exhausted for this Space. Please wait a short moment or try regenerating with another style or seed.';
    } else if (errorDetail.includes('IndexError') || errorDetail.includes('KeyError')) {
      errorDetail = 'Pose keypoint detection issue. Please stand back to keep your full body (head to feet) visible.';
    }

    throw new Error(`Virtual Try-On unavailable: ${errorDetail}`);
  }
}

export const tryOnManager = new ResilientTryOnManager();
