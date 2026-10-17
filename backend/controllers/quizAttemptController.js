import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import QuizAttempt from '../models/QuizAttempt.js';
import Question from '../models/Question.js';
import Exam from '../models/Exam.js';
import User from '../models/User.js';
import { publicQuestion, validateAnswers } from '../utils/questionValidation.js';
import { levelFromXp, applyPrivilege } from '../utils/xpUtils.js';
import { calculateXPWithBoosts } from './shopController.js';
import { trackCompetitiveXP } from './competitiveController.js';
import { updateUserStreak, getStreakInfo } from '../utils/streakUtils.js';

export const optionalQuizAuth = (req, res, next) => {
  if (!req.cookies?.token) return next();
  try {
    req.userId = jwt.verify(req.cookies.token, process.env.JWT_SECRET).userId;
    next();
  } catch {
    // An expired login must not prevent visitors from practicing without an account.
    next();
  }
};

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const ownedAttempt = async (req) => {
  if (typeof req.body.attemptId !== 'string') throw fail('Missing quiz session. Please reload the quiz.');
  const attempt = await QuizAttempt.findOne({ token: req.body.attemptId, expiresAt: { $gt: new Date() } });
  if (!attempt || String(attempt.userId || '') !== String(req.userId || '')) throw fail('Quiz session not found', 404);
  return attempt;
};
const corrections = (attempt) => attempt.questions.map(q => ({ _id: q._id, correctAnswers: q.correctAnswers }));

export const startQuizAttempt = async (req, res) => {
  try {
    const { kind, examId, attemptId, category, includeAcadnet, type, tags, chapters } = req.body;
    if (!['exam', 'daily', 'random'].includes(kind)) throw fail('Invalid quiz mode');
    if (attemptId) {
      const attempt = await ownedAttempt(req);
      if (attempt.kind !== kind || (kind === 'exam' && attempt.examId !== examId)) throw fail('Quiz session mismatch');
      return res.json({ attemptId: attempt.token, questions: attempt.questions.map(publicQuestion),
        checked: Object.fromEntries(attempt.checked), result: attempt.result,
        corrections: corrections(attempt).filter(q => attempt.result || attempt.checked.has(String(q._id))) });
    }
    const filter = {};
    let exam;
    if (kind === 'exam') {
      if (typeof examId !== 'string') throw fail('Invalid exam');
      exam = await Exam.findOne({ id: examId });
      if (!exam) throw fail('Exam not found', 404);
      filter.tags = exam.tag;
    } else if (kind === 'daily') {
      filter.tags = category === 'NETWORK' ? 'NETWORK' : 'LINUX';
      if (category !== 'NETWORK' && !includeAcadnet) filter.type = { $ne: 'acadnet' };
    } else {
      if (['basic', 'all', 'acadnet'].includes(type)) filter.type = type;
      const conditions = [];
      if (typeof tags === 'string' && tags) conditions.push({ tags: { $in: tags.split(',') } });
      if (typeof chapters === 'string' && chapters) conditions.push({ tags: { $in: chapters.split(',') } });
      if (conditions.length) filter.$and = conditions;
    }
    const questions = kind === 'exam' ? await Question.find(filter).lean() :
      await Question.aggregate([{ $match: filter }, { $sample: { size: kind === 'daily' ? 20 : 50 } }]);
    if (!questions.length) throw fail('No questions available');
    const attempt = await QuizAttempt.create({ token: randomBytes(32).toString('hex'), userId: req.userId || null,
      kind, examId: exam?.id, examTitle: exam?.title, examTag: exam?.tag,
      day: new Date().toISOString().slice(0, 10), questions,
      expiresAt: new Date(Date.now() + 7 * 86400000) });
    res.json({ attemptId: attempt.token, questions: questions.map(publicQuestion) });
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
};

export const checkQuizAnswer = async (req, res) => {
  try {
    const { questionId, answers, attemptId } = req.body;
    let question;
    let selected = answers;
    if (attemptId) {
      let attempt = await ownedAttempt(req);
      question = attempt.questions.find(q => String(q._id) === questionId);
      if (!question) throw fail('Question is not part of this quiz');
      validateAnswers(question, answers);
      if (!attempt.result) {
        // The first checked answer is final, even if the browser retries or changes it.
        await QuizAttempt.updateOne({ _id: attempt._id, result: { $exists: false },
          [`checked.${questionId}`]: { $exists: false } }, { $set: { [`checked.${questionId}`]: answers }, $inc: { __v: 1 } });
        attempt = await QuizAttempt.findById(attempt._id);
      }
      selected = attempt.checked.get(questionId) || (attempt.result ? [] : answers);
    } else {
      if (typeof questionId !== 'string' || !/^[a-f\d]{24}$/i.test(questionId)) throw fail('Invalid question');
      question = await Question.findById(questionId);
      if (!question) throw fail('Question not found', 404);
    }
    const correct = validateAnswers(question, selected);
    res.json({ correct, correctAnswers: question.correctAnswers, selectedAnswers: selected });
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
};

export const finishQuizAttempt = (expectedKind) => async (req, res) => {
  try {
    let attempt = await ownedAttempt(req);
    if (expectedKind && attempt.kind !== expectedKind) throw fail('Quiz session mismatch');
    if (attempt.kind === 'daily' && attempt.day !== new Date().toISOString().slice(0, 10)) {
      throw fail('This daily challenge has expired. Please start today\'s challenge.');
    }
    while (!attempt.result) {
      const answers = req.body.answers;
      if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw fail('Missing quiz answers');
      const ids = new Set(attempt.questions.map(q => String(q._id)));
      if (Object.keys(answers).some(id => !ids.has(id))) throw fail('Answers contain unknown questions');
      let score = 0, totalPoints = 0, correctAnswers = 0;
      const submitted = {};
      for (const question of attempt.questions) {
        const id = String(question._id);
        const selected = attempt.checked.get(id) || answers[id] || [];
        const correct = validateAnswers(question, selected);
        submitted[id] = selected;
        totalPoints += question.points || 1;
        if (correct) { score += question.points || 1; correctAnswers++; }
      }
      // Freeze the result atomically. Parallel finish requests use the same result.
      const frozen = await QuizAttempt.updateOne({ _id: attempt._id, __v: attempt.__v, result: { $exists: false } },
        { $set: { result: { score, totalPoints, correctAnswers, totalQuestions: attempt.questions.length }, checked: submitted },
          $inc: { __v: 1 } });
      if (frozen.matchedCount) break;
      attempt = await ownedAttempt(req);
    }
    const finalized = await QuizAttempt.findById(attempt._id);
    const result = finalized.result;
    let user = req.userId ? await User.findById(req.userId) : null;
    let xpGained = 0;
    let awarded = false;
    if (req.userId && !user) throw fail('User not found', 404);
    if (user) {
      xpGained = attempt.kind === 'daily' ? applyPrivilege(result.score * 2, user) :
        attempt.kind === 'random' ? applyPrivilege(result.score, user) : await calculateXPWithBoosts(user._id, result.score);
      const filter = { _id: user._id, rewardedQuizAttempts: { $ne: attempt.token } };
      const update = { $inc: { xp: xpGained }, $addToSet: { rewardedQuizAttempts: attempt.token } };
      if (attempt.kind === 'daily') {
        filter['dailyChallenge.lastCompleted'] = { $ne: attempt.day };
        update.$set = { 'dailyChallenge.lastCompleted': attempt.day,
          'dailyChallenge.lastScore': result.score, 'dailyChallenge.lastTotalPoints': result.totalPoints };
      }
      if (attempt.kind === 'exam') {
        update.$push = { simulations: { examId: attempt.examId, examTitle: attempt.examTitle, examTag: attempt.examTag,
          ...result, date: new Date() } };
        if (result.correctAnswers > 0) {
          await updateUserStreak(user);
          update.$set = { streak: user.streak.toObject() };
        }
      }
      // Receipt and XP change in the same document: retries cannot pay twice.
      const rewarded = await User.findOneAndUpdate(filter, update, { new: true });
      awarded = Boolean(rewarded);
      if (awarded) {
        await syncQuizLevel(user._id);
        await trackCompetitiveXP(user._id, xpGained);
        if (attempt.kind === 'exam') await Exam.updateOne({ id: attempt.examId }, { $inc: { usage_ctn: 1 } });
      }
      user = await User.findById(user._id);
    }
    res.json({ success: true, ...result, corrections: corrections(finalized),
      selectedAnswers: Object.fromEntries(finalized.checked), alreadyRewarded: !awarded,
      xpGained: awarded ? xpGained : 0, xp: user?.xp, level: user?.level,
      streak: user ? getStreakInfo(user) : undefined, challengeCompleted: attempt.kind === 'daily' });
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
};

export const syncQuizLevel = async (userId) => {
  // Conditional update avoids overwriting a newer XP total from another request.
  for (;;) {
    const user = await User.findById(userId).select('xp level');
    if (!user) return;
    const result = await User.updateOne({ _id: userId, xp: user.xp }, { $set: { level: levelFromXp(user.xp) } });
    if (result.matchedCount) return;
  }
};
