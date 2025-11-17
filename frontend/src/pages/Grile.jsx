import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { getUserProgress } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import '../styles/Grile.css';

function QuizModal({ type, onClose }) {
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

  const handleStart = () => {
    if (!selectedMode) return;
    if (isTagRequired && !selectedTag) return;

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

  const canStart = selectedMode && (!isTagRequired || selectedTag);

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
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Fetch all questions first
      const basicRes = await fetch('/api/questions?type=basic');
      const basic = await basicRes.json();

      const allRes = await fetch('/api/questions?type=all');
      const all = await allRes.json();

      const acadnetRes = await fetch('/api/questions?type=acadnet');
      const acadnet = await acadnetRes.json();

      // Filter by tags on client side
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
        
        // Count solved questions per type and tag
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
      isExam: true
    }
  ];

  return (
    <>
      <div className="container grile-page">
        <div className="grile-header">
          <h1>Practice Questions</h1>
          <p>Choose your learning path and start mastering computer science fundamentals</p>
        </div>
        
        <div className="cards-grid">
          {cards.map(card => (
            <div key={card.type} className="question-card">
              <div className="card-header">
                <h2>{card.title}</h2>
                {card.category && (
                  <span className="card-category">{card.category}</span>
                )}
              </div>
              <p>{card.desc}</p>
              
              {card.categories ? (
                // Multiple categories (All Questions, Acadnet)
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
                // Single category (Basic Commands)
                <>
                  {user && (
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

                  {!user && (
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
                >
                  Continue
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <QuizModal 
          type={selectedType}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}