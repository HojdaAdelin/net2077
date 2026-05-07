import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LoginRequired from '../components/LoginRequired';
import { API_URL } from '../config';
import { ArrowRight, ArrowLeft, CheckCircle, XCircle, TrendingUp, RotateCcw } from 'lucide-react';
import '../styles/LinuxStartTest.css';

const CHAPTER_META = {
  CHAPTER3:  { name: 'Packages',        order: 1 },
  CHAPTER4:  { name: 'Processes',       order: 2 },
  CHAPTER5:  { name: 'Users',           order: 3 },
  CHAPTER6:  { name: 'Dev',             order: 4 },
  CHAPTER7:  { name: 'CLI',             order: 5 },
  CHAPTER8:  { name: 'Hardware',        order: 6 },
  CHAPTER9:  { name: 'System',          order: 7 },
  CHAPTER10: { name: 'System Storage',  order: 8 },
  CHAPTER11: { name: 'Network',         order: 9 },
  CHAPTER12: { name: 'Security',        order: 10 },
  CHAPTER14: { name: 'VM',              order: 11 },
  CHAPTER15: { name: 'Embedded Systems',order: 12 },
};

export default function LinuxStartTest() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [phase, setPhase] = useState('loading'); // loading | quiz | results
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submittedAnswers, setSubmittedAnswers] = useState({});
  const [error, setError] = useState(null);

  // Show LoginRequired if not logged in
  if (!user) {
    return (
      <LoginRequired
        icon={TrendingUp}
        title="Account Required"
        description="You need to be logged in to take the Linux Overview Test and save your results."
      />
    );
  }

  useEffect(() => {
    fetch(`${API_URL}/questions/linux-overview-test`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          setError('Could not load test questions. Please try again.');
          setPhase('error');
          return;
        }
        setQuestions(data);
        setPhase('quiz');
      })
      .catch(() => {
        setError('Network error. Please try again.');
        setPhase('error');
      });
  }, []);

  // ── Quiz helpers ──────────────────────────────────────────────────────────

  const currentQuestion = questions[currentIndex];
  const isMultiple = currentQuestion
    ? (currentQuestion.correctAnswers?.length ?? 1) > 1
    : false;

  const handleSelect = (idx) => {
    if (submittedAnswers[currentQuestion._id] !== undefined) return;
    const qid = currentQuestion._id;
    if (isMultiple) {
      const prev = selectedAnswers[qid] || [];
      setSelectedAnswers({
        ...selectedAnswers,
        [qid]: prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx],
      });
    } else {
      setSelectedAnswers({ ...selectedAnswers, [qid]: [idx] });
    }
  };

  const handleSubmit = () => {
    const qid = currentQuestion._id;
    const userAns = selectedAnswers[qid] || [];
    const correct = currentQuestion.correctAnswers || [currentQuestion.correctIndex];
    const isCorrect =
      userAns.length === correct.length && userAns.every(a => correct.includes(a));
    setSubmittedAnswers(prev => ({ ...prev, [qid]: isCorrect }));
    // Auto-advance after short delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(i => i + 1);
      }
    }, 600);
  };

  const handleFinish = async () => {
    // Build chapter stats
    const chapterStats = {};
    questions.forEach(q => {
      const ch = q._chapterTag;
      if (!ch) return;
      if (!chapterStats[ch]) chapterStats[ch] = { correct: 0, total: 0 };
      chapterStats[ch].total += 1;
      if (submittedAnswers[q._id] === true) chapterStats[ch].correct += 1;
    });

    try {
      await fetch(`${API_URL}/progress/linux-chapter-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chapters: chapterStats }),
      });
    } catch (_) { /* non-blocking */ }

    setPhase('results');
  };

  // ── Results helpers ───────────────────────────────────────────────────────

  const buildResults = () => {
    const map = {};
    questions.forEach(q => {
      const ch = q._chapterTag;
      if (!ch) return;
      if (!map[ch]) map[ch] = { correct: 0, total: 0 };
      map[ch].total += 1;
      if (submittedAnswers[q._id] === true) map[ch].correct += 1;
    });
    return Object.entries(map)
      .map(([ch, s]) => ({ ch, ...s, name: CHAPTER_META[ch]?.name || ch }))
      .sort((a, b) => b.correct - a.correct);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="lst-page">
        <div className="lst-loading">Loading test questions…</div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="lst-page">
        <div className="lst-error">
          <p>{error}</p>
          <button className="lst-btn-primary" onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    const results = buildResults();
    const totalCorrect = results.reduce((s, r) => s + r.correct, 0);
    const totalQ = results.reduce((s, r) => s + r.total, 0);
    const pct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

    return (
      <div className="lst-page">
        <div className="lst-results-wrap">
          <div className="lst-results-header">
            <h1 className="lst-results-title">Linux Overview — Results</h1>
            <div className="lst-score-ring">
              <svg viewBox="0 0 120 120" className="lst-ring-svg">
                <circle cx="60" cy="60" r="50" className="lst-ring-bg" />
                <circle
                  cx="60" cy="60" r="50"
                  className="lst-ring-fill"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
                />
              </svg>
              <div className="lst-ring-label">
                <span className="lst-ring-pct">{pct}%</span>
                <span className="lst-ring-sub">{totalCorrect}/{totalQ}</span>
              </div>
            </div>
          </div>

          <div className="lst-chapter-results">
            {results.map((r, i) => {
              const chPct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0;
              const isFirst = i === 0;
              return (
                <div key={r.ch} className={`lst-chapter-row ${isFirst ? 'lst-chapter-row--best' : ''}`}>
                  <div className="lst-chapter-rank">#{i + 1}</div>
                  <div className="lst-chapter-info">
                    <span className="lst-chapter-name">{r.name}</span>
                    <div className="lst-chapter-bar-wrap">
                      <div
                        className="lst-chapter-bar-fill"
                        style={{ width: `${chPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="lst-chapter-score">
                    {r.correct === r.total
                      ? <CheckCircle size={15} className="lst-icon-ok" />
                      : r.correct === 0
                        ? <XCircle size={15} className="lst-icon-bad" />
                        : null}
                    <span>{r.correct}/{r.total}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lst-results-actions">
            <button
              className="lst-btn-secondary"
              onClick={() => {
                setPhase('loading');
                setCurrentIndex(0);
                setSelectedAnswers({});
                setSubmittedAnswers({});
                fetch(`${API_URL}/questions/linux-overview-test`)
                  .then(r => r.json())
                  .then(data => { setQuestions(data); setPhase('quiz'); })
                  .catch(() => { setError('Network error.'); setPhase('error'); });
              }}
            >
              <RotateCcw size={15} /> Retake Test
            </button>
            <button className="lst-btn-primary" onClick={() => navigate('/progress')}>
              <TrendingUp size={15} /> Go to Progress
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz phase ────────────────────────────────────────────────────────────

  const answered = Object.keys(submittedAnswers).length;
  const progressPct = Math.round(((currentIndex + 1) / questions.length) * 100);
  const userAns = selectedAnswers[currentQuestion._id] || [];
  const submitted = submittedAnswers[currentQuestion._id];
  const correctAns = currentQuestion.correctAnswers || [currentQuestion.correctIndex];
  const chapterTag = currentQuestion._chapterTag;
  const chapterName = CHAPTER_META[chapterTag]?.name || chapterTag;
  const allAnswered = questions.every(q => submittedAnswers[q._id] !== undefined);

  return (
    <div className="lst-page">
      <div className="lst-quiz-wrap">

        {/* Sidebar */}
        <aside className="lst-sidebar">
          <div className="lst-sidebar-header">
            <span className="lst-sidebar-title">Linux Overview</span>
            <span className="lst-sidebar-count">{answered} / {questions.length}</span>
          </div>
          <div className="lst-sidebar-bar">
            <div className="lst-sidebar-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="lst-nav-grid">
            {questions.map((q, i) => {
              const s = submittedAnswers[q._id];
              let cls = 'lst-nav-btn';
              if (i === currentIndex) cls += ' active';
              else if (s === true) cls += ' correct';
              else if (s === false) cls += ' incorrect';
              return (
                <button key={q._id} className={cls} onClick={() => setCurrentIndex(i)}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          {allAnswered && (
            <button className="lst-btn-primary lst-finish-btn" onClick={handleFinish}>
              See Results <ArrowRight size={14} />
            </button>
          )}
        </aside>

        {/* Question card */}
        <main className="lst-main">
          <div className="lst-question-card">
            <div className="lst-question-meta">
              <span className="lst-q-num">Question {currentIndex + 1} of {questions.length}</span>
              <span className="lst-q-chapter">{chapterName}</span>
              {isMultiple && <span className="lst-q-multi">Multiple answers</span>}
            </div>

            <p className="lst-question-text">{currentQuestion.title}</p>

            <div className="lst-answers">
              {currentQuestion.answers.map((ans, idx) => {
                const isSelected = userAns.includes(idx);
                const isCorrectAns = correctAns.includes(idx);
                let cls = 'lst-answer';
                if (submitted !== undefined) {
                  if (isCorrectAns) cls += ' lst-answer--correct';
                  else if (isSelected && !isCorrectAns) cls += ' lst-answer--wrong';
                } else if (isSelected) {
                  cls += ' lst-answer--selected';
                }
                return (
                  <button
                    key={idx}
                    className={cls}
                    onClick={() => handleSelect(idx)}
                    disabled={submitted !== undefined}
                  >
                    <span className="lst-answer-letter">{String.fromCharCode(65 + idx)}</span>
                    <span className="lst-answer-text">{ans}</span>
                    {submitted !== undefined && isCorrectAns && (
                      <CheckCircle size={16} className="lst-answer-icon lst-icon-ok" />
                    )}
                    {submitted !== undefined && isSelected && !isCorrectAns && (
                      <XCircle size={16} className="lst-answer-icon lst-icon-bad" />
                    )}
                  </button>
                );
              })}
            </div>

            {submitted !== undefined && (
              <div className={`lst-feedback ${submitted ? 'lst-feedback--ok' : 'lst-feedback--bad'}`}>
                {submitted ? '✓ Correct' : '✗ Incorrect'}
              </div>
            )}

            <div className="lst-question-actions">
              <button
                className="lst-btn-ghost"
                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
              >
                <ArrowLeft size={14} /> Prev
              </button>

              {submitted === undefined ? (
                <button
                  className="lst-btn-primary"
                  onClick={handleSubmit}
                  disabled={userAns.length === 0}
                >
                  Submit
                </button>
              ) : currentIndex < questions.length - 1 ? (
                <button className="lst-btn-primary" onClick={() => setCurrentIndex(i => i + 1)}>
                  Next <ArrowRight size={14} />
                </button>
              ) : allAnswered ? (
                <button className="lst-btn-primary" onClick={handleFinish}>
                  See Results <ArrowRight size={14} />
                </button>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
