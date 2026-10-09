import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema({
  type: { type: String, enum: ['gold', 'item', 'frame', 'nameEffect', 'none'], default: 'none' },
  label: { type: String, default: '' },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
  icon: { type: String, default: '' },
  tier: { type: String, enum: ['free', 'premium'], default: 'free' },
  atLevel: { type: Number, default: 1 },
}, { _id: false });

const levelRewardSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  free: rewardSchema,
  premium: rewardSchema,
}, { _id: false });

const seasonPassSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: false },
  hasPremium: { type: Boolean, default: true },
  premiumCost: { type: Number, default: 200 }, // gold to unlock premium
  totalLevels: { type: Number, default: 10 },
  xpPerLevel: { type: Number, default: 100 },
  levels: [levelRewardSchema],
  bestRewards: [rewardSchema],
}, { timestamps: true });

export default mongoose.model('SeasonPass', seasonPassSchema);
