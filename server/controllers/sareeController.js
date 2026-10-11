import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Saree } from '../models/Saree.js';
import { INITIAL_SAREES } from '../seed.js';
import { removeGarmentBackground } from '../services/backgroundRemovalService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getAllSarees = async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category && category !== 'all') {
      if (category === 'bridal') {
        query = { isBridal: true };
      } else {
        query = { category };
      }
    }
    const sarees = await Saree.find(query);
    if (sarees && sarees.length > 0) {
      return res.json({ success: true, count: sarees.length, data: sarees });
    }
    let filtered = INITIAL_SAREES;
    if (category && category !== 'all') {
      filtered = category === 'bridal' 
        ? INITIAL_SAREES.filter(s => s.isBridal)
        : INITIAL_SAREES.filter(s => s.category === category);
    }
    return res.json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    console.error('Error fetching sarees:', error);
    return res.json({ success: true, count: INITIAL_SAREES.length, data: INITIAL_SAREES });
  }
};

export const getSareeById = async (req, res) => {
  try {
    const { id } = req.params;
    let saree = await Saree.findOne({ sareeId: id });
    if (!saree) {
      saree = INITIAL_SAREES.find(s => s.sareeId === id);
    }
    if (!saree) {
      return res.status(404).json({ success: false, message: 'Saree not found' });
    }
    res.json({ success: true, data: saree });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/sarees/:id/generate-tryon-image
 * Generates clean transparent garment tryOnImage by removing background
 */
export const generateSareeTryOnImage = async (req, res) => {
  try {
    const { id } = req.params;
    let saree = await Saree.findOne({ sareeId: id });
    if (!saree) {
      saree = INITIAL_SAREES.find(s => s.sareeId === id);
    }
    if (!saree) {
      return res.status(404).json({ success: false, message: 'Saree not found' });
    }

    const imagePath = saree.image;
    let buffer = null;

    if (imagePath.startsWith('/') || !imagePath.startsWith('http')) {
      const cleanRel = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
      const localFile = path.resolve(__dirname, '../../', cleanRel);
      if (fs.existsSync(localFile)) {
        buffer = fs.readFileSync(localFile);
      }
    } else {
      const resp = await fetch(imagePath);
      const ab = await resp.arrayBuffer();
      buffer = Buffer.from(ab);
    }

    if (!buffer) {
      return res.status(400).json({ success: false, message: 'Could not load original saree image' });
    }

    console.log(`[Saree Controller]: Removing background for '${saree.name}'...`);
    const cleanPngBuffer = await removeGarmentBackground(buffer);

    const assetsDir = path.resolve(__dirname, '../../assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    const fileName = `tryon_${saree.sareeId}.png`;
    const destPath = path.join(assetsDir, fileName);
    fs.writeFileSync(destPath, cleanPngBuffer);

    const tryOnImageUrl = `/assets/${fileName}`;
    if (saree.save) {
      saree.tryOnImage = tryOnImageUrl;
      await saree.save();
    }

    return res.json({
      success: true,
      message: 'Background removed successfully',
      tryOnImage: tryOnImageUrl
    });
  } catch (error) {
    console.error('[generateSareeTryOnImage error]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/sarees/:id/tryon-image
 * Update tryOnImage URL directly from admin
 */
export const updateSareeTryOnImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { tryOnImage } = req.body;

    let saree = await Saree.findOne({ sareeId: id });
    if (saree) {
      saree.tryOnImage = tryOnImage;
      await saree.save();
    }

    return res.json({ success: true, message: 'Try-on image updated', tryOnImage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
