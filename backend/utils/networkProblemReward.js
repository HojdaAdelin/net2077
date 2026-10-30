import User from '../models/User.js';
import SeasonPass from '../models/SeasonPass.js';
import { checkAndResetPeriod } from '../controllers/competitiveController.js';
import { xpWithBoosts } from './boostUtils.js';
import { levelFromXp } from './xpUtils.js';
import { updateUserStreak, getStreakInfo } from './streakUtils.js';

// The solve receipt, global XP, competitive XP and pass progress share one
// conditional User write. Retries cannot grant part of the reward twice.
export async function awardNetworkProblem(userId, problem) {
  await checkAndResetPeriod();
  const pass = await SeasonPass.findOne({ isActive: true });
  for (let retry = 0; retry < 12; retry++) {
    const user = await User.findById(userId);
    if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });
    if (user.solvedNetworkProblems.some(id => String(id) === String(problem._id))) {
      return { xpGained: 0, alreadySolved: true, xp: user.xp, level: user.level, streak: getStreakInfo(user) };
    }
    const xpGained = xpWithBoosts(user, problem.xp);
    const defaults = { xp: 0, xpPrivilege: 1, activeBoosts: [], dailyActivity: [],
      'streak.current': 0, 'streak.max': 0, 'streak.lastActivity': null, 'streak.lastActivityDate': null,
      'seasonPass.passId': null, 'seasonPass.xp': 0, 'seasonPass.isPremium': false,
      'seasonPass.claimedLevels.free': [], 'seasonPass.claimedLevels.premium': [] };
    const filter = { _id: userId, solvedNetworkProblems: { $ne: problem._id }, $expr: { $and: Object.entries(defaults).map(([path, fallback]) => ({
      $eq: [{ $ifNull: [`$${path}`, { $literal: fallback }] }, { $literal: user.get(path)?.toObject?.() ?? user.get(path) ?? fallback }]
    })) } };
    await updateUserStreak(user);
    const today = new Date().toISOString().slice(0, 10);
    const activity = user.dailyActivity.map(day => day.toObject());
    const day = activity.find(item => item.date === today);
    if (day) day.count++; else activity.push({ date: today, count: 1 });
    const changes = { level: levelFromXp(user.xp + xpGained), streak: user.streak.toObject(), dailyActivity: activity.slice(-30) };
    if (pass) {
      const samePass = String(user.seasonPass?.passId) === String(pass._id);
      const xp = Math.min((samePass ? user.seasonPass.xp || 0 : 0) + xpGained, pass.totalLevels * pass.xpPerLevel);
      const level = Math.min(Math.floor(xp / pass.xpPerLevel), pass.totalLevels);
      if (samePass) { changes['seasonPass.xp'] = xp; changes['seasonPass.level'] = level; }
      else changes.seasonPass = { passId: pass._id, xp, level, isPremium: false, claimedLevels: { free: [], premium: [] } };
    }
    const updated = await User.findOneAndUpdate(filter, {
      $addToSet: { solvedNetworkProblems: problem._id },
      $inc: { xp: xpGained, 'networkLabStats.solved': 1, 'competitiveStats.currentPeriodXP': xpGained }, $set: changes,
    }, { new: true });
    if (updated) return { xpGained, alreadySolved: false, xp: updated.xp, level: updated.level, streak: getStreakInfo(updated) };
  }
  throw Object.assign(new Error('Your account progress changed while saving. Check the objectives again to finish.'), { status: 409 });
}
