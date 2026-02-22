import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Swords, Trophy, Target, Flame, Monitor, Wifi, Clock } from 'lucide-react';
import { API_URL } from '../config';
import '../styles/Arena.css';

export default function ArenaPlay() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [view, setView] = useState('menu');
  const [category, setCategory] = useState('LINUX');
  const [questionCount, setQuestionCount] = useState(10);
  const [mode, setMode] = useState('normal');
  const [visibility, setVisibility] = useState('public');
  const [privateMatchId, setPrivateMatchId] = useState('');
  const [availableMatches, setAvailableMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [myActiveMatch, setMyActiveMatch] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);

  useEffect(() => {
    checkMyActiveMatch();
    loadMatchHistory();
  }, []);

  useEffect(() => {
    if (!myActiveMatch) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/arena/${myActiveMatch.matchId}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          setMyActiveMatch(null);
          return;
        }

        const data = await response.json();
        
        if (data.match.status === 'active') {
          clearInterval(interval);
          navigate(`/arena/match/${myActiveMatch.matchId}`);
        } else if (data.match.status === 'cancelled' || data.match.status === 'finished') {
          clearInterval(interval);
          setMyActiveMatch(null);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [myActiveMatch, navigate]);

  useEffect(() => {
    if (view === 'join') {
      loadAvailableMatches();
    }
  }, [view]);

  const checkMyActiveMatch = async () => {
    try {
      const response = await fetch(`${API_URL}/arena/my-waiting`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok && data.match) {
        setMyActiveMatch(data.match);
      }
    } catch (error) {
      console.error('Error checking active match:', error);
    }
  };

  const loadMatchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/arena/my-stats`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setMatchHistory(data.matchHistory || []);
      }
    } catch (error) {
      console.error('Error loading match history:', error);
    }
  };

  const loadAvailableMatches = async () => {
    try {
      const response = await fetch(`${API_URL}/arena/available`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setAvailableMatches(data.matches || []);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const handleCreateMatch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/arena/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category, questionCount, mode, visibility })
      });

      const data = await response.json();
      if (response.ok) {
        navigate(`/arena/waiting/${data.matchId}`);
      }
    } catch (error) {
      console.error('Error creating match:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMatch = async (matchId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/arena/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ matchId })
      });

      const data = await response.json();
      if (response.ok) {
        navigate(`/arena/match/${matchId}`);
      } else {
        alert(data.message || 'Failed to join match');
        loadAvailableMatches();
      }
    } catch (error) {
      console.error('Error joining match:', error);
    } finally {
      setLoading(false);
    }
  };

  const returnToWaitingRoom = (match) => {
    navigate(`/arena/waiting/${match.matchId}`);
  };

  const getDurationText = (count) => {
    const durations = { 10: '2 min', 20: '4 min', 30: '6 min' };
    return durations[count];
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (view === 'join') {
    return (
      <div className="container arena-page">
        <div className="arena-join">
          <button onClick={() => setView('menu')} className="btn btn-secondary arena-back-btn">
            ← Back
          </button>
          
          <h2>Join a Match</h2>

          <div className="join-options">
            <div className="join-section">
              <h3>Join with Code</h3>
              <p>Enter a private match code</p>
              <div className="code-input-group">
                <input
                  type="text"
                  placeholder="Enter match code"
                  value={privateMatchId}
                  onChange={(e) => setPrivateMatchId(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="code-input"
                />
                <button 
                  onClick={() => handleJoinMatch(privateMatchId)} 
                  className="btn btn-primary"
                  disabled={loading || privateMatchId.length !== 6}
                >
                  Join
                </button>
              </div>
            </div>

            <div className="join-divider">OR</div>

            <div className="join-section">
              <h3>Public Matches</h3>
              {availableMatches.length === 0 ? (
                <div className="no-matches">
                  <Swords size={48} />
                  <p>No public matches available</p>
                  <button onClick={loadAvailableMatches} className="btn btn-secondary">
                    Refresh
                  </button>
                </div>
              ) : (
                <div className="matches-list">
                  {availableMatches.map((match) => (
                    <div key={match._id} className="match-card">
                      <div className="match-info">
                        <div className="match-creator">
                          <span className="creator-name">{match.creator.username}</span>
                          <span className="creator-level">Lvl {match.creator.level}</span>
                        </div>
                        <div className="match-details-inline">
                          <span className="detail-badge">{match.category}</span>
                          <span className="detail-badge">{match.questionCount} Q</span>
                          <span className="detail-badge">{getDurationText(match.questionCount)}</span>
                          <span className={`detail-badge ${match.mode === 'bloody' ? 'bloody' : ''}`}>
                            {match.mode === 'bloody' ? 'Bloody' : 'Normal'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleJoinMatch(match.matchId)} 
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container arena-page">
      <div className="arena-friend-menu">
        <h2>Arena</h2>

        {myActiveMatch && (
          <div className="active-match-banner">
            <div className="banner-content">
              <Swords size={24} />
              <div className="banner-info">
                <h3>You have a match waiting</h3>
                <p>Match ID: {myActiveMatch.matchId} • {myActiveMatch.visibility === 'private' ? 'Private' : 'Public'}</p>
              </div>
            </div>
            <button onClick={() => returnToWaitingRoom(myActiveMatch)} className="btn btn-primary">
              Return to Lobby
            </button>
          </div>
        )}

        <div className="arena-actions">
          <button onClick={() => setView('join')} className="arena-action-card">
            <Users size={32} />
            <h3>Join a Match</h3>
            <p>Join public matches or enter with a code</p>
          </button>

          <div className="arena-action-card create-card">
            <Swords size={32} />
            <h3>Create a Match</h3>
            <p>Set up a new match</p>
          </div>
        </div>

        <div className="create-match-form">
          <div className="form-section">
            <h4>Visibility</h4>
            <div className="category-options">
              <button 
                className={`category-btn ${visibility === 'public' ? 'active' : ''}`}
                onClick={() => setVisibility('public')}
              >
                <Users size={20} className="category-icon-svg" />
                Public
              </button>
              <button 
                className={`category-btn ${visibility === 'private' ? 'active' : ''}`}
                onClick={() => setVisibility('private')}
              >
                <Target size={20} className="category-icon-svg" />
                Private
              </button>
            </div>
          </div>

          <div className="form-section">
            <h4>Category</h4>
            <div className="category-options">
              <button 
                className={`category-btn ${category === 'LINUX' ? 'active' : ''}`}
                onClick={() => setCategory('LINUX')}
              >
                <Monitor size={20} className="category-icon-svg" />
                Linux
              </button>
              <button 
                className={`category-btn ${category === 'NETWORK' ? 'active' : ''}`}
                onClick={() => setCategory('NETWORK')}
              >
                <Wifi size={20} className="category-icon-svg" />
                Network
              </button>
            </div>
          </div>

          <div className="form-section">
            <h4>Number of Questions</h4>
            <div className="question-options">
              {[10, 20, 30].map((count) => (
                <button
                  key={count}
                  className={`question-btn ${questionCount === count ? 'active' : ''}`}
                  onClick={() => setQuestionCount(count)}
                >
                  <span className="question-count">{count}</span>
                  <span className="question-time">{getDurationText(count)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h4>Game Mode</h4>
            <div className="mode-options">
              <button 
                className={`mode-btn ${mode === 'normal' ? 'active' : ''}`}
                onClick={() => setMode('normal')}
              >
                <Trophy size={24} />
                <div className="mode-info">
                  <span className="mode-name">Normal Game</span>
                  <span className="mode-desc">Both players earn their XP</span>
                </div>
              </button>
              <button 
                className={`mode-btn ${mode === 'bloody' ? 'active' : ''}`}
                onClick={() => setMode('bloody')}
              >
                <Flame size={24} />
                <div className="mode-info">
                  <span className="mode-name">Bloody Mode</span>
                  <span className="mode-desc">Winner takes all XP</span>
                </div>
              </button>
            </div>
          </div>

          <button 
            onClick={handleCreateMatch} 
            className="btn btn-primary btn-large"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Match'}
          </button>
        </div>

        {matchHistory.length > 0 && (
          <div className="match-history-section">
            <h3>Recent Matches</h3>
            <div className="match-history-list">
              {matchHistory.map((match, idx) => (
                <div key={idx} className={`history-item ${match.result}`}>
                  <div className="history-result">
                    <span className={`result-badge ${match.result}`}>
                      {match.result === 'win' ? 'W' : match.result === 'loss' ? 'L' : 'D'}
                    </span>
                  </div>
                  <div className="history-info">
                    <div className="history-opponent">vs {match.opponentName}</div>
                    <div className="history-details">
                      <span>{match.myScore} - {match.opponentScore}</span>
                      <span>•</span>
                      <span>{match.category}</span>
                      <span>•</span>
                      <span>+{match.xpGained} XP</span>
                    </div>
                  </div>
                  <div className="history-date">
                    {formatDate(match.date)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
