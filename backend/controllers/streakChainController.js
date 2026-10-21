import { randomBytes } from 'crypto';
import QuizAttempt from '../models/QuizAttempt.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { publicQuestion, validateAnswers } from '../utils/questionValidation.js';
import { dailyChallengeStatus } from '../utils/dailyChallenge.js';
import { chainProgress } from '../utils/streakChain.js';
import { settleDailyAttempt } from '../utils/dailyAttemptReward.js';

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const ownedChain = async req => {
  if (typeof req.body.attemptId !== 'string') throw fail('Missing Streak Chain session.');
  const attempt = await QuizAttempt.findOne({ token: req.body.attemptId, kind: 'chain', userId: req.userId });
  if (!attempt) throw fail('Streak Chain session not found.', 404);
  if (new Date(attempt.expiresAt) <= new Date()) throw fail('This Streak Chain has expired.', 410);
  return attempt;
};

const settleChain = attempt => settleDailyAttempt(attempt, chainProgress, 'streak');

const chainResponse = async attempt => {
  const progress = attempt.result || chainProgress(attempt);
  const user = await User.findById(attempt.userId);
  const awarded = Boolean(user?.rewardedQuizAttempts?.includes(attempt.token));
  const question = !attempt.result && !progress.ended ? attempt.questions[progress.answered] : null;
  return { attemptId: attempt.token, category: attempt.chainCategory, ...progress,
    finished: Boolean(attempt.result), question: question ? publicQuestion(question) : null,
    xpAwarded: awarded ? progress.xp : 0, userXp: user?.xp, userLevel: user?.level,
    nextAvailableAt: dailyChallengeStatus(user?.dailyChallenge).nextAvailableAt };
};

export const startStreakChain = async (req, res) => {
  try {
    if (req.body.attemptId) {
      let attempt = await ownedChain(req);
      if (attempt.result || chainProgress(attempt).ended) attempt = await settleChain(attempt);
      return res.json(await chainResponse(attempt));
    }
    const user = await User.findById(req.userId);
    if (!user) throw fail('User not found.', 404);
    if (dailyChallengeStatus(user.dailyChallenge).completed) throw fail('Your next daily challenge is not available yet.', 409);
    const { category, includeAcadnet } = req.body;
    if (!['LINUX', 'NETWORK', 'ARDUINO', 'ACADNET'].includes(category)) throw fail('Invalid category.');
    const filter = category === 'ACADNET' ? { type: 'acadnet' } : { tags: category };
    if (category === 'LINUX' && !includeAcadnet) filter.type = { $ne: 'acadnet' };
    const questions = await Question.aggregate([{ $match: filter }, { $sample: { size: 20 } }]);
    if (!questions.length) throw fail('No questions available in this category.');
    const attempt = await QuizAttempt.create({ token: randomBytes(32).toString('hex'), userId: req.userId,
      kind: 'chain', chainCategory: category, chainPrivilege: user.xpPrivilege || 1,
      questions, expiresAt: new Date(Date.now() + 86400000) });
    res.json(await chainResponse(attempt));
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
};

export const answerStreakChain = async (req, res) => {
  try {
    let attempt = await ownedChain(req);
    const { questionId, answers } = req.body;
    const question = attempt.questions.find(q => String(q._id) === questionId);
    if (!question) throw fail('Question is not part of this chain.');
    validateAnswers(question, answers);
    if (!attempt.checked.has(questionId)) {
      const progress = chainProgress(attempt);
      if (attempt.result || progress.ended || String(attempt.questions[progress.answered]._id) !== questionId) {
        throw fail('Answer the current question first.', 409);
      }
      await QuizAttempt.updateOne({ _id: attempt._id, __v: attempt.__v, result: { $exists: false },
        [`checked.${questionId}`]: { $exists: false } },
      { $set: { [`checked.${questionId}`]: answers }, $inc: { __v: 1 } });
      attempt = await QuizAttempt.findById(attempt._id);
      if (!attempt.checked.has(questionId)) throw fail('The chain changed. Please reload to continue.', 409);
    }
    const selectedAnswers = attempt.checked.get(questionId);
    if (attempt.result || chainProgress(attempt).ended) attempt = await settleChain(attempt);
    res.json({ ...await chainResponse(attempt), feedback: { questionId,
      correct: validateAnswers(question, selectedAnswers), correctAnswers: question.correctAnswers, selectedAnswers } });
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
};

export const finishStreakChain = async (req, res) => {
  try {
    const attempt = await settleChain(await ownedChain(req));
    res.json(await chainResponse(attempt));
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
};
