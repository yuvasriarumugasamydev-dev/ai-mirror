import mongoose from 'mongoose';

const sareeSchema = new mongoose.Schema(
  {
    sareeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameTa: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['kanjivaram', 'banarasi', 'organza', 'bridal']
    },
    isBridal: { type: Boolean, default: false },
    price: { type: Number, required: true },
    priceFormatted: { type: String, required: true },
    origin: { type: String, required: true },
    originTa: { type: String, required: true },
    fabric: { type: String, required: true },
    fabricTa: { type: String, required: true },
    zari: { type: String, required: true },
    zariTa: { type: String, required: true },
    blouse: { type: String, required: true },
    blouseTa: { type: String, required: true },
    rating: { type: Number, default: 4.8 },
    reviewsCount: { type: Number, default: 50 },
    image: { type: String, required: true },
    tryOnImage: { type: String, default: '' },
    accentColor: { type: String, default: '#800000' },
    zariColor: { type: String, default: '#FFD700' },
    story: { type: String, required: true },
    storyTa: { type: String, required: true }
  },
  { timestamps: true }
);

export const Saree = mongoose.model('Saree', sareeSchema);
