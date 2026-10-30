// In-memory stylist requests storage
const stylistRequests = [];

export const requestStylist = async (req, res) => {
  try {
    const { station, sareeId, note } = req.body;
    const request = {
      id: 'req_' + Date.now(),
      station: station || 'Mirror Station #1',
      sareeId: sareeId || null,
      note: note || 'Customer requested assistance at AI Mirror',
      status: 'pending',
      createdAt: new Date()
    };
    
    // Store in memory
    stylistRequests.push(request);
    console.log('[Concierge Alert]: Assistance requested for station', station);
    
    res.status(201).json({
      success: true,
      message: 'Stylist notified successfully. A boutique assistant is on the way.',
      data: request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
