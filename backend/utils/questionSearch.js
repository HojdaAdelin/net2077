const invalid = message => Object.assign(new Error(message), { status: 400 });
const scalar = (value, name, maxLength = 100) => {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || value.length > maxLength) throw invalid(`Invalid ${name}`);
  return value.trim();
};

export function questionSearchFilter(query) {
  const q = scalar(query.q, 'search text', 200);
  const category = scalar(query.category, 'category');
  const type = scalar(query.type, 'question type');
  const tag = scalar(query.tag, 'tag');
  const difficulty = scalar(query.difficulty, 'difficulty');
  if (category && !['LINUX', 'NETWORK', 'ARDUINO', 'ACADNET'].includes(category)) throw invalid('Invalid category');
  if (type && !['basic', 'all', 'acadnet'].includes(type)) throw invalid('Invalid question type');
  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) throw invalid('Invalid difficulty');
  const conditions = [];
  // Treat search text literally, including code punctuation and regex characters.
  if (q) conditions.push({ title: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } });
  if (category) conditions.push(category === 'ACADNET' ? { type: 'acadnet' } : { tags: category });
  if (type) conditions.push({ type });
  if (tag) conditions.push({ tags: tag });
  if (difficulty) conditions.push({ difficulty });
  return conditions.length > 1 ? { $and: conditions } : conditions[0] || {};
}

export function questionSearchPagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const pageSize = query.pageSize === undefined ? 25 : Number(query.pageSize);
  if (!Number.isSafeInteger(page) || page < 1 || ![25, 50, 100].includes(pageSize)) throw invalid('Invalid pagination');
  return { page, pageSize };
}
