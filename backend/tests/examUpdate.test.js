import test from 'node:test';
import assert from 'node:assert/strict';
import Exam from '../models/Exam.js';
import { updateExam } from '../controllers/examController.js';
import router from '../routes/examRoutes.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';

const details = { id: 'updated-exam', title: 'Updated title', description: 'Updated description',
  duration: 90, totalPoints: 120, tag: 'UPDATED_TAG', year: 2026, phase: 'national', new_test_badge: false };
const response = () => ({ code: 200, status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; } });

test('updates the same exam, preserves attempts, and ignores fields outside Exam Details', async t => {
  const existing = { _id: 'stored-id', id: 'original-exam', usage_ctn: 19 };
  t.mock.method(Exam, 'findOne', async query => query._id ? null : existing);
  const update = t.mock.method(Exam, 'findOneAndUpdate', async (query, changes, options) => {
    assert.deepEqual(query, { _id: existing._id });
    assert.equal(options.runValidators, true);
    return { ...existing, ...changes.$set };
  });
  const res = response();
  await updateExam({ params: { id: existing.id }, body: { ...details, title: ' Updated title ', usage_ctn: 0, _id: 'forged-id' } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.exam._id, 'stored-id');
  assert.equal(res.body.exam.usage_ctn, 19);
  assert.equal(res.body.exam.title, 'Updated title');
  assert.equal(res.body.exam.new_test_badge, false);
  assert.deepEqual(update.mock.calls[0].arguments[1], { $set: details });
});

test('duplicate exam IDs are rejected', async t => {
  t.mock.method(Exam, 'findOne', async query => ({ _id: query._id ? 'other-id' : 'original-id' }));
  const update = t.mock.method(Exam, 'findOneAndUpdate', async () => assert.fail('Must not save a duplicate'));
  const res = response();
  await updateExam({ params: { id: 'original' }, body: details }, res);
  assert.equal(res.code, 409);
  assert.equal(update.mock.callCount(), 0);
});

test('missing exams return 404', async t => {
  t.mock.method(Exam, 'findOne', async () => null);
  const res = response();
  await updateExam({ params: { id: 'missing' }, body: details }, res);
  assert.equal(res.code, 404);
});

test('invalid or missing details cannot be saved', async t => {
  t.mock.method(Exam, 'findOneAndUpdate', async () => assert.fail('Must not save invalid details'));
  for (const changed of [{ title: ' ' }, { id: 'bad/id' }, { duration: -1 }, { totalPoints: null },
    { year: 2026.5 }, { year: 'invalid' }, { new_test_badge: 'true' }]) {
    const res = response();
    await updateExam({ params: { id: 'original' }, body: { ...details, ...changed } }, res);
    assert.equal(res.code, 400);
  }
});

test('edit endpoint requires both authentication and root role', () => {
  const route = router.stack.find(layer => layer.route?.path === '/:id' && layer.route.methods.put).route;
  assert.deepEqual(route.stack.map(layer => layer.handle), [authMiddleware, isRoot, updateExam]);
});
