import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'helper', 'mod', 'head-mod', 'admin', 'head-admin', 'root'], 
    default: 'user' 
  },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  sentFriendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  solvedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  solvedByTag: {
    LINUX: { type: Number, default: 0 },
    NETWORK: { type: Number, default: 0 }
  },
  solvedTerminalQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Terminal' }],
  terminalStats: {
    solved: { type: Number, default: 0 }
  },
  solvedIS: [{ type: mongoose.Schema.Types.ObjectId, ref: 'IS' }],
  isStats: {
    solved: { type: Number, default: 0 }
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
  arenaStats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    totalXP: { type: Number, default: 0 },
    matchHistory: [{
      matchId: String,
      opponent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      opponentName: String,
      myScore: Number,
      opponentScore: Number,
      result: { type: String, enum: ['win', 'loss', 'draw'] },
      mode: { type: String, enum: ['normal', 'bloody'] },
      category: String,
      xpGained: Number,
      date: { type: Date, default: Date.now }
    }]
  },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
