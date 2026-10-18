// Pure calculation: callers that already loaded the user need no extra DB read.
export const xpWithBoosts = (user, baseXP, now = new Date()) => {
  const boosts = user.activeBoosts?.filter(boost => boost.expiresAt > now) || [];
  const privilege = user.xpPrivilege > 1 ? user.xpPrivilege : 1;
  let xp = privilege > 1 ? Math.ceil(baseXP * privilege) : baseXP;
  const boost = boosts.find(item => item.type === 'xp_multiplier');
  if (boost) xp = Math.ceil(xp * boost.multiplier);
  return xp;
};
