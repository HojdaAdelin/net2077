import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import LoginRequired from '../components/LoginRequired';
import QuestionTitle from '../components/QuestionTitle';
import { EventNotice, eventDate } from '../components/EventUI';
import { eventRequest } from '../services/events';
import { API_URL } from '../config';
import '../styles/Events.css';

const localDate = value => {
  const date = new Date(value);
  return new Date(+date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const initialFilters = { q: '', category: '', difficulty: '', type: '', tag: '', hasExplanation: '' };
async function questionRequest(path, signal) {
  const response = await fetch(`${API_URL}/questions/${path}`, { credentials: 'include', signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to load the question bank.');
  return data;
}

export default function EventEditor() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  if (!user) return <LoginRequired title="Organizer access" description="Log in with an organizer account to create competitions." />;
  if (user.role !== 'root') return <main className="ev-page"><Link to="/events" className="ev-text-link"><ArrowLeft size={15} />Back to events</Link><EventNotice error="Event organization is currently available to root accounts." /></main>;
  return <Editor key={`${id || 'new'}-${user.username}`} />;
}

function Editor() {
  const { id } = useParams(), navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', startsAt: localDate(Date.now() + 3600000), durationMinutes: 90, difficulty: 'unrated' });
  const [revision, setRevision] = useState(null), [selected, setSelected] = useState(new Map());
  const [filters, setFilters] = useState(initialFilters), [page, setPage] = useState(1);
  const [bank, setBank] = useState(null), [tags, setTags] = useState([]), [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(Boolean(id)), [error, setError] = useState(''), [bankError, setBankError] = useState('');
  const [saving, setSaving] = useState(false), [retry, setRetry] = useState(0), [selectionOpen, setSelectionOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    questionRequest('search/filters', controller.signal).then(data => setTags(data.tags)).catch(error => { if (error.name !== 'AbortError') setBankError(error.message); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setInitializing(true); setError('');
    eventRequest(`/${id}/editor`, { signal: controller.signal }).then(({ event }) => {
      if (event.status !== 'upcoming') throw new Error('This event has started and can no longer be edited.');
      setForm({ title: event.title, description: event.description, startsAt: localDate(event.startsAt), durationMinutes: event.durationMinutes, difficulty: event.difficulty });
      setRevision(event.revision); setSelected(new Map(event.questions.map(question => [question._id, question])));
    }).catch(error => { if (error.name !== 'AbortError') setError(error.message); }).finally(() => { if (!controller.signal.aborted) setInitializing(false); });
    return () => controller.abort();
  }, [id]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setBankError('');
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ ...filters, page: String(page), pageSize: '25' });
      questionRequest(`search?${params}`, controller.signal).then(setBank)
        .catch(error => { if (error.name !== 'AbortError') setBankError(error.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, page, retry]);
  const field = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const filter = (key, value) => { setFilters(previous => ({ ...previous, [key]: value })); setPage(1); };
  const toggle = question => setSelected(previous => {
    const next = new Map(previous);
    if (next.has(question._id)) next.delete(question._id);
    else if (next.size < 200) next.set(question._id, question);
    return next;
  });
  const selectPage = () => setSelected(previous => {
    const next = new Map(previous);
    for (const question of bank?.questions || []) if (next.size < 200) next.set(question._id, question);
    return next;
  });
  const submit = async event => {
    event.preventDefault();
    if (saving || initializing || (id && revision === null)) return;
    setSaving(true); setError('');
    try {
      if (!selected.size) throw new Error('Select at least one question for the event.');
      const result = await eventRequest(id ? `/${id}` : '', { method: id ? 'PUT' : 'POST', body: {
        ...form, startsAt: new Date(form.startsAt).toISOString(), durationMinutes: Number(form.durationMinutes), questionIds: [...selected.keys()], ...(id ? { revision } : {}),
      } });
      navigate(`/events/${result.event._id}`);
    } catch (error) { setError(error.message); }
    finally { setSaving(false); }
  };
  if (initializing) return <main className="ev-page"><div className="ev-loading">Loading event editor…</div></main>;
  return <main className="ev-page ev-editor">
    <Link to={id ? `/events/${id}` : '/events'} className="ev-text-link"><ArrowLeft size={15} />Back to {id ? 'event' : 'events'}</Link>
    <header className="ev-page-header"><div><span className="ev-eyebrow">ORGANIZER DESK</span><h1>{id ? 'Edit the event' : 'Set the challenge'}<span className="ev-heading-dot">.</span></h1><p>Choose the format. Set the date. Build a question set.</p></div><span className="ev-editor-access">Root access</span></header>
    <form onSubmit={submit}>
      <fieldset className="ev-form-section" disabled={saving}><legend><span>01</span>Event details</legend>
        <div className="ev-form-grid"><label className="ev-field ev-field--wide">Title<input required maxLength={160} value={form.title} onChange={event => field('title', event.target.value)} placeholder="Acadnet · Local round simulation" /></label><label className="ev-field ev-field--wide">Description<textarea required rows={4} maxLength={6000} value={form.description} onChange={event => field('description', event.target.value)} placeholder="What is the competition about? Who is it for? Include any rules participants should know." /><small>{form.description.length} / 6,000</small></label><label className="ev-field">Start date & time<input type="datetime-local" required value={form.startsAt} onChange={event => field('startsAt', event.target.value)} /><small>{Intl.DateTimeFormat().resolvedOptions().timeZone} · everyone starts together</small></label><label className="ev-field">Duration in minutes<input type="number" required min={5} max={1440} value={form.durationMinutes} onChange={event => field('durationMinutes', event.target.value)} /></label><label className="ev-field">Competition level<select value={form.difficulty} onChange={event => field('difficulty', event.target.value)}>{['easy', 'normal', 'hard', 'unrated'].map(level => <option key={level} value={level}>{level[0].toUpperCase() + level.slice(1)}</option>)}</select></label></div>
      </fieldset>
      <section className="ev-form-section" aria-labelledby="ev-question-bank-title"><div className="ev-bank-heading"><h2 id="ev-question-bank-title"><span>02</span>Build the question set</h2><button type="button" className="ev-button" onClick={() => setSelectionOpen(value => !value)} aria-expanded={selectionOpen}>{selected.size} selected<Check size={15} /></button></div><p className="ev-muted">Pick up to 200 questions, across any number of pages. Their order of selection becomes the competition order.</p>
        {selectionOpen && <div className="ev-selection"><div className="ev-bank-actions"><strong>Your question set</strong><button type="button" className="ev-text-link" disabled={saving || !selected.size} onClick={() => setSelected(new Map())}>Clear selection</button></div>{[...selected.values()].map((question, index) => <div className="ev-selected-question" key={question._id}><span>{String(index + 1).padStart(2, '0')}</span><span>{question.title}</span><button type="button" disabled={saving} aria-label={`Remove question ${index + 1}`} onClick={() => toggle(question)}><X size={15} /></button></div>)}{!selected.size && <p>No questions selected yet.</p>}</div>}
        <div className="ev-bank-filters"><label className="ev-search"><Search size={16} /><input aria-label="Search question title" placeholder="Search the question bank…" value={filters.q} onChange={event => filter('q', event.target.value)} /></label><label className="ev-field">Category<select value={filters.category} onChange={event => filter('category', event.target.value)}><option value="">All categories</option>{['LINUX', 'NETWORK', 'ARDUINO', 'ACADNET'].map(value => <option key={value}>{value}</option>)}</select></label><label className="ev-field">Difficulty<select value={filters.difficulty} onChange={event => filter('difficulty', event.target.value)}><option value="">All difficulties</option>{['easy', 'medium', 'hard'].map(value => <option key={value}>{value}</option>)}</select></label><label className="ev-field">Type<select value={filters.type} onChange={event => filter('type', event.target.value)}><option value="">Every type</option>{['basic', 'all', 'acadnet'].map(value => <option key={value}>{value}</option>)}</select></label><label className="ev-field">Tag<select value={filters.tag} onChange={event => filter('tag', event.target.value)}><option value="">All tags</option>{tags.map(value => <option key={value}>{value}</option>)}</select></label><label className="ev-field">Explanation<select value={filters.hasExplanation} onChange={event => filter('hasExplanation', event.target.value)}><option value="">Any</option><option value="yes">With explanation</option><option value="no">Without explanation</option></select></label></div>
        <div className="ev-bank-actions"><span>{bank?.total || 0} matching questions</span><div><button type="button" className="ev-text-link" onClick={() => { setFilters(initialFilters); setPage(1); }}>Reset filters</button><button type="button" className="ev-button" disabled={loading || saving || selected.size >= 200} onClick={selectPage}><Plus size={14} />Select this page</button></div></div>
        {bankError && <EventNotice error={bankError} retry={() => setRetry(value => value + 1)} />}
        {loading ? <div className="ev-loading">Searching the question bank…</div> : <div className="ev-question-bank">{bank?.questions.map(question => <label key={question._id} className={`ev-bank-question${selected.has(question._id) ? ' is-selected' : ''}`}><input type="checkbox" checked={selected.has(question._id)} disabled={saving || (!selected.has(question._id) && selected.size >= 200)} onChange={() => toggle(question)} /><div><div className="ev-bank-question-meta"><span>{question.difficulty}</span><span>{question.type}</span><span>{question.points} pt</span>{question.tags?.map(tag => <span key={tag}>{tag}</span>)}</div><div className="ev-bank-question-title"><QuestionTitle title={question.title} /></div></div></label>)}{bank && !bank.questions.length && <div className="ev-empty"><p>No questions match these filters.</p></div>}</div>}
        {bank?.totalPages > 1 && <div className="ev-pagination"><span>Page {bank.page} / {bank.totalPages}</span><div><button type="button" className="ev-button" aria-label="Previous question page" disabled={loading || bank.page <= 1} onClick={() => setPage(bank.page - 1)}><ChevronLeft size={16} /></button><button type="button" className="ev-button" aria-label="Next question page" disabled={loading || bank.page >= bank.totalPages} onClick={() => setPage(bank.page + 1)}><ChevronRight size={16} /></button></div></div>}
      </section>
      <div className="ev-publish-bar"><div><strong>{selected.size} questions · {[...selected.values()].reduce((sum, question) => sum + (question.points || 1), 0)} points</strong><span>{form.startsAt ? eventDate(form.startsAt) : 'Choose a start date'} · {form.durationMinutes || 0} min</span></div><button type="submit" className="ev-button ev-button--primary" disabled={saving || !selected.size || (id && revision === null)}>{saving ? 'Saving…' : id ? 'Save event' : 'Publish event'}<ArrowRight size={16} /></button></div>
      {error && <EventNotice error={error} />}
    </form>
  </main>;
}
