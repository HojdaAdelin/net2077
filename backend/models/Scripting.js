import mongoose from 'mongoose';

const scriptingSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  xp: { type: Number, required: true },
  script: { type: String, required: true },       
  answers: [{ type: String, required: true }],    
  correctAnswers: [{ type: Number, required: true }], 
  hint: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Scripting', scriptingSchema);
