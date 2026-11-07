import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendedNetworkProblem } from './networkProblemCatalog.js';

const lab = (id, difficulty = 'easy', tags = [], solved = false, published = true) =>
  ({ _id: id, difficulty, tags, solved, published });

test('without history, recommends the first published lab in catalog order', () => {
  const first = lab('first', 'hard');
  assert.equal(recommendedNetworkProblem([lab('draft', 'easy', [], false, false), first, lab('second')]), first);
});

test('matches average difficulty across the whole solved history', () => {
  const medium = lab('next-medium', 'medium');
  assert.equal(recommendedNetworkProblem([
    lab('solved-easy', 'easy', [], true), lab('solved-hard', 'hard', [], true),
    lab('next-easy'), lab('next-hard', 'hard'), medium,
  ]), medium);
});

test('uses tag frequency across completed labs rather than just the latest solve', () => {
  const routing = lab('routing', 'medium', ['routing']);
  assert.equal(recommendedNetworkProblem([
    lab('a', 'medium', ['routing'], true), lab('b', 'medium', ['routing'], true),
    lab('c', 'medium', ['dns'], true), lab('dns', 'medium', ['dns']), routing,
  ]), routing);
});

test('normalizes tags and counts each tag once per solved lab', () => {
  const routing = lab('routing', 'medium', [' Routing ', 'routing']);
  assert.equal(recommendedNetworkProblem([
    lab('a', 'medium', ['Routing', ' routing ', 'ROUTING'], true),
    lab('b', 'medium', ['DNS'], true), lab('c', 'medium', ['dns'], true),
    routing, lab('dns', 'medium', ['dns']),
  ])._id, 'dns');
});

test('difficulty fit outweighs familiar tags when the gap is a full level', () => {
  const easy = lab('easy', 'easy', ['new-topic']);
  assert.equal(recommendedNetworkProblem([
    lab('a', 'easy', ['routing'], true), lab('hard', 'hard', ['routing']), easy,
  ]), easy);
});

test('equal matches favor the next difficulty, then preserve catalog order', () => {
  const medium = lab('medium', 'medium', ['routing']);
  assert.equal(recommendedNetworkProblem([
    lab('a', 'easy', ['routing'], true), lab('b', 'medium', ['routing'], true),
    lab('easy', 'easy', ['routing']), medium, lab('another-medium', 'medium', ['routing']),
  ]), medium);
});

test('drafts never influence history or become recommendations; inputs stay unchanged', () => {
  const easy = lab('next');
  const problems = [lab('draft-solve', 'hard', ['ospf'], true, false), easy, lab('draft', 'hard', [], false, false)];
  const snapshot = structuredClone(problems);
  assert.equal(recommendedNetworkProblem(problems), easy);
  assert.deepEqual(problems, snapshot);
});

test('returns null for empty catalogs or when every published lab is solved', () => {
  assert.equal(recommendedNetworkProblem([]), null);
  assert.equal(recommendedNetworkProblem([lab('done', 'easy', [], true), lab('draft', 'easy', [], false, false)]), null);
});
