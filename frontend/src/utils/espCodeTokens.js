const cppTokens = /(?<raw>R"HTML\([\s\S]*?\)HTML")|(?<comment>\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(?<directive>^[ \t]*#\w+(?:[ \t]+<[^>\n]+>)?)|(?<string>"(?:\\[\s\S]|[^"\\\n])*"|'(?:\\[\s\S]|[^'\\\n])*')|(?<keyword>\b(?:auto|break|case|const|continue|default|else|enum|false|for|if|nullptr|return|static|struct|switch|true|using|while)\b)|(?<type>\b(?:bool|char|double|float|int|long|size_t|unsigned|void|u?int(?:8|16|32|64)_t|String|IPAddress|Preferences|WebServer|wifi_sta_list_t)\b)|(?<number>\b(?:0[xX][a-fA-F0-9]+|\d+(?:\.\d+)?)[uUlLfF]*\b)|(?<constant>\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b)|(?<function>\b[a-zA-Z_]\w*(?=[ \t]*\())/gm;
const htmlTokens = /(?<comment><!--[\s\S]*?-->)|(?<tag><!DOCTYPE[^>]*>|<\/?[a-z][\w-]*(?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*\s*\/?>)/gi;
const htmlTagTokens = /(?<tag>^<\/?!?[\w-]+|\/?>$)|(?<string>"[^"]*"|'[^']*')|(?<attribute>[\w:-]+)/g;

function tokenize(source, pattern, expand) {
  const result = [];
  let offset = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index > offset) result.push({ text: source.slice(offset, match.index) });
    const type = Object.keys(match.groups).find(key => match.groups[key] !== undefined);
    result.push(...(expand?.(match[0], type) || [{ text: match[0], type }]));
    offset = match.index + match[0].length;
  }
  if (offset < source.length) result.push({ text: source.slice(offset) });
  return result;
}

function tokenizeHtml(source) {
  return tokenize(source, htmlTokens, (text, type) => type === 'tag' ? tokenize(text, htmlTagTokens) : null);
}

export function espCodeTokens(source) {
  if (/^\s*https?:\/\/\S+\s*$/.test(source)) return [{ text: source, type: 'string' }];
  if (/^\s*<(?:!DOCTYPE|\/?[a-z][\w-]*(?:\s|\/?>))/i.test(source)) return tokenizeHtml(source);
  return tokenize(source, cppTokens, (text, type) => {
    if (type !== 'raw') return null;
    return [
      { text: text.slice(0, 7), type: 'string' },
      ...tokenizeHtml(text.slice(7, -6)),
      { text: text.slice(-6), type: 'string' },
    ];
  });
}
