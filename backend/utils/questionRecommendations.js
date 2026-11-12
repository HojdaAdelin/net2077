import { createHash } from 'node:crypto';

export const QUESTION_CATEGORIES = ['LINUX', 'NETWORK', 'ARDUINO', 'ACADNET'];
export const performanceKey = (category, type, tag) => createHash('sha256').update(JSON.stringify([category, type, tag])).digest('hex');
const tagsOf = q => [...new Set((q.tags || []).filter(t => typeof t === 'string').map(t => t.trim().toUpperCase()).filter(Boolean))];
export function questionCategories(question) {
  const tags = tagsOf(question);
  const categories = QUESTION_CATEGORIES.filter(c => tags.includes(c) || c === 'ACADNET' && question.type === 'acadnet');
  return categories.length ? categories : ['GENERAL'];
}
export function performanceScopes(question) {
  const tags = tagsOf(question).filter(t => !QUESTION_CATEGORIES.includes(t)).slice(0, 32);
  const features = [...new Set(['TOTAL', `DIFFICULTY_${question.difficulty || 'medium'}`, ...tags])];
  return questionCategories(question).flatMap(category => features.map(tag => ({ category, type: question.type, tag })));
}
const values = map => map instanceof Map ? [...map.values()] : Object.values(map || {});
const count = stat => (stat?.correct || 0) + (stat?.wrong || 0);
const levels = ['easy', 'medium', 'hard'];

// Pool filtering is performed in MongoDB; this second check makes exclusion of
// solved questions explicit and keeps the ranking function safe for other callers.
export function recommendQuestions(candidates, { solved = [], performance = {}, limit = 50, random = Math.random, category } = {}) {
  const solvedIds = new Set(solved.map(q => String(q._id ?? q)));
  const pool = [...new Map(candidates.filter(q => !solvedIds.has(String(q._id))).map(q => [String(q._id), q])).values()];
  const stats = new Map(values(performance).map(s => [performanceKey(s.category, s.type, s.tag), s]));
  const affinity = new Map();
  for (const question of solved) if (question.tags) for (const tag of tagsOf(question)) affinity.set(tag, (affinity.get(tag) || 0) + 1);
  const maxAffinity = Math.max(1, ...affinity.values());
  const historyLevels = solved.filter(q => q.difficulty).map(q => levels.indexOf(q.difficulty)).filter(level => level >= 0);
  const historyTarget = historyLevels.length ? Math.round(historyLevels.reduce((sum, level) => sum + level, 0) / historyLevels.length) : 1;
  const ranked = pool.map(question => {
    const scope = category || questionCategories(question)[0];
    const get = tag => stats.get(performanceKey(scope, question.type, tag));
    const total = get('TOTAL');
    const accuracy = total ? ((total.correct || 0) + 2) / (count(total) + 4) : null;
    const target = accuracy === null ? historyTarget : accuracy < .5 ? 0 : accuracy < .82 ? 1 : 2;
    const tags = tagsOf(question).filter(t => !QUESTION_CATEGORIES.includes(t));
    const chapters = tags.filter(t => /^CHAPTER\d+$/.test(t));
    const features = (chapters.length ? chapters : tags).map(get).filter(Boolean);
    const weakness = features.length ? Math.max(...features.map(s => ((s.wrong || 0) + 1) / (count(s) + 4) * Math.min(1, count(s) / 8))) : 0;
    const observations = features.reduce((sum, s) => sum + count(s), 0);
    const interest = tags.length ? Math.max(...tags.map(t => (affinity.get(t) || 0) / maxAffinity)) : 0;
    const difficultyFit = 1 / (1 + .6 * Math.abs(levels.indexOf(question.difficulty || 'medium') - target));
    const score = (1 + 6 * weakness + .4 * interest + .7 / (1 + observations)) * difficultyFit;
    return { question, score, observations, chapter: `${scope}:${question.type}:${chapters[0] || tags[0] || 'GENERAL'}`, tie: random() };
  });
  const result = [], selected = new Set(), coverage = new Map();
  const size = Math.min(Math.max(0, limit), ranked.length), focusCount = Math.ceil(size * .8);
  // Most slots reinforce weaknesses, with a soft chapter cap to avoid a batch
  // dominated by a single topic. The remainder explores less-observed material.
  while (result.length < focusCount) {
    let best;
    for (const item of ranked) {
      if (selected.has(item)) continue;
      const priority = (item.score + .15 * item.tie) / (1 + .22 * (coverage.get(item.chapter) || 0));
      if (!best || priority > best.priority) best = { item, priority };
    }
    selected.add(best.item); result.push(best.item.question);
    coverage.set(best.item.chapter, (coverage.get(best.item.chapter) || 0) + 1);
  }
  const exploration = ranked.filter(item => !selected.has(item)).map(item => ({ ...item,
    priority: -Math.log(Math.max(1e-9, random())) * (1 + item.observations) * (1 + (coverage.get(item.chapter) || 0)),
  })).sort((a, b) => a.priority - b.priority);
  result.push(...exploration.slice(0, size - result.length).map(item => item.question));
  return result;
}

export function recommendationFilter({ type, tags, chapters, board } = {}) {
  const filter = {}, conditions = [];
  const fail = () => { throw Object.assign(new Error('Invalid recommendation filters.'), { status: 400 }); };
  if (type) { if (!['basic', 'all', 'acadnet'].includes(type)) fail(); filter.type = type; }
  const automaticChapters = type === 'basic' || tags === 'LINUX';
  for (const [input, chapterOnly] of [[tags, false], [automaticChapters ? undefined : chapters, true]]) {
    if (input === undefined || input === null || input === '') continue;
    if (typeof input !== 'string' || input.length > 1024) fail();
    const entries = [...new Set(input.split(',').map(t => t.trim()).filter(Boolean))];
    if (entries.length > 32 || entries.some(t => chapterOnly ? !/^CHAPTER\d+$/.test(t) : !QUESTION_CATEGORIES.includes(t))) fail();
    if (entries.length) conditions.push({ tags: { $in: entries } });
  }
  if (board) { if (board !== 'esp32') fail(); conditions.push({ tags: { $all: ['ARDUINO', 'ESP32'] } }); }
  if (conditions.length) filter.$and = conditions;
  return filter;
}
