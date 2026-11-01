export function unclaimedRewards(pass, progress) {
  if (!pass || !progress) return [];
  return (pass.levels || []).flatMap(entry => {
    if (entry.level < 1 || entry.level > pass.totalLevels || entry.level > progress.level) return [];
    return ['free', 'premium'].filter(tier =>
      (tier === 'free' || (pass.hasPremium && progress.isPremium)) &&
      entry[tier] && entry[tier].type !== 'none' &&
      !(progress.claimedLevels?.[tier] || []).includes(entry.level)
    ).map(tier => ({ level: entry.level, tier, ...entry[tier] }));
  });
}

export const countUnclaimedRewards = (pass, progress) => unclaimedRewards(pass, progress).length;

export function stackRewards(rewards) {
  const groups = new Map();
  for (const reward of rewards) {
    const key = reward.type === 'gold' ? 'gold' : `${reward.type}:${reward.value}`;
    if (!groups.has(key)) groups.set(key, { ...reward, key, quantity: 0 });
    groups.get(key).quantity += reward.type === 'gold' ? Number(reward.value) || 0 : 1;
  }
  return [...groups.values()];
}
