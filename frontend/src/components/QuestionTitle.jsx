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
              <code>{lines.join('\n')}</code>
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
