import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import { CheckCircle, Lock, Unlock, X, Terminal as TerminalIcon } from 'lucide-react';
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
  const [showUnsolvedOnly, setShowUnsolvedOnly] = useState(false);
  const [showAnswersModal, setShowAnswersModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const terminalInputRef = useRef(null);

  useEffect(() => {
    fetchQuestions();
    if (user) {
      fetchUserProgress();
    }
  }, [user]);

  useEffect(() => {
    // Filter questions based on difficulty and unsolved status
    let filtered = questions;
    
    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(q => q.difficulty === difficultyFilter);
    }
    
    // Apply unsolved filter
    if (showUnsolvedOnly) {
      filtered = filtered.filter(q => !isQuestionSolved(q._id));
    }
    
    setFilteredQuestions(filtered);
    
    // Always set a current question if filtered list has items
    if (filtered.length > 0) {
      // If current question is not in filtered list, select first one
      if (!currentQuestion || !filtered.find(q => q._id === currentQuestion._id)) {
        setCurrentQuestion(filtered[0]);
        setTerminalHistory([]);
        setCommand('');
      }
    } else {
      // No questions match the filter
      setCurrentQuestion(null);
      setTerminalHistory([]);
      setCommand('');
    }
  }, [questions, difficultyFilter, showUnsolvedOnly, userProgress]);

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

  const handleShowAnswers = () => {
    setShowConfirmModal(true);
  };

  const confirmShowAnswers = () => {
    setShowConfirmModal(false);
    setShowAnswersModal(true);
  };

  const closeAnswersModal = () => {
    setShowAnswersModal(false);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
  };

  // Prevent copying in modals
  const handleModalKeyDown = (e) => {
    // Prevent Ctrl+C, Ctrl+A, Ctrl+V, etc.
    if (e.ctrlKey && (e.key === 'c' || e.key === 'a' || e.key === 'v' || e.key === 'x')) {
      e.preventDefault();
      return false;
    }
    // Prevent F12, Ctrl+Shift+I, Ctrl+U
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.key === 'u')) {
      e.preventDefault();
      return false;
    }
  };

  const handleModalContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  const handleModalSelectStart = (e) => {
    e.preventDefault();
    return false;
  };

  const handleModalDragStart = (e) => {
    e.preventDefault();
    return false;
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
              
              <div className="terminal-unsolved-filter">
                <label className="terminal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={showUnsolvedOnly}
                    onChange={(e) => setShowUnsolvedOnly(e.target.checked)}
                    className="terminal-checkbox"
                  />
                  <span>Show Unsolved Only</span>
                </label>
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
                    {isQuestionSolved(question._id) && <CheckCircle size={16} className="terminal-solved-indicator" />}
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
            {currentQuestion ? (
              <>
                <div className="terminal-question-header">
                  <div className="terminal-question-info">
                    <h2>{currentQuestion.title}</h2>
                    <p>{currentQuestion.description}</p>
                    <div className="terminal-question-meta">
                      <span className={`terminal-difficulty ${currentQuestion.difficulty}`}>{currentQuestion.difficulty}</span>
                      <span className="terminal-points">{currentQuestion.points} points</span>
                    </div>
                  </div>
                  
                  <div className="terminal-answers-section">
                    {isQuestionSolved(currentQuestion._id) ? (
                      <div className="terminal-accepted-commands">
                        <h3><CheckCircle size={16} /> Accepted Commands</h3>
                        <div className="terminal-commands-list">
                          {currentQuestion.acceptedCommands.slice(0, 3).map((cmd, index) => (
                            <div key={index} className="terminal-command-item">
                              <code>{cmd}</code>
                            </div>
                          ))}
                          {currentQuestion.acceptedCommands.length > 3 && (
                            <div className="terminal-more-commands">
                              +{currentQuestion.acceptedCommands.length - 3} more commands
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="terminal-locked-answers">
                        <h3><Lock size={16} /> Solution</h3>
                        <p>Complete this question to see accepted commands</p>
                        <button 
                          className="terminal-unlock-btn"
                          onClick={handleShowAnswers}
                          title="Click to reveal solution"
                        >
                          <Unlock size={14} /> Show Answers
                        </button>
                      </div>
                    )}
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
                        <CheckCircle size={16} /> Question completed! Great job!
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="terminal-no-questions">
                <TerminalIcon size={64} />
                <h3>No questions match your filters</h3>
                <p>Try adjusting your difficulty or unsolved filters to see more questions.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal pentru confirmarea afișării răspunsurilor */}
        {showConfirmModal && (
          <div className="terminal-modal-overlay" onClick={closeConfirmModal}>
            <div className="terminal-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="terminal-modal-header">
                <h3><Lock size={20} /> Reveal Solution</h3>
                <button className="terminal-modal-close" onClick={closeConfirmModal}>
                  <X size={20} />
                </button>
              </div>
              <div className="terminal-modal-body">
                <p>Are you sure you want to see the accepted commands? This will reveal the solution for this question.</p>
                <div className="terminal-confirm-buttons">
                  <button className="terminal-btn-cancel" onClick={closeConfirmModal}>
                    Cancel
                  </button>
                  <button className="terminal-btn-confirm" onClick={confirmShowAnswers}>
                    <Unlock size={16} /> Show Solution
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal pentru afișarea răspunsurilor */}
        {showAnswersModal && currentQuestion && (
          <div className="terminal-modal-overlay" onClick={closeAnswersModal}>
            <div 
              className="terminal-modal" 
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleModalKeyDown}
              onContextMenu={handleModalContextMenu}
              onSelectStart={handleModalSelectStart}
              onDragStart={handleModalDragStart}
              tabIndex={-1}
            >
              <div className="terminal-modal-header">
                <h3><TerminalIcon size={20} /> Accepted Commands: {currentQuestion.title}</h3>
                <button className="terminal-modal-close" onClick={closeAnswersModal}>
                  <X size={20} />
                </button>
              </div>
              <div 
                className="terminal-modal-body"
                onKeyDown={handleModalKeyDown}
                onContextMenu={handleModalContextMenu}
                onSelectStart={handleModalSelectStart}
                onDragStart={handleModalDragStart}
              >
                <div className="terminal-commands-list">
                  {currentQuestion.acceptedCommands.map((cmd, index) => (
                    <div 
                      key={index} 
                      className="terminal-command-item"
                      onKeyDown={handleModalKeyDown}
                      onContextMenu={handleModalContextMenu}
                      onSelectStart={handleModalSelectStart}
                      onDragStart={handleModalDragStart}
                    >
                      <code>{cmd}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}