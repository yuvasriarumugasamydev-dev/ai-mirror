import { StylistRequest } from '../models/StylistRequest.js';

export const requestStylist = async (req, res) => {
  try {
    const { station, sareeId, note } = req.body;
    const request = {
      station: station || 'Mirror Station #1',
      sareeId: sareeId || null,
      note: note || 'Customer requested assistance at AI Mirror',
      status: 'pending',
      createdAt: new Date()
    };
    try {
      await StylistRequest.create(request);
    } catch (e) {
      // In-memory logging
      console.log('[Concierge Alert]: Assistance requested for station', station);
    }
    res.status(201).json({
      success: true,
      message: 'Stylist notified successfully. A boutique assistant is on the way.',
      data: request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
