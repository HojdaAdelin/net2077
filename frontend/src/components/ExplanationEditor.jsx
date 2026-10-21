import { useId, useRef } from 'react';
import { Bold, Italic, Underline, Code, Code2 } from 'lucide-react';
import { ExplanationContent } from './ExplanationViewer';
import { wrapExplanationSelection } from '../utils/explanationMarkup';
import '../styles/Explanation.css';

export default function ExplanationEditor({ value, onChange, disabled }) {
  const input = useRef(null);
  const id = useId();
  const format = name => {
    const element = input.current;
    const next = wrapExplanationSelection(value, element.selectionStart, element.selectionEnd, name);
    if (next.value.length > 20000) return;
    onChange(next.value);
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(next.start, next.end); });
  };
  return <section className="explanation-editor">
    <header><label htmlFor={id}>Explain content</label><span>Optional · saved in the question JSON</span></header>
    <div className="explanation-editor-grid"><div>
      <div className="explanation-toolbar" role="group" aria-label="Explanation formatting">
        {[['bold', 'Bold', Bold], ['italic', 'Italic', Italic], ['underline', 'Underline', Underline], ['inlineCode', 'Inline code `...`', Code], ['code', 'Code block /* */', Code2]].map(([name, title, Icon]) =>
          <button key={name} type="button" title={title} aria-label={title} disabled={disabled}
            onMouseDown={event => event.preventDefault()} onClick={() => format(name)}><Icon size={16} /></button>)}
      </div>
      <textarea ref={input} id={id} value={value} disabled={disabled} maxLength={20000} rows={7}
        onChange={event => onChange(event.target.value)} placeholder="Explain why the answer is correct and why the other options are wrong..." />
      <div className="explanation-editor-help"><span>**bold** · *italic* · __underline__ · `inline code` · /* code block */</span><span>{value.length}/20,000</span></div>
    </div><div className="explanation-editor-preview"><span>Explanation preview</span>
      {value.trim() ? <ExplanationContent content={value} /> : <p>No explanation yet. Older questions work without one.</p>}
    </div></div>
  </section>;
}
