import mongoose from 'mongoose';

const roadmapSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  chapters: { type: Number, required: true, default: 0 },
  lessons: { type: Number, required: true, default: 0 },
  type: { type: String, enum: ['free', 'premium'], default: 'free' },
  visible: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Roadmap', roadmapSchema);
