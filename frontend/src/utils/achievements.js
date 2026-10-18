const definitions = [
  { type: 'linux', field: 'linux', minimum: 500, legendary: 1000, name: 'Linux Master', legendaryName: 'Legendary Linux', color: '#f97316', unit: 'Linux questions solved' },
  { type: 'network', field: 'network', minimum: 50, legendary: 300, name: 'Network Expert', legendaryName: 'Legendary Network', color: '#3b82f6', unit: 'Network questions solved' },
  { type: 'terminal', field: 'terminal', minimum: 50, legendary: 150, name: 'Terminal Pro', legendaryName: 'Legendary Terminal', color: '#22c55e', unit: 'Terminal commands solved' },
  { type: 'level', minimum: 50, legendary: 100, name: 'Master User', legendaryName: 'Legendary User', color: '#a855f7', unit: 'level' },
  { type: 'questions', minimum: 1000, legendary: 2500, name: 'Question Solver', legendaryName: 'Question Master', color: '#f43f5e', unit: 'questions solved in total' },
  { type: 'arduino', field: 'arduino', minimum: 100, legendary: 150, name: 'Arduino Builder', legendaryName: 'Arduino Master', color: '#8b5cf6', unit: 'Arduino questions solved' },
  { type: 'top1', rank: 1, name: 'Champion', color: '#fbbf24' },
  { type: 'top2', rank: 2, name: 'Runner-up', color: '#94a3b8' },
  { type: 'top3', rank: 3, name: 'Top 3', color: '#cd7f32' },
];

export function getAchievement(type, count = 0, level = 0) {
  const definition = definitions.find(item => item.type === type);
  if (!definition) return null;
  const current = type === 'level' ? level : count;
  const isLegendary = Boolean(definition.legendary && current >= definition.legendary);
  const target = isLegendary ? definition.legendary : definition.minimum;
  return { ...definition, current, target, isLegendary,
    name: isLegendary ? definition.legendaryName : definition.name,
    color: isLegendary ? '#60a5fa' : definition.color,
    description: definition.rank ? `Rank #${definition.rank} on Leaderboard` :
      type === 'level' ? `Reached Level ${target}` : `${target}+ ${definition.unit}` };
}

export function getProfileAchievements(profile) {
  return definitions.map(definition => {
    const count = definition.type === 'questions' ? profile.totalQuestionsSolved || 0 :
      profile.categoryStats?.[definition.field] || 0;
    const badge = getAchievement(definition.type, count, profile.level || 0);
    return { ...badge, count, level: profile.level || 0,
      unlocked: definition.rank ? profile.leaderboardRank === definition.rank : badge.current >= definition.minimum,
      leaderboardRank: profile.leaderboardRank };
  });
}
