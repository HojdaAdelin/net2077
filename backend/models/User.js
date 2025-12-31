import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  solvedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  solvedByTag: {
    LINUX: { type: Number, default: 0 },
    NETWORK: { type: Number, default: 0 }
  },
  simulations: [{
    examId: String,
    examTitle: String,
    examTag: String,
    score: Number,
    totalPoints: Number,
    correctAnswers: Number,
    totalQuestions: Number,
    date: { type: Date, default: Date.now }
  }],
  streak: {
    current: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    lastActivity: { type: Date, default: null },
    lastActivityDate: { type: String, default: null } 
  },
  dailyChallenge: {
    lastCompleted: { type: String, default: null },
    lastScore: { type: Number, default: 0 },
    lastTotalPoints: { type: Number, default: 0 }
  },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
