import User from '../models/User.js';
import SeasonPass from '../models/SeasonPass.js';
import { checkAndResetPeriod } from '../controllers/competitiveController.js';
import { courseLessons, COURSE_COMPLETION_XP } from '../network/networkCourse.js';
import { levelFromXp } from './xpUtils.js';

export function createCourseReward({ users, passes, resetPeriod }) {
  // completedIds must come from the persisted course record, never request data.
  return async (userId, completedIds = []) => {
    const completed = new Set(completedIds);
    if (!courseLessons.every(lesson => completed.has(lesson.id))) return { xpGained: 0, rewardClaimed: false };
    let user = await users.findById(userId);
    const receipt = value => ({ xpGained: 0, rewardClaimed: true, xp: value.xp, level: value.level });
    if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });
    if (user.networkCourseRewarded) return receipt(user);
    await resetPeriod();
    const pass = await passes.findOne({ isActive: true });
    for (let retry = 0; retry < 12; retry++) {
      user = await users.findById(userId);
      if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });
      if (user.networkCourseRewarded) return receipt(user);
      const snapshots = { xp: 0, 'seasonPass.passId': null, 'seasonPass.xp': 0,
        'seasonPass.isPremium': false, 'seasonPass.claimedLevels.free': [], 'seasonPass.claimedLevels.premium': [] };
      const filter = { _id: userId, networkCourseRewarded: { $ne: true }, $expr: { $and: Object.entries(snapshots).map(([path, fallback]) => ({
        $eq: [{ $ifNull: [`$${path}`, { $literal: fallback }] }, { $literal: user.get(path)?.toObject?.() ?? user.get(path) ?? fallback }],
      })) } };
      const changes = { networkCourseRewarded: true, level: levelFromXp(user.xp + COURSE_COMPLETION_XP) };
      if (pass) {
        const samePass = String(user.seasonPass?.passId) === String(pass._id);
        const xp = Math.min((samePass ? user.seasonPass.xp || 0 : 0) + COURSE_COMPLETION_XP, pass.totalLevels * pass.xpPerLevel);
        const level = Math.min(Math.floor(xp / pass.xpPerLevel), pass.totalLevels);
        if (samePass) { changes['seasonPass.xp'] = xp; changes['seasonPass.level'] = level; }
        else changes.seasonPass = { passId: pass._id, xp, level, isPremium: false, claimedLevels: { free: [], premium: [] } };
      }
      // Receipt and fixed 500 XP share a single conditional User write. A retry,
      // concurrent final lesson or failed HTTP response cannot award it twice.
      const updated = await users.findOneAndUpdate(filter, {
        $set: changes, $inc: { xp: COURSE_COMPLETION_XP, 'competitiveStats.currentPeriodXP': COURSE_COMPLETION_XP },
      }, { new: true });
      if (updated) return { ...receipt(updated), xpGained: COURSE_COMPLETION_XP };
    }
    throw Object.assign(new Error('Your progress changed while awarding course XP. Reload the course to retry.'), { status: 409 });
  };
}
export const awardNetworkCourse = createCourseReward({ users: User, passes: SeasonPass, resetPeriod: checkAndResetPeriod });
