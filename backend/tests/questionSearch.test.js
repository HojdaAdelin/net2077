import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Question from '../models/Question.js';
import { questionSearchFilter, questionSearchPagination } from '../utils/questionSearch.js';
import { searchQuestions, getQuestionFilters, exportFilteredQuestions } from '../controllers/questionController.js';

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

function database(t, questions = Array.from({ length: 235 }, (_, index) => ({ _id: String(index), title: `Question ${index}` }))) {
  const calls = [];
  t.mock.method(Question, 'countDocuments', async filter => { calls.push({ count: filter }); return questions.length; });
  t.mock.method(Question, 'find', filter => {
    const call = { filter, skip: 0 }; calls.push(call);
    const query = {
      sort(value) { call.sort = value; return query; },
      skip(value) { call.skip = value; return query; },
      limit(value) { call.limit = value; return query; },
      async lean() { return questions.slice(call.skip, call.skip + call.limit); }
    };
    return query;
  });
  return calls;
}

test('title, category, tag, difficulty and question type combine without replacing one another', () => {
  assert.deepEqual(questionSearchFilter({ q: '  chmod  ', category: 'LINUX', tag: 'CHAPTER_2', difficulty: 'hard', type: 'all' }), {
    $and: [{ title: { $regex: 'chmod', $options: 'i' } }, { tags: 'LINUX' }, { type: 'all' }, { tags: 'CHAPTER_2' }, { difficulty: 'hard' }]
  });
});

test('AcadNet category matches question type and supports actual Linux or Network tags', () => {
  assert.deepEqual(questionSearchFilter({ category: 'ACADNET', tag: 'NETWORK', difficulty: 'easy' }), {
    $and: [{ type: 'acadnet' }, { tags: 'NETWORK' }, { difficulty: 'easy' }]
  });
  assert.deepEqual(questionSearchFilter({ category: 'ARDUINO' }), { tags: 'ARDUINO' });
  assert.deepEqual(questionSearchFilter({}), {});
});

test('search treats code punctuation as literal text rather than a regular expression', () => {
  const text = 'if (a[0] == 1) { x++; } .* $HOME \\';
  const filter = questionSearchFilter({ q: text });
  const regex = new RegExp(filter.title.$regex, filter.title.$options);
  assert.equal(regex.test(text), true);
  assert.equal(regex.test('completely different text'), false);
  assert.equal(new RegExp(questionSearchFilter({ q: 'a.b' }).title.$regex).test('axb'), false);
});

test('invalid filters, injected objects and oversized searches are rejected', () => {
  for (const query of [{ category: 'invalid' }, { difficulty: 'impossible' }, { type: 'unknown' },
    { q: { $ne: '' } }, { tag: ['LINUX'] }, { q: 'a'.repeat(201) }]) {
    assert.throws(() => questionSearchFilter(query), { status: 400 });
  }
});

test('pagination uses bounded page sizes and rejects invalid page requests', () => {
  assert.deepEqual(questionSearchPagination({}), { page: 1, pageSize: 25 });
  assert.deepEqual(questionSearchPagination({ page: '3', pageSize: '100' }), { page: 3, pageSize: 100 });
  for (const query of [{ page: '-1' }, { page: '1.5' }, { page: 'NaN' }, { pageSize: '100000' }, { pageSize: '0' }]) {
    assert.throws(() => questionSearchPagination(query), { status: 400 });
  }
});

test('paginated browsing reaches every question beyond the former 200-question cap', async t => {
  const calls = database(t);
  const ids = [];
  for (let page = 1; page <= 10; page++) {
    const res = response(); await searchQuestions({ query: { page: String(page), pageSize: '25' } }, res);
    assert.equal(res.statusCode, 200); assert.equal(res.body.total, 235); assert.equal(res.body.totalPages, 10);
    ids.push(...res.body.questions.map(question => question._id));
  }
  assert.equal(ids.length, 235); assert.equal(new Set(ids).size, 235);
  assert.deepEqual(calls.find(call => call.sort).sort, { createdAt: -1, _id: -1 });
});

test('count and page fetch use the same combined filters', async t => {
  const calls = database(t);
  const query = { page: '2', pageSize: '50', category: 'NETWORK', difficulty: 'medium', q: 'TCP' };
  const res = response(); await searchQuestions({ query }, res);
  assert.deepEqual(calls[0].count, questionSearchFilter(query));
  assert.deepEqual(calls[1].filter, calls[0].count);
  assert.equal(calls[1].skip, 50); assert.equal(calls[1].limit, 50);
});

test('deleting the last row on the last page falls back to the last available page', async t => {
  database(t, [{ _id: 'only-question' }]);
  const res = response(); await searchQuestions({ query: { page: '10', pageSize: '25' } }, res);
  assert.equal(res.body.page, 1); assert.equal(res.body.totalPages, 1); assert.equal(res.body.questions.length, 1);
});

test('empty filtered collections return an explicit zero total', async t => {
  database(t, []);
  const res = response(); await searchQuestions({ query: { page: '1', category: 'LINUX' } }, res);
  assert.deepEqual(res.body, { questions: [], total: 0, page: 1, pageSize: 25, totalPages: 1 });
});

test('legacy search and all-question callers retain their array responses', async t => {
  database(t);
  const all = response(); await searchQuestions({ query: { all: '1' } }, all);
  assert.equal(Array.isArray(all.body), true); assert.equal(all.body.length, 200);
  const search = response(); await searchQuestions({ query: { q: 'Question' } }, search);
  assert.equal(Array.isArray(search.body), true); assert.equal(search.body.length, 30);
  const short = response(); await searchQuestions({ query: { q: 'Q' } }, short);
  assert.deepEqual(short.body, []);
});

test('tag options come from the actual database and sort chapter numbers naturally', async t => {
  t.mock.method(Question, 'distinct', async field => {
    assert.equal(field, 'tags'); return ['CHAPTER_10', 'LINUX', '', 'CHAPTER_2', null];
  });
  const res = response(); await getQuestionFilters({}, res);
  assert.deepEqual(res.body.tags, ['CHAPTER_2', 'CHAPTER_10', 'LINUX']);
});

test('invalid requests and database failures return errors rather than empty results', async t => {
  const invalid = response(); await searchQuestions({ query: { page: '1', difficulty: 'invalid' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  t.mock.method(Question, 'countDocuments', async () => { throw new Error('Database unavailable'); });
  const failed = response(); await searchQuestions({ query: { page: '1' } }, failed);
  assert.equal(failed.statusCode, 500);
});

test('question search and tag options remain restricted to root', () => {
  const routes = readFileSync(new URL('../routes/questionRoutes.js', import.meta.url), 'utf8');
  assert.match(routes, /router\.get\('\/search', authMiddleware, checkRole\('root'\), searchQuestions\)/);
  assert.match(routes, /router\.get\('\/search\/filters', authMiddleware, checkRole\('root'\), getQuestionFilters\)/);
});


test('filtered JSON export includes every matching row with the same search filters and order', async t => {
  const questions = Array.from({ length: 235 }, (_, index) => ({ _id: String(index), __v: 1,
    createdAt: 'date', updatedAt: 'date', title: `Question ${index}`, answers: ['A', 'B'],
    correctAnswers: [0], type: 'all', tags: ['LINUX'], difficulty: 'hard', explanation: '**Reason**' }));
  const query = { q: 'Question', category: 'LINUX', tag: 'LINUX', type: 'all', difficulty: 'hard' };
  t.mock.method(Question, 'find', filter => {
    assert.deepEqual(filter, questionSearchFilter(query));
    return { sort(value) {
      assert.deepEqual(value, { createdAt: -1, _id: -1 });
      return { lean: async () => questions };
    } };
  });
  const res = response(); await exportFilteredQuestions({ query }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 235);
  const copied = JSON.parse(JSON.stringify(res.body, null, 2));
  assert.equal(Array.isArray(copied), true);
  assert.equal(copied[234].title, 'Question 234');
  assert.equal(copied[0].explanation, '**Reason**');
  assert.deepEqual(copied[0].correctAnswers, [0]);
  for (const field of ['_id', '__v', 'createdAt', 'updatedAt']) assert.equal(field in copied[0], false);
});

test('filtered JSON export returns an empty array for no matches and rejects invalid filters', async t => {
  t.mock.method(Question, 'find', () => ({ sort: () => ({ lean: async () => [] }) }));
  const empty = response(); await exportFilteredQuestions({ query: {} }, empty);
  assert.deepEqual(empty.body, []);
  const invalid = response(); await exportFilteredQuestions({ query: { difficulty: 'invalid' } }, invalid);
  assert.equal(invalid.statusCode, 400);
});

test('filtered JSON export is restricted to root', () => {
  const routes = readFileSync(new URL('../routes/questionRoutes.js', import.meta.url), 'utf8');
  assert.ok(routes.includes("router.get('/search/export', authMiddleware, checkRole('root'), exportFilteredQuestions)"));
});


test('explanation presence ignores missing, null, empty and whitespace-only text', () => {
  const withExplanation = questionSearchFilter({ hasExplanation: 'yes' });
  const withoutExplanation = questionSearchFilter({ hasExplanation: 'no' });
  assert.deepEqual(withExplanation, { explanation: { $regex: '\\S' } });
  assert.deepEqual(withoutExplanation, { explanation: { $not: { $regex: '\\S' } } });
  const regex = new RegExp(withExplanation.explanation.$regex);
  for (const value of ['', ' ', '\n\t  ']) assert.equal(regex.test(value), false);
  for (const value of ['Explanation', '**bold**', '  reason  ']) assert.equal(regex.test(value), true);
  assert.doesNotThrow(() => Question.find(withExplanation).cast(Question));
  assert.doesNotThrow(() => Question.find(withoutExplanation).cast(Question));
});

test('explanation filter combines with every other filter and reaches filtered export', async t => {
  const query = { category: 'LINUX', difficulty: 'hard', q: 'chmod', hasExplanation: 'no' };
  const filter = questionSearchFilter(query);
  assert.deepEqual(filter.$and.at(-1), { explanation: { $not: { $regex: '\\S' } } });
  t.mock.method(Question, 'find', received => {
    assert.deepEqual(received, filter);
    return { sort: () => ({ lean: async () => [] }) };
  });
  const res = response(); await exportFilteredQuestions({ query }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, []);
});

test('invalid explanation selectors are rejected', () => {
  for (const value of ['true', 'invalid', {}, ['yes']]) assert.throws(() => questionSearchFilter({ hasExplanation: value }), { status: 400 });
  assert.deepEqual(questionSearchFilter({ hasExplanation: '' }), {});
});
