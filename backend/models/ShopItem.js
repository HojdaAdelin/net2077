import mongoose from 'mongoose';

const shopItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  category: { type: String, enum: ['boost', 'reset', 'cosmetic'], required: true },
  icon: { type: String, required: true },
  duration: { type: Number },
  multiplier: { type: Number },
  isSpecialOffer: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('ShopItem', shopItemSchema);
