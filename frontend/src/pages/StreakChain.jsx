import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Link2, ListChecks, X } from 'lucide-react';
import { API_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import QuestionTitle from '../components/QuestionTitle';
import '../styles/StreakChain.css';

const request = async (endpoint, body) => {
  const response = await fetch(`${API_URL}/questions/chain/${endpoint}`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.message || 'Unable to load Streak Chain.'), { status: response.status });
  return data;
};
const labels = { LINUX: 'Linux', NETWORK: 'Network', ARDUINO: 'Arduino', ACADNET: 'AcadNet' };

export default function StreakChain() {
  const { category: categoryParam } = useParams();
  const [params] = useSearchParams();
  const category = categoryParam.toUpperCase();
  const includeAcadnet = params.get('acadnet') === '1';
  const { user, loading: authLoading, updateUser } = useContext(AuthContext);
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const pendingStart = useRef(null);
  const sending = useRef(false);
  const storageKey = `streak-chain:${user?._id || user?.id}:${category}:${includeAcadnet}`;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    setError('');
    if (pendingStart.current?.key !== storageKey) {
      const start = async () => {
        const attemptId = localStorage.getItem(storageKey);
        let data;
        try { data = await request('start', { attemptId, category, includeAcadnet }); }
        catch (err) {
          if (!attemptId || ![404, 410].includes(err.status)) throw err;
          localStorage.removeItem(storageKey);
          data = await request('start', { category, includeAcadnet });
        }
        if (data.finished) localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, data.attemptId);
        return data;
      };
      // Reuse the creation request when React re-runs effects in development.
      pendingStart.current = { key: storageKey, promise: start() };
    }
    pendingStart.current.promise.then(data => {
      if (!active) return;
      setSession(data); setQuestion(data.question); setAnswers([]); setConfirmEnd(false);
      if (data.finished) updateUser({ xp: data.userXp, level: data.userLevel });
    }).catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, storageKey, category, includeAcadnet, Boolean(user)]);

  const receive = data => {
    setSession(data);
    if (data.finished) {
      localStorage.removeItem(storageKey);
      updateUser({ xp: data.userXp, level: data.userLevel });
    }
  };
  const submit = async () => {
    if (sending.current || !answers.length || session.feedback) return;
    sending.current = true; setBusy(true); setError('');
    try { receive(await request('answer', { attemptId: session.attemptId, questionId: question._id, answers })); }
    catch (err) { setError(err.message); }
    finally { sending.current = false; setBusy(false); }
  };
  const finish = async () => {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError('');
    try { receive(await request('finish', { attemptId: session.attemptId })); }
    catch (err) { setError(err.message); }
    finally { sending.current = false; setBusy(false); }
  };
  const next = () => {
    setQuestion(session.question); setAnswers([]); setSession(current => ({ ...current, feedback: null }));
  };
  const toggle = index => {
    if (session.feedback || busy) return;
    setAnswers(current => question.multipleCorrect ? current.includes(index) ? current.filter(value => value !== index) : [...current, index] : [index]);
  };

  if (authLoading || loading) return <div className="container chain-page"><p>Loading Streak Chain...</p></div>;
  if (!user) return <div className="container chain-page"><h1>Streak Chain</h1><p>Sign in to play daily challenges.</p><Link to="/login">Sign in</Link></div>;

  return <main className="container chain-page">
    <Link to="/grile" className="chain-back"><ArrowLeft size={15} /> Practice</Link>
    <header className="chain-header"><div><span className="chain-category">{labels[session?.category || category] || category}</span><h1><Link2 size={25} /> Streak Chain</h1></div>
      {session && !session.finished && <button type="button" className="chain-end" onClick={() => setConfirmEnd(!confirmEnd)} disabled={busy}>End chain</button>}
    </header>
    {error && <div className="chain-error" role="alert">{error}</div>}
    {!session && <Link to="/grile" className="chain-primary">Back to practice</Link>}
    {session && <>
      <div className="chain-scoreboard" aria-live="polite">
        <div><span>Chain</span><strong>{session.streak}<small> / {session.totalQuestions}</small></strong></div>
        <div><span>{session.finished ? 'Last multiplier' : 'Next multiplier'}</span><strong>&times;{(session.finished ? (10 + session.streak) / 10 : session.multiplier).toFixed(1)}</strong></div>
        <div className="chain-xp"><span>{session.finished ? 'XP earned' : 'XP accumulated'}</span><strong>{session.finished ? session.xpAwarded : session.xp}<small> XP</small></strong></div>
      </div>
      <div className="chain-links" aria-label={`${session.streak} correct answers out of ${session.totalQuestions}`}>
        {Array.from({ length: session.totalQuestions }, (_, index) => <span key={index} className={index < session.streak ? 'complete' : session.failed && index === session.streak ? 'broken' : !session.finished && index === session.streak ? 'current' : ''}>
          {index < session.streak ? <Check size={12} /> : session.failed && index === session.streak ? <X size={12} /> : index + 1}
        </span>)}
      </div>
      {session.finished ? <section className="chain-result">
        <span className="chain-result-icon">{session.failed ? <Link2 size={30} /> : <Check size={30} />}</span>
        <h2>{session.failed ? 'Chain broken' : session.stopped ? 'Chain completed' : 'Perfect chain'}</h2>
        <p>{session.streak} correct {session.streak === 1 ? 'answer' : 'answers'} in a row.</p>
        {session.feedback && !session.feedback.correct && question && <div className="chain-correction"><QuestionTitle title={question.title} /><span>Correct answer:</span>
          {session.feedback.correctAnswers.map(index => <strong key={index}>{question.answers[index]}</strong>)}
        </div>}
        <p>{session.xpAwarded === 0 && session.xp > 0 ? 'Another daily challenge already claimed this reward window.' : 'Daily Challenges are now locked for 24 hours.'}</p>
        <Link to="/grile" className="chain-primary">Back to practice <ArrowRight size={16} /></Link>
      </section> : <>
        {confirmEnd && <div className="chain-end-confirm"><p>End now and collect your {session.xp} XP? This starts the 24h cooldown.</p>
          <div><button type="button" onClick={() => setConfirmEnd(false)} disabled={busy}>Keep playing</button><button type="button" onClick={finish} disabled={busy}>End &amp; collect</button></div>
        </div>}
        {question && <section className="chain-question">
          <div className="chain-question-meta"><span>Question {session.feedback ? session.answered : session.answered + 1} / {session.totalQuestions}</span><span>{question.points || 1} base XP</span></div>
          <h2><QuestionTitle title={question.title} /></h2>
          {question.multipleCorrect && <div className="chain-multiple-notice"><ListChecks size={20} aria-hidden="true" /><span>Select all correct answers.</span></div>}
          <div className="chain-answers">{question.answers.map((answer, index) => {
            const feedback = session.feedback;
            const selected = feedback ? feedback.selectedAnswers.includes(index) : answers.includes(index);
            const correct = feedback?.correctAnswers.includes(index);
            return <button type="button" key={index} disabled={Boolean(feedback) || busy} aria-pressed={selected}
              className={`chain-answer ${selected ? 'selected' : ''} ${feedback && correct ? 'correct' : ''} ${feedback && selected && !correct ? 'wrong' : ''}`}
              onClick={() => toggle(index)}><span className="chain-answer-letter">{String.fromCharCode(65 + index)}</span><span>{answer}</span>{feedback && correct && <Check size={16} />}</button>;
          })}</div>
          <div className="chain-question-footer">
            {session.feedback ? <><span className="chain-correct-note"><Check size={15} /> Correct. Chain continues.</span><button className="chain-primary" type="button" onClick={next}>Next question <ArrowRight size={16} /></button></>
              : <><span className="chain-hint">A wrong answer ends the chain.</span><button className="chain-primary" type="button" onClick={submit} disabled={!answers.length || busy}>{busy ? 'Checking...' : 'Check answer'}<ArrowRight size={16} /></button></>}
          </div>
        </section>}
      </>}
    </>}
  </main>;
}
