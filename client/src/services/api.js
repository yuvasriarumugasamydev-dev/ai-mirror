const API_BASE = '/api';

export const fetchSarees = async (category = 'all') => {
  try {
    const url = category && category !== 'all' ? `${API_BASE}/sarees?category=${category}` : `${API_BASE}/sarees`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API request failed');
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.warn('[API Fallback]: Using local initial dataset:', err);
    return null; // Will trigger context fallback
  }
};

export const saveSnapshotAPI = async (snapshotData) => {
  try {
    const res = await fetch(`${API_BASE}/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshotData)
    });
    return await res.json();
  } catch (err) {
    console.warn('[API Warning]: Snapshot saved client-side only');
    return { success: true, data: snapshotData };
  }
};

export const requestStylistAPI = async (payload) => {
  try {
    const res = await fetch(`${API_BASE}/stylist/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.warn('[API Warning]: Stylist request handled locally');
    return { success: true };
  }
};
