import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import { CheckCircle, Code, Trophy, Play } from 'lucide-react';
import '../styles/IS.css';

export default function IS() {
  const { user, updateUser } = useContext(AuthContext);
  const [problems, setProblems] = useState([]);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (user) {
      fetchProblems();
    }
  }, [user]);

  const fetchProblems = async () => {
    try {
      const response = await fetch(`${API_URL}/is`, {
        credentials: 'include'
      });
      const data = await response.json();
      setProblems(data);
      if (data.length > 0) {
        setCurrentProblem(data[0]);
        setCode(data[0].samplecode);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching IS problems:', error);
      setLoading(false);
    }
  };

  const handleProblemSelect = (problem) => {
    setCurrentProblem(problem);
    setCode(problem.samplecode);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!currentProblem || !code.trim()) return;
    
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/is/${currentProblem._id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ code })
      });

      const data = await response.json();
      setResult(data);

      if (data.success && data.xpGained > 0) {
        // Update user context
        updateUser({
          xp: data.newXP,
          level: data.newLevel
        });
        
        // Refresh problems to update completion status
        await fetchProblems();
      }
    } catch (error) {
      console.error('Error submitting code:', error);
      setResult({
        success: false,
        message: 'Error submitting code. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="is-page">
        <div className="is-container">
          <div className="is-auth-notice">
            <h2>Login Required</h2>
            <p>Please login to access the IS/Debug environment.</p>
            <Link to="/login" className="btn btn-primary">
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="is-header">
          <h1>IS/Debug</h1>
        </div>

        <div className="is-content">
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
                    <span className="is-problem-xp">
                      <Trophy size={14} />
                      {problem.xp} XP
                    </span>
                    <span className="is-problem-lang">
                      <Code size={14} />
                      {problem.language.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                            <strong>Output:</strong>
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
                  <div className="is-code-header">
                    <h3>Code Editor</h3>
                    <span className="is-language-badge">{currentProblem.language.toUpperCase()}</span>
                  </div>
                  
                  <div className="is-warning">
                    ⚠️ Modify only the error in the code and don't change anything else
                  </div>
                  
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="is-code-editor"
                    placeholder="Write your code here..."
                    disabled={submitting}
                  />

                  <div className="is-submit-section">
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !code.trim()}
                      className="is-submit-btn"
                    >
                      <Play size={16} />
                      {submitting ? 'Submitting...' : 'Submit Solution'}
                    </button>
                  </div>

                  {result && (
                    <div className={`is-result ${result.success ? 'success' : 'error'}`}>
                      <div className="is-result-message">
                        {result.success ? '✅' : '❌'} {result.message}
                      </div>
                      {result.xpGained > 0 && (
                        <div className="is-result-xp">
                          +{result.xpGained} XP earned!
                        </div>
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