import { useState, useEffect, useContext, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { Terminal as TerminalIcon, Maximize2, Minimize2, ArrowLeft, ArrowRight, CheckCircle2, Circle, LockKeyhole } from 'lucide-react';
import LoginRequired from '../components/LoginRequired';
import { terminalCategoryProgress, terminalCategoryAccess } from '../utils/terminalCategoryProgress';
import '../styles/Terminal.css';

async function terminalRequest(path, options = {}) {
  const response = await fetch(`${API_URL}/terminal${path}`, { credentials: 'include', ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to load terminal practice.');
  return data;
}

function LevelTag({ category }) {
  return <span className="tp-level-tag" style={{ '--level-color': category.levelColor }}>{category.levelName}</span>;
}

function CategoryProgress({ category, solved }) {
  const progress = terminalCategoryProgress(category.questions, solved);
  return (
    <div className="tp-progress">
      <div className="tp-progress-label"><span>{progress.completed} / {progress.total} solved</span><span>{progress.remaining} remaining</span></div>
      <div className="tp-progress-track" role="progressbar" aria-label={`${category.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-valuetext={`${progress.completed} of ${progress.total} problems solved`}>
        <div className="tp-progress-fill" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}

function TerminalSession({ question, categoryId, isSolved, username, onExit, onSolved }) {
  const [lines, setLines] = useState([]);
  const [input, setInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const submittingRef = useRef(false);
  const prompt = <><span className="t2-prompt-user">{username || 'user'}@net2077</span><span className="t2-prompt-colon">:</span><span className="t2-prompt-path">~</span><span className="t2-prompt-dollar">$</span></>;

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = event => { if (event.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isFullscreen]);

  const handleSubmit = async event => {
    event.preventDefault();
    const command = input.trim();
    if (!command || submittingRef.current) return;
    setInput('');
    if (command === 'exit') { onExit(); return; }
    if (command === 'clear') { setLines([]); return; }
    setLines(previous => [...previous, { type: 'user', text: command }]);
    if (isSolved) {
      setLines(previous => [...previous, { type: 'success', text: 'This problem is already solved. Type exit to return to the category.' }]);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await terminalRequest('/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question._id, command, categoryId }),
      });
      if (result.success) {
        setLines(previous => [...previous, { type: 'success', text: 'Correct! Problem solved. Type exit to return to the category.' }]);
        onSolved(question, result);
      } else {
        setLines(previous => [...previous, { type: 'error', text: result.message || 'Incorrect command. Try again.' }]);
      }
    } catch (error) {
      setLines(previous => [...previous, { type: 'error', text: error.message }]);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className={`t2-wrapper${isFullscreen ? ' t2-fullscreen' : ''}`}>
      <div className="t2-terminal">
        <div className="t2-topbar">
          <div className="t2-tab"><TerminalIcon size={16} aria-hidden="true" /><span>Terminal</span></div>
          <span className="t2-topbar-title">{username || 'user'}@net2077: ~</span>
          <div className="t2-window-actions"><button type="button" className="t2-fullscreen-btn" onClick={() => setIsFullscreen(value => !value)} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-pressed={isFullscreen}>{isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button></div>
        </div>
        <div className="t2-body" ref={bodyRef} onClick={event => {
          if (!window.getSelection()?.toString() && !event.target.closest('input, button, a, label')) inputRef.current?.focus();
        }}>
          <div className={`t2-q-box t2-q-box-${question.difficulty}`}>
            <div className="t2-q-box-row"><span className="t2-q-box-value">{question.title}</span></div>
            <div className="t2-q-box-row"><span className="t2-description tp-shell-description">{question.description}</span></div>
            <div className="t2-q-box-row"><span className={`t2-diff-${question.difficulty}`}>{question.difficulty}</span><span className="t2-meta">{question.points} points</span></div>
          </div>
          <div className="t2-line t2-hint">{isSolved ? 'Problem solved. Type exit to return to the category.' : 'Enter your command. Use clear to reset the screen or exit to go back.'}</div>
          <div className="t2-separator" />
          <div role="log" aria-label="Terminal output" aria-live="polite" aria-relevant="additions text">
            {lines.map((line, index) => <div key={index} className={`t2-line ${line.type === 'user' ? 't2-user-line' : line.type === 'success' ? 't2-success' : 't2-error'}`}>{line.type === 'user' && <span className="t2-user-prefix">{prompt}</span>}{line.text}</div>)}
          </div>
          <form onSubmit={handleSubmit} className="t2-input-row">
            <span className="t2-user-prefix">{prompt}</span>
            <input ref={inputRef} type="text" className="t2-input" value={input} onChange={event => setInput(event.target.value)} readOnly={submitting} aria-busy={submitting} autoFocus autoComplete="off" spellCheck={false} aria-label="Terminal command" autoCapitalize="off" autoCorrect="off" />
          </form>
        </div>
        <div className="t2-statusbar">
          <div className="t2-session-status"><span className="t2-status-dot" aria-hidden="true" />bash<span className="t2-status-divider">/</span>UTF-8</div>
          <div className="t2-statusbar-right"><span>{submitting ? 'Checking...' : isSolved ? 'Solved' : 'In progress'}</span><button type="button" className="tp-shell-back" disabled={submitting} onClick={onExit}>Back to category</button></div>
        </div>
      </div>
    </div>
  );
}

export default function Terminal() {
  const { user, updateUser } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [userProgress, setUserProgress] = useState({ solved: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    Promise.all([
      terminalRequest('/categories', { signal: controller.signal }),
      terminalRequest('/progress', { signal: controller.signal }),
    ]).then(([content, progress]) => {
      if (!controller.signal.aborted) { setCategories(content.categories); setUserProgress(progress); }
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id, retry]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [searchParams.get('category'), searchParams.get('problem')]);

  if (!user) return <LoginRequired icon={TerminalIcon} title="Terminal Access Required" description="Please sign in to access terminal practice." />;

  const categoryId = searchParams.get('category');
  const problemId = searchParams.get('problem');
  const categoryAccess = terminalCategoryAccess(categories, userProgress.solved);
  const activeCategory = categoryAccess.find(category => category._id === categoryId);
  const activeProblem = activeCategory?.questions.find(question => question._id === problemId);
  const solvedIds = new Set((userProgress.solved || []).filter(Boolean).map(item => String(item._id ?? item)));
  const enterCategory = category => { if (!category.locked) setSearchParams({ category: category._id }); };
  const backToCategory = () => enterCategory(activeCategory);
  const onSolved = (question, result) => {
    setUserProgress(previous => {
      const alreadySolved = previous.solved.some(item => String(item?._id ?? item) === question._id);
      return alreadySolved ? previous : { ...previous, solved: [...previous.solved, { _id: question._id }] };
    });
    updateUser({ xp: result.xp, level: result.level, streak: result.streak });
  };

  return (
    <div className="terminal-page"><div className="container">
      <div className="terminal-header"><h1 className="terminal-glitch" data-text="Terminal Practice">Terminal Practice</h1></div>
      {loading ? <div className="terminal-loading">Loading terminal practice...</div> : error ? (
        <div className="tp-empty" role="alert"><p>{error}</p><button type="button" className="btn btn-secondary" onClick={() => setRetry(value => value + 1)}>Try again</button></div>
      ) : (categoryId && !activeCategory) || (problemId && !activeProblem) ? (
        <div className="tp-empty"><p>This category or problem is no longer available.</p><button type="button" className="btn btn-secondary" onClick={() => setSearchParams({})}>Back to categories</button></div>
      ) : activeCategory?.locked ? (
        <div className="tp-empty tp-locked-notice"><LockKeyhole size={28} aria-hidden="true" /><h2>Category locked</h2><p>Complete all problems in {activeCategory.prerequisiteName} to unlock this category.</p><button type="button" className="btn btn-secondary" onClick={() => setSearchParams({})}>Back to categories</button></div>
      ) : activeCategory ? (
        <>
          <button type="button" className="tp-back" onClick={activeProblem ? backToCategory : () => setSearchParams({})}><ArrowLeft size={16} />{activeProblem ? 'Back to category' : 'All categories'}</button>
          <div className="tp-category-summary" style={{ '--level-color': activeCategory.levelColor }}>
            <div className="tp-category-heading"><h2 className="tp-card-glitch" data-text={activeCategory.name}>{activeCategory.name}</h2><LevelTag category={activeCategory} /></div>
            <CategoryProgress category={activeCategory} solved={userProgress.solved} />
          </div>
          {activeProblem ? (
            <TerminalSession key={`${user.id}:${activeCategory._id}:${activeProblem._id}`} categoryId={activeCategory._id} question={activeProblem} isSolved={solvedIds.has(activeProblem._id)} username={user.username} onExit={backToCategory} onSolved={onSolved} />
          ) : (
            <div className="tp-problem-list">
              {activeCategory.questions.map((question, index) => {
                const solved = solvedIds.has(question._id);
                return (
                  <article className={`tp-problem-card${solved ? ' tp-problem-solved' : ''}`} key={question._id}>
                    <div className="tp-problem-card-header">
                      <span className="tp-problem-number">{String(index + 1).padStart(2, '0')}</span>
                      <span className={`tp-solved-state${solved ? ' solved' : ''}`}>{solved ? <CheckCircle2 size={14} /> : <Circle size={13} />}{solved ? 'Solved' : 'Not solved'}</span>
                    </div>
                    <div className="tp-problem-top">
                      <div className="tp-problem-content"><h3>{question.title}</h3><p>{question.description}</p></div>
                    </div>
                    <div className="tp-problem-footer">
                      <div className="tp-problem-difficulty"><span className={`tp-difficulty ${question.difficulty}`}>{question.difficulty}</span><span className="tp-problem-points">{question.points} points</span></div>
                      <button type="button" className={`tp-solve${solved ? ' tp-solve-review' : ''}`} onClick={() => setSearchParams({ category: activeCategory._id, problem: question._id })}>{solved ? 'Review problem' : 'Solve now'}<ArrowRight size={16} aria-hidden="true" /></button>
                    </div>
                  </article>
                );
              })}
              {!activeCategory.questions.length && <div className="tp-empty"><p>No problems in this category yet.</p></div>}
            </div>
          )}
        </>
      ) : (
        <div className="tp-category-grid">
          {categoryAccess.map(category => {
            const progress = terminalCategoryProgress(category.questions, userProgress.solved);
            return (
              <article className={`tp-category-card${category.locked ? ' tp-category-locked' : ''}`} key={category._id} style={{ '--level-color': category.levelColor }}>
                <div className="tp-card-heading"><span className="tp-category-icon"><TerminalIcon size={24} aria-hidden="true" /></span><h2 className="tp-card-glitch" data-text={category.name}>{category.name}</h2><LevelTag category={category} /></div>
                {category.badge && <div className="tp-category-badge"><img src={`/${encodeURIComponent(category.badge)}`} alt={`${category.name} badge`} width="100" height="100" loading="lazy" /></div>}
                <div className="tp-card-progress-caption"><span>Progress</span><strong>{progress.percent}%</strong></div>
                <div className="tp-progress-track" role="progressbar" aria-label={`${category.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-valuetext={`${progress.completed} of ${progress.total} problems solved`}><div className="tp-progress-fill" style={{ width: `${progress.percent}%` }} /></div>
                <div className="tp-card-counts"><span>{progress.completed} of {progress.total} solved</span><span className={progress.total > 0 && !progress.remaining ? 'tp-complete-label' : ''}>{progress.total > 0 && !progress.remaining ? 'Completed' : `${progress.remaining} remaining`}</span></div>
                {category.locked && <p className="tp-unlock-hint">Complete {category.prerequisiteName} to unlock.</p>}
                <button type="button" className="tp-category-enter" disabled={category.locked} onClick={() => enterCategory(category)}>{category.locked ? <><span>Locked</span><LockKeyhole size={16} aria-hidden="true" /></> : <><span className="tp-button-glitch" data-text="Enter">Enter</span><ArrowRight size={17} aria-hidden="true" /></>}</button>
              </article>
            );
          })}
          {!categories.length && <div className="tp-empty"><p>No terminal categories available yet.</p></div>}
        </div>
      )}
    </div></div>
  );
}
