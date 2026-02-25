import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { getUserProgress, getDailyChallengeStatus } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { X, Monitor, Wifi, Cpu, BookOpen, Trophy, FileCheck } from 'lucide-react';
import '../styles/Grile.css';

function QuizModal({ type, onClose, user, preSelectedCategory = '' }) {
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedTag, setSelectedTag] = useState(preSelectedCategory || ((type === 'basic' || type === 'daily') ? 'LINUX' : ''));
  const navigate = useNavigate();

  const availableTags = [
    { id: 'LINUX', label: 'Linux', color: '#f59e0b', icon: '🐧', desc: 'System administration & commands' },
    { id: 'NETWORK', label: 'Network', color: '#3b82f6', icon: '🌐', desc: 'Networking protocols & security' },
    { id: 'TIC/ICT', label: 'TIC/ICT', color: '#8b5cf6', icon: '💻', desc: 'Academic examination topics' }
  ];

  const isAllModeNoFilter = type === 'all' && selectedMode === 'all' && !selectedTag;
  const isTagRequired = type !== 'basic' && !isAllModeNoFilter;
  const needsTagAttention = isTagRequired && !selectedTag;
  const needsAuth = selectedMode === 'unsolved' && !user;

  const handleStart = () => {
    // Special handling for daily challenge
    if (type === 'daily') {
      if (!selectedTag) return;
      
      if (selectedTag === 'LINUX') {
        navigate('/grile/daily/challenge');
      } else if (selectedTag === 'NETWORK') {
        navigate('/grile/daily/network');
      }
      return;
    }

    // Regular quiz handling
    if (!selectedMode) return;
    if (isTagRequired && !selectedTag) return;
    if (needsAuth) return;

    let finalTag = '';
    if (type === 'basic') {
      finalTag = 'LINUX';
    } else if (selectedTag) {
      // If a tag is selected, always use it (even for "all" mode)
      finalTag = selectedTag;
    }

    const params = new URLSearchParams();
    params.set('type', type);
    if (finalTag) {
      params.set('tags', finalTag);
    }

    navigate(`/grile/${type}/${selectedMode}?${params.toString()}`);
  };

  const canStart = type === 'daily' ? selectedTag : (selectedMode && (!isTagRequired || selectedTag) && !needsAuth);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <h2>{type === 'daily' ? 'Choose Daily Challenge Category' : 'Choose Quiz Mode'}</h2>
        <p>{type === 'daily' ? 'Select Linux or Network for your daily challenge' : 'Select mode and optionally filter by tags'}</p>
        
        {type !== 'daily' && (
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
        )}

        {type !== 'basic' && type !== 'daily' && (
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
                Choose a category to continue.
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

        {type === 'daily' && (
          <div className="modal-section">
            <h3 className="section-title">Select Category *</h3>
            <div className="tags-grid">
              {availableTags.slice(0, 2).map(tag => (
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
            <p className="tag-helper">
              Choose Linux or Network for your daily challenge.
            </p>
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
  const [searchParams] = useSearchParams();
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
  const [preSelectedCategory, setPreSelectedCategory] = useState('');
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [dailyChallengeLoading, setDailyChallengeLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'linux', 'network'
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    if (user) {
      loadDailyChallengeStatus();
    }
    
    // Check for filter parameter in URL
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      const validFilters = ['all', 'linux', 'network'];
      if (validFilters.includes(filterParam.toLowerCase())) {
        setActiveFilter(filterParam.toLowerCase());
      }
    }
  }, [user, searchParams]);

  const loadDailyChallengeStatus = async () => {
    try {
      setDailyChallengeLoading(true);
      const status = await getDailyChallengeStatus();
      setDailyChallenge(status);
    } catch (error) {
      console.error('Error loading daily challenge status:', error);
    } finally {
      setDailyChallengeLoading(false);
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
      const allTIC = all.filter(q => q.tags && q.tags.includes('TIC/ICT'));
      
      const acadnetLinux = acadnet.filter(q => q.tags && q.tags.includes('LINUX'));
      const acadnetNetwork = acadnet.filter(q => q.tags && q.tags.includes('NETWORK'));

      console.log('Stats:', {
        basic: basic.length,
        allLinux: allLinux.length,
        allNetwork: allNetwork.length,
        allTIC: allTIC.length,
        acadnetLinux: acadnetLinux.length,
        acadnetNetwork: acadnetNetwork.length
      });

      setStats({
        basic: basic.length,
        all: { linux: allLinux.length, network: allNetwork.length, tic: allTIC.length },
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
        const allTICSolved = allTIC.filter(q => solvedSet.has(q._id)).length;
        const acadnetLinuxSolved = acadnetLinux.filter(q => solvedSet.has(q._id)).length;
        const acadnetNetworkSolved = acadnetNetwork.filter(q => solvedSet.has(q._id)).length;

        setSolved({
          basic: basicSolved,
          all: { 
            linux: allLinuxSolved, 
            network: allNetworkSolved,
            tic: allTICSolved
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
    } else if (type === 'daily' && dailyChallengeLoading) {
      // Prevent navigation while loading daily challenge status
      return;
    } else {
      setSelectedType(type);
      setPreSelectedCategory(''); // Reset pre-selected category for regular flow
      setShowModal(true);
    }
  };

  const handleCardClick = (card) => {
    // Prevent click if daily challenge is completed
    if (card.type === 'daily' && card.completed) {
      return;
    }
    
    if (card.type === 'exam') {
      navigate('/exam-selection');
    } else if (card.type === 'daily' && dailyChallengeLoading) {
      return;
    } else {
      setSelectedType(card.type);
      setPreSelectedCategory(card.preSelectedTag || '');
      setShowModal(true);
    }
  };

  const handleResetStats = async () => {
    if (!user || solved.basic < 50) return;
    
    setIsResetting(true);
    try {
      const response = await fetch(`${API_URL}/questions/resetBasicStats`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        
        updateUser({ 
          xp: data.newXp, 
          level: data.newLevel 
        });

        await loadData();
        
        setShowResetModal(false);
        alert(`Stats reset successfully! ${data.questionsReset} questions reset, ${data.xpAdded} XP added.`);
      } else {
        alert(data.message || 'Failed to reset stats');
      }
    } catch (error) {
      console.error('Error resetting stats:', error);
      alert('Failed to reset stats. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  // Define all cards
  const allCards = [
    { 
      title: 'Linux Questions', 
      desc: 'System administration, commands & concepts',
      type: 'all',
      category: 'Linux',
      total: stats.all.linux,
      solved: solved.all.linux,
      color: '#f59e0b',
      icon: <Monitor size={24} />,
      filter: 'linux',
      preSelectedTag: 'LINUX'
    },
    { 
      title: 'Network Questions', 
      desc: 'Networking protocols, security & infrastructure',
      type: 'all',
      category: 'Network',
      total: stats.all.network,
      solved: solved.all.network,
      color: '#3b82f6',
      icon: <Wifi size={24} />,
      filter: 'network',
      preSelectedTag: 'NETWORK'
    },
    { 
      title: 'TIC/ICT Questions', 
      desc: 'Academic examination topics',
      type: 'all',
      category: 'TIC/ICT',
      total: stats.all.tic,
      solved: solved.all.tic,
      color: '#8b5cf6',
      icon: <Cpu size={24} />,
      filter: 'all',
      preSelectedTag: 'TIC/ICT'
    },
    { 
      title: 'Basic Commands', 
      desc: 'Master fundamental Linux commands',
      type: 'basic',
      category: 'Linux',
      total: stats.basic,
      solved: solved.basic,
      color: '#10b981',
      icon: <Monitor size={24} />,
      filter: 'linux'
    },
    ...(user ? [{
      title: 'Daily Challenge',
      desc: '20 questions with 2x XP bonus',
      type: 'daily',
      isDaily: true,
      completed: dailyChallenge?.completed || false,
      timeUntilNext: dailyChallenge?.timeUntilNext || '',
      loading: dailyChallengeLoading,
      color: '#f59e0b',
      icon: <Trophy size={24} />,
      filter: 'all'
    }] : []),
    { 
      title: 'Tests', 
      desc: 'Practice with timer and scoring',
      type: 'exam',
      isExam: true,
      examTag: 'TEST',
      color: '#3b82f6',
      icon: <FileCheck size={24} />,
      filter: 'all'
    }
  ];

  // Filter cards based on active filter
  const filteredCards = allCards.filter(card => {
    if (activeFilter === 'all') return true;
    return card.filter === activeFilter || card.filter === 'all';
  });

  return (
    <>
      <div className="container grile-page">
        <div className="grile-header">
          <h1>Practice Questions</h1>
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              <BookOpen size={18} />
              All Categories
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'linux' ? 'active' : ''}`}
              onClick={() => setActiveFilter('linux')}
            >
              <Monitor size={18} />
              Linux
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'network' ? 'active' : ''}`}
              onClick={() => setActiveFilter('network')}
            >
              <Wifi size={18} />
              Network
            </button>
          </div>
        </div>
        
        <div className="compact-cards-grid">
          {filteredCards.map((card, idx) => (
            <div 
              key={idx} 
              className={`compact-card ${card.completed ? 'daily-completed' : ''} ${card.isExam ? 'exam-card' : ''}`}
              style={{'--card-color': card.color}}
              onClick={() => handleCardClick(card)}
              data-disabled={card.type === 'daily' && card.completed ? 'true' : undefined}
            >
              <div className="compact-card-header">
                <div className="compact-card-icon">{card.icon}</div>
                <div className="compact-card-info">
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                </div>
                {card.isDaily && (
                  <span className={`compact-status ${card.completed ? 'completed' : 'available'}`}>
                    {card.completed ? '✓' : '★'}
                  </span>
                )}
                {card.isExam && (
                  <span className="compact-status exam">TEST</span>
                )}
              </div>
              
              {card.type === 'basic' && user && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowResetModal(true);
                  }}
                  className="compact-reset-btn"
                  disabled={solved.basic < 50}
                  title={solved.basic < 50 ? `Need ${50 - solved.basic} more solved questions` : 'Reset stats for XP'}
                >
                  Reset for XP ({solved.basic}/50)
                </button>
              )}
              
              {user && !card.isDaily && !card.isExam && (
                <div className="compact-stats">
                  <div className="compact-stat">
                    <span className="stat-value">{card.solved}</span>
                    <span className="stat-label">Solved</span>
                  </div>
                  <div className="compact-stat-divider"></div>
                  <div className="compact-stat">
                    <span className="stat-value">{card.total}</span>
                    <span className="stat-label">Total</span>
                  </div>
                  <div className="compact-progress-bar">
                    <div 
                      className="compact-progress-fill" 
                      style={{ 
                        width: `${card.total > 0 ? (card.solved / card.total * 100) : 0}%`,
                        background: card.color
                      }}
                    />
                  </div>
                </div>
              )}

              {!user && !card.isDaily && !card.isExam && (
                <div className="compact-count">
                  {card.total} questions
                </div>
              )}

              {card.isDaily && !card.loading && (
                <div className="compact-daily-info">
                  {card.completed ? (
                    <span className="daily-next">Next: {card.timeUntilNext}</span>
                  ) : (
                    <span className="daily-bonus">2x XP • 20 Questions</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <QuizModal 
          type={selectedType}
          user={user}
          preSelectedCategory={preSelectedCategory}
          onClose={() => setShowModal(false)}
        />
      )}

      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset Basic Commands Stats</h3>
              <button 
                className="modal-close"
                onClick={() => setShowResetModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="reset-modal-body">
              <div className="reset-info">
                <p><strong>Total user XP won't be reset</strong>, only basic commands stats will be reset.</p>
                <p>You will get <strong>1 point for every question solved</strong>.</p>
                <p>You need at least <strong>50 solved basic commands questions</strong>.</p>
              </div>
              
              <div className="reset-stats">
                <div className="stat-item">
                  <span className="stat-label">Currently solved:</span>
                  <span className="stat-value">{solved.basic}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">XP you'll gain:</span>
                  <span className="stat-value">{solved.basic} XP</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Status:</span>
                  <span className={`stat-status ${solved.basic >= 50 ? 'eligible' : 'not-eligible'}`}>
                    {solved.basic >= 50 ? 'Eligible' : `Need ${50 - solved.basic} more`}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setShowResetModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleResetStats}
                className="btn btn-primary"
                disabled={solved.basic < 50 || isResetting}
              >
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}