import mongoose from 'mongoose';

const RareDropSchema = new mongoose.Schema({
  username: { type: String, required: true },
  prizeId:  { type: String, required: true },
  label:    { type: String, required: true },
  icon:     { type: String, required: true },
  type:     { type: String, required: true },
  frameKey: { type: String, default: null },
  effectKey:{ type: String, default: null },
  rarity:   { type: String, default: null },
  chance:   { type: Number, required: true }, // percentage e.g. 3.0
  droppedAt:{ type: Date, default: Date.now },
});

export default mongoose.model('RareDrop', RareDropSchema);
