// Move within a category without changing the global problem order.
export function moveTerminalProblem(ids, id, targetIndex) {
  const sourceIndex = ids.indexOf(id);
  if (sourceIndex < 0 || !Number.isInteger(targetIndex) || targetIndex < 0 ||
      targetIndex >= ids.length || sourceIndex === targetIndex) return ids;
  const reordered = [...ids];
  reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, id);
  return reordered;
}
