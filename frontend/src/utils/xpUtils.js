/**
 * XP per level tier — must match backend/utils/xpUtils.js exactly.
 *  lvl  1-50  → 100 XP
 *  lvl 51-80  → 150 XP
 *  lvl 81-100 → 200 XP
 *  lvl 101-150→ 300 XP
 *  lvl 151+   → 500 XP
 */
export function xpPerLevel(level) {
  if (level <= 50)  return 100;
  if (level <= 80)  return 150;
  if (level <= 100) return 200;
  if (level <= 150) return 300;
  return 500;
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
