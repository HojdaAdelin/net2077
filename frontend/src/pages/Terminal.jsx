import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import '../styles/Terminal.css';

export default function Terminal() {
  const { user, updateUser } = useContext(AuthContext);
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userProgress, setUserProgress] = useState({ solved: [], totalSolved: 0, totalQuestions: 0, totalPoints: 0 });
  const [command, setCommand] = useState('');
  const [terminalHistory, setTerminalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const terminalInputRef = useRef(null);

  useEffect(() => {
    fetchQuestions();
    if (user) {
      fetchUserProgress();
    }
  }, [user]);

  useEffect(() => {
    // Filter questions based on difficulty
    let filtered = questions;
    if (difficultyFilter !== 'all') {
      filtered = questions.filter(q => q.difficulty === difficultyFilter);
    }
    setFilteredQuestions(filtered);
    
    // Update current question if it's not in filtered list
    if (currentQuestion && !filtered.find(q => q._id === currentQuestion._id)) {
      setCurrentQuestion(filtered.length > 0 ? filtered[0] : null);
      setTerminalHistory([]);
      setCommand('');
    }
  }, [questions, difficultyFilter, currentQuestion]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`${API_URL}/terminal`);
      const data = await response.json();
      setQuestions(data);
      setFilteredQuestions(data); // Initialize filtered questions
      if (data.length > 0) {
        setCurrentQuestion(data[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching terminal questions:', error);
      setLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    try {
      const response = await fetch(`${API_URL}/terminal/progress`, {
        credentials: 'include'
      });
      const data = await response.json();
      setUserProgress(data);
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  const handleQuestionSelect = (question) => {
    setCurrentQuestion(question);
    setTerminalHistory([]);
    setCommand('');
    if (terminalInputRef.current) {
      terminalInputRef.current.focus();
    }
  };

  const handleCommandSubmit = async (e) => {
    e.preventDefault();
    if (!command.trim() || !currentQuestion || !user) return;

    const newHistoryEntry = {
      command: command.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setTerminalHistory(prev => [...prev, newHistoryEntry]);

    try {
      const response = await fetch(`${API_URL}/terminal/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          questionId: currentQuestion._id,
          command: command.trim()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setTerminalHistory(prev => [...prev, {
          output: `✅ ${result.message} (+${result.points} points)`,
          timestamp: new Date().toLocaleTimeString(),
          success: true
        }]);
        
        // Update user XP and level in context
        if (result.xp !== undefined && result.level !== undefined) {
          updateUser({ 
            xp: result.xp, 
            level: result.level,
            streak: result.streak 
          });
        }
        
        // Update user progress
        await fetchUserProgress();
        
        // Move to next question after 500ms
        setTimeout(() => {
          const currentIndex = filteredQuestions.findIndex(q => q._id === currentQuestion._id);
          const nextQuestion = filteredQuestions[currentIndex + 1];
          if (nextQuestion && !userProgress.solved.some(s => s._id === nextQuestion._id)) {
            handleQuestionSelect(nextQuestion);
          }
        }, 500);
      } else {
        setTerminalHistory(prev => [...prev, {
          output: `❌ ${result.message}`,
          timestamp: new Date().toLocaleTimeString(),
          success: false
        }]);
      }
    } catch (error) {
      console.error('Error submitting command:', error);
      setTerminalHistory(prev => [...prev, {
        output: '❌ Error submitting command',
        timestamp: new Date().toLocaleTimeString(),
        success: false
      }]);
    }

    setCommand('');
  };

  const isQuestionSolved = (questionId) => {
    return userProgress.solved.some(solved => solved._id === questionId);
  };

  if (!user) {
    return (
      <div className="terminal-page">
        <div className="container">
          <div className="terminal-auth-notice">
            <h2>Login Required</h2>
            <p>Please login to access the Terminal practice environment.</p>
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
      <div className="terminal-page">
        <div className="container">
          <div className="terminal-loading">Loading terminal questions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-page">
      <div className="container">
        <div className="terminal-header">
          <h1>Terminal Practice</h1>
          <p>Practice Linux commands in a simulated terminal environment</p>
        </div>

        <div className="terminal-content">
          <div className="terminal-sidebar">
            <div className="terminal-difficulty-filter">
              <h3>Filter by Difficulty</h3>
              <div className="terminal-filter-buttons">
                <button 
                  className={`terminal-filter-btn ${difficultyFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setDifficultyFilter('all')}
                >
                  All
                </button>
                <button 
                  className={`terminal-filter-btn ${difficultyFilter === 'easy' ? 'active' : ''}`}
                  onClick={() => setDifficultyFilter('easy')}
                >
                  Easy
                </button>
                <button 
                  className={`terminal-filter-btn ${difficultyFilter === 'medium' ? 'active' : ''}`}
                  onClick={() => setDifficultyFilter('medium')}
                >
                  Medium
                </button>
                <button 
                  className={`terminal-filter-btn ${difficultyFilter === 'hard' ? 'active' : ''}`}
                  onClick={() => setDifficultyFilter('hard')}
                >
                  Hard
                </button>
              </div>
            </div>

            <div className="terminal-questions-list">
              <h3>Questions ({filteredQuestions.length})</h3>
              <div className="terminal-questions-scroll">
                {filteredQuestions.map((question, index) => (
                  <div
                    key={question._id}
                    className={`terminal-question-item ${currentQuestion?._id === question._id ? 'active' : ''} ${isQuestionSolved(question._id) ? 'solved' : ''}`}
                    onClick={() => handleQuestionSelect(question)}
                  >
                    <span className="terminal-question-number">{index + 1}</span>
                    <span className="terminal-question-title">{question.title}</span>
                    {isQuestionSolved(question._id) && <span className="terminal-solved-indicator">✓</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="terminal-progress-stats">
              <h3>Progress</h3>
              <div className="terminal-stat-item">
                <span>Solved:</span>
                <span>{userProgress.totalSolved}/{userProgress.totalQuestions}</span>
              </div>
            </div>
          </div>

          <div className="terminal-main">
            {currentQuestion && (
              <>
                <div className="terminal-question-header">
                  <h2>{currentQuestion.title}</h2>
                  <p>{currentQuestion.description}</p>
                  <div className="terminal-question-meta">
                    <span className={`terminal-difficulty ${currentQuestion.difficulty}`}>{currentQuestion.difficulty}</span>
                    <span className="terminal-points">{currentQuestion.points} points</span>
                  </div>
                </div>

                <div className="terminal-container">
                  <div className="terminal-header-bar">
                    <div className="terminal-buttons">
                      <span className="terminal-button close"></span>
                      <span className="terminal-button minimize"></span>
                      <span className="terminal-button maximize"></span>
                    </div>
                    <div className="terminal-title">user@net2077: ~</div>
                  </div>

                  <div className="terminal-body">
                    <div className="terminal-input-section">
                      <form onSubmit={handleCommandSubmit} className="terminal-input-form">
                        <div className="terminal-input-line">
                          <span className="terminal-prompt">user@net2077:~$ </span>
                          <input
                            ref={terminalInputRef}
                            type="text"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            className="terminal-input"
                            placeholder="Enter your command..."
                            autoFocus
                            disabled={isQuestionSolved(currentQuestion._id)}
                          />
                        </div>
                      </form>
                    </div>

                    <div className="terminal-history">
                      {terminalHistory.map((entry, index) => (
                        <div key={index} className="terminal-entry">
                          {entry.command && (
                            <div className="terminal-command">
                              <span className="terminal-prompt">user@net2077:~$ </span>
                              <span>{entry.command}</span>
                            </div>
                          )}
                          {entry.output && (
                            <div className={`terminal-output ${entry.success ? 'success' : 'error'}`}>
                              {entry.output}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {isQuestionSolved(currentQuestion._id) && (
                      <div className="terminal-question-completed">
                        ✅ Question completed! Great job!
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}