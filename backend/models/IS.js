import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  input: { type: String, default: '' },
  output: { type: String, required: true },
}, { _id: false });

const isSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  xp: { type: Number, required: true },
  input: { type: String, required: true },
  output: { type: String, required: true },
  samplecode: { type: String, required: true },
  officialcode: { type: String, required: true },
  language: { type: String, required: true, default: 'cpp' },
  tests: {
    t: { type: Number, default: 0 },
    cases: [testCaseSchema],
  },
}, { timestamps: true });

export default mongoose.model('IS', isSchema);