import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['basic', 'all', 'acadnet'], required: true },
  answers: [{ type: String, required: true }],
  correctAnswers: [{ type: Number, required: true }],
  multipleCorrect: { type: Boolean, default: false },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  points: { type: Number, default: 1 },
  tags: [{ type: String }] 
}, { timestamps: true });

export default mongoose.model('Question', questionSchema);
