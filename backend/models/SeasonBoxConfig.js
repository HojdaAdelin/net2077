import mongoose from 'mongoose';

const prizeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['gold', 'item', 'frame', 'nameEffect', 'profileEffect'], required: true },
  label: { type: String, required: true }, icon: String,
  rarity: { type: String, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'], required: true },
  chance: Number, min: Number, max: Number,
  sourceKey: String, amount: Number, quantity: { type: Number, default: 1 },
  itemId: String, itemName: String, itemCategory: String, itemDuration: Number, itemMultiplier: Number,
  frameKey: String, effectKey: String,
}, { _id: false });

const schema = new mongoose.Schema({
  _id: { type: String, default: 'season-box' },
  cost: { type: Number, required: true },
  duplicateGold: { type: Number, required: true },
  ticketTotal: { type: Number, default: 10000, enum: [10000] },
  revision: { type: Number, default: 0 },
  prizes: [prizeSchema],
}, { timestamps: true });

export default mongoose.model('SeasonBoxConfig', schema);
