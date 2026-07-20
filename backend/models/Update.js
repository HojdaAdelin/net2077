import mongoose from 'mongoose';

const updateSchema = new mongoose.Schema({
  version: { type: String, required: true },
  date: { type: String, required: true },
  author: { type: String, required: true },
  authorRole: { type: String, required: true },
  sections: {
    features: [{ type: String }],
    improvements: [{ type: String }],
    bugFixes: [{ type: String }]
  }
}, { timestamps: true });

export default mongoose.model('Update', updateSchema);
