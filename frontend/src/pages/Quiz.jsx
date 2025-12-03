import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import '../styles/Quiz.css';

const API_BASE = '/api';
const DEFAULT_EXAM_DURATION_MIN = 60;
const getExamStorageKey = (examId) => `exam_state_${examId}`;

export default function Quiz({ isExam = false }) {
  const { type, mode, examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); 
  const [submittedAnswers, setSubmittedAnswers] = useState({}); 
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [examMeta, setExamMeta] = useState(null);
  const [error, setError] = useState(null);
  const [examStarted, setExamStarted] = useState(!isExam);
  const [timeLeft, setTimeLeft] = useState(null);
  const [finishReason, setFinishReason] = useState(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [lockedQuestions, setLockedQuestions] = useState({});

  useEffect(() => {
    loadQuestions();
  }, [type, mode, examId, isExam, location.search]);

  useEffect(() => {
    if (isExam) {
      setExamStarted(false);
      setFinishReason(null);
      setTimeSpent(0);
      setLockedQuestions({});
    } else {
      setExamStarted(true);
    }
  }, [isExam, examId]);

  const examDurationMinutes = isExam ? (examMeta?.duration || DEFAULT_EXAM_DURATION_MIN) : null;
  const examDurationSeconds = examDurationMinutes ? examDurationMinutes * 60 : null;

  useEffect(() => {
    if (!isExam || !examMeta || !examDurationSeconds || !examStarted) return;
    if (timeLeft !== null) return;
    setTimeLeft(examDurationSeconds);
  }, [isExam, examMeta, examDurationSeconds, timeLeft, examStarted]);

  const handleFinishExam = useCallback((reason = 'manual') => {
    if (showResults) return;

    if (isExam) {
      

        let score = 0;
        let totalPoints = 0;
        let correctAnswers = 0;
        
        questions.forEach((q) => {
          totalPoints += q.points || 1;
          const qUserAnswers = selectedAnswers[q._id] || [];
          const qCorrectAnswers = q.correctAnswers || [q.correctIndex];
          
          if (
            qUserAnswers.length === qCorrectAnswers.length &&
            qUserAnswers.every(ans => qCorrectAnswers.includes(ans))
          ) {
            score += q.points || 1;
            correctAnswers += 1;
          }
        });

        fetch(`${API_BASE}/progress/addSimulation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ 
            examId: examId,
            examTitle: examMeta?.title || 'Unknown Exam',
            examTag: examMeta?.tag || '',
            score, 
            totalPoints,
            correctAnswers,
            totalQuestions: questions.length
          })
        }).catch(error => console.error('Error saving simulation:', error));

      /* Simulation logic */
      setFinishReason(reason);
      setExamStarted(false);
      const duration = examDurationSeconds ?? 0;
      const elapsed = duration - (timeLeft ?? duration);
      setTimeSpent(Math.max(0, elapsed));
    }

    setShowResults(true);
  }, [examDurationSeconds, isExam, showResults, timeLeft]);

  useEffect(() => {
    if (!isExam || !examStarted || showResults) return;

    if (timeLeft === 0) {
      handleFinishExam('time');
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(interval);
          handleFinishExam('time');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [handleFinishExam, isExam, examStarted, showResults, timeLeft]);

  useEffect(() => {
    if (!isExam || !examId || !questions.length) return;
    const payload = {
      examStarted,
      timeLeft,
      selectedAnswers,
      submittedAnswers,
      lockedQuestions,
      currentIndex,
      showResults,
      finishReason,
      timeSpent,
      lastSavedAt: Date.now()
    };
    localStorage.setItem(getExamStorageKey(examId), JSON.stringify(payload));
  }, [
    isExam,
    examId,
    questions.length,
    examStarted,
    timeLeft,
    selectedAnswers,
    submittedAnswers,
    lockedQuestions,
    currentIndex,
    showResults,
    finishReason,
    timeSpent
  ]);

  const loadQuestions = async () => {
    setLoading(true);
    setError(null);
    setSelectedAnswers({});
    setSubmittedAnswers({});
    let fetchedExamMeta = null;
    try {
      const urlParams = new URLSearchParams(location.search);
      const tagsParam = urlParams.get('tags');
      const queryType = urlParams.get('type') || type;

      let data = [];
      let tagsFilter = tagsParam;

      if (isExam) {
        if (!examId) {
          throw new Error('Missing exam identifier');
        }

        const examResponse = await fetch(`${API_BASE}/exams/${examId}`);
        if (!examResponse.ok) {
          throw new Error('Exam not found or unavailable');
        }

        const examData = await examResponse.json();
        fetchedExamMeta = examData;
        setExamMeta(examData);

        if (examData.tag) {
          tagsFilter = examData.tag;
        }

        const questionsResponse = await fetch(
          `${API_BASE}/questions${tagsFilter ? `?tags=${encodeURIComponent(tagsFilter)}` : ''}`
        );

        if (!questionsResponse.ok) {
          throw new Error('Unable to load exam questions');
        }

        data = await questionsResponse.json();
      } else {
        setExamMeta(null);

        if (mode === 'random') {
          const params = new URLSearchParams();
          if (queryType) params.append('type', queryType);
          if (tagsParam) params.append('tags', tagsParam);
          const queryString = params.toString() ? `?${params.toString()}` : '';
          const response = await fetch(`${API_BASE}/questions/random50${queryString}`);
          data = await response.json();
        } else if (mode === 'unsolved') {
          const response = await fetch(`${API_BASE}/questions/unsolved`, {
            credentials: 'include'
          });
          data = await response.json();
        } else {
          const response = await fetch(`${API_BASE}/questions`);
          data = await response.json();
        }
      }

      let filtered = data;
      if (!isExam) {
        if (queryType === 'basic') {
          filtered = filtered.filter(q => q.type === 'basic');
        } else if (queryType === 'all') {
          filtered = filtered.filter(q => q.type === 'all');
        } else if (queryType === 'acadnet') {
          filtered = filtered.filter(q => q.type === 'acadnet');
        }
      }

      // Filter by tags
      if (!isExam && tagsFilter) {
        filtered = filtered.filter(q => q.tags && q.tags.includes(tagsFilter));
      } else if (isExam && tagsFilter) {
        filtered = filtered.filter(q => q.tags && q.tags.includes(tagsFilter));
      }

      let restoredState = null;
      if (isExam && examId) {
        const stored = localStorage.getItem(getExamStorageKey(examId));
        if (stored) {
          try {
            restoredState = JSON.parse(stored);
          } catch (err) {
            console.warn('Unable to parse stored exam state', err);
          }
        }
      }

      if (isExam) {
        const currentMeta = fetchedExamMeta || examMeta;
        const durationMinutes = currentMeta?.duration || DEFAULT_EXAM_DURATION_MIN;
        const durationSeconds = durationMinutes * 60;

        const validIds = new Set(filtered.map(q => q._id));
        const sanitizeMap = (map = {}) => Object.fromEntries(
          Object.entries(map || {}).filter(([id]) => validIds.has(id))
        );

        let initialSelected = sanitizeMap(restoredState?.selectedAnswers || {});
        let initialSubmitted = sanitizeMap(restoredState?.submittedAnswers || {});
        let initialLocked = sanitizeMap(restoredState?.lockedQuestions || {});
        let initialCurrentIndex = restoredState?.currentIndex || 0;
        if (!filtered[initialCurrentIndex]) {
          initialCurrentIndex = 0;
        }

        let adjustedTimeLeft = restoredState?.timeLeft ?? durationSeconds;
        if (
          restoredState?.lastSavedAt &&
          restoredState?.timeLeft !== null &&
          restoredState?.timeLeft !== undefined
        ) {
          const elapsed = Math.floor((Date.now() - restoredState.lastSavedAt) / 1000);
          adjustedTimeLeft = Math.max(0, restoredState.timeLeft - elapsed);
        }

        const autoFinished = restoredState?.examStarted && !restoredState?.showResults && adjustedTimeLeft === 0;
        const wasExamStarted = restoredState?.examStarted || false;

        setExamStarted(autoFinished ? false : wasExamStarted);
        setSelectedAnswers(initialSelected);
        setSubmittedAnswers(initialSubmitted);
        setLockedQuestions(initialLocked);
        setCurrentIndex(initialCurrentIndex);
        
        if (wasExamStarted || autoFinished) {
          setTimeLeft(adjustedTimeLeft);
        }
        setShowResults(autoFinished ? true : (restoredState?.showResults || false));
        setFinishReason(autoFinished ? 'time' : (restoredState?.finishReason || null));
        setTimeSpent(autoFinished ? durationSeconds : (restoredState?.timeSpent || 0));

        setExamMeta(prev => {
          const base = prev || currentMeta || {};
          return { ...base, questionCount: filtered.length };
        });
      } else if (mode !== 'random') {
        
        let prefilledSelected = {};
        let prefilledSubmitted = {};
        try {
          const progressRes = await fetch(`${API_BASE}/progress/user`, {
            credentials: 'include'
          });

          if (progressRes.ok) {
            const progressData = await progressRes.json();
            const solvedSet = new Set(
              (progressData.solvedQuestions || []).map(entry =>
                typeof entry === 'string' ? entry : entry.id
              )
            );

            filtered.forEach(question => {
              if (solvedSet.has(question._id)) {
                prefilledSubmitted[question._id] = true;
                const correctAnswers = question.correctAnswers && question.correctAnswers.length > 0
                  ? [...question.correctAnswers]
                  : (question.correctIndex !== undefined ? [question.correctIndex] : []);

                if (correctAnswers.length > 0) {
                  prefilledSelected[question._id] = correctAnswers;
                }
              }
            });
          }
        } catch (progressError) {
          console.warn('Unable to preload solved questions:', progressError);
        }

        setSelectedAnswers(prefilledSelected);
        setSubmittedAnswers(prefilledSubmitted);
      }

      console.log('Filtered questions:', {
        total: data.length,
        filtered: filtered.length,
        type: queryType,
        tags: tagsFilter
      });

      setQuestions(filtered);
    } catch (error) {
      console.error('Error loading questions:', error);
      setError(error.message || 'An unexpected error occurred while loading questions.');
    }
    setLoading(false);
  };

  const clearStoredExamState = useCallback(() => {
    if (isExam && examId) {
      localStorage.removeItem(getExamStorageKey(examId));
    }
  }, [isExam, examId]);

  const handleStartExam = () => {
    if (!isExam) return;
    setExamStarted(true);
    setShowResults(false);
    setFinishReason(null);
    setTimeSpent(0);
    setLockedQuestions({});
    setSelectedAnswers({});
    setSubmittedAnswers({});
    setCurrentIndex(0);
    setTimeLeft(examDurationSeconds || DEFAULT_EXAM_DURATION_MIN * 60);
  };

  const handleRestartExam = () => {
    if (!isExam) {
      window.location.reload();
      return;
    }
    clearStoredExamState();
    setExamStarted(false);
    setShowResults(false);
    setFinishReason(null);
    setTimeSpent(0);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setSubmittedAnswers({});
    setLockedQuestions({});
    setTimeLeft(examDurationSeconds || DEFAULT_EXAM_DURATION_MIN * 60);
    loadQuestions();
  };

  const handleExitExam = () => {
    if (isExam) {
      clearStoredExamState();
      navigate('/exam-selection');
    } else {
      navigate('/grile');
    }
  };

  const handleAnswerSelect = (questionId, answerIndex, isMultiple) => {
    if (isExam && !examStarted) return;

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

  const handleNext = () => {
    if (isExam && !examStarted) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (isExam && !examStarted) return;
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmitQuestion = async () => {
    const currentQuestion = questions[currentIndex];
    const userAnswers = selectedAnswers[currentQuestion._id] || [];
    const correctAnswers = currentQuestion.correctAnswers || [currentQuestion.correctIndex];


    const isCorrect = 
      userAnswers.length === correctAnswers.length &&
      userAnswers.every(ans => correctAnswers.includes(ans));

    setSubmittedAnswers(prev => {
      const updated = {
        ...prev,
        [currentQuestion._id]: isCorrect
      };
      
      return updated;
    });

    if (isExam && !isCorrect) {
      setLockedQuestions(prev => ({
        ...prev,
        [currentQuestion._id]: true
      }));
    }
    if (!isExam && isCorrect) {
      try {
        await fetch(`${API_BASE}/questions/markSolved`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ questionId: currentQuestion._id })
        });
        console.log('Progress saved for question:', currentQuestion._id);
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    }
  };

  const handleSubmitAll = () => {
    handleFinishExam('manual');
  };

  const calculateScore = () => {
    let totalPoints = 0;
    let maxPoints = 0;

    questions.forEach((q) => {
      maxPoints += q.points || 1;
      const userAnswers = selectedAnswers[q._id] || [];
      const correctAnswers = q.correctAnswers || [q.correctIndex];


      if (
        userAnswers.length === correctAnswers.length &&
        userAnswers.every(ans => correctAnswers.includes(ans))
      ) {
        totalPoints += q.points || 1;
      }
    });

    return { totalPoints, maxPoints };
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (loading) {
    return (
      <div className="container quiz-page">
        <div className="loading">Loading questions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container quiz-page">
        <div className="empty-quiz">
          <h2>{error}</h2>
          <button onClick={isExam ? handleExitExam : () => navigate('/grile')} className="btn btn-primary">
            {isExam ? 'Back to Exams' : 'Back to Questions'}
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="container quiz-page">
        <div className="empty-quiz">
          <h2>No questions available</h2>
          <button onClick={isExam ? handleExitExam : () => navigate('/grile')} className="btn btn-primary">
            {isExam ? 'Back to Exams' : 'Back to Questions'}
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const { totalPoints, maxPoints } = calculateScore();
  const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
  const totalExamQuestions = examMeta?.questionCount || questions.length;
  const answeredCount = Object.keys(submittedAnswers).length;

  if (showResults) {
    return (
      <div className="container quiz-page">
        <div className="quiz-results">
          <h1>{isExam ? 'Exam Complete!' : 'Quiz Complete!'}</h1>
          <div className="results-score">
            <div className="score-circle">
              <span className="score-value">{percentage}%</span>
            </div>
            <div className="score-details">
              <p>{totalPoints} / {maxPoints} points</p>
            </div>
          </div>
          {isExam && (
            <div className="exam-results-meta">
              <div className="exam-results-item">
                <span className="meta-label">Time spent</span>
                <span className="meta-value">{formatTime(timeSpent)}</span>
              </div>
              <div className="exam-results-item">
                <span className="meta-label">Completion</span>
                <span className="meta-value">
                  {finishReason === 'time' ? 'Time expired' : 'Completed'}
                </span>
              </div>
              <div className="exam-results-item">
                <span className="meta-label">Questions answered</span>
                <span className="meta-value">{answeredCount} / {questions.length}</span>
              </div>
            </div>
          )}
          <div className="results-actions">
            <button onClick={handleExitExam} className="btn btn-secondary">
              {isExam ? 'Back to Exams' : 'Back to Questions'}
            </button>
            <button onClick={handleRestartExam} className="btn btn-primary">
              {isExam ? 'Restart Exam' : 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <div className="quiz-container">
        <div className="quiz-sidebar">
          {isExam && (
            <div className="exam-timer">
              <p>Time Remaining</p>
              <span className={`timer-value ${timeLeft !== null && timeLeft <= 60 ? 'danger' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
          <div className="quiz-progress">
            <h3>Progress</h3>
            <div className="progress-info">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>{Object.keys(selectedAnswers).length} answered</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="question-list">
            {questions.map((q, idx) => {
              const isAnswered = selectedAnswers[q._id] !== undefined;
              const isSubmitted = submittedAnswers[q._id] !== undefined;
              const isCorrect = submittedAnswers[q._id] === true;
              const isLocked = lockedQuestions[q._id];
              const disabledNav = isExam && (!examStarted || (isLocked && idx !== currentIndex));
              
              let btnClass = 'question-nav-btn';
              if (idx === currentIndex) btnClass += ' active';
              if (isSubmitted && isCorrect) btnClass += ' correct';
              if (isSubmitted && !isCorrect) btnClass += ' incorrect';
              if (isAnswered && !isSubmitted) btnClass += ' answered';
              if (disabledNav) btnClass += ' disabled';
              
              return (
                <button
                  key={q._id}
                  className={btnClass}
                  disabled={disabledNav}
                  onClick={() => !disabledNav && setCurrentIndex(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="quiz-actions">
            <button 
              onClick={handlePrevious} 
              disabled={currentIndex === 0}
              className="btn btn-secondary"
            >
              Previous
            </button>
            <button onClick={handleNext} className="btn btn-secondary" disabled={currentIndex === questions.length - 1}>
              Next
            </button>
          </div>

          <button 
            onClick={handleSubmitAll} 
            className="btn btn-primary"
            style={{ marginTop: '16px', width: '100%' }}
            disabled={isExam && !examStarted}
          >
            {isExam ? 'Submit Exam' : 'Finish Quiz'}
          </button>
        </div>

        <div className="quiz-content">
          {isExam && examMeta && (
            <div className="exam-banner">
              <div className="exam-banner-header">
                <div>
                  <p className="exam-banner-phase">{examMeta.phase} phase</p>
                  <h2>{examMeta.title}</h2>
                  <p className="exam-banner-description">{examMeta.description}</p>
                </div>
              </div>
              <div className="exam-banner-meta">
                <div className="exam-meta-item">
                  <span className="meta-label">Duration</span>
                  <span className="meta-value">{examDurationMinutes} min</span>
                </div>
                <div className="exam-meta-item">
                  <span className="meta-label">Points</span>
                  <span className="meta-value">{examMeta.totalPoints}</span>
                </div>
                <div className="exam-meta-item">
                  <span className="meta-label">Questions</span>
                  <span className="meta-value">{totalExamQuestions}</span>
                </div>
              </div>
            </div>
          )}

          {isExam && !examStarted ? (
            <div className="exam-prep">
              <h2>Ready to start the exam?</h2>
              <p>
                You will have {examDurationMinutes} minutes to solve {totalExamQuestions} questions. 
                Once you submit an answer it is locked, and incorrect answers cannot be revisited.
              </p>
              <ul className="exam-prep-list">
                <li>The timer starts as soon as you press Start Exam</li>
                <li>Navigate forward carefully—wrong answers are locked</li>
                <li>The exam ends when you submit all answers or time runs out</li>
              </ul>
              <button 
                onClick={handleStartExam}
                className="btn btn-primary"
              >
                Start Exam
              </button>
            </div>
          ) : (
            <div className="question-card">
              <div className="question-header">
                <span className="question-number">Question {currentIndex + 1}</span>
                <div className="question-meta">
                  <span className="question-type">{currentQuestion.type}</span>
                  <span className="question-points">{currentQuestion.points || 1} {currentQuestion.points === 1 ? 'point' : 'points'}</span>
                </div>
              </div>

              {currentQuestion.tags && currentQuestion.tags.length > 0 && (
                <div className="question-tags">
                  {currentQuestion.tags.map((tag, idx) => (
                    <span key={idx} className="question-tag">{tag}</span>
                  ))}
                </div>
              )}
              
              <h2 className="question-title">{currentQuestion.title}</h2>

              {currentQuestion.multipleCorrect && (
                <div className="question-hint">
                  Select all correct answers
                </div>
              )}

              <div className="answers-list">
                {currentQuestion.answers.map((answer, idx) => {
                  const userAnswers = selectedAnswers[currentQuestion._id] || [];
                  const isSelected = userAnswers.includes(idx);
                  const isSubmitted = submittedAnswers[currentQuestion._id] !== undefined;
                  const correctAnswers = currentQuestion.correctAnswers || [currentQuestion.correctIndex];
                  const isCorrectAnswer = correctAnswers.includes(idx);
                  
                  let answerClass = 'answer-option';
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
                      disabled={isSubmitted || (isExam && !examStarted)}
                    >
                      <span className="answer-letter">{String.fromCharCode(65 + idx)}</span>
                      <span className="answer-text">{answer}</span>
                      {currentQuestion.multipleCorrect && (
                        <span className="answer-checkbox">
                          {isSelected && '✓'}
                        </span>
                      )}
                      {isSubmitted && isCorrectAnswer && (
                        <span className="answer-indicator">✓</span>
                      )}
                      {isSubmitted && isSelected && !isCorrectAnswer && (
                        <span className="answer-indicator">✗</span>
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
                    selectedAnswers[currentQuestion._id].length === 0 ||
                    (isExam && !examStarted)
                  }
                  style={{ marginTop: '24px', width: '100%' }}
                >
                  Submit Answer
                </button>
              )}

              {submittedAnswers[currentQuestion._id] !== undefined && (
                <div className={`answer-feedback ${submittedAnswers[currentQuestion._id] ? 'correct' : 'incorrect'}`}>
                  {submittedAnswers[currentQuestion._id] ? (
                    <>
                      <span className="feedback-icon">✓</span>
                      <span className="feedback-text">Correct! +{currentQuestion.points || 1} points</span>
                    </>
                  ) : (
                    <>
                      <span className="feedback-icon">✗</span>
                      <span className="feedback-text">Incorrect. Try the next question!</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
