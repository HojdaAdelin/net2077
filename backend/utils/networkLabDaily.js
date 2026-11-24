const zone = 'Europe/Bucharest';
const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
});
const offsetFormat = new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'longOffset' });
const dayMs = 86400000;
export const NETWORK_DAILY_XP = 50;
const taskTypes = [
  { metric: 'xp', targets: [100, 150, 200], label: target => `Earn ${target} XP from labs` },
  { metric: 'labs', targets: [2, 3], label: target => `Complete ${target} new labs` },
  { metric: 'objectives', targets: [3, 5, 7], label: target => `Pass ${target} lab objectives` },
];

function dailyTasks(day) {
  const random = createHash('sha256').update(`network-lab:${day}`).digest();
  return taskTypes.filter((_, index) => index !== random[0] % taskTypes.length).map(({ metric, targets, label }, index) => {
    const target = targets[random[index + 1] % targets.length];
    return { metric, target, label: label(target) };
  });
}

function progressFor(state, metric) {
  return metric === 'objectives' ? state.objectiveKeys?.length || 0 : state[metric] || 0;
}

export function networkDailyPeriod(now = new Date()) {
  const parts = Object.fromEntries(dateFormat.formatToParts(now).map(({ type, value }) => [type, Number(value)]));
  const localDay = Date.UTC(parts.year, parts.month - 1, parts.day);
  const day = Math.floor(localDay / dayMs) - Number(parts.hour < 20);
  const nextEvening = (day + 1) * dayMs + 20 * 3600000;
  const offset = offsetFormat.formatToParts(nextEvening).find(part => part.type === 'timeZoneName').value;
  const [, sign, hours, minutes] = /^GMT([+-])(\d{2}):(\d{2})$/.exec(offset);
  const resetAt = new Date(nextEvening - (sign === '+' ? 1 : -1) * (+hours * 60 + +minutes) * 60000);
  return { day, resetAt, tasks: dailyTasks(day) };
}

export function networkDailyStatus(state, points, now = new Date()) {
  const { day, resetAt, tasks } = networkDailyPeriod(now);
  const today = state?.day === day ? state : {};
  return {
    tasks: tasks.map(task => ({ ...task, progress: today.rewarded ? task.target : Math.min(task.target, progressFor(today, task.metric)) })),
    resetAt, serverTime: now, completed: Boolean(today.rewarded), points: points || 0, rewardXp: NETWORK_DAILY_XP,
  };
}

export function recordNetworkDailyActivity(state, { newSolve, xp, objectiveKeys }, now) {
  const { day, tasks } = networkDailyPeriod(now);
  const today = state?.day === day ? state : {};
  const target = tasks.find(task => task.metric === 'objectives')?.target || 0;
  if (today.rewarded || (!newSolve && (!target || !objectiveKeys.length))) return null;
  const next = {
    day, version: (today.version || 0) + 1,
    labs: (today.labs || 0) + Number(newSolve), xp: (today.xp || 0) + xp,
    objectiveKeys: [...new Set([...(today.objectiveKeys || []), ...objectiveKeys])].slice(0, target),
    rewarded: false,
  };
  if (!newSolve && next.objectiveKeys.length === (today.objectiveKeys?.length || 0)) return null;
  next.rewarded = tasks.every(task => progressFor(next, task.metric) >= task.target);
  return next;
}
import { createHash } from 'node:crypto';

