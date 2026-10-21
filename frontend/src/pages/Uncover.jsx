import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Eye, ListChecks, X } from 'lucide-react';
import { API_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import QuestionTitle from '../components/QuestionTitle';
import '../styles/StreakChain.css';
import '../styles/Uncover.css';

const request = async (endpoint, body) => {
  const response = await fetch(`${API_URL}/questions/uncover/${endpoint}`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.message || 'Unable to load Uncover.'), { status: response.status });
  return data;
};
const labels = { LINUX: 'Linux', NETWORK: 'Network', ARDUINO: 'Arduino', ACADNET: 'AcadNet' };

export default function Uncover() {
  const { category: categoryParam } = useParams();
  const [params] = useSearchParams();
  const category = categoryParam.toUpperCase();
  const includeAcadnet = params.get('acadnet') === '1';
  const { user, loading: authLoading, updateUser } = useContext(AuthContext);
  const [session, setSession] = useState(null);
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const pendingStart = useRef(null);
  const sending = useRef(false);
  const storageKey = `uncover:${user?._id || user?.id}:${category}:${includeAcadnet}`;

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
      setSession(data); setView(data); setConfirmEnd(false);
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
  const submit = async isCorrect => {
    if (sending.current || session.feedback || !view?.option) return;
    sending.current = true; setBusy(true); setError('');
    try { receive(await request('answer', { attemptId: session.attemptId, questionId: view.question._id,
      optionIndex: view.option.index, isCorrect })); }
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
    setView(session); setSession(current => ({ ...current, feedback: null }));
  };

  if (authLoading || loading) return <div className="container chain-page"><p>Loading Uncover...</p></div>;
  if (!user) return <div className="container chain-page"><h1>Uncover</h1><p>Sign in to play daily challenges.</p><Link to="/login">Sign in</Link></div>;
  const question = view?.question;
  const option = view?.option;

  return <main className="container chain-page uncover-page">
    <Link to="/grile" className="chain-back"><ArrowLeft size={15} /> Practice</Link>
    <header className="chain-header"><div><span className="chain-category">{labels[session?.category || category] || category}</span><h1><Eye size={25} /> Uncover</h1></div>
      {session && !session.finished && <button type="button" className="chain-end" onClick={() => setConfirmEnd(!confirmEnd)} disabled={busy}>End challenge</button>}
    </header>
    {error && <div className="chain-error" role="alert">{error}</div>}
    {!session && <Link to="/grile" className="chain-primary">Back to practice</Link>}
    {session && <>
      <div className="chain-scoreboard" aria-live="polite">
        <div><span>Completed</span><strong>{session.completedQuestions}<small> / {session.totalQuestions}</small></strong></div>
        <div><span>Multiplier</span><strong>&times;3</strong></div>
        <div><span>{session.finished ? 'XP earned' : 'XP accumulated'}</span><strong>{session.finished ? session.xpAwarded : session.xp}<small> XP</small></strong></div>
      </div>
      <div className="chain-links" aria-label={`${session.completedQuestions} questions completed out of ${session.totalQuestions}`}>
        {Array.from({ length: session.totalQuestions }, (_, index) => <span key={index} className={index < session.completedQuestions ? 'complete' : session.failed && index === session.completedQuestions ? 'broken' : !session.finished && index === session.completedQuestions ? 'current' : ''}>
          {index < session.completedQuestions ? <Check size={12} /> : session.failed && index === session.completedQuestions ? <X size={12} /> : index + 1}
        </span>)}
      </div>
      {session.finished ? <section className="chain-result">
        <span className="chain-result-icon">{session.failed ? <X size={30} /> : <Check size={30} />}</span>
        <h2>{session.failed ? 'Challenge ended' : session.stopped ? 'Challenge completed' : 'Fully uncovered'}</h2>
        <p>{session.completedQuestions} of {session.totalQuestions} questions completed.</p>
        {session.feedback && !session.feedback.correct && <div className="chain-correction"><QuestionTitle title={session.feedback.title} />
          <span>Answer {String.fromCharCode(65 + session.feedback.optionIndex)}</span>
          <strong>{session.feedback.text}</strong>
          <span>You chose: {session.feedback.decision ? 'Correct answer' : 'Not a correct answer'}.</span>
          <strong>{session.feedback.isCorrect ? 'This is a correct answer.' : 'This is not a correct answer.'}</strong>
        </div>}
        <p>{session.xpAwarded === 0 && session.xp > 0 ? 'Another daily challenge already claimed this reward window.' : 'Daily Challenges are now locked for 24 hours.'}</p>
        <Link to="/grile" className="chain-primary">Back to practice <ArrowRight size={16} /></Link>
      </section> : <>
        {confirmEnd && <div className="chain-end-confirm"><p>End now and collect your {session.xp} XP? Only fully completed questions earn XP. This starts the 24h cooldown.</p>
          <div><button type="button" onClick={() => setConfirmEnd(false)} disabled={busy}>Keep playing</button><button type="button" onClick={finish} disabled={busy}>End &amp; collect</button></div>
        </div>}
        {question && option && <section className="chain-question">
          <div className="chain-question-meta"><span>Question {view.questionIndex + 1} / {session.totalQuestions}</span><span>{question.points} base XP &times; 3</span></div>
          <h2><QuestionTitle title={question.title} /></h2>
          {question.multipleCorrect && <div className="chain-multiple-notice"><ListChecks size={20} aria-hidden="true" /><span>This question has multiple correct answers.</span></div>}
          {view.revealed.length > 0 && <ol className="uncover-revealed" aria-label="Previous answers">{view.revealed.map(answer => <li key={answer.index}>
            <span>{String.fromCharCode(65 + answer.index)}</span><span>{answer.text}</span><small>{answer.isCorrect ? 'Correct answer' : 'Not correct'}</small>
          </li>)}</ol>}
          <div className="uncover-option" aria-live="polite">
            <span className="uncover-option-count">Answer {option.index + 1} of {option.total}</span>
            <div><span className="chain-answer-letter">{String.fromCharCode(65 + option.index)}</span><span>{option.text}</span></div>
          </div>
          {session.feedback ? <div className="chain-question-footer"><span className="chain-correct-note"><Check size={15} /> {option.index + 1 === option.total ? 'Question complete. XP added.' : 'Right decision.'}</span>
            <button type="button" className="chain-primary" onClick={next}>{option.index + 1 === option.total ? 'Next question' : 'Reveal next answer'}<ArrowRight size={16} /></button>
          </div> : <>
            <p className="uncover-prompt">Is this a correct answer to the question?</p>
            <div className="uncover-decisions">
              <button type="button" onClick={() => submit(false)} disabled={busy}><X size={18} /> Not a correct answer</button>
              <button type="button" onClick={() => submit(true)} disabled={busy}><Check size={18} /> Correct answer</button>
            </div>
            <p className="uncover-rule">{busy ? 'Checking your decision...' : 'Every answer must be classified correctly. One mistake ends the challenge.'}</p>
          </>}
        </section>}
      </>}
    </>}
  </main>;
}
