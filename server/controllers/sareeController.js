import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Saree } from '../models/Saree.js';
import { removeGarmentBackground } from '../services/backgroundRemovalService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_SAREES_PATH = path.resolve(__dirname, '../data/sarees.json');

/**
 * Load sarees directly from local JSON file (no DB seed dependency)
 */
export const getLocalSareesData = () => {
  try {
    if (fs.existsSync(LOCAL_SAREES_PATH)) {
      const raw = fs.readFileSync(LOCAL_SAREES_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[sareeController] Error reading local sarees.json:', err.message);
  }
  return [];
};

export const getAllSarees = async (req, res) => {
  try {
    const { category } = req.query;
    let sarees = getLocalSareesData();

    if (category && category !== 'all') {
      sarees = category === 'bridal' 
        ? sarees.filter(s => s.isBridal)
        : sarees.filter(s => s.category === category);
    }

    return res.json({ success: true, count: sarees.length, data: sarees });
  } catch (error) {
    console.error('Error fetching sarees:', error);
    const fallback = getLocalSareesData();
    return res.json({ success: true, count: fallback.length, data: fallback });
  }
};

export const getSareeById = async (req, res) => {
  try {
    const { id } = req.params;
    const sarees = getLocalSareesData();
    let saree = sarees.find(s => s.sareeId === id || s._id === id);

    if (!saree) {
      try {
        saree = await Saree.findOne({ sareeId: id });
      } catch (e) {}
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
    const sarees = getLocalSareesData();
    let saree = sarees.find(s => s.sareeId === id || s._id === id);
    if (!saree) {
      try {
        saree = await Saree.findOne({ sareeId: id });
      } catch (e) {}
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

    // Update local JSON file
    const sarees = getLocalSareesData();
    const idx = sarees.findIndex(s => s.sareeId === id || s._id === id);
    if (idx !== -1) {
      sarees[idx].tryOnImage = tryOnImage;
      try {
        fs.writeFileSync(LOCAL_SAREES_PATH, JSON.stringify(sarees, null, 2), 'utf-8');
      } catch (e) {
        console.error('Error writing local sarees.json:', e);
      }
    }

    try {
      let saree = await Saree.findOne({ sareeId: id });
      if (saree) {
        saree.tryOnImage = tryOnImage;
        await saree.save();
      }
    } catch (e) {}

    return res.json({ success: true, message: 'Try-on image updated', tryOnImage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
