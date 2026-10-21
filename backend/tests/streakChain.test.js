import ShopItem from '../models/ShopItem.js';
import { useItem } from '../controllers/shopController.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Question from '../models/Question.js';
import QuizAttempt from '../models/QuizAttempt.js';
import CompetitivePeriod from '../models/CompetitivePeriod.js';
import SeasonPass from '../models/SeasonPass.js';
import { startStreakChain, answerStreakChain, finishStreakChain } from '../controllers/streakChainController.js';
import { checkQuizAnswer, finishQuizAttempt } from '../controllers/quizAttemptController.js';
import { chainProgress } from '../utils/streakChain.js';
import { dailyChallengeStatus } from '../utils/dailyChallenge.js';

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const question = (points = 3) => ({ _id: new mongoose.Types.ObjectId(), title: 'Question', type: 'all',
  answers: ['A', 'B', 'C'], correctAnswers: [1], points, tags: ['LINUX'] });

function setup(t, questions = [question(3), question(5), question(2)]) {
  const user = new User({ username: 'chain', email: 'chain@example.com', password: 'test', xp: 0 });
  let attempt = new QuizAttempt({ token: 'chain-token', userId: user._id, kind: 'chain', chainCategory: 'LINUX',
    chainPrivilege: 1, questions, expiresAt: new Date(Date.now() + 86400000), __v: 0 });
  t.mock.method(user, 'save', async () => user);
  t.mock.method(User, 'findById', () => Object.assign(Promise.resolve(user), { select: () => Promise.resolve(user) }));
  t.mock.method(User, 'updateOne', async (filter, update) => {
    if (filter.xp !== user.xp) return { matchedCount: 0 };
    user.set(update.$set); return { matchedCount: 1 };
  });
  t.mock.method(User, 'findOneAndUpdate', async (filter, update) => {
    if (user.rewardedQuizAttempts.includes(filter.rewardedQuizAttempts.$ne)) return null;
    if (filter.$or && !filter.$or.some(condition => Object.entries(condition).every(([key, expected]) => {
      const value = user.get(key);
      if (expected === null) return value == null;
      if ('$lte' in expected) return value != null && new Date(value) <= expected.$lte;
      return value !== expected.$ne;
    }))) return null;
    user.xp += update.$inc.xp;
    user.rewardedQuizAttempts.push(update.$addToSet.rewardedQuizAttempts);
    user.set(update.$set);
    return user;
  });
  t.mock.method(QuizAttempt, 'findOne', async filter => {
    if (filter.token !== attempt.token) return null;
    if (filter.userId && String(filter.userId) !== String(attempt.userId)) return null;
    return attempt;
  });
  t.mock.method(QuizAttempt, 'findById', async () => attempt);
  t.mock.method(QuizAttempt, 'updateOne', async (filter, update) => {
    if (attempt.result || filter.__v !== attempt.__v) return { matchedCount: 0 };
    for (const [key, value] of Object.entries(update.$set)) attempt.set(key, value);
    attempt.__v++;
    return { matchedCount: 1 };
  });
  t.mock.method(QuizAttempt, 'create', async data => { attempt = new QuizAttempt({ ...data, __v: 0 }); return attempt; });
  const aggregate = t.mock.method(Question, 'aggregate', async () => questions);
  t.mock.method(CompetitivePeriod, 'findOne', async () => ({ endDate: new Date(Date.now() + 60000) }));
  const pass = new SeasonPass({ number: 1, name: 'Test', isActive: true, totalLevels: 10, xpPerLevel: 100 });
  t.mock.method(SeasonPass, 'findOne', async () => pass);
  const req = { userId: String(user._id), body: { attemptId: attempt.token } };
  const answer = async (index, answers = [1]) => {
    const res = response();
    await answerStreakChain({ ...req, body: { attemptId: attempt.token, questionId: String(questions[index]._id), answers } }, res);
    return res;
  };
  return { user, req, questions, aggregate, answer, get attempt() { return attempt; } };
}

test('chain starts with one public question and a maximum sample of 20', async t => {
  const { req, aggregate } = setup(t);
  req.body = { category: 'ARDUINO' };
  const res = response();
  await startStreakChain(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.question.correctAnswers, undefined);
  assert.equal(res.body.questions, undefined);
  assert.equal(res.body.multiplier, 1.1);
  assert.deepEqual(aggregate.mock.calls[0].arguments[0], [{ $match: { tags: 'ARDUINO' } }, { $sample: { size: 20 } }]);
});

for (const [category, includeAcadnet, filter] of [
  ['LINUX', false, { tags: 'LINUX', type: { $ne: 'acadnet' } }],
  ['LINUX', true, { tags: 'LINUX' }], ['NETWORK', false, { tags: 'NETWORK' }],
  ['ACADNET', false, { type: 'acadnet' }]
]) test(`chain filters ${category}, includeAcadnet=${includeAcadnet}`, async t => {
  const { req, aggregate } = setup(t); req.body = { category, includeAcadnet };
  const res = response(); await startStreakChain(req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(aggregate.mock.calls[0].arguments[0][0].$match, filter);
});

test('chain rounds each reward up, exposes the next question and ends at first mistake', async t => {
  const { answer, user } = setup(t);
  const first = await answer(0);
  assert.equal(first.body.xp, 4); assert.equal(first.body.streak, 1); assert.equal(first.body.multiplier, 1.2);
  assert.equal(first.body.finished, false); assert.equal(user.xp, 0);
  const second = await answer(1);
  assert.equal(second.body.xp, 10);
  const failed = await answer(2, [0]);
  assert.equal(failed.body.finished, true); assert.equal(failed.body.failed, true);
  assert.equal(failed.body.streak, 2); assert.equal(failed.body.xpAwarded, 10);
  assert.equal(failed.body.question, null); assert.equal(user.xp, 10);
  assert.equal(user.competitiveStats.currentPeriodXP, 10); assert.equal(user.seasonPass.xp, 10);
  assert.equal(dailyChallengeStatus(user.dailyChallenge).completed, true);
});

test('a wrong first answer ends the chain and locks daily challenges even with zero XP', async t => {
  const { answer, user } = setup(t);
  const res = await answer(0, []);
  assert.equal(res.body.finished, true); assert.equal(res.body.xpAwarded, 0);
  assert.equal(dailyChallengeStatus(user.dailyChallenge).completed, true);
});

test('future questions cannot be submitted or exposed through generic quiz endpoints', async t => {
  const { answer, req, questions, attempt } = setup(t);
  const future = await answer(1);
  assert.equal(future.statusCode, 409); assert.equal(attempt.checked.size, 0);
  const check = response();
  await checkQuizAnswer({ ...req, body: { ...req.body, questionId: String(questions[2]._id), answers: [1] } }, check);
  assert.equal(check.statusCode, 400); assert.equal(check.body.correctAnswers, undefined);
  const finish = response(); await finishQuizAttempt()(req, finish);
  assert.equal(finish.statusCode, 400);
});

test('retries preserve first answer and never award XP or tracking twice', async t => {
  const { answer, user, req } = setup(t, [question(3)]);
  const first = await answer(0);
  const retry = await answer(0, [0]);
  const finish = response(); await finishStreakChain(req, finish);
  assert.equal(first.body.xpAwarded, 4); assert.equal(retry.body.feedback.correct, true);
  assert.equal(retry.body.xpAwarded, 4); assert.equal(finish.body.xpAwarded, 4);
  assert.equal(user.xp, 4); assert.equal(user.competitiveStats.currentPeriodXP, 4);
  assert.equal(user.rewardedQuizAttempts.length, 1);
});

test('parallel answers cannot replace a wrong answer or pay twice', async t => {
  const { answer, user } = setup(t, [question(3)]);
  const [first, second] = await Promise.all([answer(0, [0]), answer(0, [1])]);
  assert.equal(first.body.finished, true); assert.equal(second.body.finished, true);
  assert.equal(first.body.feedback.correct, false); assert.equal(second.body.feedback.correct, false);
  assert.equal(user.xp, 0); assert.equal(user.rewardedQuizAttempts.length, 1);
});

test('stop early awards the verified prefix only and starts the shared cooldown', async t => {
  const { answer, req, user } = setup(t);
  await answer(0);
  req.body.answers = { forged: [1] }; req.body.xp = 9999;
  const res = response(); await finishStreakChain(req, res);
  assert.equal(res.body.stopped, true); assert.equal(res.body.xpAwarded, 4);
  assert.equal(user.xp, 4); assert.equal(dailyChallengeStatus(user.dailyChallenge).completed, true);
});

test('daily cooldown blocks chain creation and a second award from a pre-existing chain', async t => {
  const { req, user, answer } = setup(t, [question(3)]);
  user.dailyChallenge.completedAt = new Date();
  const res = response(); await startStreakChain({ ...req, body: { category: 'LINUX' } }, res);
  assert.equal(res.statusCode, 409);
  const completion = await answer(0);
  assert.equal(completion.body.finished, true); assert.equal(completion.body.xpAwarded, 0);
  assert.equal(user.xp, 0);
});

test('resuming restores progress and settles a terminal answer after an interrupted request', async t => {
  const { req, attempt, questions, user } = setup(t, [question(3)]);
  attempt.checked.set(String(questions[0]._id), [1]);
  const res = response(); await startStreakChain(req, res);
  assert.equal(res.body.finished, true); assert.equal(res.body.xpAwarded, 4); assert.equal(user.xp, 4);
});

test('20 correct answers reach x3, use exact decimal rounding and preserve XP privilege', () => {
  const questions = Array.from({ length: 20 }, () => question(100));
  const attempt = { questions, checked: new Map(questions.map(q => [String(q._id), [1]])), chainPrivilege: 2 };
  const progress = chainProgress(attempt);
  assert.equal(progress.streak, 20); assert.equal(progress.multiplier, 3);
  assert.equal(progress.xp, 8200); assert.equal(progress.ended, true); assert.equal(progress.failed, false);
});

test('another user and an expired session cannot submit answers', async t => {
  const { req, attempt, questions } = setup(t);
  const body = { ...req.body, questionId: String(questions[0]._id), answers: [1] };
  const other = response();
  await answerStreakChain({ userId: String(new mongoose.Types.ObjectId()), body }, other);
  assert.equal(other.statusCode, 404);
  attempt.expiresAt = new Date(Date.now() - 1000);
  const expired = response(); await answerStreakChain({ ...req, body }, expired);
  assert.equal(expired.statusCode, 410);
});


test('a full 20-question chain automatically finishes at x3 and awards the rounded sum', async t => {
  const { answer, user } = setup(t, Array.from({ length: 20 }, () => question(1)));
  let result;
  for (let index = 0; index < 20; index++) {
    result = await answer(index);
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.finished, index === 19);
  }
  assert.equal(result.body.streak, 20);
  assert.equal(result.body.multiplier, 3);
  assert.equal(result.body.xpAwarded, 50);
  assert.equal(user.xp, 50);
  assert.equal(dailyChallengeStatus(user.dailyChallenge).completed, true);
});

test('a wrong answer prevents every later question in the chain', async t => {
  const { answer, attempt } = setup(t);
  await answer(0, [0]);
  const later = await answer(1, [1]);
  assert.equal(later.statusCode, 409);
  assert.equal(attempt.checked.size, 1);
});

test('Reset Daily Challenge unlocks a completed chain and allows a new chain reward', async t => {
  const context = setup(t, [question(3)]);
  const { answer, user, req } = context;
  await answer(0);
  assert.equal(dailyChallengeStatus(user.dailyChallenge).completed, true);
  user.inventory.push({ itemId: 'reset_daily', quantity: 1 });
  t.mock.method(ShopItem, 'findOne', async () => ({ itemId: 'reset_daily' }));
  const reset = response();
  await useItem({ userId: req.userId, params: { itemId: 'reset_daily' } }, reset);
  assert.equal(reset.statusCode, 200);
  assert.equal(dailyChallengeStatus(user.dailyChallenge).completed, false);
  assert.equal(user.inventory.length, 0);
  const start = response();
  await startStreakChain({ userId: req.userId, body: { category: 'ACADNET' } }, start);
  assert.equal(start.statusCode, 200);
  assert.equal(start.body.finished, false);
  const finish = await answer(0);
  assert.equal(finish.body.xpAwarded, 4);
  assert.equal(user.xp, 8);
});
