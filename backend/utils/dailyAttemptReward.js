import QuizAttempt from '../models/QuizAttempt.js';
import User from '../models/User.js';
import { dailyRewardFilter } from './dailyChallenge.js';
import { syncQuizLevel } from '../controllers/quizAttemptController.js';
import { trackCompetitiveXP } from '../controllers/competitiveController.js';

export async function settleDailyAttempt(attempt, calculateProgress, scoreField) {
  while (!attempt.result) {
    const progress = calculateProgress(attempt);
    const result = { ...progress, ended: true, stopped: !progress.ended };
    await QuizAttempt.updateOne({ _id: attempt._id, __v: attempt.__v, result: { $exists: false } },
      { $set: { result }, $inc: { __v: 1 } });
    attempt = await QuizAttempt.findById(attempt._id);
  }
  const rewarded = await User.findOneAndUpdate({ _id: attempt.userId,
    rewardedQuizAttempts: { $ne: attempt.token }, ...dailyRewardFilter() }, {
    $inc: { xp: attempt.result.xp }, $addToSet: { rewardedQuizAttempts: attempt.token },
    $set: { 'dailyChallenge.completedAt': new Date(),
      'dailyChallenge.lastCompleted': new Date().toISOString().slice(0, 10),
      'dailyChallenge.lastScore': attempt.result[scoreField],
      'dailyChallenge.lastTotalPoints': attempt.questions.length }
  }, { new: true });
  if (rewarded) {
    await syncQuizLevel(attempt.userId);
    await trackCompetitiveXP(attempt.userId, attempt.result.xp);
  }
  return attempt;
}
