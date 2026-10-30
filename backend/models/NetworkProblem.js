import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  schemaVersion: { type: Number, default: 1 },
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true }, summary: String, description: String,
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
  xp: { type: Number, default: 50, min: 0, max: 10000 },
  published: { type: Boolean, default: false, index: true },
  tags: [String], hints: [String],
  topology: { type: mongoose.Schema.Types.Mixed, required: true },
  objectives: { type: [mongoose.Schema.Types.Mixed], required: true },
  permissions: { type: mongoose.Schema.Types.Mixed, required: true },
  order: { type: Number, default: 0 },
  revision: { type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.model('NetworkProblem', schema);
