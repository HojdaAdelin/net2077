export function terminalCategoryProgress(questions, solved) {
  const solvedIds = new Set((solved || []).filter(Boolean).map(item => String(item._id ?? item)));
  const questionIds = [...new Set(questions.map(question => String(question._id)))];
  const total = questionIds.length;
  const completed = questionIds.filter(id => solvedIds.has(id)).length;
  return { total, completed, remaining: total - completed, percent: total ? Math.round(completed / total * 100) : 0 };
}

export function terminalCategoryAccess(categories, solved) {
  let prerequisite = null;
  return categories.map(category => {
    const access = { locked: Boolean(prerequisite), prerequisiteName: prerequisite?.name || null };
    if (!prerequisite && terminalCategoryProgress(category.questions, solved).remaining > 0) prerequisite = category;
    return { ...category, ...access };
  });
}
