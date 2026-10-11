import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema(
  {
    snapshotId: { type: String, required: true, unique: true },
    sareeId: { type: String, required: true },
    sareeName: { type: String, required: true },
    imageDataUrl: { type: String, required: true },
    kioskStation: { type: String, default: 'Mirror Station #1' },
    lightingPreset: { type: String, default: 'showroom' },
    drapeStyle: { type: String, default: 'nivi' },
    blouseColor: { type: String, default: '#800000' }
  },
  { timestamps: true }
);

export const Snapshot = mongoose.model('Snapshot', snapshotSchema);
