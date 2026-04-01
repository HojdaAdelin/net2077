import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { CheckCircle, Trophy, FileTerminal, AlertCircle } from 'lucide-react';
import LoginRequired from '../components/LoginRequired';
import '../styles/ScriptingProblems.css';

export default function ScriptingProblems() {
  const { user, updateUser } = useContext(AuthContext);
  const [problems, setProblems] = useState([]);
  const [current, setCurrent] = useState(null);
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUnsolvedOnly, setShowUnsolvedOnly] = useState(false);

  useEffect(() => {
    if (user) fetchProblems();
  }, [user]);

  if (!user) {
    return (
      <LoginRequired
        icon={FileTerminal}
        title="Scripting Problems Access Required"
        description="Please login to access Bash scripting challenges."
      />
    );
  }

  const fetchProblems = async () => {
    try {
      const res = await fetch(`${API_URL}/scripting`, { credentials: 'include' });
      const data = await res.json();
      setProblems(data);
      if (data.length > 0) setCurrent(data[0]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const selectProblem = (problem) => {
    setCurrent(problem);
    setSelected([]);
    setResult(null);
  };

  const toggleAnswer = (idx) => {
    if (current?.isCompleted) return;
    setSelected(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!current || selected.length === 0 || submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/scripting/${current._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ selectedAnswers: selected })
      });
      const data = await res.json();
      setResult(data);
      if (data.success && data.xpGained > 0) {
        updateUser({ xp: data.newXP, level: data.newLevel });
        const updated = { ...current, isCompleted: true, correctAnswers: data.correctAnswers };
        setCurrent(updated);
        setProblems(prev => prev.map(p => p._id === current._id ? updated : p));
      }
    } catch {
      setResult({ success: false, message: 'Error submitting. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = showUnsolvedOnly ? problems.filter(p => !p.isCompleted) : problems;

  if (loading) {
    return (
      <div className="sp-page">
        <div className="sp-container">
          <div className="sp-loading">Loading scripting problems...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-page">
      <div className="sp-container">
        <div className="sp-header">
          <h1>Scripting Problems</h1>
        </div>

        <div className="sp-content">
          {/* Sidebar */}
          <div className="sp-sidebar">
            <div className="sp-filter">
              <label className="sp-filter-label">
                <input
                  type="checkbox"
                  checked={showUnsolvedOnly}
                  onChange={e => {
                    setShowUnsolvedOnly(e.target.checked);
                    // if current gets hidden, select first visible
                    if (e.target.checked && current?.isCompleted) {
                      const first = problems.find(p => !p.isCompleted);
                      if (first) selectProblem(first);
                    }
                  }}
                  className="sp-filter-checkbox"
                />
                Show unsolved only
              </label>
            </div>

            <h3>Problems ({filtered.length})</h3>
            <div className="sp-list">
              {filtered.map((p, i) => (
                <div
                  key={p._id}
                  className={`sp-item ${current?._id === p._id ? 'active' : ''} ${p.isCompleted ? 'completed' : ''}`}
                  onClick={() => selectProblem(p)}
                >
                  <span className="sp-num">{problems.indexOf(p) + 1}</span>
                  <span className="sp-title">{p.title}</span>
                  {p.isCompleted && <CheckCircle size={15} className="sp-done-icon" />}
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="sp-no-items">No unsolved problems left.</p>
              )}
            </div>
          </div>

          {/* Main */}
          <div className="sp-main">
            {current ? (
              <>
                <div className="sp-problem-card">
                  <div className="sp-problem-top">
                    <h2>{current.title}</h2>
                    <div className="sp-xp-badge">
                      <Trophy size={14} />
                      {current.xp} XP
                    </div>
                  </div>
                  <p className="sp-description">{current.description}</p>

                  <div className="sp-script-block">
                    <div className="sp-script-header">bash</div>
                    <pre className="sp-script-code">{current.script}</pre>
                  </div>
                </div>

                <div className="sp-answers-card">
                  <div className="sp-answers-header">
                    <AlertCircle size={16} />
                    <span>Select all correct answers — multiple may apply</span>
                  </div>

                  {current.isCompleted && (
                    <div className="sp-completed-notice">
                      <CheckCircle size={16} />
                      Problem solved — correct answers are highlighted below.
                    </div>
                  )}

                  <div className="sp-answers-grid">
                    {current.answers.map((ans, idx) => {
                      const isCorrect = current.isCompleted && current.correctAnswers?.includes(idx);
                      return (
                        <button
                          key={idx}
                          className={`sp-answer-btn
                            ${selected.includes(idx) ? 'selected' : ''}
                            ${current.isCompleted ? 'disabled' : ''}
                            ${isCorrect ? 'correct' : ''}
                          `}
                          onClick={() => toggleAnswer(idx)}
                          disabled={current.isCompleted}
                        >
                          <span className="sp-answer-letter">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <code className="sp-answer-code">{ans}</code>
                        </button>
                      );
                    })}
                  </div>

                  {!current.isCompleted && (
                    <button
                      className="sp-submit-btn"
                      onClick={handleSubmit}
                      disabled={selected.length === 0 || submitting}
                    >
                      {submitting ? 'Checking...' : 'Submit Answer'}
                    </button>
                  )}

                  {result && (
                    <div className={`sp-result ${result.success ? 'success' : 'error'}`}>
                      <span>{result.success ? '✅' : '❌'} {result.message}</span>
                      {result.xpGained > 0 && (
                        <span className="sp-result-xp">+{result.xpGained} XP earned!</span>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="sp-empty">
                <FileTerminal size={56} />
                <h3>No problems available</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
