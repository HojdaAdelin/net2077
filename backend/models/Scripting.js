import mongoose from 'mongoose';

const scriptingSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  xp: { type: Number, required: true },
  script: { type: String, required: true },       // bash script shown as code
  answers: [{ type: String, required: true }],    // array of answer options
  correctAnswers: [{ type: Number, required: true }], // indices of correct answers
  hint: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Scripting', scriptingSchema);
