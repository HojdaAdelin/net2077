import { useItem } from '../controllers/shopController.js';
import ShopItem from '../models/ShopItem.js';
import { dailyChallengeStatus } from '../utils/dailyChallenge.js';
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
    if (filter.$expr && !filter.$expr.$and.every(({ $eq: [field, expected] }) => {
      const [path, fallback] = field.$ifNull;
      const value = user.get(path.slice(1)) ?? fallback.$literal;
      return JSON.stringify(value) === JSON.stringify(expected.$literal);
    })) return null;
    if (filter.rewardedQuizAttempts && user.rewardedQuizAttempts.includes(filter.rewardedQuizAttempts.$ne)) return null;
    if (filter.$or && !filter.$or.some(condition => Object.entries(condition).every(([path, expected]) => {
      const value = user.get(path);
      if (expected === null) return value == null;
      if ('$lte' in expected) return value != null && new Date(value) <= expected.$lte;
      return value !== expected.$ne;
    }))) return null;
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
  return { user, attempt, questions, req, pass };
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

test('Daily Challenge preserves double XP and privilege, and only pays once within 24 hours', async t => {
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

// Independent hydrated snapshots reproduce reads from separate MongoDB requests.
function practiceSetup(t) {
  const fixture = setup(t);
  t.mock.method(User, 'findById', async () => new User(fixture.user.toObject()));
  t.mock.method(Question, 'findById', async id => fixture.questions.find(q => String(q._id) === String(id)));
  const request = (q = fixture.questions[0]) => ({ userId: String(fixture.user._id),
    body: { questionId: String(q._id), answers: q.correctAnswers } });
  return { ...fixture, request };
}

test('practice combines all rewards in one write and performs five DB operations', async t => {
  const { user, request } = practiceSetup(t);
  const res = response();
  await markSolved(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.xp, 96);
  assert.equal(user.competitiveStats.currentPeriodXP, 6);
  assert.equal(user.seasonPass.xp, 6);
  assert.equal(User.findById.mock.callCount(), 1);
  assert.equal(Question.findById.mock.callCount(), 1);
  assert.equal(CompetitivePeriod.findOne.mock.callCount(), 1);
  assert.equal(SeasonPass.findOne.mock.callCount(), 1);
  assert.equal(User.findOneAndUpdate.mock.callCount(), 1);
  assert.equal(User.updateOne.mock.callCount(), 0);
  const [filter, update] = User.findOneAndUpdate.mock.calls[0].arguments;
  // Validate the actual Mongoose filter/update casting without connecting to DB.
  const query = mongoose.Model.findOneAndUpdate.call(User, filter, update);
  assert.doesNotThrow(() => query.cast(User));
  assert.equal(update.$inc['competitiveStats.currentPeriodXP'], 6);
  assert.equal(update.$set.level, 1);
});

test('parallel practice requests for one question award every reward only once', async t => {
  const { user, request } = practiceSetup(t);
  const results = [response(), response()];
  await Promise.all(results.map(res => markSolved(request(), res)));
  assert.ok(results.every(res => res.statusCode === 200));
  assert.equal(user.xp, 96);
  assert.equal(user.competitiveStats.currentPeriodXP, 6);
  assert.equal(user.seasonPass.xp, 6);
  assert.equal(user.dailyActivity[0].count, 1);
  assert.equal(user.solvedQuestions.length, 1);
  assert.equal(results.filter(res => res.body.alreadySolved).length, 1);
});

test('parallel practice solves retry stale snapshots and retain both rewards and activity', async t => {
  const { user, questions, request } = practiceSetup(t);
  const results = questions.map(() => response());
  await Promise.all(questions.map((q, i) => markSolved(request(q), results[i])));
  assert.ok(results.every(res => res.statusCode === 200));
  assert.equal(user.xp, 106);
  assert.equal(user.level, 2);
  assert.equal(user.competitiveStats.currentPeriodXP, 16);
  assert.equal(user.seasonPass.xp, 16);
  assert.equal(user.dailyActivity[0].count, 2);
  assert.equal(user.solvedByTag.LINUX, 2);
  assert.equal(user.solvedQuestions.length, 2);
});

test('practice preserves premium, claimed rewards and season XP cap with active boosts', async t => {
  const { user, pass, request } = practiceSetup(t);
  user.activeBoosts.push({ type: 'xp_multiplier', multiplier: 3, expiresAt: new Date(Date.now() + 60000) });
  user.seasonPass = { passId: pass._id, xp: 995, level: 9, isPremium: true,
    claimedLevels: { free: [1], premium: [1] } };
  const res = response();
  await markSolved(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.xp, 108);
  assert.equal(user.level, 2);
  assert.equal(user.competitiveStats.currentPeriodXP, 18);
  assert.equal(user.seasonPass.xp, 1000);
  assert.equal(user.seasonPass.level, 10);
  assert.equal(user.seasonPass.isPremium, true);
  assert.deepEqual([...user.seasonPass.claimedLevels.free], [1]);
  assert.deepEqual([...user.seasonPass.claimedLevels.premium], [1]);
});

test('practice ignores and removes expired boosts and supports no active season', async t => {
  const { user, request } = practiceSetup(t);
  user.activeBoosts.push({ type: 'xp_multiplier', multiplier: 3, expiresAt: new Date(0) });
  t.mock.method(SeasonPass, 'findOne', async () => null);
  const res = response();
  await markSolved(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.xp, 96);
  assert.equal(user.competitiveStats.currentPeriodXP, 6);
  assert.equal(user.activeBoosts.length, 0);
  assert.equal(user.seasonPass.xp, 0);
});

test('practice resets rewards only on entering a different season', async t => {
  const { user, pass, request } = practiceSetup(t);
  user.seasonPass = { passId: new mongoose.Types.ObjectId(), xp: 500, level: 5,
    isPremium: true, claimedLevels: { free: [1], premium: [1] } };
  const res = response();
  await markSolved(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(String(user.seasonPass.passId), String(pass._id));
  assert.equal(user.seasonPass.xp, 6);
  assert.equal(user.seasonPass.level, 0);
  assert.equal(user.seasonPass.isPremium, false);
  assert.equal(user.seasonPass.claimedLevels.free.length, 0);
});

test('wrong and already solved practice answers skip reward queries and writes', async t => {
  const { user, request } = practiceSetup(t);
  const wrong = request();
  wrong.body.answers = [0];
  const res = response();
  await markSolved(wrong, res);
  assert.equal(res.body.correct, false);
  assert.equal(user.xp, 90);
  assert.equal(CompetitivePeriod.findOne.mock.callCount(), 0);
  assert.equal(SeasonPass.findOne.mock.callCount(), 0);
  assert.equal(User.findOneAndUpdate.mock.callCount(), 0);
  await markSolved(request(), response());
  const replay = response();
  await markSolved(request(), replay);
  assert.equal(replay.body.alreadySolved, true);
  assert.equal(CompetitivePeriod.findOne.mock.callCount(), 1);
  assert.equal(SeasonPass.findOne.mock.callCount(), 1);
  assert.equal(User.findOneAndUpdate.mock.callCount(), 1);
});

test('a season purchase between read and write is preserved after retry', async t => {
  const { user, pass, request } = practiceSetup(t);
  user.seasonPass.passId = pass._id;
  const write = User.findOneAndUpdate;
  let first = true;
  t.mock.method(User, 'findOneAndUpdate', async (...args) => {
    if (first) {
      first = false;
      user.seasonPass.isPremium = true;
      user.seasonPass.claimedLevels.premium.push(1);
    }
    return write(...args);
  });
  const res = response();
  await markSolved(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.xp, 96);
  assert.equal(user.seasonPass.isPremium, true);
  assert.deepEqual([...user.seasonPass.claimedLevels.premium], [1]);
  assert.equal(user.seasonPass.xp, 6);
  assert.equal(User.findOneAndUpdate.mock.callCount(), 2);
});


test('daily Arduino uses its category and never exposes solutions', async t => {
  const { req, questions } = setup(t, 'daily');
  req.body = { kind: 'daily', category: 'ARDUINO' };
  const aggregate = t.mock.method(Question, 'aggregate', async () => questions);
  t.mock.method(QuizAttempt, 'create', async data => new QuizAttempt(data));
  const res = response();
  await startQuizAttempt(req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(aggregate.mock.calls[0].arguments[0][0], { $match: { tags: 'ARDUINO' } });
  assert.equal('correctAnswers' in res.body.questions[0], false);
});

test('daily start is blocked across midnight until 24 hours have elapsed', async t => {
  const { user, req } = setup(t, 'daily');
  user.dailyChallenge.completedAt = new Date(Date.now() - 23 * 3600000);
  user.dailyChallenge.lastCompleted = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  req.body = { kind: 'daily', category: 'LINUX' };
  const res = response();
  await startQuizAttempt(req, res);
  assert.equal(res.statusCode, 409);
});

test('daily completion can award again after 24 hours', async t => {
  const { user, req } = setup(t, 'daily');
  user.dailyChallenge.completedAt = new Date(Date.now() - 25 * 3600000);
  const res = response();
  await finishQuizAttempt('daily')(req, res);
  assert.equal(res.body.xpGained, 32);
  assert.ok(Date.now() - user.dailyChallenge.completedAt.getTime() < 5000);
});

test('distinct daily sessions grant double XP only once', async t => {
  const { user, req, attempt } = setup(t, 'daily');
  // Distinct sessions bypass the receipt guard; the cooldown is still atomic.
  user.rewardedQuizAttempts = ['another-session'];
  const first = response();
  await finishQuizAttempt('daily')(req, first);
  attempt.token = 'parallel-session';
  req.body.attemptId = attempt.token;
  const second = response();
  await finishQuizAttempt('daily')(req, second);
  assert.equal(first.body.xpGained, 32);
  assert.equal(second.body.xpGained, 0);
  assert.equal(user.xp, 122);
});


test('daily status uses a rolling 24-hour timer and unlocks at its exact boundary', () => {
  const completedAt = new Date('2026-10-20T23:30:00.000Z');
  const locked = dailyChallengeStatus({ completedAt, lastScore: 12 }, new Date('2026-10-21T01:30:00.000Z'));
  assert.equal(locked.completed, true);
  assert.equal(locked.nextAvailableAt, '2026-10-21T23:30:00.000Z');
  assert.equal(locked.timeUntilNext, '22h 0m');
  assert.equal(locked.lastScore, 12);
  assert.equal(dailyChallengeStatus({ completedAt }, new Date('2026-10-21T23:30:00.000Z')).completed, false);
});

test('daily status supports legacy completions and the reset item', () => {
  const now = new Date('2026-10-21T12:00:00.000Z');
  assert.equal(dailyChallengeStatus({ lastCompleted: '2026-10-21' }, now).nextAvailableAt, '2026-10-22T00:00:00.000Z');
  assert.equal(dailyChallengeStatus({ lastCompleted: '2026-10-20' }, now).completed, false);
  assert.equal(dailyChallengeStatus({ lastCompleted: null, completedAt: null }, now).completed, false);
});

for (const includeAcadnet of [false, true]) {
  test(`Linux daily respects includeAcadnet=${includeAcadnet}`, async t => {
    const { req, questions } = setup(t, 'daily');
    req.body = { kind: 'daily', category: 'LINUX', includeAcadnet };
    const aggregate = t.mock.method(Question, 'aggregate', async () => questions);
    t.mock.method(QuizAttempt, 'create', async data => new QuizAttempt(data));
    const res = response();
    await startQuizAttempt(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(aggregate.mock.calls[0].arguments[0][0].$match,
      includeAcadnet ? { tags: 'LINUX' } : { tags: 'LINUX', type: { $ne: 'acadnet' } });
  });
}


test('using reset_daily clears the cooldown, consumes one item and allows another reward', async t => {
  const { user, req, attempt } = setup(t, 'daily');
  await finishQuizAttempt('daily')(req, response());
  assert.equal(dailyChallengeStatus(user.dailyChallenge).completed, true);
  user.inventory.push({ itemId: 'reset_daily', quantity: 2 });
  t.mock.method(ShopItem, 'findOne', async () => ({ itemId: 'reset_daily' }));
  const reset = response();
  await useItem({ userId: req.userId, params: { itemId: 'reset_daily' } }, reset);
  assert.equal(reset.statusCode, 200);
  assert.equal(reset.body.success, true);
  assert.equal(user.dailyChallenge.completedAt, null);
  assert.equal(user.dailyChallenge.lastCompleted, null);
  assert.equal(dailyChallengeStatus(user.dailyChallenge).completed, false);
  assert.equal(user.inventory.find(item => item.itemId === 'reset_daily').quantity, 1);
  attempt.token = 'after-reset';
  req.body.attemptId = attempt.token;
  const reward = response();
  await finishQuizAttempt('daily')(req, reward);
  assert.equal(reward.body.xpGained, 32);
});


test('explanations stay private in public questions without changing stored data', () => {
  const q = { ...question(), explanation: '**Reason** /* echo test */' };
  const safe = publicQuestion(q);
  assert.equal(safe.explanation, undefined);
  assert.equal(q.explanation, '**Reason** /* echo test */');
});

test('practice explanations are returned after correct, wrong and already-solved answers', async t => {
  const { questions, user, request } = practiceSetup(t);
  questions[0].explanation = '**B** is correct.';
  const wrongReq = request(); wrongReq.body.answers = [0];
  const wrong = response(); await markSolved(wrongReq, wrong);
  assert.equal(wrong.body.explanation, questions[0].explanation);
  assert.equal(wrong.body.correct, false);
  const correct = response(); await markSolved(request(), correct);
  const repeat = response(); await markSolved(request(), repeat);
  assert.equal(correct.body.explanation, questions[0].explanation);
  assert.equal(repeat.body.explanation, questions[0].explanation);
  assert.equal(user.xp, 96);
});

for (const kind of ['exam', 'daily', 'random']) {
  test(`${kind} answer checks only include explanations in random practice`, async t => {
    const { attempt, req, questions } = setup(t, kind);
    attempt.questions[0].explanation = 'Private explanation.';
    req.body.questionId = String(questions[0]._id); req.body.answers = [1];
    const res = response(); await checkQuizAnswer(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.explanation, kind === 'random' ? 'Private explanation.' : undefined);
  });
}

test('standalone question checks return explanations only after a valid answer payload', async t => {
  const q = { ...question(), explanation: 'The explanation.' };
  t.mock.method(Question, 'findById', async () => q);
  const bad = response(); await checkQuizAnswer({ body: { questionId: String(q._id) } }, bad);
  assert.equal(bad.statusCode, 400); assert.equal(bad.body.explanation, undefined);
  const valid = response(); await checkQuizAnswer({ body: { questionId: String(q._id), answers: [0] } }, valid);
  assert.equal(valid.body.explanation, q.explanation);
});

test('restoring random practice reveals explanations for checked questions only', async t => {
  const { req, attempt, questions } = setup(t, 'random');
  attempt.questions.forEach(q => { q.explanation = 'Do not leak before checking.'; });
  attempt.checked.set(String(questions[0]._id), [0]); req.body.kind = 'random';
  const res = response(); await startQuizAttempt(req, res);
  assert.equal(res.body.questions.every(q => q.explanation === undefined), true);
  assert.equal(res.body.corrections.length, 1);
  assert.equal(res.body.corrections[0].explanation, 'Do not leak before checking.');
});

test('explanations do not change scores, rewards or exam corrections', async t => {
  const { req, attempt } = setup(t, 'exam');
  attempt.questions.forEach(q => { q.explanation = 'Explanation for practice only.'; });
  const res = response(); await finishQuizAttempt('exam')(req, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.score, 8); assert.equal(res.body.xpGained, 16);
  assert.equal(res.body.corrections.every(q => q.explanation === undefined), true);
});
