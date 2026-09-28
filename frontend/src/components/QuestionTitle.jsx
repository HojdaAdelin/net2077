export default function QuestionTitle({ title, className }) {
  if (!title) return null;

  const parts = title.split(/(\/\*[\s\S]*?\*\/)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('/*') && part.endsWith('*/')) {
          const code = part.slice(2, -2).replace(/^\\n|\\n$/g, '').trim();
          const lines = code.split(/\\n/g);
          return (
            <pre key={i} className="qt-code-block">
              <code dangerouslySetInnerHTML={{ __html: highlightBash(lines.join('\n')) }} />
            </pre>
          );
        }

        const lines = part.split(/\\n/g);
        return (
          <span key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightBash(code) {
  // Tokenize line by line to keep things simple and safe
  return code.split('\n').map(line => highlightLine(line)).join('\n');
}

function highlightLine(raw) {
  // We'll build tokens left-to-right using regex scanning
  const tokens = [];
  let rest = raw;

  // Patterns in priority order
  const patterns = [
    // Comments  # ...
    { re: /^(#.*)$/, cls: 'qt-c' },
    // Strings double/single quoted
    { re: /^("(?:[^"\\]|\\.)*")/, cls: 'qt-s' },
    { re: /^('(?:[^'\\]|\\.)*')/, cls: 'qt-s' },
    // Variables $VAR or ${VAR}
    { re: /^(\$\{[^}]+\}|\$[a-zA-Z_][a-zA-Z0-9_]*)/, cls: 'qt-v' },
    // Numbers standalone
    { re: /^(\b\d+\b)/, cls: 'qt-n' },
    // Operators & punctuation
    { re: /^([|><&;(){}\[\]])/, cls: 'qt-op' },
    // Flags  -x  --xyz
    { re: /^(-{1,2}[a-zA-Z][-a-zA-Z0-9]*)/, cls: 'qt-f' },
    // Keywords / built-ins
    {
      re: /^(if|then|else|elif|fi|for|while|do|done|case|esac|in|function|return|exit|break|continue|export|local|readonly|unset|shift|source|alias|echo|printf|read|test|true|false|sudo|su|apt|apt-get|yum|dnf|pacman|brew|pip|python|python3|node|npm|yarn|git|docker|kubectl|chmod|chown|chgrp|ls|cd|pwd|mkdir|rm|rmdir|cp|mv|touch|cat|less|more|head|tail|grep|find|sed|awk|cut|sort|uniq|wc|xargs|tee|tr|diff|patch|tar|gzip|gunzip|zip|unzip|curl|wget|ssh|scp|rsync|ps|top|kill|killall|pgrep|pkill|systemctl|service|journalctl|df|du|free|mount|umount|fdisk|lsblk|netstat|ss|ip|ifconfig|ping|traceroute|nmap|env|which|type|man|help|history|clear|date|uptime|uname|hostname|whoami|id|groups|useradd|userdel|usermod|groupadd|passwd|su|cron|crontab)\b/,
      cls: 'qt-kw'
    },
    // Path segments starting with /
    { re: /^(\/[^\s|><&;(){}\[\]]*[^\s|><&;(){}\[\]\\.])/, cls: 'qt-p' },
    // Executable at start of command (first word)
    { re: /^([a-zA-Z_][a-zA-Z0-9_\-.]*)/, cls: null }, // plain identifier — no highlight for unknown words
    // Anything else char by char
    { re: /^([\s\S])/, cls: null },
  ];

  while (rest.length > 0) {
    let matched = false;
    for (const { re, cls } of patterns) {
      const m = rest.match(re);
      if (m) {
        const text = escapeHtml(m[1]);
        tokens.push(cls ? `<span class="${cls}">${text}</span>` : text);
        rest = rest.slice(m[1].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Safety fallback
      tokens.push(escapeHtml(rest[0]));
      rest = rest.slice(1);
    }
  }

  return tokens.join('');
}
