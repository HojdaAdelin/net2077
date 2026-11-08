import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock3, Flag, Save } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import LoginRequired from '../components/LoginRequired';
import QuestionTitle from '../components/QuestionTitle';
import ExamReview from '../components/ExamReview';
import { EventNotice, eventTime, eventDate } from '../components/EventUI';
import { eventRequest } from '../services/events';
import '../styles/Events.css';

export default function EventCompete() {
  const { user } = useContext(AuthContext), { id } = useParams();
  if (!user) return <LoginRequired icon={Flag} title="Join the competition" description="Log in to enter this event and save your answers." />;
  return <Competition key={`${id}-${user.username}`} id={id} />;
}

function Competition({ id }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null), [answers, setAnswers] = useState({}), [index, setIndex] = useState(0);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [saveState, setSaveState] = useState('All answers saved');
  const [now, setNow] = useState(Date.now()), [busy, setBusy] = useState(false), [flagged, setFlagged] = useState(new Set()), [retry, setRetry] = useState(0);
  const current = useRef(null), selected = useRef({}), queue = useRef(Promise.resolve()), mounted = useRef(true);
  const offset = useRef(0), pending = useRef(0), failed = useRef(false), ending = useRef(false);
  const load = async signal => {
    const response = await eventRequest(`/${id}/attempt`, { signal });
    if (signal?.aborted || !mounted.current) return;
    current.current = response;
    offset.current = +new Date(response.serverNow) - Date.now();
    selected.current = response.participation.answers;
    setData(response); setAnswers(selected.current); setError('');
  };
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    load(controller.signal).catch(error => { if (error.name !== 'AbortError' && mounted.current) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const beforeUnload = event => { if (pending.current || failed.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { mounted.current = false; controller.abort(); clearInterval(timer); window.removeEventListener('beforeunload', beforeUnload); };
  }, [id, retry]);

  const save = (snapshot = selected.current) => {
    pending.current++;
    if (mounted.current) setSaveState('Saving answers…');
    const request = queue.current.catch(() => {}).then(async () => {
      const response = await eventRequest(`/${id}/attempt`, { method: 'PUT', keepalive: true, body: { answers: snapshot, revision: current.current.participation.revision } });
      current.current = response;
      if (mounted.current) setData(response);
      return response;
    });
    queue.current = request;
    request.then(() => {
      pending.current--; failed.current = false;
      if (mounted.current) { setSaveState(pending.current ? 'Saving answers…' : 'All answers saved'); setError(''); }
    }, error => {
      pending.current--; failed.current = true;
      if (mounted.current) { setSaveState('Answers not saved'); setError(error.message); }
    });
    return request;
  };
  const time = now + offset.current;
  const started = data && time >= +new Date(data.event.startsAt);
  const ended = data && time >= +new Date(data.event.endsAt);
  const locked = ended;
  useEffect(() => {
    if (!data || !started || data.event.status !== 'upcoming') return;
    const controller = new AbortController();
    load(controller.signal).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [started, data?.event.status]);
  useEffect(() => {
    if (!ended || ending.current) return;
    ending.current = true;
    queue.current.catch(() => {}).then(() => load()).catch(error => { if (mounted.current) setError(error.message); });
  }, [ended]);

  const choose = answerIndex => {
    if (locked || busy) return;
    const question = data.questions[index], previous = selected.current[question._id] || [];
    const value = question.multipleCorrect
      ? previous.includes(answerIndex) ? previous.filter(answer => answer !== answerIndex) : [...previous, answerIndex].sort((a, b) => a - b)
      : previous.includes(answerIndex) ? [] : [answerIndex];
    const next = { ...selected.current, [question._id]: value };
    selected.current = next; setAnswers(next);
    void save(next).catch(() => {});
  };
  const leave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await queue.current.catch(() => {});
      if (failed.current && !locked) await save();
      navigate(`/events/${id}`);
    } catch { /* Stay here until answers can be saved. */ }
    finally { if (mounted.current) setBusy(false); }
  };
  if (loading) return <main className="ev-page"><div className="ev-loading" role="status">Opening your competition…</div></main>;
  if (!data) return <main className="ev-page"><Link to={`/events/${id}`} className="ev-text-link"><ArrowLeft size={15} />Back to event</Link><EventNotice error={error} retry={() => setRetry(value => value + 1)} /></main>;
  const event = data.event;
  if (!started) return <main className="ev-page"><Link to={`/events/${id}`} className="ev-text-link"><ArrowLeft size={15} />Back to event</Link><div className="ev-empty"><Clock3 size={32} /><h1>Your place is reserved.</h1><p>{event.title} begins {eventDate(event.startsAt)}.</p><strong className="ev-countdown">{eventTime((+new Date(event.startsAt) - time) / 1000)}</strong><p>The questions will unlock here automatically.</p></div></main>;
  if (locked) return (
    <main className="ev-page">
      <Link to={`/events/${id}`} className="ev-text-link"><ArrowLeft size={15} />Event & leaderboard</Link>
      <section className="ev-result">
        <span className="ev-eyebrow">COMPETITION FINISHED</span><h1>Time is up.</h1><p>{event.title}</p>
        {data.event.status === 'ended' ? <>
          <div className="ev-result-stats">
            <div><strong>{data.participation.score}<small> / {event.totalPoints}</small></strong><span>points</span></div>
            <div><strong>{data.participation.correctCount}<small> / {event.questionCount}</small></strong><span>correct answers</span></div>
            <div><strong>{eventTime(data.participation.elapsedSeconds)}</strong><span>time recorded</span></div>
          </div>
          <p>The competition ended automatically. Your last saved answers are final.</p>
        </> : <p role="status">The competition is closing. Loading your final results…</p>}
        <Link to={`/events/${id}`} className="ev-button ev-button--primary">View leaderboard<ArrowRight size={16} /></Link>
      </section>
      {error && <EventNotice error={error} retry={() => { void load().catch(error => setError(error.message)); }} />}
      {data.event.status === 'ended' && <ExamReview questions={data.questions} selectedAnswers={data.participation.answers} />}
    </main>
  );
  const question = data.questions[index];
  if (!question) return <main className="ev-page"><EventNotice error="The question set could not be opened. Reload your competition." retry={() => setRetry(value => value + 1)} /></main>;
  const answered = data.questions.filter(question => answers[question._id]?.length).length;
  return <main className="ev-page ev-compete">
    <div className="ev-competition-bar"><button type="button" className="ev-text-link" onClick={leave} disabled={busy}><ArrowLeft size={15} />Event overview</button><span className={`ev-save-state${failed.current ? ' is-error' : ''}`} role="status"><Save size={14} />{saveState}</span><div className={`ev-clock${+new Date(event.endsAt) - time < 300000 ? ' ev-clock--urgent' : ''}`}><Clock3 size={16} /><span>{eventTime((+new Date(event.endsAt) - time) / 1000)}</span></div></div>
    <header className="ev-exam-heading"><span className="ev-eyebrow">COMPETITION IN PROGRESS</span><h1>{event.title}</h1></header>
    {error && <EventNotice error={error} retry={() => { void save().catch(() => {}); }} />}
    <div className="ev-exam-layout"><aside className="ev-question-nav"><div><strong>Your question set</strong><span>{answered} / {data.questions.length} answered</span></div><progress aria-label="Questions answered" value={answered} max={data.questions.length} /><nav aria-label="Competition questions">{data.questions.map((item, number) => <button type="button" key={item._id} className={`${number === index ? 'is-current ' : ''}${answers[item._id]?.length ? 'is-answered ' : ''}${flagged.has(item._id) ? 'is-flagged' : ''}`} aria-current={number === index ? 'step' : undefined} aria-label={`Question ${number + 1}${answers[item._id]?.length ? ', answered' : ''}${flagged.has(item._id) ? ', flagged' : ''}`} onClick={() => setIndex(number)}>{number + 1}</button>)}</nav><p>Filled: answered<br /><Flag size={11} /> Corner mark: revisit</p><div className="ev-auto-finish"><Clock3 size={15} /><span>Ends automatically.<br />You can edit answers until time runs out.</span></div></aside>
      <section className="ev-question-panel" aria-labelledby="ev-current-question"><div className="ev-question-heading"><span id="ev-current-question">QUESTION {String(index + 1).padStart(2, '0')} <small>/ {data.questions.length}</small></span><div><span>{question.points} {question.points === 1 ? 'point' : 'points'}</span><button className="ev-flag-button" type="button" aria-pressed={flagged.has(question._id)} onClick={() => setFlagged(previous => { const next = new Set(previous); if (next.has(question._id)) next.delete(question._id); else next.add(question._id); return next; })}><Flag size={15} />{flagged.has(question._id) ? 'Flagged' : 'Revisit'}</button></div></div><div className="ev-question-title"><QuestionTitle title={question.title} /></div><p className="ev-answer-hint">{question.multipleCorrect ? 'Select all correct answers.' : 'Select one answer.'}</p>
        <div className="ev-answers">{question.answers.map((answer, number) => <label className={`ev-answer${answers[question._id]?.includes(number) ? ' is-selected' : ''}`} key={number}><input type={question.multipleCorrect ? 'checkbox' : 'radio'} name={`event-${question._id}`} checked={answers[question._id]?.includes(number) || false} disabled={busy} onChange={() => choose(number)} /><span className="ev-answer-letter">{String.fromCharCode(65 + number)}</span><span className="ev-answer-text"><QuestionTitle title={answer} /></span><span className="ev-answer-check" aria-hidden="true">{answers[question._id]?.includes(number) && <Check size={16} />}</span></label>)}</div>
        <div className="ev-question-footer"><button type="button" className="ev-button" disabled={!index} onClick={() => setIndex(value => value - 1)}><ArrowLeft size={15} />Previous</button><button type="button" className="ev-text-link" disabled={busy || !answers[question._id]?.length} onClick={() => { selected.current = { ...selected.current, [question._id]: [] }; setAnswers(selected.current); void save().catch(() => {}); }}>Clear answer</button><button type="button" className="ev-button" disabled={index >= data.questions.length - 1} onClick={() => setIndex(value => value + 1)}>Next<ArrowRight size={15} /></button></div>
      </section>
    </div>
  </main>;
}
