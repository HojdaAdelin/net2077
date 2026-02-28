import mongoose from 'mongoose';

const roadmapSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  chapters: [{
    id: { type: Number, required: true },
    title: { type: String, required: true },
    topics: [{ type: String }]
  }],
  type: { type: String, enum: ['free', 'premium'], default: 'free' },
  image: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Roadmap', roadmapSchema);
