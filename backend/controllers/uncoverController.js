import { randomBytes } from 'crypto';
import QuizAttempt from '../models/QuizAttempt.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { dailyChallengeStatus } from '../utils/dailyChallenge.js';
import { settleDailyAttempt } from '../utils/dailyAttemptReward.js';
import { uncoverProgress, uncoverDecisionKey } from '../utils/uncover.js';

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const ownedUncover = async req => {
  if (typeof req.body.attemptId !== 'string') throw fail('Missing Uncover session.');
  const attempt = await QuizAttempt.findOne({ token: req.body.attemptId, kind: 'uncover', userId: req.userId });
  if (!attempt) throw fail('Uncover session not found.', 404);
  if (new Date(attempt.expiresAt) <= new Date()) throw fail('This Uncover session has expired.', 410);
  return attempt;
};
const settle = attempt => settleDailyAttempt(attempt, uncoverProgress, 'completedQuestions');

const uncoverResponse = async attempt => {
  const progress = attempt.result || uncoverProgress(attempt);
  const user = await User.findById(attempt.userId);
  const awarded = Boolean(user?.rewardedQuizAttempts?.includes(attempt.token));
  const question = !attempt.result && !progress.ended ? attempt.questions[progress.questionIndex] : null;
  // Do not send the unseen options or any solution. Each decision unlocks only
  // the next option, and a question pays only after every decision is correct.
  return { attemptId: attempt.token, category: attempt.challengeCategory, ...progress,
    finished: Boolean(attempt.result),
    question: question ? { _id: question._id, title: question.title, points: question.points || 1,
      multipleCorrect: question.correctAnswers.length > 1 } : null,
    option: question ? { index: progress.optionIndex, text: question.answers[progress.optionIndex], total: question.answers.length } : null,
    revealed: question ? question.answers.slice(0, progress.optionIndex).map((text, index) => ({ text, index,
      isCorrect: attempt.uncoverDecisions.get(uncoverDecisionKey(question._id, index)) })) : [],
    xpAwarded: awarded ? progress.xp : 0, userXp: user?.xp, userLevel: user?.level,
    nextAvailableAt: dailyChallengeStatus(user?.dailyChallenge).nextAvailableAt };
};

export const startUncover = async (req, res) => {
  try {
    if (req.body.attemptId) {
      let attempt = await ownedUncover(req);
      if (attempt.result || uncoverProgress(attempt).ended) attempt = await settle(attempt);
      return res.json(await uncoverResponse(attempt));
    }
    const user = await User.findById(req.userId);
    if (!user) throw fail('User not found.', 404);
    if (dailyChallengeStatus(user.dailyChallenge).completed) throw fail('Your next daily challenge is not available yet.', 409);
    const { category, includeAcadnet } = req.body;
    if (!['LINUX', 'NETWORK', 'ARDUINO', 'ACADNET'].includes(category)) throw fail('Invalid category.');
    const filter = category === 'ACADNET' ? { type: 'acadnet' } : { tags: category };
    if (category === 'LINUX' && !includeAcadnet) filter.type = { $ne: 'acadnet' };
    const questions = await Question.aggregate([{ $match: filter }, { $sample: { size: 10 } }]);
    if (!questions.length) throw fail('No questions available in this category.');
    const attempt = await QuizAttempt.create({ token: randomBytes(32).toString('hex'), userId: req.userId,
      kind: 'uncover', challengeCategory: category, challengePrivilege: user.xpPrivilege || 1,
      questions, expiresAt: new Date(Date.now() + 86400000) });
    res.json(await uncoverResponse(attempt));
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
};

export const answerUncover = async (req, res) => {
  try {
    let attempt = await ownedUncover(req);
    const { questionId, optionIndex, isCorrect } = req.body;
    const questionIndex = attempt.questions.findIndex(question => String(question._id) === questionId);
    const question = attempt.questions[questionIndex];
    if (!question || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.answers.length || typeof isCorrect !== 'boolean') {
      throw fail('Invalid answer decision.');
    }
    const key = uncoverDecisionKey(questionId, optionIndex);
    if (!attempt.uncoverDecisions.has(key)) {
      const progress = uncoverProgress(attempt);
      if (attempt.result || progress.ended || progress.questionIndex !== questionIndex || progress.optionIndex !== optionIndex) {
        throw fail('Decide on the current answer first.', 409);
      }
      await QuizAttempt.updateOne({ _id: attempt._id, __v: attempt.__v, result: { $exists: false },
        [`uncoverDecisions.${key}`]: { $exists: false } },
      { $set: { [`uncoverDecisions.${key}`]: isCorrect }, $inc: { __v: 1 } });
      attempt = await QuizAttempt.findById(attempt._id);
      if (!attempt.uncoverDecisions.has(key)) throw fail('The session changed. Please reload to continue.', 409);
    }
    const decision = attempt.uncoverDecisions.get(key);
    const expected = question.correctAnswers.includes(optionIndex);
    if (attempt.result || uncoverProgress(attempt).ended) attempt = await settle(attempt);
    res.json({ ...await uncoverResponse(attempt), feedback: { questionId, title: question.title,
      optionIndex, text: question.answers[optionIndex], decision, isCorrect: expected, correct: decision === expected } });
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
};

export const finishUncover = async (req, res) => {
  try { res.json(await uncoverResponse(await settle(await ownedUncover(req)))); }
  catch (error) { res.status(error.status || 500).json({ message: error.message }); }
};
