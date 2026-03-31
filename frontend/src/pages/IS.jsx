import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { CheckCircle, Code, Trophy, Copy, Check, Send, TriangleAlert } from 'lucide-react';
import LoginRequired from '../components/LoginRequired';
import '../styles/IS.css';

export default function IS() {
  const { user, updateUser } = useContext(AuthContext);
  const [problems, setProblems] = useState([]);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [testInput, setTestInput] = useState(''); // full test input from backend
  const [outputs, setOutputs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) fetchProblems();
  }, [user]);

  if (!user) {
    return (
      <LoginRequired
        icon={Code}
        title="IS/Debug Access Required"
        description="Please login to access programming challenges and debug real-world code problems."
      />
    );
  }

  const fetchProblems = async () => {
    try {
      const res = await fetch(`${API_URL}/is`, { credentials: 'include' });
      const data = await res.json();
      setProblems(data);
      if (data.length > 0) selectProblem(data[0]);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const selectProblem = async (problem) => {
    setCurrentProblem(problem);
    setOutputs(['']);
    setResult(null);
    setCopied(false);
    setTestInput('');
    try {
      const res = await fetch(`${API_URL}/is/${problem._id}/test-input`, { credentials: 'include' });
      const data = await res.json();
      setTestInput(data.input || '');
    } catch {
      setTestInput('');
    }
  };

  const handleProblemSelect = (problem) => selectProblem(problem);

  const handleCopyInput = () => {
    const text = testInput;
    const copy = (t) => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(t).catch(() => fallback(t));
      } else {
        fallback(t);
      }
    };
    const fallback = (t) => {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    };
    copy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!currentProblem) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/is/${currentProblem._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ outputs }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success && data.xpGained > 0) {
        updateUser({ xp: data.newXP, level: data.newLevel });
        await fetchProblems();
      }
    } catch {
      setResult({ success: false, message: 'Error submitting. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="is-page">
        <div className="is-container">
          <div className="is-loading">Loading IS problems...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="is-page">
      <div className="is-container">
        <div className="is-header"><h1>IS/Debug</h1></div>

        <div className="is-content">
          {/* Sidebar */}
          <div className="is-sidebar">
            <h3>Problems ({problems.length})</h3>
            <div className="is-problems-list">
              {problems.map((problem, index) => (
                <div
                  key={problem._id}
                  className={`is-problem-card ${currentProblem?._id === problem._id ? 'active' : ''} ${problem.isCompleted ? 'completed' : ''}`}
                  onClick={() => handleProblemSelect(problem)}
                >
                  <div className="is-problem-header">
                    <span className="is-problem-number">{index + 1}</span>
                    <h4>{problem.title}</h4>
                    {problem.isCompleted && <CheckCircle size={16} className="is-completed-icon" />}
                  </div>
                  <div className="is-problem-meta">
                    <span className="is-problem-xp"><Trophy size={14} />{problem.xp} XP</span>
                    <span className="is-problem-lang"><Code size={14} />{problem.language.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main */}
          <div className="is-main">
            {currentProblem && (
              <>
                <div className="is-problem-details">
                  <h2>{currentProblem.title}</h2>
                  <div className="is-problem-info">
                    <div className="is-problem-left">
                      <div className="is-problem-description">
                        <h3>Problem Description</h3>
                        <p>{currentProblem.description}</p>
                      </div>
                    </div>
                    <div className="is-problem-right">
                      <div className="is-problem-example">
                        <h3>Example</h3>
                        <div className="is-example-section">
                          <div className="is-input-section">
                            <strong>Input:</strong>
                            <code>{currentProblem.input}</code>
                          </div>
                          <div className="is-output-section">
                            <strong>#1 Test Output:</strong>
                            <code>{currentProblem.output}</code>
                          </div>
                        </div>
                      </div>
                      <div className="is-problem-reward">
                        <Trophy size={16} />
                        <span>{currentProblem.xp} XP</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="is-code-section">
                  {/* Code editor header */}
                  <div className="is-code-header">
                    <h3>Code Editor</h3>
                    <span className="is-language-badge">{currentProblem.language.toUpperCase()}</span>
                  </div>

                  {/* Warning / instruction */}
                  <div className="is-warning">
                    <TriangleAlert /> Paste the output for the given input
                  </div>

                  {/* Locked code editor */}
                  <textarea
                    value={currentProblem.samplecode}
                    readOnly
                    className="is-code-editor"
                  />

                  {/* Input section with copy button */}
                  <div className="is-input-copy-section">
                    <div className="is-input-copy-header">
                      <span className="is-input-copy-label">Test Cases Input</span>
                      <button className="is-copy-btn" onClick={handleCopyInput}>
                        {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy test cases</>}
                      </button>
                    </div>
                    <pre className="is-input-display">{testInput || '(loading...)'}</pre>
                  </div>

                  {/* Output input */}
                  <div className="is-output-submit-row">
                    <textarea
                      className="is-output-input"
                      placeholder="Paste the output result here..."
                      value={outputs[0] || ''}
                      onChange={e => setOutputs([e.target.value])}
                      disabled={submitting}
                      rows={3}
                    />
                    <button
                      className="is-submit-btn"
                      onClick={handleSubmit}
                      disabled={submitting || !outputs[0]?.trim()}
                    >
                      <Send size={16} />
                      {submitting ? 'Checking...' : 'Submit Result'}
                    </button>
                  </div>

                  {/* Result */}
                  {result && (
                    <div className={`is-result ${result.success ? 'success' : 'error'}`}>
                      <div className="is-result-message">
                        {result.success ? '✅' : '❌'} {result.message}
                      </div>
                      {result.xpGained > 0 && (
                        <div className="is-result-xp">+{result.xpGained} XP earned!</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
