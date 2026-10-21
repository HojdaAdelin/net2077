const DAY = 86400000;

export function dailyChallengeStatus(challenge, now = new Date()) {
  // Older completions only recorded the UTC calendar date.
  const completedAt = challenge?.completedAt || (challenge?.lastCompleted ? `${challenge.lastCompleted}T00:00:00.000Z` : null);
  const end = completedAt ? new Date(completedAt).getTime() + DAY : 0;
  const remaining = Math.max(0, end - now.getTime());
  return { completed: remaining > 0, nextAvailableAt: remaining ? new Date(end).toISOString() : null,
    serverTime: now.toISOString(), timeUntilNext: `${Math.floor(remaining / 3600000)}h ${Math.floor(remaining % 3600000 / 60000)}m`,
    lastScore: challenge?.lastScore || 0, lastTotalPoints: challenge?.lastTotalPoints || 0 };
}

export function dailyRewardFilter(now = new Date()) {
  return { $or: [
    { 'dailyChallenge.completedAt': { $lte: new Date(now.getTime() - DAY) } },
    { 'dailyChallenge.completedAt': null, 'dailyChallenge.lastCompleted': { $ne: now.toISOString().slice(0, 10) } }
  ] };
}
