import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ExamSelection.css';

export default function ExamSelection() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const response = await fetch('/api/exams');
      const data = await response.json();
      setExams(data);
    } catch (error) {
      console.error('Error loading exams:', error);
    }
    setLoading(false);
  };

  const handleStartExam = (examId) => {
    navigate(`/exam/${examId}`);
  };

  if (loading) {
    return (
      <div className="container exam-selection-page">
        <div className="loading">Loading exams...</div>
      </div>
    );
  }

  return (
    <div className="container exam-selection-page">
      <div className="exam-header">
        <h1>Examination Subjects</h1>
      </div>

      <div className="exams-grid">
        {exams.map(exam => (
          <div key={exam.id} className="exam-card">
            <div className="exam-badge">{exam.year}</div>
            <h2>{exam.title}</h2>
            <p>{exam.description}</p>
            
            <div className="exam-details">
              <div className="exam-detail">
                <span className="detail-icon">⏱️</span>
                <span className="detail-text">{exam.duration} minutes</span>
              </div>
              <div className="exam-detail">
                <span className="detail-icon">📊</span>
                <span className="detail-text">{exam.totalPoints} points</span>
              </div>
            </div>

            <button 
              onClick={() => handleStartExam(exam.id)}
              className="btn btn-primary btn-full"
            >
              Start Examination
            </button>
          </div>
        ))}
      </div>

      <button 
        onClick={() => navigate('/grile')}
        className="btn btn-secondary"
        style={{ marginTop: '32px' }}
      >
        Back to Questions
      </button>
    </div>
  );
}
