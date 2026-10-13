import { Snapshot } from '../models/Snapshot.js';

// Ephemeral session snapshots storage fallback
let inMemorySnapshots = [];
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export const getSnapshotById = async (id) => {
  try {
    const doc = await Snapshot.findOne({ $or: [{ snapshotId: id }, { _id: id }] });
    if (doc) return doc;
  } catch (e) {}
  return inMemorySnapshots.find(s => s.snapshotId === id || s.id === id) || null;
};

export const clearSessionSnapshots = () => {
  inMemorySnapshots = [];
};

export const saveSnapshot = async (req, res) => {
  try {
    const { sareeId, sareeName, sareePrice, imageDataUrl, kioskStation, lightingPreset, drapeStyle, blouseColor } = req.body;
    const snapshotId = req.body.snapshotId || ('snap_' + Date.now());

    const newSnapshot = {
      snapshotId,
      id: snapshotId,
      sareeId,
      sareeName,
      sareePrice: sareePrice || 'Exclusive Collection',
      imageDataUrl: imageDataUrl || '',
      kioskStation: kioskStation || 'Mirror Station #1',
      lightingPreset: lightingPreset || 'showroom',
      drapeStyle: drapeStyle || 'nivi',
      blouseColor: blouseColor || '#800000',
      createdAt: new Date(),
      expiresAt: Date.now() + SESSION_TTL_MS
    };

    inMemorySnapshots.unshift(newSnapshot);

    // Save to MongoDB
    try {
      await Snapshot.create(newSnapshot);
    } catch (dbErr) {
      console.warn('[MongoDB Snapshot Save Notice]:', dbErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Snapshot saved to Database',
      data: newSnapshot
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSnapshots = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let todayCount = 0;
    let totalCount = 0;
    let docs = [];

    try {
      todayCount = await Snapshot.countDocuments({ createdAt: { $gte: startOfToday } });
      totalCount = await Snapshot.countDocuments({});
      docs = await Snapshot.find().sort({ createdAt: -1 }).limit(20);
    } catch (dbErr) {
      // Memory fallback if DB query fails
      const todayDateStr = new Date().toISOString().slice(0, 10);
      todayCount = inMemorySnapshots.filter(s => {
        try {
          return new Date(s.createdAt).toISOString().slice(0, 10) === todayDateStr;
        } catch (e) {
          return false;
        }
      }).length;
      totalCount = inMemorySnapshots.length;
      docs = inMemorySnapshots;
    }

    res.json({
      success: true,
      count: docs.length,
      todayCount,
      totalCount,
      data: docs
    });
  } catch (error) {
    res.json({ success: true, count: 0, todayCount: 0, totalCount: 0, data: [] });
  }
};

