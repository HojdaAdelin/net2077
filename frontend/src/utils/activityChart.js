// Activity is recorded by the backend using UTC calendar dates.
export function activityDays(data, count, now = new Date()) {
  const counts = new Map();
  for (const entry of data || []) {
    if (typeof entry.date === 'string' && Number.isFinite(entry.count) && entry.count >= 0) {
      counts.set(entry.date, (counts.get(entry.date) || 0) + entry.count);
    }
  }
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today - (count - 1 - index) * 86400000).toISOString().slice(0, 10);
    return { date, count: counts.get(date) || 0 };
  });
}

export function activityScale(maximum) {
  const raw = Math.max(maximum, 1) / 3;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].find(value => value * magnitude >= raw) * magnitude);
  return { step, maximum: step * 3 };
}
