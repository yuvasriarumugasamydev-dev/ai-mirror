import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { removeGarmentBackground } from '../services/backgroundRemovalService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_SAREES_PATH = path.resolve(__dirname, '../data/sarees.json');
const CLIENT_SAREES_PATH = path.resolve(__dirname, '../../client/src/data/sarees.json');

/**
 * POST /api/sarees
 * Add a new saree to the catalog
 */
export const addSaree = async (req, res) => {
  try {
    const rawPrice = String(req.body.price || '₹0');
    const numericPrice = parseInt(rawPrice.replace(/[₹,]/g, '')) || 0;
    const defaultImg = '/assets/image_20261013_123805.jpg';

    const newSaree = {
      sareeId: req.body.id || `saree-${Date.now()}`,
      name: req.body.name,
      category: req.body.category || 'kanjivaram',
      isBridal: req.body.isBridal || false,
      price: numericPrice,
      priceFormatted: rawPrice.startsWith('₹') ? rawPrice : `₹${rawPrice}`,
      fabric: req.body.fabric || 'Pure Silk',
      origin: req.body.fabric || 'Pure Silk',
      image: req.body.image || defaultImg,
      tryOnImage: req.body.image || defaultImg,
      accentColor: req.body.colorCode || '#A61C52',
      rating: 4.8,
      reviewsCount: 0,
      story: `Beautiful ${req.body.name}`,
      _id: req.body.id || `saree-${Date.now()}`
    };

    // Read existing sarees
    let sarees = getLocalSareesData();
    
    // Add new saree to the beginning
    sarees.unshift(newSaree);
    
    // Save to JSON file (both server and client if exists)
    try {
      fs.writeFileSync(LOCAL_SAREES_PATH, JSON.stringify(sarees, null, 2), 'utf-8');
      if (fs.existsSync(path.dirname(CLIENT_SAREES_PATH))) {
        try { fs.writeFileSync(CLIENT_SAREES_PATH, JSON.stringify(sarees, null, 2), 'utf-8'); } catch (ce) {}
      }
      console.log(`[addSaree]: Successfully added '${newSaree.name}' to catalog`);
    } catch (e) {
      console.error('[addSaree]: Error writing to sarees.json:', e.message);
      return res.status(500).json({ success: false, message: 'Failed to save saree to file' });
    }

    return res.json({ success: true, data: newSaree, message: 'Saree added successfully' });
  } catch (error) {
    console.error('[addSaree error]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/sarees/:id
 * Delete a saree from the catalog
 */
export const deleteSaree = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Read existing sarees
    let sarees = getLocalSareesData();
    
    // Find and remove the saree
    const initialLength = sarees.length;
    sarees = sarees.filter(s => s.sareeId !== id && s._id !== id && s.id !== id);
    
    if (sarees.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Saree not found' });
    }
    
    // Save to JSON file
    try {
      fs.writeFileSync(LOCAL_SAREES_PATH, JSON.stringify(sarees, null, 2), 'utf-8');
      if (fs.existsSync(path.dirname(CLIENT_SAREES_PATH))) {
        try { fs.writeFileSync(CLIENT_SAREES_PATH, JSON.stringify(sarees, null, 2), 'utf-8'); } catch (ce) {}
      }
      console.log(`[deleteSaree]: Successfully deleted saree with id '${id}'`);
    } catch (e) {
      console.error('[deleteSaree]: Error writing to sarees.json:', e.message);
      return res.status(500).json({ success: false, message: 'Failed to delete saree from file' });
    }

    return res.json({ success: true, message: 'Saree deleted successfully' });
  } catch (error) {
    console.error('[deleteSaree error]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

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
    let saree = sarees.find(s => s.sareeId === id || s._id === id || s.id === id);

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
    const sareeIndex = sarees.findIndex(s => s.sareeId === id || s._id === id || s.id === id);

    if (sareeIndex === -1) {
      return res.status(404).json({ success: false, message: 'Saree not found in catalog' });
    }

    const saree = sarees[sareeIndex];
    const imagePath = saree.image;

    let absoluteImagePath;
    if (imagePath.startsWith('/assets/')) {
      absoluteImagePath = path.join(__dirname, '../../assets', path.basename(imagePath));
    } else {
      absoluteImagePath = path.resolve(__dirname, '..', imagePath.replace(/^\//, ''));
    }

    if (!fs.existsSync(absoluteImagePath)) {
      return res.status(400).json({ success: false, message: `Original image not found: ${absoluteImagePath}` });
    }

    console.log(`[generateSareeTryOnImage]: Processing image background removal for ${saree.name}...`);
    const transparentDataUri = await removeGarmentBackground(absoluteImagePath);

    const outputDir = path.join(__dirname, '../../assets/tryon');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `tryon_${id}_${Date.now()}.png`;
    const outputPath = path.join(outputDir, filename);

    const base64Data = transparentDataUri.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));

    const publicUrl = `/assets/tryon/${filename}`;
    sarees[sareeIndex].tryOnImage = publicUrl;
    fs.writeFileSync(LOCAL_SAREES_PATH, JSON.stringify(sarees, null, 2), 'utf-8');

    return res.json({
      success: true,
      message: 'Clean try-on image generated successfully',
      tryOnImage: publicUrl
    });
  } catch (error) {
    console.error('[generateSareeTryOnImage error]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/sarees/:id/tryon-image
 * Updates or overrides tryOnImage manually
 */
export const updateSareeTryOnImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { tryOnImage } = req.body;

    if (!tryOnImage) {
      return res.status(400).json({ success: false, message: 'tryOnImage URL is required' });
    }

    const sarees = getLocalSareesData();
    const sareeIndex = sarees.findIndex(s => s.sareeId === id || s._id === id || s.id === id);

    if (sareeIndex === -1) {
      return res.status(404).json({ success: false, message: 'Saree not found' });
    }

    sarees[sareeIndex].tryOnImage = tryOnImage;
    fs.writeFileSync(LOCAL_SAREES_PATH, JSON.stringify(sarees, null, 2), 'utf-8');

    return res.json({
      success: true,
      message: 'tryOnImage updated successfully',
      data: sarees[sareeIndex]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
