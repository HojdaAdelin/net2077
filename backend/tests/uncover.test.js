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
import { startUncover, answerUncover, finishUncover } from '../controllers/uncoverController.js';
import { checkQuizAnswer, finishQuizAttempt } from '../controllers/quizAttemptController.js';
import { uncoverProgress, uncoverDecisionKey } from '../utils/uncover.js';
import { dailyChallengeStatus } from '../utils/dailyChallenge.js';

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const question = (points = 3) => ({ _id: new mongoose.Types.ObjectId(), title: 'Question', type: 'all',
  answers: ['A', 'B', 'C'], correctAnswers: [1], points, tags: ['LINUX'] });

function setup(t, questions = [question(3), question(5), question(2)]) {
  const user = new User({ username: 'uncover', email: 'uncover@example.com', password: 'test', xp: 0 });
  let attempt = new QuizAttempt({ token: 'uncover-token', userId: user._id, kind: 'uncover', challengeCategory: 'LINUX',
    challengePrivilege: 1, questions, expiresAt: new Date(Date.now() + 86400000), __v: 0 });
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
    if (filter.token !== attempt.token || (filter.kind && filter.kind !== attempt.kind)) return null;
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
  const answer = async (index, optionIndex, isCorrect) => {
    const res = response();
    await answerUncover({ ...req, body: { attemptId: attempt.token, questionId: String(questions[index]._id), optionIndex, isCorrect } }, res);
    return res;
  };
  const complete = async index => {
    let res;
    for (let option = 0; option < questions[index].answers.length; option++) {
      res = await answer(index, option, questions[index].correctAnswers.includes(option));
      assert.equal(res.statusCode, 200);
    }
    return res;
  };
  return { user, req, questions, aggregate, answer, complete, get attempt() { return attempt; } };
}

test('Uncover starts with title and first option only, sampling at most 10 questions', async t => {
  const { req, aggregate, questions } = setup(t);
  req.body = { category: 'ARDUINO' };
  const res = response(); await startUncover(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.question.title, questions[0].title);
  assert.equal(res.body.question.answers, undefined);
  assert.equal(res.body.question.correctAnswers, undefined);
  assert.equal(res.body.questions, undefined);
  assert.deepEqual(res.body.option, { index: 0, text: 'A', total: 3 });
  assert.deepEqual(res.body.revealed, []);
  assert.deepEqual(aggregate.mock.calls[0].arguments[0], [{ $match: { tags: 'ARDUINO' } }, { $sample: { size: 10 } }]);
});

for (const [category, includeAcadnet, filter] of [
  ['LINUX', false, { tags: 'LINUX', type: { $ne: 'acadnet' } }],
  ['LINUX', true, { tags: 'LINUX' }], ['NETWORK', false, { tags: 'NETWORK' }],
  ['ACADNET', false, { type: 'acadnet' }]
]) test(`Uncover filters ${category}, includeAcadnet=${includeAcadnet}`, async t => {
  const { req, aggregate } = setup(t); req.body = { category, includeAcadnet };
  const res = response(); await startUncover(req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(aggregate.mock.calls[0].arguments[0][0].$match, filter);
});

test('both yes and no decisions must match; a full question earns triple XP exactly once', async t => {
  const { answer, user, questions } = setup(t);
  const first = await answer(0, 0, false);
  assert.equal(first.body.feedback.correct, true);
  assert.equal(first.body.option.text, 'B');
  assert.equal(first.body.option.index, 1);
  assert.equal(first.body.xp, 0);
  assert.equal(first.body.question.answers, undefined);
  assert.equal(first.body.feedback.correctAnswers, undefined);
  assert.equal(JSON.stringify(first.body).includes('"C"'), false);
  const second = await answer(0, 1, true);
  assert.equal(second.body.xp, 0);
  const third = await answer(0, 2, false);
  assert.equal(third.body.xp, 9);
  assert.equal(third.body.completedQuestions, 1);
  assert.equal(String(third.body.question._id), String(questions[1]._id));
  assert.equal(user.xp, 0);
  const retry = await answer(0, 2, true);
  assert.equal(retry.body.xp, 9);
  assert.equal(retry.body.feedback.decision, false);
});

test('a wrong classification ends immediately and awards only fully completed questions', async t => {
  const { complete, answer, user } = setup(t);
  await complete(0);
  await answer(1, 0, false);
  const failed = await answer(1, 1, false);
  assert.equal(failed.body.finished, true);
  assert.equal(failed.body.failed, true);
  assert.equal(failed.body.completedQuestions, 1);
  assert.equal(failed.body.xpAwarded, 9);
  assert.equal(failed.body.option, null);
  assert.equal(failed.body.feedback.isCorrect, true);
  assert.equal(user.xp, 9);
  assert.equal(user.competitiveStats.currentPeriodXP, 9);
  assert.equal(user.seasonPass.xp, 9);
  assert.equal(dailyChallengeStatus(user.dailyChallenge).completed, true);
  const later = await answer(1, 2, false);
  assert.equal(later.statusCode, 409);
});

test('wrong first option starts cooldown even with zero XP', async t => {
  const { answer, user } = setup(t);
  const failed = await answer(0, 0, true);
  assert.equal(failed.body.finished, true);
  assert.equal(failed.body.xpAwarded, 0);
  assert.equal(dailyChallengeStatus(user.dailyChallenge).completed, true);
});

test('multiple-answer question shows the hint and requires every answer to be classified', async t => {
  const q = { ...question(5), correctAnswers: [0, 2] };
  const { req, answer, user } = setup(t, [q]);
  const start = response(); await startUncover(req, start);
  assert.equal(start.body.question.multipleCorrect, true);
  await answer(0, 0, true);
  const middle = await answer(0, 1, false);
  assert.equal(middle.body.finished, false);
  assert.equal(middle.body.xp, 0);
  const last = await answer(0, 2, true);
  assert.equal(last.body.finished, true);
  assert.equal(last.body.xpAwarded, 15);
  assert.equal(user.xp, 15);
});

test('future options and questions cannot be submitted or inspected through generic endpoints', async t => {
  const { answer, req, questions, attempt } = setup(t);
  assert.equal((await answer(0, 1, true)).statusCode, 409);
  assert.equal((await answer(1, 0, false)).statusCode, 409);
  assert.equal(attempt.uncoverDecisions.size, 0);
  const check = response();
  await checkQuizAnswer({ ...req, body: { ...req.body, questionId: String(questions[0]._id), answers: [1] } }, check);
  assert.equal(check.statusCode, 400);
  const finish = response(); await finishQuizAttempt()(req, finish);
  assert.equal(finish.statusCode, 400);
});

test('invalid decisions and option indexes do not change the session', async t => {
  const { answer, attempt } = setup(t);
  for (const decision of [null, undefined, 0, 'false', [], {}]) assert.equal((await answer(0, 0, decision)).statusCode, 400);
  for (const index of [-1, 3, 0.5, '0']) assert.equal((await answer(0, index, false)).statusCode, 400);
  assert.equal(attempt.uncoverDecisions.size, 0);
});

test('parallel opposite decisions keep the first decision and award only once', async t => {
  const { answer, user } = setup(t, [{ ...question(3), answers: ['A'], correctAnswers: [0] }]);
  const [first, retry] = await Promise.all([answer(0, 0, true), answer(0, 0, false)]);
  assert.equal(first.body.feedback.decision, true);
  assert.equal(retry.body.feedback.decision, true);
  assert.equal(first.body.xpAwarded, 9);
  assert.equal(retry.body.xpAwarded, 9);
  assert.equal(user.xp, 9);
  assert.equal(user.competitiveStats.currentPeriodXP, 9);
  assert.equal(user.rewardedQuizAttempts.length, 1);
});

test('stop early does not award a partially uncovered question or a forged score', async t => {
  const { answer, req, user } = setup(t);
  await answer(0, 0, false);
  req.body.xp = 999999;
  const res = response(); await finishUncover(req, res);
  assert.equal(res.body.finished, true);
  assert.equal(res.body.stopped, true);
  assert.equal(res.body.xpAwarded, 0);
  assert.equal(user.xp, 0);
  assert.equal(dailyChallengeStatus(user.dailyChallenge).completed, true);
});

test('resuming restores the current option and prior decisions without exposing future options', async t => {
  const { answer, req } = setup(t);
  await answer(0, 0, false);
  const res = response(); await startUncover(req, res);
  assert.equal(res.body.option.index, 1);
  assert.deepEqual(res.body.revealed, [{ index: 0, text: 'A', isCorrect: false }]);
  assert.equal(res.body.question.answers, undefined);
  assert.equal(JSON.stringify(res.body).includes('"C"'), false);
});

test('resume recovers reward after the terminal decision was persisted but its request was interrupted', async t => {
  const { req, questions, attempt, user } = setup(t, [question(3)]);
  for (let index = 0; index < 3; index++) attempt.uncoverDecisions.set(uncoverDecisionKey(questions[0]._id, index), index === 1);
  const res = response(); await startUncover(req, res);
  assert.equal(res.body.finished, true);
  assert.equal(res.body.xpAwarded, 9);
  assert.equal(user.xp, 9);
});

test('10 complete questions finish automatically with x3 XP and existing XP privilege', async t => {
  const { complete, user, attempt } = setup(t, Array.from({ length: 10 }, () => question(3)));
  attempt.challengePrivilege = 2;
  let last;
  for (let index = 0; index < 10; index++) {
    last = await complete(index);
    assert.equal(last.body.finished, index === 9);
  }
  assert.equal(last.body.completedQuestions, 10);
  assert.equal(last.body.xpAwarded, 180);
  assert.equal(user.xp, 180);
  assert.equal(user.competitiveStats.currentPeriodXP, 180);
  assert.equal(user.seasonPass.xp, 180);
  assert.equal(dailyChallengeStatus(user.dailyChallenge).completed, true);
});

test('shared daily cooldown blocks creation and another award from an already open Uncover', async t => {
  const { req, complete, user } = setup(t, [question(3)]);
  user.dailyChallenge.completedAt = new Date();
  const start = response(); await startUncover({ ...req, body: { category: 'LINUX' } }, start);
  assert.equal(start.statusCode, 409);
  const finish = await complete(0);
  assert.equal(finish.body.xpAwarded, 0);
  assert.equal(user.xp, 0);
});

test('Reset Daily Challenge unlocks Uncover and permits a new reward', async t => {
  const { req, complete, user } = setup(t, [question(3)]);
  await complete(0);
  user.inventory.push({ itemId: 'reset_daily', quantity: 1 });
  t.mock.method(ShopItem, 'findOne', async () => ({ itemId: 'reset_daily' }));
  const reset = response(); await useItem({ userId: req.userId, params: { itemId: 'reset_daily' } }, reset);
  assert.equal(reset.statusCode, 200);
  assert.equal(dailyChallengeStatus(user.dailyChallenge).completed, false);
  const start = response(); await startUncover({ ...req, body: { category: 'ACADNET' } }, start);
  assert.equal(start.statusCode, 200);
  assert.equal((await complete(0)).body.xpAwarded, 9);
  assert.equal(user.xp, 18);
});

test('another user, another game type and expired sessions cannot reveal options', async t => {
  const { req, attempt } = setup(t);
  const other = response(); await startUncover({ userId: String(new mongoose.Types.ObjectId()), body: req.body }, other);
  assert.equal(other.statusCode, 404);
  attempt.kind = 'chain';
  const wrongKind = response(); await startUncover(req, wrongKind);
  assert.equal(wrongKind.statusCode, 404);
  attempt.kind = 'uncover'; attempt.expiresAt = new Date(Date.now() - 1000);
  const expired = response(); await startUncover(req, expired);
  assert.equal(expired.statusCode, 410);
});
