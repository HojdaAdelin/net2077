import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'NetworkProblem', required: true },
  revision: { type: Number, required: true }, token: { type: String, required: true },
  topology: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });
schema.index({ userId: 1, problemId: 1 }, { unique: true });
export default mongoose.model('NetworkLabProgress', schema);
