export function terminalCategoryProgress(questions, solved) {
  const solvedIds = new Set((solved || []).filter(Boolean).map(item => String(item._id ?? item)));
  const questionIds = [...new Set(questions.map(question => String(question._id)))];
  const total = questionIds.length;
  const completed = questionIds.filter(id => solvedIds.has(id)).length;
  return { total, completed, remaining: total - completed, percent: total ? Math.round(completed / total * 100) : 0 };
}
