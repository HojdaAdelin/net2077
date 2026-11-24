import User from '../models/User.js';
import SeasonPass from '../models/SeasonPass.js';
import { checkAndResetPeriod } from '../controllers/competitiveController.js';
import { xpWithBoosts } from './boostUtils.js';
import { levelFromXp } from './xpUtils.js';
import { updateUserStreak, getStreakInfo } from './streakUtils.js';
import { NETWORK_DAILY_XP, recordNetworkDailyActivity } from './networkLabDaily.js';

// The solve receipt, global XP, competitive XP and pass progress share one
// conditional User write. Retries cannot grant part of the reward twice.
export async function awardNetworkProblem(userId, problem, { completed = true, objectives = [] } = {}) {
  const objectiveKeys = objectives.filter(goal => goal.passed).map(goal => `${problem._id}:${goal.id}`);
  if (completed) await checkAndResetPeriod();
  const pass = completed ? await SeasonPass.findOne({ isActive: true }) : null;
  for (let retry = 0; retry < 12; retry++) {
    const user = await User.findById(userId);
    if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });
    const alreadySolved = user.solvedNetworkProblems.some(id => String(id) === String(problem._id));
    const newSolve = completed && !alreadySolved;
    const xpGained = newSolve ? xpWithBoosts(user, problem.xp) : 0;
    const now = new Date();
    const daily = recordNetworkDailyActivity(user.networkLabDaily, { newSolve, xp: xpGained, objectiveKeys }, now);
    if (!newSolve && !daily) return { xpGained, alreadySolved, xp: user.xp, level: user.level, streak: getStreakInfo(user) };
    const bonus = daily?.rewarded ? NETWORK_DAILY_XP : 0;
    const defaults = { xp: 0, 'networkLabDaily.day': null, 'networkLabDaily.version': 0 };
    if (newSolve) Object.assign(defaults, { xpPrivilege: 1, activeBoosts: [], dailyActivity: [],
      'streak.current': 0, 'streak.max': 0, 'streak.lastActivity': null, 'streak.lastActivityDate': null,
      'seasonPass.passId': null, 'seasonPass.xp': 0, 'seasonPass.isPremium': false,
      'seasonPass.claimedLevels.free': [], 'seasonPass.claimedLevels.premium': [] });
    const filter = { _id: userId, ...(newSolve && { solvedNetworkProblems: { $ne: problem._id } }), $expr: { $and: Object.entries(defaults).map(([path, fallback]) => ({
      $eq: [{ $ifNull: [`$${path}`, { $literal: fallback }] }, { $literal: user.get(path)?.toObject?.() ?? user.get(path) ?? fallback }]
    })) } };
    const changes = daily ? { networkLabDaily: daily } : {};
    const increments = {};
    if (newSolve || bonus) {
      changes.level = levelFromXp(user.xp + xpGained + bonus);
      increments.xp = xpGained + bonus;
    }
    if (bonus) increments.networkLabDailyPoints = 1;
    if (newSolve) {
      await updateUserStreak(user);
      const today = now.toISOString().slice(0, 10);
      const activity = user.dailyActivity.map(day => day.toObject());
      const day = activity.find(item => item.date === today);
      if (day) day.count++; else activity.push({ date: today, count: 1 });
      changes.streak = user.streak.toObject();
      changes.dailyActivity = activity.slice(-30);
      increments['networkLabStats.solved'] = 1;
      increments['competitiveStats.currentPeriodXP'] = xpGained;
    }
    if (newSolve && pass) {
      const samePass = String(user.seasonPass?.passId) === String(pass._id);
      const xp = Math.min((samePass ? user.seasonPass.xp || 0 : 0) + xpGained, pass.totalLevels * pass.xpPerLevel);
      const level = Math.min(Math.floor(xp / pass.xpPerLevel), pass.totalLevels);
      if (samePass) { changes['seasonPass.xp'] = xp; changes['seasonPass.level'] = level; }
      else changes.seasonPass = { passId: pass._id, xp, level, isPremium: false, claimedLevels: { free: [], premium: [] } };
    }
    const updated = await User.findOneAndUpdate(filter, {
      ...(newSolve && { $addToSet: { solvedNetworkProblems: problem._id } }),
      ...(Object.keys(increments).length && { $inc: increments }), $set: changes,
    }, { new: true });
    if (updated) return { xpGained, dailyBonusXp: bonus, alreadySolved, xp: updated.xp, level: updated.level, streak: getStreakInfo(updated) };
  }
  throw Object.assign(new Error('Your account progress changed while saving. Check the objectives again to finish.'), { status: 409 });
}
