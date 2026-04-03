import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['header1', 'header2', 'paragraph', 'note', 'obs', 'tip', 'question', 'link'],
    required: true,
  },
  order: { type: Number, required: true, default: 0 },
  content: { type: String, default: '' },
  question: { type: String, default: '' },
  answer: { type: String, default: '' }, 
  xp: { type: Number, default: 0 },      
  label: { type: String, default: '' },
  url: { type: String, default: '' },
}, { _id: true });

const lessonSchema = new mongoose.Schema({
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  title: { type: String, required: true },
  order: { type: Number, required: true, default: 0 },
  items: [itemSchema],
}, { timestamps: true });

export default mongoose.model('Lesson', lessonSchema);
