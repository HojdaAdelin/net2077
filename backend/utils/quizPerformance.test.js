import test from 'node:test';
import assert from 'node:assert/strict';
import { createPerformanceRecorder, performanceUpdate, practiceReceipt, PERFORMANCE_WINDOW_MS } from './quizPerformance.js';
import { performanceKey } from './questionRecommendations.js';
import User from '../models/User.js';
const now = new Date('2026-11-12T10:00:00Z');
const question = { _id: 'abc', type: 'all', difficulty: 'medium', tags: ['LINUX', 'CHAPTER3', 'CHAPTER3'] };
const event = (source, correct) => ({ question, source, correct, expiresAt: new Date(Date.now() + PERFORMANCE_WINDOW_MS) });

test('Counters and retry receipt are updated atomically; there is no question list in the statistics', () => {
  const update = performanceUpdate(event('one', false), now);
  const prefix = `quizPerformance.${performanceKey('LINUX', 'all', 'CHAPTER3')}`;
  assert.equal(update.update.$inc[`${prefix}.wrong`], 1);
  assert.equal(update.update.$inc[`${prefix}.correct`], undefined);
  assert.equal(update.update.$set[`${prefix}.tag`], 'CHAPTER3');
  assert.equal(update.filter['quizAnswerReceipts.key'].$ne, update.update.$push.quizAnswerReceipts.key);
  assert.ok(!JSON.stringify(update.update.$set).includes('questionId'));
});
test('Practice retries reuse their receipt, while a new run has a new receipt', () => {
  const id = `${now.getTime()}.12345678-1234-4234-8234-123456789abc`;
  const first = practiceReceipt(id, 'abc', now.getTime());
  const retry = practiceReceipt(id, 'abc', now.getTime() + 1000);
  assert.deepEqual(first, retry);
  assert.notEqual(first.source, practiceReceipt(id, 'other', now.getTime()).source);
  assert.throws(() => practiceReceipt(id, 'abc', now.getTime() + PERFORMANCE_WINDOW_MS), { status: 410 });
  assert.throws(() => practiceReceipt('bad', 'abc', now.getTime()), { status: 400 });
  assert.equal(performanceUpdate({ ...event('old', true), expiresAt: now }, now), null);
});
test('A checked answer and later quiz finish do not double-count; a deliberate retry contributes a new result', async () => {
  const receipts = new Set(), counters = {}, prunes = [];
  const record = createPerformanceRecorder({
    updateOne: async (...args) => prunes.push(args),
    bulkWrite: async ops => {
      for (const { updateOne: { filter, update } } of ops) {
        const key = filter['quizAnswerReceipts.key'].$ne;
        if (receipts.has(key)) continue;
        receipts.add(key);
        for (const [path, delta] of Object.entries(update.$inc)) counters[path] = (counters[path] || 0) + delta;
      }
    },
  });
  await Promise.all([record('user', [event('attempt:one:abc', false)]), record('user', [event('attempt:one:abc', false)])]);
  await record('user', [event('attempt:one:abc', false)]);
  await record('user', [event('practice:retry:abc', true)]);
  const prefix = `quizPerformance.${performanceKey('LINUX', 'all', 'CHAPTER3')}`;
  assert.equal(counters[`${prefix}.wrong`], 1); assert.equal(counters[`${prefix}.correct`], 1);
  assert.ok(prunes.every(([, update]) => !JSON.stringify(update).includes('quizPerformance')));
});
test('Mongoose preserves dynamic map counters and receipt filters in the database operation', async () => {
  const original = User.$__collection.bulkWrite;
  let received;
  try {
    User.$__collection.bulkWrite = async operations => { received = operations; return { acknowledged: true }; };
    const operation = performanceUpdate(event('cast-check', true));
    await User.bulkWrite([{ updateOne: { filter: { _id: new User()._id, ...operation.filter }, update: operation.update } }]);
    const update = received[0].updateOne;
    const path = `quizPerformance.${performanceKey('LINUX', 'all', 'CHAPTER3')}`;
    assert.equal(update.update.$inc[`${path}.correct`], 1);
    assert.equal(update.update.$set[`${path}.tag`], 'CHAPTER3');
    assert.equal(update.update.$push.quizAnswerReceipts.key, update.filter['quizAnswerReceipts.key'].$ne);
    assert.ok(update.update.$push.quizAnswerReceipts.expiresAt instanceof Date);
    assert.ok(update.update.$min.quizStatsSince instanceof Date);
  } finally { User.$__collection.bulkWrite = original; }
});
