import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Question from '../models/Question.js';
import QuizAttempt from '../models/QuizAttempt.js';
import CompetitivePeriod from '../models/CompetitivePeriod.js';
import SeasonPass from '../models/SeasonPass.js';
import Exam from '../models/Exam.js';
import { validateAnswers, publicQuestion, hideArenaSolutions } from '../utils/questionValidation.js';
import { checkQuizAnswer, finishQuizAttempt, startQuizAttempt } from '../controllers/quizAttemptController.js';
import { markSolved } from '../controllers/questionController.js';

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; } });
const question = (correctAnswers = [1], points = 3) => ({ _id: new mongoose.Types.ObjectId(),
  title: 'Example', answers: ['A', 'B', 'C'], correctAnswers, points, tags: ['LINUX'], type: 'all' });

test('grades answer sets, including multiple answers and unanswered questions', () => {
  const q = question([0, 2]);
  assert.equal(validateAnswers(q, [2, 0]), true);
  assert.equal(validateAnswers(q, [0]), false);
  assert.equal(validateAnswers(q, []), false);
});

test('rejects absent, duplicate, noninteger, negative and out-of-range answers', () => {
  for (const value of [undefined, null, '1', [1, 1], ['1'], [-1], [3], [1.5]]) {
    assert.throws(() => validateAnswers(question(), value), { status: 400 });
  }
});

test('public questions omit both solution formats without mutating stored data', () => {
  const q = { ...question(), correctIndex: 1 };
  const publicData = publicQuestion(q);
  assert.equal('correctAnswers' in publicData, false);
  assert.equal('correctIndex' in publicData, false);
  assert.deepEqual(q.correctAnswers, [1]);
});

function setup(t, kind = 'random') {
  const questions = [question(), question([0, 2], 5)];
  const user = new User({ username: 'test', email: 'test@example.com', password: 'unused', xp: 90, xpPrivilege: 2 });
  const pass = new SeasonPass({ number: 1, name: 'Test', isActive: true, totalLevels: 10, xpPerLevel: 100 });
  const attempt = new QuizAttempt({ token: 'test-session', userId: user._id, kind, questions,
    day: new Date().toISOString().slice(0, 10), expiresAt: new Date(Date.now() + 60000), __v: 0,
    examId: 'exam', examTitle: 'Server title', examTag: 'LINUX' });
  t.mock.method(user, 'save', async () => user);
  t.mock.method(User, 'findById', () => Object.assign(Promise.resolve(user), { select: () => Promise.resolve(user) }));
  t.mock.method(User, 'updateOne', async (filter, update) => {
    if (filter.xp !== user.xp) return { matchedCount: 0 };
    user.set(update.$set);
    return { matchedCount: 1 };
  });
  t.mock.method(User, 'findOneAndUpdate', async (filter, update) => {
    if (filter.rewardedQuizAttempts && user.rewardedQuizAttempts.includes(filter.rewardedQuizAttempts.$ne)) return null;
    if (filter['dailyChallenge.lastCompleted'] && user.dailyChallenge.lastCompleted === filter['dailyChallenge.lastCompleted'].$ne) return null;
    if (filter.solvedQuestions && user.solvedQuestions.some(id => String(id) === String(filter.solvedQuestions.$ne))) return null;
    for (const [key, value] of Object.entries(update.$inc || {})) user.set(key, (user.get(key) || 0) + value);
    for (const [key, value] of Object.entries(update.$addToSet || {})) user.get(key).push(value);
    for (const [key, value] of Object.entries(update.$push || {})) user.get(key).push(value);
    if (update.$set) user.set(update.$set);
    return user;
  });
  t.mock.method(CompetitivePeriod, 'findOne', async () => ({ endDate: new Date(Date.now() + 60000) }));
  t.mock.method(SeasonPass, 'findOne', async () => pass);
  t.mock.method(Exam, 'updateOne', async () => ({ matchedCount: 1 }));
  t.mock.method(QuizAttempt, 'findOne', async () => attempt);
  t.mock.method(QuizAttempt, 'findById', async () => attempt);
  t.mock.method(QuizAttempt, 'updateOne', async (filter, update) => {
    if (attempt.result || (filter.__v !== undefined && filter.__v !== attempt.__v)) return { matchedCount: 0 };
    const checkedPath = Object.keys(filter).find(key => key.startsWith('checked.'));
    if (checkedPath && attempt.checked.has(checkedPath.slice(8))) return { matchedCount: 0 };
    attempt.set(update.$set);
    attempt.__v++;
    return { matchedCount: 1 };
  });
  const answers = Object.fromEntries(questions.map(q => [String(q._id), q.correctAnswers]));
  const req = { userId: String(user._id), body: { attemptId: attempt.token, answers, score: 999999, totalPoints: 999999 } };
  return { user, attempt, questions, req };
}

test('Random 50 ignores claimed score, pays once, and tracks competitive and season XP', async t => {
  const { user, req } = setup(t);
  const first = response();
  await finishQuizAttempt('random')(req, first);
  assert.equal(first.statusCode, 200);
  assert.equal(first.body.score, 8);
  assert.equal(first.body.totalPoints, 8);
  assert.equal(first.body.xpGained, 16);
  assert.equal(user.xp, 106);
  assert.equal(user.level, 2);
  assert.equal(user.competitiveStats.currentPeriodXP, 16);
  assert.equal(user.seasonPass.xp, 16);
  const replay = response();
  await finishQuizAttempt('random')(req, replay);
  assert.equal(replay.body.xpGained, 0);
  assert.equal(user.xp, 106);
  assert.equal(user.competitiveStats.currentPeriodXP, 16);
  assert.equal(user.seasonPass.xp, 16);
});

test('parallel finish requests cannot pay the same attempt twice', async t => {
  const { user, req } = setup(t);
  await Promise.all([finishQuizAttempt('random')(req, response()), finishQuizAttempt('random')(req, response())]);
  assert.equal(user.xp, 106);
  assert.equal(user.rewardedQuizAttempts.length, 1);
});

test('Daily Challenge preserves double XP and privilege, and only pays once per day', async t => {
  const { user, req, attempt } = setup(t, 'daily');
  const first = response();
  await finishQuizAttempt('daily')(req, first);
  assert.equal(first.body.xpGained, 32);
  assert.equal(user.dailyChallenge.lastScore, 8);
  attempt.token = 'another-attempt';
  req.body.attemptId = attempt.token;
  const second = response();
  await finishQuizAttempt('daily')(req, second);
  assert.equal(second.body.xpGained, 0);
  assert.equal(user.xp, 122);
});

test('exam history uses server metadata, preserves boost, streak and season tracking', async t => {
  const { user, req } = setup(t, 'exam');
  user.activeBoosts.push({ type: 'xp_multiplier', multiplier: 3, expiresAt: new Date(Date.now() + 60000) });
  req.body.examTitle = 'Forged title';
  const res = response();
  await finishQuizAttempt('exam')(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.xpGained, 48);
  assert.equal(user.simulations[0].examTitle, 'Server title');
  assert.equal(user.simulations[0].score, 8);
  assert.equal(user.streak.current, 1);
  assert.equal(user.competitiveStats.currentPeriodXP, 48);
  assert.equal(user.seasonPass.xp, 48);
  await finishQuizAttempt('exam')(req, response());
  assert.equal(user.simulations.length, 1);
});

test('checked wrong answers stay wrong when final payload replaces them', async t => {
  const { req, questions, attempt } = setup(t);
  const id = String(questions[0]._id);
  const check = response();
  await checkQuizAnswer({ userId: req.userId, body: { attemptId: attempt.token, questionId: id, answers: [0] } }, check);
  assert.equal(check.body.correct, false);
  const repeated = response();
  await checkQuizAnswer({ userId: req.userId, body: { attemptId: attempt.token, questionId: id, answers: [1] } }, repeated);
  assert.equal(repeated.body.correct, false);
  const finish = response();
  await finishQuizAttempt('random')(req, finish);
  assert.equal(finish.body.score, 5);
});

test('rejects another user, another mode, unknown questions and invalid answer sets', async t => {
  const { req } = setup(t);
  for (const request of [
    { ...req, userId: String(new mongoose.Types.ObjectId()) },
    { ...req, body: { ...req.body, answers: { fake: [1] } } },
    { ...req, body: { ...req.body, answers: Object.fromEntries(Object.keys(req.body.answers).map(id => [id, [1, 1]])) } },
  ]) {
    const res = response();
    await finishQuizAttempt('random')(request, res);
    assert.ok(res.statusCode >= 400);
  }
  const res = response();
  await finishQuizAttempt('exam')(req, res);
  assert.equal(res.statusCode, 400);
});

test('practice requires the actual answer and pays a solved question only once', async t => {
  const { user, questions } = setup(t);
  const q = questions[0];
  t.mock.method(Question, 'findById', async () => q);
  const req = { userId: String(user._id), body: { questionId: String(q._id) } };
  const missing = response();
  await markSolved(req, missing);
  assert.equal(missing.statusCode, 400);
  assert.equal(user.xp, 90);
  req.body.answers = [0];
  const wrong = response();
  await markSolved(req, wrong);
  assert.equal(wrong.body.correct, false);
  assert.equal(user.xp, 90);
  req.body.answers = [1];
  await markSolved(req, response());
  await markSolved(req, response());
  assert.equal(user.xp, 96);
  assert.equal(user.solvedQuestions.length, 1);
  assert.equal(user.solvedByTag.LINUX, 1);
  assert.equal(user.streak.current, 1);
  assert.equal(user.competitiveStats.currentPeriodXP, 6);
  assert.equal(user.seasonPass.xp, 6);
});

test('resuming reveals corrections only for checked questions', async t => {
  const { req, attempt, questions } = setup(t, 'exam');
  attempt.checked.set(String(questions[0]._id), [0]);
  req.body.kind = 'exam'; req.body.examId = 'exam';
  const res = response();
  await startQuizAttempt(req, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.questions.every(q => !('correctAnswers' in q)));
  assert.equal(res.body.corrections.length, 1);
});

test('old score-only requests are rejected without awarding XP', async t => {
  const { user, req } = setup(t);
  const res = response();
  await finishQuizAttempt('random')({ userId: req.userId, body: { score: 999999, totalPoints: 999999 } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(user.xp, 90);
});

test('anonymous visitors receive a verified result without creating rewards', async t => {
  const { user, req, attempt } = setup(t);
  attempt.userId = null;
  delete req.userId;
  const res = response();
  await finishQuizAttempt()(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.score, 8);
  assert.equal(user.xp, 90);
  assert.equal(user.rewardedQuizAttempts.length, 0);
});

test('expired daily attempts cannot claim a reward', async t => {
  const { user, req, attempt } = setup(t, 'daily');
  attempt.day = '2000-01-01';
  const res = response();
  await finishQuizAttempt('daily')(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(user.xp, 90);
});

test('new random sessions select questions on the server and never expose solutions', async t => {
  const { req, questions } = setup(t);
  const aggregate = t.mock.method(Question, 'aggregate', async () => questions);
  t.mock.method(QuizAttempt, 'create', async data => new QuizAttempt(data));
  req.body = { kind: 'random', type: 'all', tags: 'LINUX', chapters: 'CHAPTER3' };
  const res = response();
  await startQuizAttempt(req, res);
  assert.equal(res.statusCode, 200);
  const pipeline = aggregate.mock.calls[0].arguments[0];
  assert.deepEqual(pipeline[1], { $sample: { size: 50 } });
  assert.equal(pipeline[0].$match.type, 'all');
  assert.equal(pipeline[0].$match.$and.length, 2);
  assert.ok(res.body.questions.every(q => !('correctAnswers' in q)));
});

test('arena hides unsubmitted solutions and keeps checked question feedback', () => {
  const first = question(), second = question();
  const req = { userId: 'creator' };
  const res = response();
  hideArenaSolutions(req, res, () => {});
  res.json({ match: { creator: 'creator', status: 'active', questions: [first, second],
    creatorAnswers: { [String(first._id)]: [1] } } });
  assert.deepEqual(res.body.match.questions[0].correctAnswers, [1]);
  assert.equal('correctAnswers' in res.body.match.questions[1], false);
});
