import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, enum: ['resource'], required: true },
  type: { type: String, enum: ['pdf', 'text', 'video', 'roadmap-content'], default: 'text' }
}, { timestamps: true });

export default mongoose.model('Resource', resourceSchema);
