import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { getUserProgress, getDailyChallengeStatus } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import '../styles/Grile.css';

function QuizModal({ type, onClose, user }) {
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedTag, setSelectedTag] = useState(type === 'basic' ? 'LINUX' : '');
  const navigate = useNavigate();

  const availableTags = [
    { id: 'LINUX', label: 'Linux', color: '#f59e0b' },
    { id: 'NETWORK', label: 'Network', color: '#3b82f6' }
  ];

  const isAllModeNoFilter = type === 'all' && selectedMode === 'all';
  const isTagRequired = type !== 'basic' && !isAllModeNoFilter;
  const needsTagAttention = isTagRequired && !selectedTag;
  const needsAuth = selectedMode === 'unsolved' && !user;

  const handleStart = () => {
    if (!selectedMode) return;
    if (isTagRequired && !selectedTag) return;
    if (needsAuth) return;

    let finalTag = '';
    if (type === 'basic') {
      finalTag = 'LINUX';
    } else if (isTagRequired) {
      finalTag = selectedTag;
    }

    const params = new URLSearchParams();
    params.set('type', type);
    if (finalTag) {
      params.set('tags', finalTag);
    }

    navigate(`/grile/${type}/${selectedMode}?${params.toString()}`);
  };

  const canStart = selectedMode && (!isTagRequired || selectedTag) && !needsAuth;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <h2>Choose Quiz Mode</h2>
        <p>Select mode and optionally filter by tags</p>
        
        <div className="modal-section">
          <h3 className="section-title">Quiz Mode</h3>
          <div className="mode-options">
            <button 
              className={`mode-option ${selectedMode === 'unsolved' ? 'selected' : ''}`}
              onClick={() => setSelectedMode('unsolved')}
            >
              <div className="mode-title">Unsolved Questions</div>
              <div className="mode-desc">Practice questions you haven't answered yet</div>
            </button>
            
            <button 
              className={`mode-option ${selectedMode === 'all' ? 'selected' : ''}`}
              onClick={() => setSelectedMode('all')}
            >
              <div className="mode-title">All Questions</div>
              <div className="mode-desc">Practice all available questions</div>
            </button>
            
            <button 
              className={`mode-option ${selectedMode === 'random' ? 'selected' : ''}`}
              onClick={() => setSelectedMode('random')}
            >
              <div className="mode-title">Simulation Test</div>
              <div className="mode-desc">Random 50 questions in test mode</div>
            </button>
          </div>
          
          {needsAuth && (
            <p className="auth-required-message">
              You need an account to track unsolved questions.
            </p>
          )}
        </div>

        {type !== 'basic' && (
          <div className="modal-section">
            <h3 className="section-title">
              Select Category {isTagRequired ? '*' : <span className="optional-label">(optional)</span>}
            </h3>
            <div className="tags-grid">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  className={`tag-option ${selectedTag === tag.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTag(tag.id)}
                  style={{
                    '--tag-color': tag.color
                  }}
                >
                  {tag.label}
                </button>
              ))}
            </div>
            {isTagRequired ? (
              <p className={`tag-helper ${needsTagAttention ? 'error' : ''}`}>
                Choose Linux or Network to continue.
              </p>
            ) : (
              <p className="tag-helper">
                Optional: narrow down to Linux or Network questions.
              </p>
            )}
          </div>
        )}

        {type === 'basic' && (
          <div className="modal-section">
            <div className="info-box">
              <strong>Category:</strong> Linux (Basic Commands)
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            onClick={handleStart}
            className="btn btn-primary"
            disabled={!canStart}
          >
            Start Quiz
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Grile() {
  const [stats, setStats] = useState({ 
    basic: 0, 
    all: { linux: 0, network: 0 }, 
    acadnet: { linux: 0, network: 0 } 
  });
  const [solved, setSolved] = useState({ 
    basic: 0, 
    all: { linux: 0, network: 0 }, 
    acadnet: { linux: 0, network: 0 } 
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    if (user) {
      loadDailyChallengeStatus();
    }
  }, [user]);

  const loadDailyChallengeStatus = async () => {
    try {
      const status = await getDailyChallengeStatus();
      setDailyChallenge(status);
    } catch (error) {
      console.error('Error loading daily challenge status:', error);
    }
  };

  const loadData = async () => {
    try {
      
      const basicRes = await fetch(`${API_URL}/questions?type=basic`);
      const basic = await basicRes.json();

      const allRes = await fetch(`${API_URL}/questions?type=all`);
      const all = await allRes.json();

      const acadnetRes = await fetch(`${API_URL}/questions?type=acadnet`);
      const acadnet = await acadnetRes.json();

      const allLinux = all.filter(q => q.tags && q.tags.includes('LINUX'));
      const allNetwork = all.filter(q => q.tags && q.tags.includes('NETWORK'));
      
      const acadnetLinux = acadnet.filter(q => q.tags && q.tags.includes('LINUX'));
      const acadnetNetwork = acadnet.filter(q => q.tags && q.tags.includes('NETWORK'));

      console.log('Stats:', {
        basic: basic.length,
        allLinux: allLinux.length,
        allNetwork: allNetwork.length,
        acadnetLinux: acadnetLinux.length,
        acadnetNetwork: acadnetNetwork.length
      });

      setStats({
        basic: basic.length,
        all: { linux: allLinux.length, network: allNetwork.length },
        acadnet: { linux: acadnetLinux.length, network: acadnetNetwork.length }
      });

      if (user) {
        const progress = await getUserProgress();
        const solvedSet = new Set(
          (progress.solvedQuestions || []).map(entry => 
            typeof entry === 'string' ? entry : entry.id
          )
        );
        
        const basicSolved = basic.filter(q => solvedSet.has(q._id)).length;
        const allLinuxSolved = allLinux.filter(q => solvedSet.has(q._id)).length;
        const allNetworkSolved = allNetwork.filter(q => solvedSet.has(q._id)).length;
        const acadnetLinuxSolved = acadnetLinux.filter(q => solvedSet.has(q._id)).length;
        const acadnetNetworkSolved = acadnetNetwork.filter(q => solvedSet.has(q._id)).length;

        setSolved({
          basic: basicSolved,
          all: { 
            linux: allLinuxSolved, 
            network: allNetworkSolved 
          },
          acadnet: { 
            linux: acadnetLinuxSolved, 
            network: acadnetNetworkSolved 
          }
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleContinue = (type) => {
    if (type === 'exam') {
      navigate('/exam-selection');
    } else if (type === 'daily') {
      
      navigate('/grile/daily/challenge');
    } else {
      setSelectedType(type);
      setShowModal(true);
    }
  };

  const cards = [
    { 
      title: 'Basic Commands', 
      desc: 'Master fundamental Linux commands and concepts',
      type: 'basic',
      category: 'Linux',
      total: stats.basic,
      solved: solved.basic
    },
    ...(user ? [{
      title: 'Daily Challenge',
      desc: '20 Linux questions with 2x XP bonus',
      type: 'daily',
      isDaily: true,
      completed: dailyChallenge?.completed || false,
      timeUntilNext: dailyChallenge?.timeUntilNext || ''
    }] : []),
    { 
      title: 'All Questions', 
      desc: 'Complete collection covering Linux and Network topics',
      type: 'all',
      categories: [
        { name: 'Linux', total: stats.all.linux, solved: solved.all.linux },
        { name: 'Network', total: stats.all.network, solved: solved.all.network }
      ]
    },
    { 
      title: 'Examination Subjects', 
      desc: 'Official examination practice with timer and scoring',
      type: 'exam',
      isExam: true,
      examTag: 'EXAM'
    }
  ];

  return (
    <>
      <div className="container grile-page">
        <div className="grile-header">
          <h1>Practice Questions</h1>
        </div>
        
        <div className="cards-grid">
          {cards.map(card => (
            <div 
              key={card.type} 
              className={`question-card ${card.completed ? 'daily-completed' : ''} ${card.isExam ? 'exam-card' : ''}`}
            >
              <div className="card-header">
                <h2>{card.title}</h2>
                {card.category && (
                  <span className="card-category">{card.category}</span>
                )}
                {card.isDaily && (
                  <span className={`daily-status ${card.completed ? 'completed' : 'available'}`}>
                    {card.completed ? 'Completed' : 'Available'}
                  </span>
                )}
                {card.isExam && (
                  <span className="exam-status">
                    {card.examTag}
                  </span>
                )}
              </div>
              <p>{card.desc}</p>
              
              {card.isDaily && (
                <div className="daily-info">
                  {card.completed ? (
                    <div className="daily-completed-info">
                      <span className="completed-text">Challenge completed today!</span>
                      <span className="next-reset">Next challenge in: {card.timeUntilNext}</span>
                    </div>
                  ) : (
                    <div className="daily-available-info">
                      <span className="bonus-text">2x XP Bonus</span>
                      <span className="questions-count">20 Linux Questions</span>
                    </div>
                  )}
                </div>
              )}

              {card.isExam && (
                <div className="exam-info">
                  <div className="exam-features">
                    <span className="exam-feature">Timer & Scoring</span>
                    <span className="exam-feature">Official Practice</span>
                  </div>
                </div>
              )}
              
              {card.categories ? (
                
                <div className="categories-stats">
                  {card.categories.map((cat, idx) => (
                    <div key={idx} className="category-stat-card">
                      <div className="category-name">{cat.name}</div>
                      {user ? (
                        <div className="category-progress">
                          <span className="progress-text">{cat.solved} / {cat.total}</span>
                          <div className="mini-progress-bar">
                            <div 
                              className="mini-progress-fill" 
                              style={{ width: `${cat.total > 0 ? (cat.solved / cat.total * 100) : 0}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="category-total">{cat.total} questions</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                
                <>
                  {user && !card.isExam && !card.isDaily && (
                    <div className="progress-stats">
                      <div className="progress-stat">
                        <span className="stat-value">{card.solved}</span>
                        <span className="stat-label">Solved</span>
                      </div>
                      <div className="progress-stat">
                        <span className="stat-value">{card.total - card.solved}</span>
                        <span className="stat-label">Remaining</span>
                      </div>
                      <div className="progress-stat">
                        <span className="stat-value">{card.total}</span>
                        <span className="stat-label">Total</span>
                      </div>
                    </div>
                  )}

                  {!user && !card.isDaily && !card.isExam && (
                    <div className="question-count-badge">
                      {card.total} questions available
                    </div>
                  )}
                </>
              )}
              
              <div className="card-actions">
                <button 
                  onClick={() => handleContinue(card.type)}
                  className="btn btn-primary btn-full"
                  disabled={card.isDaily && card.completed}
                >
                  {card.isDaily && card.completed ? 'Completed Today' : 'Continue'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <QuizModal 
          type={selectedType}
          user={user}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}