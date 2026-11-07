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
  const published = problems.filter(problem => problem.published);
  const candidates = published.filter(problem => !problem.solved);
  const solved = published.filter(problem => problem.solved);
  if (!candidates.length) return null;
  if (!solved.length) return candidates[0];

  const knownDifficulties = solved.filter(problem => Object.hasOwn(difficultyOrder, problem.difficulty));
  const average = knownDifficulties.length
    ? knownDifficulties.reduce((sum, problem) => sum + difficultyOrder[problem.difficulty], 0) / knownDifficulties.length
    : 0;
  const tagCounts = new Map();
  const tagsFor = problem => [...new Set((problem.tags || []).map(tag => tag.trim().toLowerCase()).filter(Boolean))];
  for (const problem of solved) {
    for (const tag of tagsFor(problem)) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  }
  const score = problem => {
    const tags = tagsFor(problem);
    const affinity = tags.length
      ? tags.reduce((sum, tag) => sum + (tagCounts.get(tag) || 0) / solved.length, 0) / tags.length
      : 0;
    // Difficulty is the main signal; familiar topics refine nearby matches.
    const distance = Math.abs((difficultyOrder[problem.difficulty] ?? 3) - average);
    return distance + 0.35 * (1 - affinity);
  };
  return candidates.reduce((best, candidate) => {
    const difference = score(candidate) - score(best);
    // At equal suitability, allow a step up; catalog order breaks remaining ties.
    return difference < -1e-9 || (Math.abs(difference) <= 1e-9 &&
      difficultyOrder[candidate.difficulty] > difficultyOrder[best.difficulty]) ? candidate : best;
  });
}
