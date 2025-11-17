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
      
      let url = '';
      const params = new URLSearchParams();
      if (queryType) params.append('type', queryType);
      if (tags) params.append('tags', tags);
      
      let data;
      if (mode === 'random') {
        url = `/api/questions/random50?${params.toString()}`;
        const response = await fetch(`http://localhost:5000${url}`);
        data = await response.json();
      } else if (mode === 'unsolved') {
        data = await getUnsolvedQuestions();
      } else {
        url = `/api/questions?${params.toString()}`;
        const response = await fetch(`http://localhost:5000${url}`);
        data = await response.json();
      }
      setQuestions(data);
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

  const handleSubmit = () => {
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
            {questions.map((q, idx) => (
              <button
                key={q._id}
                className={`question-nav-btn ${idx === currentIndex ? 'active' : ''} ${selectedAnswers[q._id] !== undefined ? 'answered' : ''}`}
                onClick={() => setCurrentIndex(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <div className="quiz-actions">
            <button 
              onClick={handlePrevious} 
              disabled={currentIndex === 0}
              className="btn btn-secondary"
            >
              Previous
            </button>
            {currentIndex === questions.length - 1 ? (
              <button onClick={handleSubmit} className="btn btn-primary">
                Submit
              </button>
            ) : (
              <button onClick={handleNext} className="btn btn-primary">
                Next
              </button>
            )}
          </div>
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
                
                return (
                  <button
                    key={idx}
                    className={`answer-option ${isSelected ? 'selected' : ''} ${currentQuestion.multipleCorrect ? 'multiple' : ''}`}
                    onClick={() => handleAnswerSelect(currentQuestion._id, idx, currentQuestion.multipleCorrect)}
                  >
                    <span className="answer-letter">{String.fromCharCode(65 + idx)}</span>
                    <span className="answer-text">{answer}</span>
                    {currentQuestion.multipleCorrect && (
                      <span className="answer-checkbox">
                        {isSelected && '✓'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
