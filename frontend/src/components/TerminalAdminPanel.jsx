import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Save, RefreshCw } from 'lucide-react';
import { API_URL } from '../config';
import { useConfirm } from '../context/ConfirmContext';
import '../styles/TerminalAdminPanel.css';

const emptyCategory = () => ({ name: '', levelName: 'Intro', levelColor: '#22c55e', questions: [] });
const emptyProblem = () => ({ title: '', description: '', difficulty: 'easy', points: 5, order: 0, acceptedCommands: '' });
const matchesProblem = (problem, search, difficulty) =>
  problem.title.toLowerCase().includes(search.trim().toLowerCase()) &&
  (!difficulty || problem.difficulty === difficulty);

async function request(path = '', options = {}) {
  const response = await fetch(`${API_URL}/terminal/admin${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to save terminal content.');
  return data;
}

function ProblemFilters({ search, onSearch, difficulty, onDifficulty, label }) {
  return (
    <div className="ta-filters">
      <input className="rd-input" type="search" aria-label={label} placeholder="Search problems by title..." value={search} onChange={event => onSearch(event.target.value)} />
      <select className="rd-input" aria-label={`${label}: difficulty`} value={difficulty} onChange={event => onDifficulty(event.target.value)}>
        <option value="">All difficulties</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
    </div>
  );
}

function LevelTag({ name, color }) {
  return <span className="ta-level-tag" style={{ '--tag-color': color }}>{name || 'Level'}</span>;
}

export default function TerminalAdminPanel() {
  const { showConfirm } = useConfirm();
  const [tab, setTab] = useState('categories');
  const [problems, setProblems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState(emptyCategory);
  const [problemDraft, setProblemDraft] = useState(emptyProblem);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerDifficulty, setPickerDifficulty] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(false);

  const load = useCallback(async signal => {
    const data = await request('', { signal });
    setProblems(data.problems);
    setCategories(data.categories);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch(failure => {
      if (failure.name !== 'AbortError') setError(failure.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load]);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try { await load(); } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  };
  const openCategory = category => {
    setEditor({ type: 'category', id: category?._id || null });
    setCategoryDraft(category ? { name: category.name, levelName: category.levelName, levelColor: category.levelColor, questions: [...category.questions] } : emptyCategory());
    setPickerSearch('');
    setPickerDifficulty('');
    setSelectedOnly(false);
    setError('');
    setNotice('');
  };
  const openProblem = problem => {
    setEditor({ type: 'problem', id: problem?._id || null });
    setProblemDraft(problem ? { title: problem.title, description: problem.description, difficulty: problem.difficulty,
      points: problem.points, order: problem.order, acceptedCommands: problem.acceptedCommands.join('\n') } : emptyProblem());
    setError('');
    setNotice('');
  };
  const toggleProblem = id => setCategoryDraft(previous => ({ ...previous, questions:
    previous.questions.includes(id) ? previous.questions.filter(value => value !== id) : [...previous.questions, id] }));

  const save = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const isCategory = editor.type === 'category';
      const body = isCategory ? categoryDraft : { ...problemDraft,
        points: Number(problemDraft.points), order: Number(problemDraft.order),
        acceptedCommands: problemDraft.acceptedCommands.split(/\r?\n/).map(value => value.trim()).filter(Boolean) };
      await request(`/${isCategory ? 'categories' : 'problems'}${editor.id ? `/${editor.id}` : ''}`, {
        method: editor.id ? 'PUT' : 'POST', body: JSON.stringify(body),
      });
      setEditor(null);
      setNotice(`${isCategory ? 'Category' : 'Problem'} saved.`);
      await load();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };

  const remove = async (type, item) => {
    const isCategory = type === 'category';
    const confirmed = await showConfirm({ title: isCategory ? 'Delete category?' : 'Delete problem?',
      message: isCategory ? `Delete "${item.name}"? Its problems will remain available.` :
        `Delete "${item.title}"? It will also be removed from every terminal category.`, confirmText: 'Delete' });
    if (!confirmed) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request(`/${isCategory ? 'categories' : 'problems'}/${item._id}`, { method: 'DELETE' });
      setNotice(`${isCategory ? 'Category' : 'Problem'} deleted.`);
      await load();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };

  const visibleProblems = problems.filter(problem => matchesProblem(problem, search, difficulty));
  const pickerProblems = problems.filter(problem => matchesProblem(problem, pickerSearch, pickerDifficulty) &&
    (!selectedOnly || categoryDraft.questions.includes(problem._id)));
  const visibleCategories = categories.filter(category => category.name.toLowerCase().includes(categorySearch.trim().toLowerCase()));

  return (
    <div className="ta-panel">
      <div className="ta-heading"><div><h2>Terminal</h2><p>Manage practice categories and terminal problems.</p></div>
        <button type="button" className="btn btn-secondary ta-button" onClick={refresh} disabled={busy || loading || Boolean(editor)} aria-label="Refresh terminal content"><RefreshCw size={15} /></button>
      </div>
      <div className="ta-tabs" aria-label="Terminal management sections">
        <button type="button" aria-pressed={tab === 'categories'} disabled={busy} onClick={() => { setTab('categories'); setEditor(null); }}>Categories <span>{categories.length}</span></button>
        <button type="button" aria-pressed={tab === 'problems'} disabled={busy} onClick={() => { setTab('problems'); setEditor(null); }}>Problems <span>{problems.length}</span></button>
      </div>
      {error && <div className="ta-message ta-error" role="alert">{error}</div>}
      {notice && <div className="ta-message" role="status">{notice}</div>}
      {loading ? <p className="ta-empty">Loading terminal content...</p> : editor ? (
        <form className="ta-editor" onSubmit={save}>
          <fieldset disabled={busy}>
            <div className="ta-heading"><h3>{editor.id ? 'Edit' : 'New'} {editor.type === 'category' ? 'category' : 'problem'}</h3>
              <button type="button" className="rd-icon-btn" onClick={() => setEditor(null)} aria-label="Close editor"><X size={18} /></button>
            </div>
            {editor.type === 'category' ? (
              <>
                <label className="ta-field">Category name<input className="rd-input" required maxLength={120} value={categoryDraft.name} onChange={event => setCategoryDraft({ ...categoryDraft, name: event.target.value })} placeholder="e.g. Files and directories" /></label>
                <div className="ta-level-fields">
                  <label className="ta-field">Level tag<input className="rd-input" required maxLength={40} value={categoryDraft.levelName} onChange={event => setCategoryDraft({ ...categoryDraft, levelName: event.target.value })} placeholder="Intro, Basic, Advanced..." /></label>
                  <label className="ta-field">Tag color<input className="ta-color" type="color" value={categoryDraft.levelColor} onChange={event => setCategoryDraft({ ...categoryDraft, levelColor: event.target.value })} /></label>
                  <LevelTag name={categoryDraft.levelName} color={categoryDraft.levelColor} />
                </div>
                <div className="ta-picker-heading"><h4>Problems in this category</h4><span>{categoryDraft.questions.length} selected</span></div>
                <ProblemFilters search={pickerSearch} onSearch={setPickerSearch} difficulty={pickerDifficulty} onDifficulty={setPickerDifficulty} label="Find problems for category" />
                <button type="button" className="ta-selection-filter" aria-pressed={selectedOnly} onClick={() => setSelectedOnly(value => !value)}>Selected only</button>
                <div className="ta-picker">
                  {pickerProblems.length ? pickerProblems.map(problem => (
                    <label key={problem._id} className="ta-picker-row">
                      <input type="checkbox" checked={categoryDraft.questions.includes(problem._id)} onChange={() => toggleProblem(problem._id)} />
                      <span className="ta-picker-content">
                        <span className="ta-picker-title">{problem.title}</span>
                        <span className="ta-picker-description">{problem.description}</span>
                        <span className="ta-picker-meta"><span className={`ta-difficulty ${problem.difficulty}`}>{problem.difficulty}</span><span>{problem.points} points</span></span>
                      </span>
                    </label>
                  )) : <p className="ta-empty">No problems match your search and difficulty.</p>}
                </div>
              </>
            ) : (
              <>
                <label className="ta-field">Title<input className="rd-input" required maxLength={300} value={problemDraft.title} onChange={event => setProblemDraft({ ...problemDraft, title: event.target.value })} /></label>
                <label className="ta-field">Description<textarea className="rd-textarea" required rows={5} maxLength={10000} value={problemDraft.description} onChange={event => setProblemDraft({ ...problemDraft, description: event.target.value })} /></label>
                <div className="ta-problem-fields">
                  <label className="ta-field">Difficulty<select className="rd-input" value={problemDraft.difficulty} onChange={event => setProblemDraft({ ...problemDraft, difficulty: event.target.value })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
                  <label className="ta-field">Points<input className="rd-input" type="number" required min="0" max="10000" step="1" value={problemDraft.points} onChange={event => setProblemDraft({ ...problemDraft, points: event.target.value })} /></label>
                  <label className="ta-field">Display order<input className="rd-input" type="number" required min="0" max="1000000" step="1" value={problemDraft.order} onChange={event => setProblemDraft({ ...problemDraft, order: event.target.value })} /></label>
                </div>
                <label className="ta-field">Accepted commands<textarea className="rd-textarea" required rows={5} value={problemDraft.acceptedCommands} onChange={event => setProblemDraft({ ...problemDraft, acceptedCommands: event.target.value })} placeholder={'ls -la\nls -al'} /><span className="ta-help">One accepted command per line.</span></label>
              </>
            )}
            <div className="ta-editor-actions"><button type="button" className="btn btn-secondary" onClick={() => setEditor(null)}>Cancel</button><button type="submit" className="btn btn-primary ta-button"><Save size={15} />{busy ? 'Saving...' : 'Save changes'}</button></div>
          </fieldset>
        </form>
      ) : tab === 'categories' ? (
        <>
          <div className="ta-toolbar"><input className="rd-input" type="search" aria-label="Search terminal categories" placeholder="Search categories..." value={categorySearch} onChange={event => setCategorySearch(event.target.value)} /><button type="button" className="btn btn-primary ta-button" disabled={busy} onClick={() => openCategory(null)}><Plus size={16} />New category</button></div>
          <div className="ta-category-list">
            {visibleCategories.map(category => (
              <article className="ta-category-card" key={category._id}>
                <div className="ta-card-top"><LevelTag name={category.levelName} color={category.levelColor} /><span className="ta-count">{category.questionCount} {category.questionCount === 1 ? 'problem' : 'problems'}</span></div>
                <h3>{category.name}</h3>
                <div className="ta-card-actions"><button type="button" className="btn btn-secondary ta-button" disabled={busy} onClick={() => openCategory(category)}><Pencil size={14} />Edit category</button><button type="button" className="rd-icon-btn ta-delete" aria-label={`Delete category ${category.name}`} disabled={busy} onClick={() => remove('category', category)}><Trash2 size={16} /></button></div>
              </article>
            ))}
          </div>
          {!visibleCategories.length && <p className="ta-empty">{categories.length ? 'No categories match your search.' : 'No categories yet. Create one and select its problems.'}</p>}
        </>
      ) : (
        <>
          <div className="ta-toolbar"><h3>{problems.length} terminal problems</h3><button type="button" className="btn btn-primary ta-button" disabled={busy} onClick={() => openProblem(null)}><Plus size={16} />New problem</button></div>
          <ProblemFilters search={search} onSearch={setSearch} difficulty={difficulty} onDifficulty={setDifficulty} label="Search terminal problems" />
          <div className="ta-problem-list">{visibleProblems.map(problem => (
            <article className="ta-problem-row" key={problem._id}>
              <div className="ta-problem-info"><h4>{problem.title}</h4><div className="ta-problem-meta"><span className={`ta-difficulty ${problem.difficulty}`}>{problem.difficulty}</span><span>{problem.points} points</span><span>{categories.filter(category => category.questions.includes(problem._id)).length} categories</span></div></div>
              <div className="ta-row-actions"><button type="button" className="rd-icon-btn" aria-label={`Edit problem ${problem.title}`} disabled={busy} onClick={() => openProblem(problem)}><Pencil size={16} /></button><button type="button" className="rd-icon-btn ta-delete" aria-label={`Delete problem ${problem.title}`} disabled={busy} onClick={() => remove('problem', problem)}><Trash2 size={16} /></button></div>
            </article>
          ))}</div>
          {!visibleProblems.length && <p className="ta-empty">No problems match your search and difficulty.</p>}
        </>
      )}
    </div>
  );
}
