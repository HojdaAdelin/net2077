import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import '../styles/SharedQuestion.css';

export default function Question() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadQuestion();
  }, [questionId]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/questions/${questionId}`);
      
      if (!response.ok) {
        throw new Error('Question not found');
      }
      
      const data = await response.json();
      setQuestion(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (index) => {
    if (submitted) return;

    if (question.multipleCorrect) {
      setSelectedAnswers(prev => 
        prev.includes(index) 
          ? prev.filter(i => i !== index)
          : [...prev, index]
      );
    } else {
      setSelectedAnswers([index]);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const isCorrect = () => {
    if (!submitted) return null;
    const correctAnswers = question.correctAnswers || [question.correctIndex];
    return selectedAnswers.length === correctAnswers.length &&
           selectedAnswers.every(ans => correctAnswers.includes(ans));
  };

  if (loading) {
    return (
      <div className="sq-page">
        <div className="sq-loading">Loading question...</div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="sq-page">
        <div className="sq-error">
          <h2>Question not found</h2>
          <p>The question you're looking for doesn't exist or has been removed.</p>
          <button onClick={() => navigate('/grile')} className="sq-btn sq-btn-primary">
            Back to Questions
          </button>
        </div>
      </div>
    );
  }

  const correctAnswers = question.correctAnswers || [question.correctIndex];

  return (
    <div className="sq-page">
      <div className="sq-container">
        <div className="sq-card">
          <div className="sq-header">
            <span className="sq-badge">Shared Question</span>
            <div className="sq-meta">
              <span className="sq-type">{question.type}</span>
              <span className="sq-points">{question.points || 1} {question.points === 1 ? 'point' : 'points'}</span>
            </div>
          </div>

          {question.tags && question.tags.length > 0 && (
            <div className="sq-tags">
              {question.tags.map((tag, idx) => (
                <span key={idx} className="sq-tag">{tag}</span>
              ))}
            </div>
          )}
          
          <h2 className="sq-title">{question.title}</h2>

          {question.multipleCorrect && (
            <div className="sq-hint">
              Select all correct answers
            </div>
          )}

          <div className="sq-answers">
            {question.answers.map((answer, index) => {
              const isSelected = selectedAnswers.includes(index);
              const isCorrectAnswer = correctAnswers.includes(index);
              
              let answerClass = 'sq-answer';
              if (isSelected) answerClass += ' sq-answer-selected';
              if (submitted && isCorrectAnswer) answerClass += ' sq-answer-correct';
              if (submitted && isSelected && !isCorrectAnswer) answerClass += ' sq-answer-incorrect';
              
              return (
                <button
                  key={index}
                  className={answerClass}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={submitted}
                >
                  <span className="sq-answer-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="sq-answer-text">{answer}</span>
                  {submitted && isCorrectAnswer && <span className="sq-answer-indicator">✓</span>}
                  {submitted && isSelected && !isCorrectAnswer && <span className="sq-answer-indicator">✗</span>}
                </button>
              );
            })}
          </div>

          {!submitted ? (
            <button 
              onClick={handleSubmit}
              className="sq-btn sq-btn-primary"
              disabled={selectedAnswers.length === 0}
            >
              Submit Answer
            </button>
          ) : (
            <div className="sq-feedback">
              <div className={`sq-feedback-message ${isCorrect() ? 'sq-feedback-correct' : 'sq-feedback-incorrect'}`}>
                {isCorrect() ? '✓ Correct!' : '✗ Incorrect'}
              </div>
              <button 
                onClick={() => navigate('/grile')}
                className="sq-btn sq-btn-secondary"
              >
                Practice More Questions
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
