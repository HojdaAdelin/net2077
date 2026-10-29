export function terminalCategoryAccess(categories, solved = []) {
  const solvedIds = new Set(solved.filter(Boolean).map(item => String(item._id ?? item)));
  let prerequisite = null;
  return categories.map(category => {
    const access = { locked: Boolean(prerequisite), prerequisiteId: prerequisite ? String(prerequisite._id) : null,
      prerequisiteName: prerequisite?.name || null };
    const questions = (category.questions || []).filter(Boolean);
    if (!prerequisite && questions.some(question => !solvedIds.has(String(question._id ?? question)))) prerequisite = category;
    return { ...category, ...access };
  });
}
