// Ephemeral session snapshots storage
// Preserved in memory for the active kiosk session (never purged prematurely)
let inMemorySnapshots = [];
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // Lasts full active session

export const getSnapshotById = (id) => {
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
      imageDataUrl, // ephemeral in memory for QR code transfer during session
      kioskStation: kioskStation || 'Mirror Station #1',
      lightingPreset: lightingPreset || 'showroom',
      drapeStyle: drapeStyle || 'nivi',
      blouseColor: blouseColor || '#800000',
      createdAt: new Date(),
      expiresAt: Date.now() + SESSION_TTL_MS
    };

    // Keep in ephemeral memory for the session; do not delete until session ends
    inMemorySnapshots.unshift(newSnapshot);

    res.status(201).json({
      success: true,
      message: 'Snapshot saved for kiosk session QR transfer',
      data: newSnapshot
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSnapshots = async (req, res) => {
  try {
    const todayDateStr = new Date().toISOString().slice(0, 10);
    const todayCount = inMemorySnapshots.filter(s => {
      try {
        return new Date(s.createdAt).toISOString().slice(0, 10) === todayDateStr;
      } catch (e) {
        return false;
      }
    }).length;
    const sareeCounts = {};
    inMemorySnapshots.forEach(s => {
      if (s.sareeId) {
        sareeCounts[s.sareeId] = (sareeCounts[s.sareeId] || 0) + 1;
      }
    });

    res.json({
      success: true,
      count: inMemorySnapshots.length,
      todayCount,
      totalCount: inMemorySnapshots.length,
      sareeCounts,
      data: inMemorySnapshots
    });
  } catch (error) {
    res.json({ success: true, count: 0, todayCount: 0, totalCount: 0, sareeCounts: {}, data: [] });
  }
};

