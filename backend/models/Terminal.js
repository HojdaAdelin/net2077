import mongoose from 'mongoose';

const terminalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  acceptedCommands: [{ type: String, required: true }],
  points: { type: Number, default: 5 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  order: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model('Terminal', terminalSchema);