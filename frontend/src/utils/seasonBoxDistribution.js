export function seasonBoxDistribution(prizes) {
  let total = 0;
  let valid = prizes.length > 0;
  const ranges = prizes.map(prize => {
    const chance = Number(prize.chance);
    const units = Math.round(chance * 100);
    if (!Number.isFinite(chance) || chance <= 0 || chance > 100 || units < 1 || Math.abs(chance * 100 - units) > 1e-7) {
      valid = false;
      return null;
    }
    const range = { min: total + 1, max: total + units };
    total += units;
    return range;
  });
  return { ranges, total: total / 100, remaining: (10000 - total) / 100,
    valid: valid && total === 10000, precisionValid: valid };
}
