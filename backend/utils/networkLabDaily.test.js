import test from 'node:test';
import assert from 'node:assert/strict';
import { networkDailyPeriod, networkDailyStatus, recordNetworkDailyActivity } from './networkLabDaily.js';

test('the daily period changes at 20:00 Bucharest time across daylight-saving transitions', () => {
  for (const [boundary, next] of [
    ['2026-03-28T18:00:00Z', '2026-03-29T17:00:00Z'],
    ['2026-03-29T17:00:00Z', '2026-03-30T17:00:00Z'],
    ['2026-10-24T17:00:00Z', '2026-10-25T18:00:00Z'],
    ['2026-10-25T18:00:00Z', '2026-10-26T18:00:00Z'],
  ]) {
    const now = new Date(boundary);
    const previous = networkDailyPeriod(new Date(now.getTime() - 1));
    const current = networkDailyPeriod(now);
    assert.equal(previous.resetAt.getTime(), now.getTime());
    assert.equal(current.day, previous.day + 1);
    assert.equal(current.resetAt.getTime(), Date.parse(next));
  }
});

test('each date selects two stable, distinct tasks within the configured caps', () => {
  const pairs = new Set();
  const start = Date.parse('2026-11-24T18:00:00Z');
  for (let i = 0; i < 30; i++) {
    const now = new Date(start + i * 86400000);
    const { tasks } = networkDailyPeriod(now);
    assert.equal(new Set(tasks.map(task => task.metric)).size, 2);
    assert.deepEqual(tasks, networkDailyPeriod(new Date(+now + 60000)).tasks);
    for (const task of tasks) assert.ok(task.target <= { xp: 200, labs: 3, objectives: 7 }[task.metric]);
    pairs.add(tasks.map(task => task.metric).join('/'));
  }
  assert.equal(pairs.size, 3);
});

test('unique objectives count on partial checks, and both tasks must finish before the one-time reward', () => {
  let now = new Date('2026-11-24T18:00:00Z');
  while (!networkDailyPeriod(now).tasks.some(task => task.metric === 'objectives')) now = new Date(+now + 86400000);
  const { resetAt, tasks } = networkDailyPeriod(now);
  const otherTask = tasks.find(task => task.metric !== 'objectives');
  const partial = { newSolve: false, xp: 0, objectiveKeys: ['lab:objective'] };
  let state = recordNetworkDailyActivity(undefined, partial, now);
  assert.equal(state.objectiveKeys.length, 1);
  assert.equal(recordNetworkDailyActivity(state, partial, now), null);
  for (let i = 0; i < otherTask.target && !state.rewarded && (otherTask.metric === 'labs' || i < 1); i++) {
    state = recordNetworkDailyActivity(state, { newSolve: true, xp: 200, objectiveKeys: [] }, now);
  }
  assert.equal(state.rewarded, false);
  state = recordNetworkDailyActivity(state, { ...partial, objectiveKeys: Array.from({ length: 7 }, (_, i) => `lab:${i}`) }, now);
  assert.equal(state.rewarded, true);
  assert.equal(recordNetworkDailyActivity(state, { ...partial, newSolve: true }, now), null);
  const afterReset = networkDailyStatus(state, 1, resetAt);
  assert.ok(afterReset.tasks.every(task => task.progress === 0));
  assert.equal(afterReset.completed, false);
  assert.equal(afterReset.points, 1);
});
