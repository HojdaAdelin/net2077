import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Network, ArrowLeft, ArrowUpRight, CheckCircle2, Circle, RotateCcw, Zap, Search, FlaskConical, Save, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import LoginRequired from '../components/LoginRequired';
import NetworkDifficultyFilter from '../components/NetworkDifficultyFilter';
import NetworkLabLoading from '../components/NetworkLabLoading';
import { NetworkWorkspace } from './NetworkLab';
import { networkRequest } from '../services/networkProblems';
import '../styles/NetworkProblems.css';

const PROBLEMS_PER_PAGE = 9;

export default function NetworkProblems() {
  const { user } = useContext(AuthContext);
  const [problems, setProblems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [page, setPage] = useState(1);
  const listToolbar = useRef(null);
  useEffect(() => { setPage(1); }, [search, filter, difficulty, user?.id]);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    networkRequest('', { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setProblems(data.problems); })
      .catch(error => { if (error.name !== 'AbortError') setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id]);
  if (!user) return <LoginRequired icon={Network} title="Network Lab problems" description="Sign in to solve practical networking problems and save your progress." />;
  if (loading) return <NetworkLabLoading />;
  const visible = problems.filter(problem => (filter !== 'solved' || problem.solved) && (filter !== 'unsolved' || !problem.solved) &&
    (difficulty === 'all' || problem.difficulty === difficulty) &&
    `${problem.title} ${problem.summary} ${problem.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const published = problems.filter(problem => problem.published);
  const solved = published.filter(problem => problem.solved).length;
  const pageCount = Math.max(1, Math.ceil(visible.length / PROBLEMS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PROBLEMS_PER_PAGE;
  const pageProblems = visible.slice(firstIndex, firstIndex + PROBLEMS_PER_PAGE);
  const pageNumbers = pageCount <= 7 ? Array.from({ length: pageCount }, (_, index) => index + 1) :
    [...new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1])].filter(value => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const changePage = value => {
    setPage(value);
    listToolbar.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  return <div className="nlp-page">
    <header className="nlp-hero"><div><span className="nlp-eyebrow"><Network size={15} />NETWORK LAB</span><h1>Build skills. Solve networks.</h1><p>Configure real networking concepts in a simulated lab, one problem at a time.</p></div><Link className="nlp-button" to="/network-lab"><FlaskConical size={15} />Open sandbox<ArrowUpRight size={14} /></Link></header>
    <div className="nlp-overview"><div><strong>{published.length}</strong><span>Practice problems</span></div><div><strong>{solved}</strong><span>Completed</span></div><div><strong>{published.filter(problem => !problem.solved).reduce((total, problem) => total + problem.xp, 0)}</strong><span>XP available</span></div><div className="nlp-overview-progress"><span>Your progress <b>{published.length ? Math.round(solved / published.length * 100) : 0}%</b></span><progress value={solved} max={published.length || 1} /></div></div>
    <div className="nlp-list-toolbar"><label className="nlp-search"><Search size={16} /><input aria-label="Search problems" placeholder="Search problems or topics…" value={search} onChange={event => setSearch(event.target.value)} /></label><div className="nlp-list-options"><div className="nlp-filters" role="group" aria-label="Problem filter">{[['all', 'All problems'], ['unsolved', 'To do'], ['solved', 'Completed']].map(([id, title]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{title}</button>)}</div><NetworkDifficultyFilter value={difficulty} onChange={setDifficulty} /></div></div>
    {error && <p className="nlp-error" role="alert">{error}</p>}
    <div ref={listToolbar} className="nlp-list-anchor" />
    {!visible.length ? <div className="nlp-empty"><Network size={30} /><h2>{problems.length ? 'No matching problems' : 'Your next challenge is on its way'}</h2><p>{problems.length ? 'Try another search or filter.' : 'New networking problems will appear here when they are published.'}</p></div> : <div className="nlp-grid">{pageProblems.map(problem => <Link to={`/network-lab/problems/${problem._id}`} className={`nlp-card${problem.solved ? ' is-solved' : ''}`} key={problem._id}><div className="nlp-card-top"><span className="nlp-card-icon"><Network size={23} /></span><span className={`nlp-difficulty ${problem.difficulty}`}>{problem.difficulty}</span>{!problem.published && <span className="nlp-badge">Draft</span>}</div><h2>{problem.title}</h2><p>{problem.summary}</p><div className="nlp-tags">{problem.tags.map(tag => <span key={tag}>{tag}</span>)}</div><div className="nlp-card-footer"><span><Zap size={14} />{problem.xp} XP</span><span>{problem.solved ? <><CheckCircle2 size={14} />Completed</> : <>{problem.objectiveCount} objectives<ArrowUpRight size={15} /></>}</span></div></Link>)}</div>}
    {visible.length > 0 && <div className="nlp-pagination"><span className="nlp-pagination-summary" role="status">Showing {firstIndex + 1}–{Math.min(firstIndex + PROBLEMS_PER_PAGE, visible.length)} of {visible.length} problems</span>{pageCount > 1 && <nav aria-label="Network problems pages"><button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page"><ChevronLeft size={14} /><span>Previous</span></button>{pageNumbers.map((number, index) => <span className="nlp-page-number-group" key={number}>{index > 0 && number - pageNumbers[index - 1] > 1 && <span className="nlp-page-ellipsis" aria-hidden="true">…</span>}<button type="button" aria-label={`Page ${number}`} aria-current={currentPage === number ? 'page' : undefined} onClick={() => changePage(number)}>{number}</button></span>)}<button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage === pageCount} aria-label="Next page"><span>Next</span><ChevronRight size={14} /></button></nav>}</div>}
  </div>;
}

export function NetworkProblem() {
  const { user, updateUser } = useContext(AuthContext);
  const { problemId } = useParams();
  const navigate = useNavigate();
  const { showConfirm } = useConfirm();
  const [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null), [busy, setBusy] = useState(false), [saveStatus, setSaveStatus] = useState('Saved');
  const [resetKey, setResetKey] = useState(0);
  const context = useRef(null), topology = useRef(null), timer = useRef(null), writes = useRef(Promise.resolve()), generation = useRef(0), saved = useRef(''), action = useRef(false);
  const pendingWrites = useRef(0);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    generation.current++; context.current = null; action.current = false; clearTimeout(timer.current); setBusy(false); setLoading(true); setError(''); setResult(null);
    networkRequest(`/${problemId}`, { signal: controller.signal }).then(value => {
      if (controller.signal.aborted) return;
      context.current = { id: problemId, token: value.attempt.token, revision: value.problem.revision };
      topology.current = value.attempt.topology; saved.current = JSON.stringify(value.attempt.topology);
      setData(value); setSaveStatus('Saved');
    }).catch(error => { if (error.name !== 'AbortError') setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); clearTimeout(timer.current); generation.current++; context.current = null; };
  }, [problemId, user?.id]);

  const save = useCallback(() => {
    const current = context.current, snapshot = topology.current, serial = JSON.stringify(snapshot), version = generation.current;
    if (!current || (saved.current === serial && !pendingWrites.current)) return writes.current.catch(() => {});
    pendingWrites.current++;
    setSaveStatus('Saving…');
    const request = writes.current.catch(() => {}).then(() => networkRequest(`/${current.id}/attempt`, { method: 'PUT', body: { ...current, topology: snapshot } }));
    writes.current = request;
    request.then(() => {
      pendingWrites.current--;
      if (version === generation.current) { saved.current = serial; setSaveStatus(pendingWrites.current ? 'Saving…' : JSON.stringify(topology.current) === serial ? 'Saved' : 'Unsaved changes'); setError(''); }
    }, error => {
      pendingWrites.current--;
      if (version === generation.current) { setSaveStatus('Save failed'); setError(error.message); }
    });
    return request;
  }, []);
  const changed = useCallback(value => {
    topology.current = value;
    clearTimeout(timer.current);
    if (!context.current) return;
    setResult(null);
    if (JSON.stringify(value) === saved.current && !pendingWrites.current) { setSaveStatus('Saved'); return; }
    setSaveStatus('Unsaved changes');
    timer.current = setTimeout(() => { if (!action.current) void save().catch(() => {}); }, 800);
  }, [save]);
  const check = async () => {
    if (!context.current || action.current) return;
    const version = generation.current;
    action.current = true; setBusy(true); setError(''); clearTimeout(timer.current);
    try {
      await writes.current.catch(() => {});
      if (version !== generation.current) return;
      const response = await networkRequest(`/${problemId}/check`, { method: 'POST', body: { ...context.current, topology: topology.current } });
      if (version !== generation.current) return;
      saved.current = JSON.stringify(topology.current); setSaveStatus('Saved'); setResult(response);
      if (response.completed && !response.preview) {
        setData(previous => ({ ...previous, solved: true }));
        updateUser({ xp: response.xp, level: response.level, streak: response.streak });
      }
    } catch (error) { if (version === generation.current) setError(error.message); }
    finally { if (version === generation.current) { action.current = false; setBusy(false); } }
  };
  const reset = async () => {
    if (action.current || !await showConfirm({ title: 'Reset this lab?', message: 'Your current configuration will be replaced with the starting topology. Earned XP and completion history will be kept.', confirmText: 'Reset lab' })) return;
    action.current = true; setBusy(true); clearTimeout(timer.current); setError('');
    const version = generation.current;
    try {
      await writes.current.catch(() => {});
      if (version !== generation.current) return;
      const response = await networkRequest(`/${problemId}/reset`, { method: 'POST', body: context.current });
      if (version !== generation.current) return;
      context.current = { ...context.current, token: response.token };
      topology.current = response.topology; saved.current = JSON.stringify(response.topology);
      setData(previous => ({ ...previous, attempt: response })); setResetKey(value => value + 1); setResult(null); setSaveStatus('Saved');
    } catch (error) { if (version === generation.current) setError(error.message); }
    finally { if (version === generation.current) { action.current = false; setBusy(false); } }
  };
  const leave = async () => {
    const version = generation.current;
    clearTimeout(timer.current);
    try { await save(); if (version === generation.current) navigate('/network-lab/problems'); } catch { /* Keep the workspace open so saving can be retried. */ }
  };
  if (!user) return <LoginRequired icon={Network} title="Network Lab problems" description="Sign in to continue this lab and save your progress." />;
  if (loading) return <NetworkLabLoading view="problem" />;
  if (!data || error && !context.current) return <div className="nlp-page"><Link to="/network-lab/problems" className="nlp-back"><ArrowLeft size={15} />All problems</Link><p className="nlp-error" role="alert">{error || 'Problem not found.'}</p></div>;
  const { problem } = data;
  return <div className="nlp-page nlp-problem-page">
    <button className="nlp-back" type="button" onClick={leave} disabled={busy}><ArrowLeft size={15} />All problems</button>
    <header className="nlp-problem-heading"><div><div className="nlp-problem-badges"><span className={`nlp-difficulty ${problem.difficulty}`}>{problem.difficulty}</span><span className="nlp-xp"><Zap size={14} />{problem.xp} XP</span>{data.solved && <span className="nlp-completed"><CheckCircle2 size={14} />Completed</span>}{!problem.published && <span className="nlp-badge">Draft preview · no XP</span>}</div><h1>{problem.title}</h1><p>{problem.summary}</p></div><div className="nlp-problem-actions"><span className="nlp-save-status"><Save size={13} />{saveStatus}</span>{saveStatus === 'Save failed' && <button type="button" className="nlp-button" onClick={() => void save().catch(() => {})} disabled={busy}>Retry save</button>}<button type="button" className="nlp-button" onClick={reset} disabled={busy}><RotateCcw size={14} />Reset</button><button type="button" className="nlp-button primary" onClick={check} disabled={busy}><CheckCircle2 size={15} />{busy ? 'Please wait…' : 'Check objectives'}</button></div></header>
    <section className="nlp-brief"><div className="nlp-instructions"><h2>Your mission</h2><p>{problem.description}</p>{problem.hints.length > 0 && <details><summary><Lightbulb size={14} />Need a hint?</summary><ul>{problem.hints.map((hint, index) => <li key={index}>{hint}</li>)}</ul></details>}</div><div className="nlp-objectives"><div className="nlp-objectives-heading"><h2>Objectives</h2><span>{result?.objectives.filter(goal => goal.passed).length || 0} / {problem.objectives.length}</span></div>{problem.objectives.map(goal => {
      const checked = result?.objectives.find(item => item.id === goal.id);
      return <div className={`nlp-objective${checked?.passed ? ' is-complete' : ''}`} key={goal.id}>{checked?.passed ? <CheckCircle2 size={16} /> : <Circle size={16} />}<div><span>{goal.label}</span>{checked && !checked.passed && <small>{checked.detail}</small>}</div></div>;
    })}</div></section>
    {error && <p className="nlp-error" role="alert">{error}</p>}
    {result?.completed && <div className="nlp-success" role="status"><CheckCircle2 size={22} /><div><strong>{result.preview ? 'Preview completed successfully' : 'Lab completed!'}</strong><p>{result.preview ? 'Publish this problem to enable XP rewards.' : result.alreadySolved ? 'You have already earned XP for this problem. You can keep practicing.' : `+${result.xpGained} XP earned. Your competitive season and active Season Pass progress have been updated.`}</p></div></div>}
    <div inert={busy ? '' : undefined} aria-busy={busy}><NetworkWorkspace key={`${problem._id}-${resetKey}`} initialTopology={data.attempt.topology} problem={problem} onTopologyChange={changed} embedded /></div>
  </div>;
}
