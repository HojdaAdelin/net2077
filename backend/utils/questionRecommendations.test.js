import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceKey, performanceScopes, recommendQuestions, recommendationFilter } from './questionRecommendations.js';
const q = (id, chapter = 'CHAPTER3', category = 'LINUX', difficulty = 'medium', type = 'all') => ({ _id: String(id), tags: [category, chapter], difficulty, type });
const stat = (tag, correct, wrong, category = 'LINUX', type = 'all') => ({ category, type, tag, correct, wrong });
const random = () => .5;

test('Recommendations return 50 unique unsolved questions, or all remaining when fewer exist', () => {
  const candidates = Array.from({ length: 90 }, (_, i) => q(i));
  const solved = candidates.slice(0, 20);
  const result = recommendQuestions([...candidates, ...candidates], { solved, random });
  assert.equal(result.length, 50); assert.equal(new Set(result.map(q => q._id)).size, 50);
  assert.ok(result.every(q => Number(q._id) >= 20));
  assert.equal(recommendQuestions(candidates.slice(0, 25), { solved, random }).length, 5);
  assert.deepEqual(recommendQuestions(candidates, { solved: candidates, random }), []);
});
test('Sustained mistakes prioritize a weak chapter over a mastered chapter', () => {
  const performance = [stat('CHAPTER3', 0, 20), stat('CHAPTER4', 20, 0)];
  const pool = [q('mastered', 'CHAPTER4'), q('weak', 'CHAPTER3')];
  assert.equal(recommendQuestions(pool, { performance, random, limit: 1, category: 'LINUX' })[0]._id, 'weak');
});
test('Category and quiz type isolate statistics even when chapter tags overlap', () => {
  const performance = [stat('CHAPTER3', 0, 100, 'NETWORK'), stat('CHAPTER3', 0, 100, 'LINUX', 'acadnet')];
  const pool = [q('first', 'CHAPTER4'), q('second', 'CHAPTER3')];
  assert.deepEqual(recommendQuestions(pool, { performance, random, category: 'LINUX' }), recommendQuestions(pool, { random, category: 'LINUX' }));
});
test('Difficulty follows measured accuracy, with solved-history fallback for existing accounts', () => {
  const pool = ['easy', 'medium', 'hard'].map(d => q(d, 'CHAPTER3', 'LINUX', d));
  assert.equal(recommendQuestions(pool, { performance: [stat('TOTAL', 1, 15)], random, limit: 1 })[0]._id, 'easy');
  assert.equal(recommendQuestions(pool, { performance: [stat('TOTAL', 30, 0)], random, limit: 1 })[0]._id, 'hard');
  assert.equal(recommendQuestions(pool, { solved: [q('solved', 'CHAPTER3', 'LINUX', 'hard')], random, limit: 1 })[0]._id, 'hard');
});
test('Tag affinity works for categories without Linux chapter tags', () => {
  const solved = [q('old', 'ROUTING', 'NETWORK')];
  const result = recommendQuestions([q('dns', 'DNS', 'NETWORK'), q('route', 'ROUTING', 'NETWORK')], { solved, random, limit: 1, category: 'NETWORK' });
  assert.equal(result[0]._id, 'route');
});
test('New accounts receive a varied batch instead of fifty questions from one chapter', () => {
  const pool = [3, 4, 5, 6].flatMap(ch => Array.from({ length: 30 }, (_, i) => q(`${ch}-${i}`, `CHAPTER${ch}`)));
  const result = recommendQuestions(pool, { random });
  assert.equal(new Set(result.map(q => q.tags[1])).size, 4);
});
test('Filter construction combines type, category, chapters and ESP32 with AND', () => {
  assert.deepEqual(recommendationFilter({ type: 'all', tags: 'ARDUINO', chapters: 'CHAPTER15', board: 'esp32' }), {
    type: 'all', $and: [{ tags: { $in: ['ARDUINO'] } }, { tags: { $in: ['CHAPTER15'] } }, { tags: { $all: ['ARDUINO', 'ESP32'] } }],
  });
  assert.deepEqual(recommendationFilter({ type: 'acadnet' }), { type: 'acadnet' });
  for (const input of [{ type: { $ne: '' } }, { tags: ['LINUX'] }, { tags: 'UNKNOWN' }, { chapters: 'CHAPTER3,$where' }, { board: 'bad' }]) assert.throws(() => recommendationFilter(input), { status: 400 });
});
test('Performance keys safely separate metadata and duplicate tags count only once', () => {
  const scopes = performanceScopes({ type: 'acadnet', difficulty: 'hard', tags: ['LINUX', 'CHAPTER3', 'CHAPTER3', 'LINUX', 'topic.$unsafe'] });
  assert.equal(scopes.filter(s => s.category === 'LINUX' && s.tag === 'CHAPTER3').length, 1);
  assert.ok(scopes.some(s => s.category === 'ACADNET'));
  assert.match(performanceKey('LINUX', 'all', 'topic.$unsafe'), /^[a-f0-9]{64}$/);
  assert.notEqual(performanceKey('LINUX', 'all', 'CHAPTER3'), performanceKey('NETWORK', 'all', 'CHAPTER3'));
});
test('Linux recommendations always choose chapters automatically, including stale URL filters', () => {
  assert.deepEqual(recommendationFilter({ type: 'all', tags: 'LINUX', chapters: 'CHAPTER3' }), {
    type: 'all', $and: [{ tags: { $in: ['LINUX'] } }],
  });
  assert.deepEqual(recommendationFilter({ type: 'basic', chapters: 'CHAPTER3' }), { type: 'basic' });
  assert.deepEqual(recommendationFilter({ type: 'acadnet', tags: 'LINUX', chapters: 'CHAPTER3' }), {
    type: 'acadnet', $and: [{ tags: { $in: ['LINUX'] } }],
  });
});
