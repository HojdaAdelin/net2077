import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: { type: Map, of: [Number], default: {}, select: false },
  score: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  answeredCount: { type: Number, default: 0 },
  startedAt: { type: Date, default: null },
  lastAnsweredAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null },
  elapsedSeconds: { type: Number, default: 0 },
  revision: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ eventId: 1, userId: 1 }, { unique: true });
schema.index({ eventId: 1, score: -1, elapsedSeconds: 1, createdAt: 1, _id: 1 });
export default mongoose.model('EventParticipation', schema);
