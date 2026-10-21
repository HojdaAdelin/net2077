// A deliberately small text format. HTML, links and scripts stay plain text.
const marks = [['**', 'strong'], ['__', 'underline'], ['*', 'em']];
function closingMark(text, token, start) {
  for (let i = start; i < text.length; i++) {
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i + 1 && !/[\r\n]/.test(text.slice(i + 1, end))) { i = end; continue; }
    }
    if (text.startsWith(token, i)) return i;
  }
  return -1;
}
function inline(text, depth = 0) {
  if (depth > 8) return [{ type: 'text', text }];
  const nodes = [];
  let plain = '';
  for (let i = 0; i < text.length;) {
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i + 1 && !/[\r\n]/.test(text.slice(i + 1, end))) {
        if (plain) { nodes.push({ type: 'text', text: plain }); plain = ''; }
        nodes.push({ type: 'inlineCode', text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    const mark = marks.find(([token]) => text.startsWith(token, i) && closingMark(text, token, i + token.length) > i + token.length);
    if (!mark) { plain += text[i++]; continue; }
    if (plain) { nodes.push({ type: 'text', text: plain }); plain = ''; }
    const [token, type] = mark;
    const end = closingMark(text, token, i + token.length);
    nodes.push({ type, children: inline(text.slice(i + token.length, end), depth + 1) });
    i = end + token.length;
  }
  if (plain) nodes.push({ type: 'text', text: plain });
  return nodes;
}

export function parseExplanation(value) {
  if (typeof value !== 'string' || !value.trim()) return [];
  const nodes = [];
  let text = '';
  // Protect inline code containing /* */ from becoming a block.
  for (const part of value.split(/(`[^`\r\n]+`|\/\*[\s\S]*?\*\/)/g).filter(Boolean)) {
    if (part.startsWith('/*') && part.endsWith('*/')) {
      if (text) { nodes.push({ type: 'inline', children: inline(text) }); text = ''; }
      nodes.push({ type: 'code', text: part });
    } else text += part;
  }
  if (text) nodes.push({ type: 'inline', children: inline(text) });
  return nodes;
}

export function wrapExplanationSelection(value, start, end, format) {
  const formats = { bold: ['**', '**', 'bold text'], italic: ['*', '*', 'italic text'],
    underline: ['__', '__', 'underlined text'], inlineCode: ['`', '`', 'code'], code: ['/*\n', '\n*/', 'code here'] };
  const [before, after, placeholder] = formats[format];
  const selected = value.slice(start, end) || placeholder;
  return { value: value.slice(0, start) + before + selected + after + value.slice(end),
    start: start + before.length, end: start + before.length + selected.length };
}
