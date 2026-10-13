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
    let query = {};
    if (category && category !== 'all') {
      query = category === 'bridal' ? { isBridal: true } : { category };
    }

    // First attempt MongoDB collection
    try {
      const dbSarees = await Saree.find(query).sort({ createdAt: -1 });
      if (dbSarees && dbSarees.length > 0) {
        return res.json({ success: true, count: dbSarees.length, data: dbSarees });
      }
    } catch (dbErr) {
      console.warn('[MongoDB Sarees Query Notice]:', dbErr.message);
    }

    // Fallback to local data
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

/**
 * POST /api/sarees
 * Create/Add new Saree from Admin and save to sarees.json
 */
export const createSaree = async (req, res) => {
  try {
    const item = req.body;
    const sarees = getLocalSareesData();

    const priceNum = typeof item.price === 'string' 
      ? parseInt(item.price.replace(/[^\d]/g, ''), 10) || 15000 
      : Number(item.price) || 15000;

    const newSaree = {
      sareeId: item.id || `saree-${Date.now()}`,
      name: item.name || 'Boutique Designer Saree',
      nameTa: item.nameTa || item.name || 'புதிய பட்டு புடவை',
      category: (item.category || 'kanjivaram').toLowerCase(),
      isBridal: item.isBridal || false,
      price: priceNum,
      priceFormatted: `₹${priceNum.toLocaleString('en-IN')}`,
      origin: item.origin || 'Kanchipuram, Tamil Nadu',
      originTa: item.originTa || 'காஞ்சிபுரம், தமிழ்நாடு',
      fabric: item.fabric || 'Pure Silk',
      fabricTa: item.fabric || 'தூய பட்டு',
      zari: item.zari || 'Gold Zari',
      zariTa: item.zari || 'தங்க ஜரிகை',
      blouse: item.blouse || 'Matching Silk Blouse',
      blouseTa: item.blouse || 'பொருத்தமான ரவிக்கை',
      rating: 5.0,
      reviewsCount: 1,
      image: item.image || '/assets/saree_kanjivaram_red.jpg',
      accentColor: item.colorCode || '#800000',
      zariColor: '#FFD700',
      story: item.story || `${item.name || 'Designer saree'} carefully woven in premium quality silk.`,
      storyTa: 'பாரம்பரிய கைத்தறி நெசவில் உருவான அழகிய புடவை.',
      tryOnImage: item.image || '/assets/saree_kanjivaram_red.jpg'
    };

    sarees.unshift(newSaree);

    try {
      fs.writeFileSync(LOCAL_SAREES_PATH, JSON.stringify(sarees, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing to local sarees.json:', e);
    }

    try {
      await Saree.create(newSaree);
    } catch (e) {}

    return res.status(201).json({ success: true, data: newSaree });
  } catch (error) {
    console.error('Error creating saree:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/sarees/:id
 * Delete Saree from Admin
 */
export const deleteSaree = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[deleteSaree] Request to delete saree with id: "${id}"`);

    // 1. Delete from MongoDB
    let dbDeletedCount = 0;
    try {
      const deleteConditions = [
        { sareeId: id },
        { id: id }
      ];

      // If id is valid MongoDB ObjectId string
      if (/^[0-9a-fA-F]{24}$/.test(id)) {
        deleteConditions.push({ _id: id });
      }

      const dbRes = await Saree.deleteOne({ $or: deleteConditions });
      dbDeletedCount = dbRes.deletedCount;
      console.log(`[deleteSaree] Deleted from MongoDB: ${dbDeletedCount}`);
    } catch (dbErr) {
      console.warn('[deleteSaree] MongoDB delete warning:', dbErr.message);
    }

    // 2. Sync server/data/sarees.json
    try {
      let sarees = getLocalSareesData();
      sarees = sarees.filter(s => s.sareeId !== id && s.id !== id && String(s._id) !== id);
      fs.writeFileSync(LOCAL_SAREES_PATH, JSON.stringify(sarees, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving server sarees.json after delete:', e);
    }

    // 3. Also sync client/src/data/sarees.json so fallback never resurrects it
    try {
      const clientDataPath = path.resolve(__dirname, '../../client/src/data/sarees.json');
      if (fs.existsSync(clientDataPath)) {
        const raw = fs.readFileSync(clientDataPath, 'utf-8');
        let clientSarees = JSON.parse(raw);
        clientSarees = clientSarees.filter(s => s.sareeId !== id && s.id !== id && String(s._id) !== id);
        fs.writeFileSync(clientDataPath, JSON.stringify(clientSarees, null, 2), 'utf-8');
      }
    } catch (e) {}

    return res.json({ success: true, message: 'Saree deleted successfully', dbDeletedCount });
  } catch (error) {
    console.error('[deleteSaree] Fatal error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

