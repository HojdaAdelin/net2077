import mongoose from 'mongoose';

const termsSchema = new mongoose.Schema({
  content: { type: mongoose.Schema.Types.Mixed, required: true }, // full JSON document
  uploadedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Terms', termsSchema);
