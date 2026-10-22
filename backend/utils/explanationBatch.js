export const MAX_EXPLANATION_BATCH = 100;
export const MAX_EXPLANATION_BATCH_TEXT = 2010000;

export function parseExplanationBatch(text, limit = MAX_EXPLANATION_BATCH) {
  if (typeof text !== 'string' || text.length > MAX_EXPLANATION_BATCH_TEXT) throw new Error('The explanation batch is too large.');
  const entries = [];
  let cursor = 0;
  while (cursor < text.length) {
    while (cursor < text.length && /\s/.test(text[cursor])) cursor++;
    if (cursor === text.length) break;
    const number = entries.length + 1;
    if (number > limit) throw new Error(`This batch contains only ${limit} questions.`);
    const header = text.slice(cursor).match(/^(\d+)\.\s*\{\{/);
    if (!header || Number(header[1]) !== number) throw new Error(`Expected ${number}. {{ explanation }}. Number entries consecutively from 1.`);
    const start = cursor + header[0].length;
    const end = text.indexOf('}}', start);
    if (end < 0) throw new Error(`Explanation ${number} is missing its closing }}.`);
    const explanation = text.slice(start, end);
    if (!explanation.trim()) throw new Error(`Explanation ${number} is empty.`);
    if (explanation.length > 20000) throw new Error(`Explanation ${number} exceeds 20,000 characters.`);
    entries.push({ number, explanation });
    cursor = end + 2;
  }
  if (!entries.length) throw new Error('Enter at least one explanation using 1. {{ explanation }}.');
  return entries;
}
