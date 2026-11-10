import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  completed: { type: [String], default: [] },
  workspaces: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
export default mongoose.model('NetworkCourseProgress', schema);
