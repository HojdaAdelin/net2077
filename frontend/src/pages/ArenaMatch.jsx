import { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { Clock, Trophy, Target, Flame } from 'lucide-react';
import '../styles/Arena.css';

export default function ArenaMatch() {
  const { matchId } = useParams();
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submittedAnswers, setSubmittedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);

  const handleFinishMatch = useCallback(async () => {
    if (showResults || !match) return;

    setShowResults(true);

    try {
      const response = await fetch(`${API_URL}/arena/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ matchId: match.matchId })
      });

      const data = await response.json();
      if (response.ok) {
        calculateResults(data.match);
        
        const isCreator = data.match.creator._id === user.id;
        const myScore = isCreator ? data.match.creatorScore : data.match.opponentScore;
        const opponentScore = isCreator ? data.match.opponentScore : data.match.creatorScore;
        
        let xpToAdd = 0;
        
        if (data.match.mode === 'bloody') {
          if (data.match.winner && data.match.winner._id === user.id) {
            xpToAdd = myScore + opponentScore;
          }
        } else {
          xpToAdd = myScore;
        }
        
        if (xpToAdd > 0) {
          updateUser({ 
            xp: user.xp + xpToAdd,
            level: Math.floor((user.xp + xpToAdd) / 100) + 1
          });
        }
      }
    } catch (error) {
      console.error('Error finishing match:', error);
    }
  }, [match, showResults, user, updateUser]);

  useEffect(() => {
    loadMatch();
  }, [matchId]);

  useEffect(() => {
    if (!match || !match.startedAt || showResults) return;

    const startTime = new Date(match.startedAt).getTime();
    const duration = match.duration * 1000;
    const endTime = startTime + duration;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0 && !showResults) {
        handleFinishMatch();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [match, showResults, handleFinishMatch]);

  const loadMatch = async () => {
    try {
      const response = await fetch(`${API_URL}/arena/${matchId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (response.ok) {
        setMatch(data.match);
        
        const isCreator = data.match.creator._id === user.id;
        const savedAnswers = isCreator ? data.match.creatorAnswers : data.match.opponentAnswers;
        
        if (savedAnswers && Object.keys(savedAnswers).length > 0) {
          const answersObj = {};
          const submittedObj = {};
          
          for (const [questionId, answers] of Object.entries(savedAnswers)) {
            answersObj[questionId] = answers;
            submittedObj[questionId] = true;
          }
          
          setSelectedAnswers(answersObj);
          setSubmittedAnswers(submittedObj);
        }
        
        if (data.match.status === 'finished') {
          setShowResults(true);
          calculateResults(data.match);
        }
      } else {
        navigate('/arena');
      }
    } catch (error) {
      console.error('Error loading match:', error);
      navigate('/arena');
    } finally {
      setLoading(false);
    }
  };

  const calculateResults = (matchData) => {
    const isCreator = matchData.creator._id === user.id;
    const myScore = isCreator ? matchData.creatorScore : matchData.opponentScore;
    const opponentScore = isCreator ? matchData.opponentScore : matchData.creatorScore;
    const opponentName = isCreator ? matchData.opponent?.username : matchData.creator.username;
    
    const won = myScore > opponentScore;
    const draw = myScore === opponentScore;

    setResults({
      myScore,
      opponentScore,
      opponentName,
      won,
      draw,
      mode: matchData.mode
    });
  };

  const handleAnswerSelect = (questionId, answerIndex, isMultiple) => {
    if (submittedAnswers[questionId]) return;

    if (isMultiple) {
      const current = selectedAnswers[questionId] || [];
      const newAnswers = current.includes(answerIndex)
        ? current.filter(idx => idx !== answerIndex)
        : [...current, answerIndex];
      
      setSelectedAnswers({
        ...selectedAnswers,
        [questionId]: newAnswers
      });
    } else {
      setSelectedAnswers({
        ...selectedAnswers,
        [questionId]: [answerIndex]
      });
    }
  };

  const handleSubmitQuestion = async () => {
    const currentQuestion = match.questions[currentIndex];
    const userAnswers = selectedAnswers[currentQuestion._id] || [];
    const correctAnswers = currentQuestion.correctAnswers || [currentQuestion.correctIndex];
    
    const isCorrect = 
      userAnswers.length === correctAnswers.length &&
      userAnswers.every(ans => correctAnswers.includes(ans));

    try {
      await fetch(`${API_URL}/arena/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          matchId: match.matchId,
          questionId: currentQuestion._id,
          answers: userAnswers
        })
      });

      setSubmittedAnswers({
        ...submittedAnswers,
        [currentQuestion._id]: isCorrect
      });

      setTimeout(() => {
        if (currentIndex < match.questions.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      }, 500);
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (loading) {
    return (
      <div className="container arena-match-page">
        <div className="loading">Loading match...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container arena-match-page">
        <div className="error">Match not found</div>
      </div>
    );
  }

  if (showResults && results) {
    return (
      <div className="container arena-match-page">
        <div className="arena-results">
          <h1>Match Complete!</h1>
          
          <div className="results-display">
            <div className="result-card">
              <span className="result-label">You</span>
              <span className="result-score">{results.myScore}</span>
            </div>
            <div className="result-vs">VS</div>
            <div className="result-card">
              <span className="result-label">{results.opponentName}</span>
              <span className="result-score">{results.opponentScore}</span>
            </div>
          </div>

          <div className={`result-message ${results.won ? 'victory' : results.draw ? 'draw' : 'defeat'}`}>
            {results.won ? (
              <>
                <Trophy size={48} />
                <h2>Victory!</h2>
                {results.mode === 'bloody' ? (
                  <p>You won and earned {results.myScore + results.opponentScore} XP!</p>
                ) : (
                  <p>You won and earned {results.myScore} XP!</p>
                )}
              </>
            ) : results.draw ? (
              <>
                <Target size={48} />
                <h2>Draw!</h2>
                <p>Both players scored equally. You earned {results.myScore} XP!</p>
              </>
            ) : (
              <>
                <Flame size={48} />
                <h2>Defeat</h2>
                {results.mode === 'bloody' ? (
                  <p>You lost and earned no XP.</p>
                ) : (
                  <p>You lost but still earned {results.myScore} XP!</p>
                )}
              </>
            )}
          </div>

          <div className="results-actions">
            <button onClick={() => navigate('/arena')} className="btn btn-primary">
              Back to Arena
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = match.questions[currentIndex];
  const isCreator = match.creator._id === user.id;
  const opponent = isCreator ? match.opponent : match.creator;
  const currentUserLevel = isCreator ? match.creator.level : match.opponent?.level;

  return (
    <div className="arena-match-page">
      <div className="arena-match-container">
        <div className="match-sidebar">
          <div className="match-timer">
            <Clock size={20} />
            <span className={`timer-value ${timeLeft <= 60 ? 'danger' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <div className="match-players">
            <div className="player-card">
              <span className="player-name">{user.username}</span>
              <span className="player-level">Lvl {currentUserLevel || user.level || '?'}</span>
            </div>
            <div className="vs-divider">VS</div>
            <div className="player-card">
              <span className="player-name">{opponent?.username || 'Waiting...'}</span>
              <span className="player-level">Lvl {opponent?.level || '?'}</span>
            </div>
          </div>

          <div className="match-info">
            <div className="info-item">
              <Target size={16} />
              <span>{match.category}</span>
            </div>
            <div className="info-item">
              <Trophy size={16} />
              <span>{match.questionCount} Questions</span>
            </div>
            <div className="info-item">
              <Flame size={16} />
              <span>{match.mode === 'bloody' ? 'Bloody' : 'Normal'}</span>
            </div>
          </div>

          <div className="arena-question-list">
            {match.questions.map((q, idx) => {
              const isAnswered = selectedAnswers[q._id] !== undefined;
              const isSubmitted = submittedAnswers[q._id] !== undefined;
              const isCorrect = submittedAnswers[q._id] === true;
              
              let btnClass = 'arena-question-nav-btn';
              if (idx === currentIndex) btnClass += ' active';
              
              if (isSubmitted) {
                if (isCorrect) {
                  btnClass += ' correct';
                } else {
                  btnClass += ' incorrect';
                }
              } else if (isAnswered) {
                btnClass += ' answered';
              }
              
              return (
                <button
                  key={q._id}
                  className={btnClass}
                  onClick={() => setCurrentIndex(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="match-content">
          <div className="question-card">
            <div className="question-header">
              <span className="question-number">Question {currentIndex + 1}</span>
              <div className="question-meta">
                <span className="question-type">{currentQuestion.type}</span>
                <span className="question-points">{currentQuestion.points || 1} points</span>
              </div>
            </div>

            {currentQuestion.tags && currentQuestion.tags.length > 0 && (
              <div className="arena-question-tags">
                {currentQuestion.tags.map((tag, idx) => (
                  <span key={idx} className="arena-question-tag">{tag}</span>
                ))}
              </div>
            )}
            
            <h2 className="arena-question-title">{currentQuestion.title}</h2>

            {currentQuestion.multipleCorrect && (
              <div className="arena-question-hint">
                Select all correct answers
              </div>
            )}

            <div className="arena-answers-list">
              {currentQuestion.answers.map((answer, idx) => {
                const userAnswers = selectedAnswers[currentQuestion._id] || [];
                const isSelected = userAnswers.includes(idx);
                const isSubmitted = submittedAnswers[currentQuestion._id] !== undefined;
                const correctAnswers = currentQuestion.correctAnswers || [currentQuestion.correctIndex];
                const isCorrectAnswer = correctAnswers.includes(idx);
                
                let answerClass = 'arena-answer-option';
                if (isSelected) answerClass += ' selected';
                if (currentQuestion.multipleCorrect) answerClass += ' multiple';
                
                if (isSubmitted) {
                  if (isCorrectAnswer) answerClass += ' correct';
                  if (isSelected && !isCorrectAnswer) answerClass += ' incorrect';
                }
                
                return (
                  <button
                    key={idx}
                    className={answerClass}
                    onClick={() => !isSubmitted && handleAnswerSelect(currentQuestion._id, idx, currentQuestion.multipleCorrect)}
                    disabled={isSubmitted}
                  >
                    <span className="arena-answer-letter">{String.fromCharCode(65 + idx)}</span>
                    <span className="arena-answer-text">{answer}</span>
                    {currentQuestion.multipleCorrect && (
                      <span className="arena-answer-checkbox">
                        {isSelected && '✓'}
                      </span>
                    )}
                    {isSubmitted && isCorrectAnswer && (
                      <span className="arena-answer-indicator">✓</span>
                    )}
                    {isSubmitted && isSelected && !isCorrectAnswer && (
                      <span className="arena-answer-indicator">✗</span>
                    )}
                  </button>
                );
              })}
            </div>

            {!submittedAnswers[currentQuestion._id] && (
              <button 
                onClick={handleSubmitQuestion}
                className="btn btn-primary"
                disabled={
                  !selectedAnswers[currentQuestion._id] || 
                  selectedAnswers[currentQuestion._id].length === 0
                }
                style={{ marginTop: '24px', width: '100%' }}
              >
                Submit Answer
              </button>
            )}

            <div className="arena-quiz-actions">
              <button 
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} 
                disabled={currentIndex === 0}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentIndex(Math.min(match.questions.length - 1, currentIndex + 1))} 
                disabled={currentIndex === match.questions.length - 1}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
