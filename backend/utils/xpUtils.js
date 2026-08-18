/**
 * XP thresholds per level tier:
 *  lvl  1-50  → 100 XP each
 *  lvl 51-80  → 150 XP each
 *  lvl 81-100 → 200 XP each
 *  lvl 101-150→ 300 XP each
 *  lvl 151+   → 500 XP each
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
  if (level <= 50)  return 100;
  if (level <= 80)  return 150;
  if (level <= 100) return 200;
  if (level <= 150) return 300;
  return 500;
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

/**
 * Returns XP progress within the current level and XP needed for next level.
 * Useful for frontend progress bars.
 */
export function xpProgressInLevel(xp) {
  let level = 1;
  let remaining = xp;

  while (remaining >= xpPerLevel(level)) {
    remaining -= xpPerLevel(level);
    level++;
  }

  return {
    level,
    currentLevelXp: remaining,           // XP earned within current level
    xpForNextLevel: xpPerLevel(level),    // XP needed to reach next level
    progressPercent: Math.floor((remaining / xpPerLevel(level)) * 100)
  };
}
