import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ClipboardList, Copy, X } from 'lucide-react';
import { API_URL } from '../config';
import QuestionTitle from './QuestionTitle';
import { ExplanationContent } from './ExplanationViewer';
import '../styles/BulkExplanationImport.css';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}/questions/explanations/${path}`, { credentials: 'include', ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to process this explanation batch.');
  return data;
};
const statusLabels = { saved: 'Saved', 'already-saved': 'Already saved', conflict: 'Skipped: question changed or already has an explanation',
  missing: 'Skipped: question was deleted', error: 'Not saved: retry this batch' };

export default function BulkExplanationImport({ filters, query, disabled, onSaved }) {
  const [size, setSize] = useState(25);
  const [open, setOpen] = useState(false);
  const [batch, setBatch] = useState(null);
  const [text, setText] = useState('');
  const [entries, setEntries] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const dialog = useRef(null);
  const inFlight = useRef(false);
  const busyRef = useRef(false);
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return;
    const focus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); setOpen(false); }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.current.querySelectorAll('button:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keydown);
      if (focus?.isConnected) focus.focus();
    };
  }, [open]);

  const prepare = async () => {
    if (inFlight.current || disabled) return;
    inFlight.current = true; setBusy(true); setOpen(true); setError(''); setBatch(null);
    setText(''); setEntries(null); setReport(null); setCopied(false);
    try {
      const params = new URLSearchParams({ size: String(size), ...filters, q: query });
      setBatch(await request(`batch?${params}`));
    } catch (err) { setError(err.message); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const post = async preview => {
    if (inFlight.current || !batch) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const data = await request(preview ? 'preview' : 'batch', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: batch.token, text }) });
      if (preview) setEntries(data.entries);
      else { setReport(data); onSaved(); }
    } catch (err) { setError(err.message); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const copyBatch = async () => {
    const content = JSON.stringify(batch.questions.map(({ _id, __v, createdAt, updatedAt, ...question }) => question), null, 2);
    setError('');
    try {
      try {
        if (!navigator.clipboard || !window.isSecureContext) throw new Error('Fallback');
        await navigator.clipboard.writeText(content);
      } catch {
        const previousFocus = document.activeElement;
        const input = document.createElement('textarea'); input.value = content;
        input.style.cssText = 'position:fixed;top:0;left:0;opacity:0;'; input.readOnly = true;
        // Keep the fallback inside the modal so its focus trap can still work.
        dialog.current.appendChild(input); input.focus(); input.select(); input.setSelectionRange(0, content.length);
        let success;
        try { success = document.execCommand('copy'); }
        finally { input.remove(); previousFocus?.focus(); }
        if (!success) throw new Error('Clipboard access was denied.');
      }
      setCopied(true);
    } catch (err) { setError(err.message); }
  };

  const questionCard = (question, number) => <div className="bulk-explain-question">
    <div className="bulk-explain-question-label"><strong>#{number}</strong><span>{question.type} / {question.difficulty}</span></div>
    <div><QuestionTitle title={question.title} /></div>
    <details><summary>Answers</summary><ol>{question.answers.map((answer, index) => <li key={index} className={question.correctAnswers?.includes(index) ? 'is-correct' : ''}>
      <span>{String.fromCharCode(65 + index)}.</span><span>{answer}</span>{question.correctAnswers?.includes(index) && <Check size={13} />}
    </li>)}</ol></details>
  </div>;

  return <>
    <div className="bulk-explain-launch">
      <label>Batch size<select className="rd-input" value={size} disabled={disabled || busy} onChange={event => setSize(Number(event.target.value))}>
        <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
      </select></label>
      <button type="button" className="rd-export-btn" disabled={disabled || busy} onClick={prepare}
        title="Prepare the first matching questions without an explanation, starting from question 1 across all pages">
        <ClipboardList size={14} /> Bulk explanations
      </button>
    </div>
    {open && createPortal(<div className="bulk-explain-overlay" onClick={event => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section className="bulk-explain-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-explain-title" tabIndex={-1} ref={dialog}>
        <header><div><h2 id="bulk-explain-title">Bulk explanations</h2>
          <p>{batch ? `${batch.questions.length} questions without explanations. This order is fixed for this batch.` : 'Preparing the first questions matching your filters...'}</p></div>
          <button type="button" className="rd-icon-btn" onClick={() => setOpen(false)} disabled={busy} aria-label="Close bulk explanations"><X size={19} /></button>
        </header>
        {error && <div className="rd-msg error" role="alert">{error}</div>}
        {!batch && busy && <div className="rd-loading" role="status">Loading questions...</div>}
        {batch && <>
          <div className="bulk-explain-tools"><span>First {batch.questions.length} matches across all pages. Existing explanations will never be overwritten.</span>
            <button type="button" className="rd-add-btn" onClick={copyBatch} disabled={busy}><Copy size={13} /> {copied ? 'Copied numbered JSON' : 'Copy numbered JSON'}</button>
          </div>
          {entries ? <div className="bulk-explain-preview">
            {report && <div className="bulk-explain-report" role="status">{report.saved} saved · {report.alreadySaved} already saved · {report.skipped} skipped · {report.errors} errors</div>}
            <p className="bulk-explain-note">{entries.length} of {batch.questions.length} questions will receive an explanation. Remaining questions stay unchanged.</p>
            {entries.map(entry => <article key={entry.number}>
              {questionCard(batch.questions[entry.number - 1], entry.number)}
              <div className="bulk-explain-association"><strong>Explanation #{entry.number}</strong><ExplanationContent content={entry.explanation} /></div>
              {report && <p className="bulk-explain-row-status">{statusLabels[report.results.find(result => result.number === entry.number)?.status]}</p>}
            </article>)}
          </div> : <div className="bulk-explain-workspace">
            <div className="bulk-explain-reference">{batch.questions.map(question => <article key={question._id}>{questionCard(question, question.number)}</article>)}</div>
            <div className="bulk-explain-input"><label htmlFor="bulk-explain-text">Numbered explanations</label>
              <p>Use <code>1. {'{{ explanation }}'}</code>, then 2, 3, and so on. The first <code>{'}}'}</code> closes each explanation. Multiline text and existing formatting are preserved.</p>
              <textarea id="bulk-explain-text" value={text} onChange={event => { setText(event.target.value); setError(''); }} disabled={busy}
                maxLength={2010000} spellCheck={false} placeholder={'1. {{\nExplanation for question 1.\n}}\n\n2. {{\nExplanation for question 2.\n}}'} />
              <small>You can fill only the first questions in this batch. Always start numbering at 1. Preview before saving.</small>
            </div>
          </div>}
        </>}
        <footer><button type="button" className="rd-add-btn" disabled={busy} onClick={() => setOpen(false)}>{report ? 'Close' : 'Cancel'}</button>
          {batch && <div>{entries && !report && <button type="button" className="rd-add-btn" disabled={busy} onClick={() => { setEntries(null); setError(''); }}>Edit text</button>}
            <button type="button" className="rd-primary-btn" disabled={busy || (!entries && !text.trim()) || (report && !report.errors)}
              onClick={() => post(!entries)}>{busy ? 'Processing...' : !entries ? 'Preview associations' : report ? 'Retry unsaved' : `Save ${entries.length} explanations`}</button>
          </div>}
        </footer>
      </section>
    </div>, document.body)}
  </>;
}
