import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true }, // minutes
  totalPoints: { type: Number, required: true },
  tag: { type: String, required: true },
  year: { type: Number, required: true },
  phase: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Exam', examSchema);
