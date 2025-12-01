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
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
