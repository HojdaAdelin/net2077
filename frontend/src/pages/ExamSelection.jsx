import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import '../styles/ExamSelection.css';

export default function ExamSelection() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const response = await fetch(`${API_URL}/exams`);
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

  const handleFilterClick = (filter) => {
    if (activeFilter === filter) {
      setActiveFilter(null);
      setSearchQuery('');
    } else {
      setActiveFilter(filter);
      setSearchQuery('');
    }
  };

  const filteredExams = exams.filter(exam => {
    const searchLower = searchQuery.toLowerCase();
    const titleMatch = exam.title.toLowerCase().includes(searchLower);
    const descMatch = exam.description.toLowerCase().includes(searchLower);
    const tagMatch = exam.tag?.toLowerCase().includes(searchLower);
    
    const matchesSearch = titleMatch || descMatch || tagMatch;
    
    if (activeFilter) {
      const filterLower = activeFilter.toLowerCase();
      const matchesFilter = 
        exam.title.toLowerCase().includes(filterLower) ||
        exam.description.toLowerCase().includes(filterLower) ||
        exam.tag?.toLowerCase().includes(filterLower);
      return matchesFilter;
    }
    
    return matchesSearch;
  });

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

      <div className="exam-filters">
        <input
          type="text"
          placeholder="Search exams..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setActiveFilter(null);
          }}
          className="exam-search-input"
        />
        <div className="exam-filter-buttons">
          <button
            className={`filter-btn filter-acadnet ${activeFilter === 'Acadnet' ? 'active' : ''}`}
            onClick={() => handleFilterClick('Acadnet')}
          >
            Acadnet
          </button>
          <button
            className={`filter-btn filter-linux ${activeFilter === 'Linux' ? 'active' : ''}`}
            onClick={() => handleFilterClick('Linux')}
          >
            Linux
          </button>
          <button
            className={`filter-btn filter-network ${activeFilter === 'Network' ? 'active' : ''}`}
            onClick={() => handleFilterClick('Network')}
          >
            Network
          </button>
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <div className="no-exams">
          <p>No exams found matching your search.</p>
        </div>
      ) : (
        <div className="exams-grid">
          {filteredExams.map(exam => (
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
      )}

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
