import mongoose from 'mongoose';

const buildNoteSchema = new mongoose.Schema({
  features: [{ title: { type: String, required: true } }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('BuildNote', buildNoteSchema);
