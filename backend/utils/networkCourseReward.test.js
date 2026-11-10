import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import User from '../models/User.js';
import { createCourseReward } from './networkCourseReward.js';
import { courseLessons, COURSE_COMPLETION_XP } from '../network/networkCourse.js';
import { levelFromXp } from './xpUtils.js';

const allLessons = courseLessons.map(l => l.id);
function setup({ user = {}, pass = null, conflict = false } = {}) {
  const account = new User({ username: 'learner', email: 'learner@example.test', password: 'unused', ...user });
  const writes = [];
  let reads = 0, conflictPending = conflict;
  const award = createCourseReward({
    users: {
      findById: async () => { reads++; return new User(account.toObject()); },
      findOneAndUpdate: async (filter, update) => {
        await Promise.resolve();
        if (conflictPending) { conflictPending = false; account.xp += 25; return null; }
        if (account.networkCourseRewarded) return null;
        for (const condition of filter.$expr.$and) {
          const [expression, expected] = condition.$eq;
          const path = expression.$ifNull[0].slice(1), fallback = expression.$ifNull[1].$literal;
          const actual = account.get(path)?.toObject?.() ?? account.get(path) ?? fallback;
          if (!isDeepStrictEqual(actual, expected.$literal)) return null;
        }
        assert.deepEqual(filter.networkCourseRewarded, { $ne: true });
        assert.equal(update.$set.networkCourseRewarded, true);
        assert.equal(update.$inc.xp, COURSE_COMPLETION_XP);
        writes.push(update);
        for (const [path, value] of Object.entries(update.$set)) account.set(path, value);
        for (const [path, value] of Object.entries(update.$inc)) account.set(path, (account.get(path) || 0) + value);
        return new User(account.toObject());
      },
    },
    passes: { findOne: async () => pass }, resetPeriod: async () => {},
  });
  return { award: completed => award(String(account._id), completed), account, writes, reads: () => reads };
}
test('All distinct curriculum lessons are required; duplicates and unknown IDs do not substitute', async () => {
  const s = setup();
  for (const input of [[], allLessons.slice(1), [...allLessons.slice(1), allLessons[1]], [...allLessons.slice(1), 'unknown']]) {
    assert.deepEqual(await s.award(input), { xpGained: 0, rewardClaimed: false });
  }
  assert.equal(s.reads(), 0); assert.equal(s.writes.length, 0);
});
test('The course grants exactly 500 XP once, ignoring multipliers and recalculating level', async () => {
  const s = setup({ user: { xp: 90, xpPrivilege: 3, activeBoosts: [{ type: 'xp_multiplier', multiplier: 4, expiresAt: new Date(Date.now() + 60000) }] } });
  const result = await s.award(allLessons);
  assert.equal(result.xpGained, 500); assert.equal(result.xp, 590); assert.equal(result.level, levelFromXp(590));
  assert.equal(s.account.competitiveStats.currentPeriodXP, 500);
  assert.equal((await s.award(allLessons)).xpGained, 0);
  assert.equal(s.account.xp, 590); assert.equal(s.writes.length, 1);
});
test('Simultaneous completion requests produce only one atomic XP and receipt write', async () => {
  const s = setup();
  const results = await Promise.all([s.award(allLessons), s.award(allLessons), s.award(allLessons)]);
  assert.equal(results.reduce((total, r) => total + r.xpGained, 0), 500);
  assert.ok(results.every(r => r.rewardClaimed)); assert.equal(s.writes.length, 1); assert.equal(s.account.xp, 500);
});
test('A concurrent account update is preserved when the reward retries', async () => {
  const s = setup({ conflict: true });
  assert.equal((await s.award(allLessons)).xp, 525);
  assert.equal(s.account.level, levelFromXp(525)); assert.equal(s.writes.length, 1);
});
test('Active pass XP is capped while premium ownership and claimed rewards are preserved', async () => {
  const passId = new User()._id;
  const s = setup({ pass: { _id: passId, totalLevels: 10, xpPerLevel: 100 }, user: {
    seasonPass: { passId, xp: 800, level: 8, isPremium: true, claimedLevels: { free: [1], premium: [1, 2] } },
  } });
  await s.award(allLessons);
  assert.equal(s.account.seasonPass.xp, 1000); assert.equal(s.account.seasonPass.level, 10);
  assert.equal(s.account.seasonPass.isPremium, true);
  assert.deepEqual([...s.account.seasonPass.claimedLevels.premium], [1, 2]);
});
