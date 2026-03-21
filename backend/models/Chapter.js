import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  title: { type: String, required: true },
  order: { type: Number, required: true, default: 0 },
}, { timestamps: true });

export default mongoose.model('Chapter', chapterSchema);
