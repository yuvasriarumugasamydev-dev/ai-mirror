import mongoose from 'mongoose';

const stylistRequestSchema = new mongoose.Schema(
  {
    station: { type: String, default: 'Mirror Station #1' },
    sareeId: { type: String, default: null },
    status: { type: String, enum: ['pending', 'assigned', 'resolved'], default: 'pending' },
    note: { type: String, default: 'Customer requested physical saree draping trial.' }
  },
  { timestamps: true }
);

export const StylistRequest = mongoose.model('StylistRequest', stylistRequestSchema);
