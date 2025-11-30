import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, enum: ['dictionary', 'resource'], required: true },
  type: { type: String, enum: ['pdf', 'text', 'video', 'roadmap'], default: 'text' },
  roadmap: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model('Resource', resourceSchema);
