import mongoose from 'mongoose';

const arenaMatchSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  opponent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  category: { type: String, enum: ['LINUX', 'NETWORK'], required: true },
  questionCount: { type: Number, enum: [10, 20, 30], required: true },
  duration: { type: Number, required: true },
  mode: { type: String, enum: ['normal', 'bloody'], required: true },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  status: { type: String, enum: ['waiting', 'active', 'finished'], default: 'waiting' },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  creatorAnswers: { type: Map, of: [Number], default: {} },
  opponentAnswers: { type: Map, of: [Number], default: {} },
  creatorScore: { type: Number, default: 0 },
  opponentScore: { type: Number, default: 0 },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('ArenaMatch', arenaMatchSchema);
