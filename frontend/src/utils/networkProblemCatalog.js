const difficultyOrder = { easy: 0, medium: 1, hard: 2 };

export function filterNetworkProblems(problems, { search = '', status = 'all', difficulty = 'all', topic = 'all', sort = 'recommended' } = {}) {
  const query = search.trim().toLowerCase();
  const filtered = problems.filter(problem =>
    (status !== 'solved' || problem.solved) && (status !== 'unsolved' || !problem.solved) &&
    (difficulty === 'all' || problem.difficulty === difficulty) &&
    (topic === 'all' || (problem.tags || []).includes(topic)) &&
    `${problem.title} ${problem.summary || ''} ${(problem.tags || []).join(' ')}`.toLowerCase().includes(query)
  );
  if (sort === 'difficulty') filtered.sort((a, b) => (difficultyOrder[a.difficulty] ?? 3) - (difficultyOrder[b.difficulty] ?? 3));
  if (sort === 'xp') filtered.sort((a, b) => b.xp - a.xp);
  return filtered;
}

export function recommendedNetworkProblem(problems) {
  return filterNetworkProblems(problems.filter(problem => problem.published && !problem.solved), { sort: 'difficulty' })[0] || null;
}
