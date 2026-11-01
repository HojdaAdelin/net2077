export function availablePassRewards(pass, progress) {
  if (String(progress?.passId) !== String(pass._id)) return [];
  return pass.levels.flatMap(entry => {
    if (entry.level < 1 || entry.level > pass.totalLevels || entry.level > progress.level) return [];
    return ['free', 'premium'].filter(tier =>
      (tier === 'free' || (pass.hasPremium && progress.isPremium)) &&
      entry[tier] && entry[tier].type !== 'none' &&
      !(progress.claimedLevels?.[tier] || []).includes(entry.level)
    ).map(tier => ({ level: entry.level, tier, reward: entry[tier] }));
  });
}

export function rewardUpdate(rewards, items, inventory) {
  const update = { $addToSet: {} };
  let gold = 0;
  const nextInventory = inventory.map(item => ({ ...item }));
  const add = (path, value) => {
    update.$addToSet[path] ??= { $each: [] };
    update.$addToSet[path].$each.push(value);
  };
  for (const { level, tier, reward } of rewards) {
    add(`seasonPass.claimedLevels.${tier}`, level);
    if (reward.type === 'gold') {
      const amount = Number(reward.value);
      if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid gold reward.');
      gold += amount;
    } else if (reward.type === 'frame' || reward.type === 'nameEffect') {
      if (typeof reward.value !== 'string' || !reward.value) throw new Error('Invalid cosmetic reward.');
      add(reward.type === 'frame' ? 'frames.owned' : 'nameEffects.owned', reward.value);
    } else if (reward.type === 'item') {
      const item = items.find(item => item.itemId === reward.value);
      if (!item || item.category === 'addon') throw new Error('Season reward item is unavailable.');
      const existing = nextInventory.find(entry => entry.itemId === item.itemId);
      if (existing) existing.quantity = (existing.quantity || 0) + 1;
      else nextInventory.push({ itemId: item.itemId, name: item.name, icon: item.icon,
        duration: item.duration, category: item.category, quantity: 1, purchasedAt: new Date() });
    }
  }
  if (gold) update.$inc = { gold };
  if (rewards.some(entry => entry.reward.type === 'item')) update.$set = { inventory: nextInventory };
  return update;
}
