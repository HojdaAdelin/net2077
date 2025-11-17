import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestions, getUnsolvedQuestions, getRandom50 } from '../services/api';
import '../styles/Quiz.css';

export default function Quiz() {
  const { type, mode } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // Pentru multiple: {questionId: [0, 2, 3]}
  const [submittedAnswers, setSubmittedAnswers] = useState({}); // {questionId: true/false}
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, [type, mode]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tags = urlParams.get('tags');
      const queryType = urlParams.get('type') || type;
      
      let data;
      const token = localStorage.getItem('token');
      
      if (mode === 'random') {
        const response = await fetch(`http://localhost:5000/api/questions/random50`);
        data = await response.json();
      } else if (mode === 'unsolved') {
        if (token) {
          const response = await fetch(`http://localhost:5000/api/questions/unsolved`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          data = await response.json();
        } else {
          const response = await fetch(`http://localhost:5000/api/questions`);
          data = await response.json();
        }
      } else {
        const response = await fetch(`http://localhost:5000/api/questions`);
        data = await response.json();
      }

      // Filter on client side
      let filtered = data;

      // Filter by type
      if (queryType === 'basic') {
        // Basic Commands: only type "basic"
        filtered = filtered.filter(q => q.type === 'basic');
      } else if (queryType === 'all') {
        // All Questions: only type "all" (exclude basic and acadnet)
        filtered = filtered.filter(q => q.type === 'all');
      } else if (queryType === 'acadnet') {
        // Acadnet: only type "acadnet"
        filtered = filtered.filter(q => q.type === 'acadnet');
      }

      // Filter by tags
      if (tags) {
        filtered = filtered.filter(q => q.tags && q.tags.includes(tags));
      }

      console.log('Filtered questions:', {
        total: data.length,
        filtered: filtered.length,
        type: queryType,
        tags: tags
      });

      setQuestions(filtered);
    } catch (error) {
      console.error('Error loading questions:', error);
    }
    setLoading(false);
  };

  const handleAnswerSelect = (questionId, answerIndex, isMultiple) => {
    if (isMultiple) {
      // Pentru răspunsuri multiple
      const current = selectedAnswers[questionId] || [];
      const newAnswers = current.includes(answerIndex)
        ? current.filter(idx => idx !== answerIndex)
        : [...current, answerIndex];
      
      setSelectedAnswers({
        ...selectedAnswers,
        [questionId]: newAnswers
      });
    } else {
      // Pentru răspuns unic
      setSelectedAnswers({
        ...selectedAnswers,
        [questionId]: [answerIndex]
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmitQuestion = async () => {
    const currentQuestion = questions[currentIndex];
    const userAnswers = selectedAnswers[currentQuestion._id] || [];
    const correctAnswers = currentQuestion.correctAnswers || [currentQuestion.correctIndex];

    // Check if answer is correct
    const isCorrect = 
      userAnswers.length === correctAnswers.length &&
      userAnswers.every(ans => correctAnswers.includes(ans));

    setSubmittedAnswers({
      ...submittedAnswers,
      [currentQuestion._id]: isCorrect
    });

    // Save progress to backend if user is logged in
    const token = localStorage.getItem('token');
    if (token && isCorrect) {
      try {
        await fetch('http://localhost:5000/api/questions/markSolved', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ questionId: currentQuestion._id })
        });
        console.log('Progress saved for question:', currentQuestion._id);
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    }
  };

  const handleSubmitAll = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    let totalPoints = 0;
    let maxPoints = 0;

    questions.forEach((q) => {
      maxPoints += q.points || 1;
      const userAnswers = selectedAnswers[q._id] || [];
      const correctAnswers = q.correctAnswers || [q.correctIndex];

      // Verifică dacă răspunsurile sunt identice
      if (
        userAnswers.length === correctAnswers.length &&
        userAnswers.every(ans => correctAnswers.includes(ans))
      ) {
        totalPoints += q.points || 1;
      }
    });

    return { totalPoints, maxPoints };
  };

  if (loading) {
    return (
      <div className="container quiz-page">
        <div className="loading">Loading questions...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="container quiz-page">
        <div className="empty-quiz">
          <h2>No questions available</h2>
          <button onClick={() => navigate('/grile')} className="btn btn-primary">
            Back to Questions
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const { totalPoints, maxPoints } = calculateScore();
  const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  if (showResults) {
    return (
      <div className="container quiz-page">
        <div className="quiz-results">
          <h1>Quiz Complete!</h1>
          <div className="results-score">
            <div className="score-circle">
              <span className="score-value">{percentage}%</span>
            </div>
            <div className="score-details">
              <p>{totalPoints} out of {maxPoints} points</p>
              <p className="score-subtext">{questions.length} questions answered</p>
            </div>
          </div>
          <div className="results-actions">
            <button onClick={() => navigate('/grile')} className="btn btn-secondary">
              Back to Questions
            </button>
            <button onClick={() => window.location.reload()} className="btn btn-primary">
              Try Again
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
              
              let btnClass = 'question-nav-btn';
              if (idx === currentIndex) btnClass += ' active';
              if (isSubmitted && isCorrect) btnClass += ' correct';
              if (isSubmitted && !isCorrect) btnClass += ' incorrect';
              if (isAnswered && !isSubmitted) btnClass += ' answered';
              
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
          >
            Finish Quiz
          </button>
        </div>

        <div className="quiz-content">
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
                    disabled={isSubmitted}
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
                disabled={!selectedAnswers[currentQuestion._id] || selectedAnswers[currentQuestion._id].length === 0}
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
        </div>
      </div>
    </div>
  );
}
