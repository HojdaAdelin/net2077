import mongoose from 'mongoose';

const competitivePeriodSchema = new mongoose.Schema({
  periodNumber: { type: Number, required: true, unique: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  winners: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    xpEarned: Number,
    rank: Number,
    goldAwarded: Number
  }],
  rewardsDistributed: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('CompetitivePeriod', competitivePeriodSchema);
