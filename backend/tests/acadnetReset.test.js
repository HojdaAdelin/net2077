import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Question from '../models/Question.js';
import CompetitivePeriod from '../models/CompetitivePeriod.js';
import SeasonPass from '../models/SeasonPass.js';
import { resetAcadnetStats } from '../controllers/questionController.js';

const response = () => ({ code: 200, status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; } });

function setup(t, count) {
  const questions = Array.from({ length: 50 }, (_, i) => ({ _id: new mongoose.Types.ObjectId(),
    tags: i < 25 ? ['LINUX', 'NETWORK'] : ['LINUX'], type: 'acadnet' }));
  const other = new mongoose.Types.ObjectId();
  const user = new User({ username: 'test', email: 'test@example.com', password: 'unused',
    xp: 100, xpPrivilege: 2, solvedQuestions: [...questions.slice(0, count).map(q => q._id), other],
    solvedByTag: { LINUX: count + 1, NETWORK: Math.min(count, 25) } });
  t.mock.method(Question, 'find', async filter => {
    assert.deepEqual(filter, { type: 'acadnet' });
    return questions;
  });
  t.mock.method(User, 'findById', async () => user);
  t.mock.method(user, 'save', async () => user);
  t.mock.method(CompetitivePeriod, 'findOne', async () => ({ endDate: new Date(Date.now() + 60000) }));
  t.mock.method(SeasonPass, 'findOne', async () => null);
  t.mock.method(User, 'findOneAndUpdate', async (filter, update) => {
    if (filter.xp !== user.xp || JSON.stringify(filter.solvedQuestions) !== JSON.stringify(user.solvedQuestions)) return null;
    const removed = new Set(update.$pull.solvedQuestions.$in.map(String));
    user.solvedQuestions = user.solvedQuestions.filter(id => !removed.has(String(id)));
    user.xp += update.$inc.xp;
    user.set(update.$set);
    return user;
  });
  return { user, other, req: { userId: String(user._id) } };
}

test('49 solved AcadNet questions cannot reset, even with other solved questions', async t => {
  const { user, req } = setup(t, 49);
  const res = response();
  await resetAcadnetStats(req, res);
  assert.equal(res.code, 400);
  assert.equal(res.body.currentSolved, 49);
  assert.equal(user.xp, 100);
  assert.equal(user.solvedQuestions.length, 50);
});

test('50 solved questions reset only AcadNet and award XP with existing privilege and tracking', async t => {
  const { user, req, other } = setup(t, 50);
  const res = response();
  await resetAcadnetStats(req, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.questionsReset, 50);
  assert.equal(res.body.xpAdded, 100);
  assert.equal(user.xp, 200);
  assert.equal(user.level, 3);
  assert.deepEqual(user.solvedQuestions.map(String), [String(other)]);
  assert.equal(user.solvedByTag.LINUX, 1);
  assert.equal(user.solvedByTag.NETWORK, 0);
  assert.equal(user.competitiveStats.currentPeriodXP, 100);
});

test('parallel resets cannot reward the same questions twice', async t => {
  const { user, req } = setup(t, 50);
  const first = response(), second = response();
  await Promise.all([resetAcadnetStats(req, first), resetAcadnetStats(req, second)]);
  assert.deepEqual([first.code, second.code].sort(), [200, 400]);
  assert.equal(user.xp, 200);
  assert.equal(user.competitiveStats.currentPeriodXP, 100);
});
