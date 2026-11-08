import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 160 },
  description: { type: String, required: true, maxlength: 6000 },
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, required: true },
  difficulty: { type: String, enum: ['easy', 'normal', 'hard', 'unrated'], required: true },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Freeze the selected question content so later bank edits do not change a contest.
  questions: { type: [mongoose.Schema.Types.Mixed], required: true, select: false },
  questionCount: { type: Number, required: true },
  totalPoints: { type: Number, required: true },
  revision: { type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.model('Event', schema);
