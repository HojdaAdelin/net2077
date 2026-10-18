/**
 * XP needed to advance from the current level to the next:
 * 1-10: 100; 11-25: 200; 26-50: 350; 51-75: 500;
 * 76-100: 750; 101-150: 1000; 151-200: 1500; 201+: 2500.
 * Keep backend/utils/xpUtils.js and frontend/src/utils/xpUtils.js in sync.
 */

/**
 * Returns the total XP needed to REACH a given level (from lvl 1).
 * Level 1 starts at 0 XP.
 */
export function totalXpForLevel(level) {
  if (level <= 1) return 0;

  let xp = 0;
  for (let lvl = 1; lvl < level; lvl++) {
    xp += xpPerLevel(lvl);
  }
  return xp;
}

/**
 * XP required to go from `level` to `level + 1`.
 */
export function xpPerLevel(level) {
  if (level <= 10)  return 100;
  if (level <= 25)  return 200;
  if (level <= 50)  return 350;
  if (level <= 75)  return 500;
  if (level <= 100) return 750;
  if (level <= 150) return 1000;
  if (level <= 200) return 1500;
  return 2500;
}

/**
 * Calculates the level a user is at based on total accumulated XP.
 */
export function levelFromXp(xp) {
  let level = 1;
  let remaining = xp;

  while (remaining >= xpPerLevel(level)) {
    remaining -= xpPerLevel(level);
    level++;
  }

  return level;
}

export function xpProgressInLevel(xp) {
  let level = 1;
  let remaining = xp;

  while (remaining >= xpPerLevel(level)) {
    remaining -= xpPerLevel(level);
    level++;
  }

  return {
    level,
    currentLevelXp: remaining,
    xpForNextLevel: xpPerLevel(level),
    progressPercent: Math.floor((remaining / xpPerLevel(level)) * 100)
  };
}

export function applyPrivilege(baseXP, user) {
  const privilege = user?.xpPrivilege;
  if (!privilege || privilege <= 1.0) return baseXP;
  return Math.ceil(baseXP * privilege);
}
