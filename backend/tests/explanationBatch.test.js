import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Question from '../models/Question.js';
import { parseExplanationBatch } from '../utils/explanationBatch.js';
import { prepareExplanationBatch, previewExplanationBatch, applyExplanationBatch } from '../controllers/explanationBatchController.js';

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const question = index => ({ _id: String(new mongoose.Types.ObjectId()), title: `Question ${index}`, answers: ['A', 'B'],
  correctAnswers: [0], type: 'all', tags: ['LINUX'], difficulty: 'hard', points: 2, updatedAt: new Date('2026-10-22T10:00:00Z'), __v: 0 });
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function setup(t, count = 3) {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-explanation-batch-secret';
  t.after(() => { if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; });
  const rows = Array.from({ length: count }, (_, index) => question(index + 1));
  const calls = [];
  const req = { userId: String(new mongoose.Types.ObjectId()), query: { size: '25', category: 'LINUX', difficulty: 'hard', hasExplanation: 'no' } };
  t.mock.method(Question, 'find', filter => {
    calls.push({ find: filter });
    let limit = Infinity;
    const query = { sort(value) { assert.deepEqual(value, { createdAt: -1, _id: -1 }); return query; },
      limit(value) { limit = value; return query; },
      lean: async () => structuredClone((filter._id ? rows.filter(row => filter._id.$in.includes(row._id)) : rows).slice(0, limit)) };
    return query;
  });
  t.mock.method(Question, 'findById', id => ({ lean: async () => structuredClone(rows.find(row => row._id === id) || null) }));
  const updateImplementation = async (filter, changes, options) => {
    calls.push({ filter, changes });
    assert.equal(options.runValidators, true);
    // Check the actual Mongoose casting without a database connection.
    const query = mongoose.Model.updateOne.call(Question, filter, changes);
    assert.doesNotThrow(() => query.cast(Question));
    const row = rows.find(row => row._id === filter._id);
    if (!row || (typeof row.explanation === 'string' && row.explanation.trim())) return { matchedCount: 0 };
    for (const [field, match] of Object.entries(filter)) {
      if (field === '_id' || field === 'explanation') continue;
      if (match.$exists === false ? row[field] !== undefined : !equal(row[field], match.$eq)) return { matchedCount: 0 };
    }
    row.explanation = changes.$set.explanation;
    row.updatedAt = new Date();
    return { matchedCount: 1 };
  };
  const update = t.mock.method(Question, 'updateOne', updateImplementation);
  const prepared = response(); await prepareExplanationBatch(req, prepared);
  assert.equal(prepared.statusCode, 200);
  const apply = async text => {
    const res = response(); await applyExplanationBatch({ userId: req.userId, body: { token: prepared.body.token, text } }, res);
    return res;
  };
  return { rows, req, batch: prepared.body, apply, update, updateImplementation, calls };
}

test('parser preserves multiline explanations exactly, including whitespace, code and numbered lines', () => {
  const content = '\n **Bold** and `inline`\n/*\necho test\n*/\n1. This number belongs to the explanation.\n';
  assert.deepEqual(parseExplanationBatch(`1. {{${content}}}\n\n2. {{ second }}`), [
    { number: 1, explanation: content }, { number: 2, explanation: ' second ' }
  ]);
});

test('parser rejects missing delimiters, empty explanations, duplicates, gaps and trailing text', () => {
  for (const text of ['', '1. Explanation', '1. {{ missing', '1. {{ }}', '2. {{ text }}',
    '1. {{ a }} 1. {{ b }}', '1. {{ a }} 3. {{ b }}', '1. {{ a }} trailing text']) {
    assert.throws(() => parseExplanationBatch(text));
  }
  assert.throws(() => parseExplanationBatch('1. {{ a }} 2. {{ b }}', 1));
  assert.throws(() => parseExplanationBatch(`1. {{${'a'.repeat(20001)}}}`));
});

test('prepared batch captures fixed numbered IDs, current filters and only missing explanations', async t => {
  const { rows, batch, calls, req } = await setup(t);
  assert.deepEqual(batch.questions.map(row => row.number), [1, 2, 3]);
  assert.deepEqual(batch.questions.map(row => row._id), rows.map(row => row._id));
  assert.deepEqual(calls[0].find.$and, [{ tags: 'LINUX' }, { difficulty: 'hard' }, { explanation: { $not: { $regex: '\\S' } } }]);
  const decoded = jwt.verify(batch.token, process.env.JWT_SECRET);
  assert.equal(decoded.sub, req.userId);
  assert.equal(decoded.entries[0].id, rows[0]._id);
});

test('preview validates input and performs no writes', async t => {
  const { req, batch, update } = await setup(t);
  const res = response();
  await previewExplanationBatch({ userId: req.userId, body: { token: batch.token, text: '1. {{ **Explanation** }}' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.entries[0].explanation, ' **Explanation** ');
  assert.equal(update.mock.callCount(), 0);
});

test('partial input updates only its original numbered questions even if database order changes', async t => {
  const { rows, batch, apply } = await setup(t);
  const firstId = batch.questions[0]._id;
  rows.reverse();
  const res = await apply('1. {{ First explanation }} 2. {{ Second explanation }}');
  assert.equal(res.body.saved, 2);
  assert.equal(rows.find(row => row._id === firstId).explanation, ' First explanation ');
  assert.equal(rows.find(row => row._id === batch.questions[1]._id).explanation, ' Second explanation ');
  assert.equal(rows.find(row => row._id === batch.questions[2]._id).explanation, undefined);
});

test('already filled, edited and deleted questions are skipped without shifting explanations', async t => {
  const { rows, apply } = await setup(t, 4);
  rows[0].explanation = 'Written separately';
  rows[1].title = 'Changed question';
  const deletedId = rows[2]._id; rows.splice(2, 1);
  const res = await apply('1. {{ A }} 2. {{ B }} 3. {{ C }} 4. {{ D }}');
  assert.equal(res.body.saved, 1); assert.equal(res.body.skipped, 3);
  assert.equal(rows[0].explanation, 'Written separately');
  assert.equal(rows[1].explanation, undefined);
  assert.equal(res.body.results[2].id, deletedId);
  assert.equal(rows[2].explanation, ' D ');
});

test('repeating a saved batch is idempotent and does not change question content or rewards', async t => {
  const { rows, apply, update } = await setup(t);
  const originalTitle = rows[0].title;
  const first = await apply('1. {{ Explain }}');
  const second = await apply('1. {{ Explain }}');
  assert.equal(first.body.saved, 1); assert.equal(second.body.alreadySaved, 1);
  assert.equal(second.body.saved, 0); assert.equal(update.mock.callCount(), 1);
  assert.equal(rows[0].title, originalTitle);
});

test('an explanation written between read and update is protected by the conditional write', async t => {
  const { rows, apply } = await setup(t);
  t.mock.method(Question, 'updateOne', async () => { rows[0].explanation = 'Concurrent edit'; return { matchedCount: 0 }; });
  const res = await apply('1. {{ Should not overwrite }}');
  assert.equal(res.body.skipped, 1); assert.equal(rows[0].explanation, 'Concurrent edit');
});

test('one failed write is reported and the same batch can safely retry', async t => {
  const { apply, updateImplementation } = await setup(t);
  let failOnce = true;
  t.mock.method(Question, 'updateOne', async (...args) => {
    if (failOnce) { failOnce = false; throw new Error('Temporary failure'); }
    return updateImplementation(...args);
  });
  const first = await apply('1. {{ Explain A }} 2. {{ Explain B }}');
  assert.equal(first.body.errors, 1); assert.equal(first.body.saved, 1);
  const retry = await apply('1. {{ Explain A }} 2. {{ Explain B }}');
  assert.equal(retry.body.errors, 0); assert.equal(retry.body.saved, 1); assert.equal(retry.body.alreadySaved, 1);
});

test('another user, tampered tokens, expired tokens and invalid numbering cannot save', async t => {
  const { req, batch, update } = await setup(t);
  for (const request of [
    { userId: String(new mongoose.Types.ObjectId()), body: { token: batch.token, text: '1. {{ A }}' } },
    { userId: req.userId, body: { token: batch.token + 'tampered', text: '1. {{ A }}' } },
    { userId: req.userId, body: { token: jwt.sign({ purpose: 'explanation-batch-v1', entries: [] }, process.env.JWT_SECRET, { subject: req.userId, expiresIn: -1 }), text: '1. {{ A }}' } }
  ]) {
    const res = response(); await applyExplanationBatch(request, res);
    assert.equal(res.statusCode, 409);
  }
  const invalid = response(); await applyExplanationBatch({ userId: req.userId, body: { token: batch.token, text: '2. {{ A }}' } }, invalid);
  assert.equal(invalid.statusCode, 400); assert.equal(update.mock.callCount(), 0);
});

test('large valid batches exceed the old 100KB body limit and remain supported', () => {
  const text = Array.from({ length: 100 }, (_, index) => `${index + 1}. {{${'x'.repeat(20000)}}}`).join('\n');
  assert.equal(parseExplanationBatch(text).length, 100);
  const server = readFileSync(new URL('../server.js', import.meta.url), 'utf8');
  assert.ok(server.includes("app.use('/api/questions/explanations', express.json({ limit: '16mb' }))"));
});

test('all batch routes require authentication and root role', () => {
  const routes = readFileSync(new URL('../routes/questionRoutes.js', import.meta.url), 'utf8');
  for (const line of ["router.get('/explanations/batch', authMiddleware, checkRole('root'), prepareExplanationBatch)",
    "router.post('/explanations/preview', authMiddleware, checkRole('root'), previewExplanationBatch)",
    "router.post('/explanations/batch', authMiddleware, checkRole('root'), applyExplanationBatch)"]) assert.ok(routes.includes(line));
});
