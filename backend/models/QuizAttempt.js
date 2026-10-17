import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  kind: { type: String, enum: ['exam', 'daily', 'random'], required: true },
  examId: String,
  examTitle: String,
  examTag: String,
  day: String,
  // Snapshot the issued questions so later content edits cannot change the score.
  questions: { type: [mongoose.Schema.Types.Mixed], required: true },
  checked: { type: Map, of: [Number], default: {} },
  result: mongoose.Schema.Types.Mixed,
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

export default mongoose.model('QuizAttempt', schema);
