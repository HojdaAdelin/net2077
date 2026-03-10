import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Trophy, Medal, Award, Crown, User, Coins, Clock, Zap, ShoppingBag } from 'lucide-react';
import { getLeaderboard } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { API_URL } from '../config';
import '../styles/Leaderboard.css';

export default function Leaderboard() {
  const { t } = useLanguage();
  const { tab } = useParams();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [competitiveData, setCompetitiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [activeTab, setActiveTab] = useState(tab === 'season' ? 'competitive' : 'alltime'); 

  useEffect(() => {
    fetchLeaderboard();
    fetchCompetitiveLeaderboard();
  }, []);

  useEffect(() => {
    // Update activeTab when URL parameter changes
    setActiveTab(tab === 'season' ? 'competitive' : 'alltime');
  }, [tab]);

  useEffect(() => {
    if (competitiveData) {
      const interval = setInterval(() => {
        updateTimeRemaining();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [competitiveData]);

  const updateTimeRemaining = () => {
    if (!competitiveData) return;
    
    const now = new Date().getTime();
    const end = new Date(competitiveData.endDate).getTime();
    const remaining = end - now;
    
    if (remaining <= 0) {
      setTimeRemaining('Resetting...');
      fetchCompetitiveLeaderboard();
      return;
    }
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
  };

  const fetchCompetitiveLeaderboard = async () => {
    try {
      const response = await fetch(`${API_URL}/competitive/leaderboard`);
      const data = await response.json();
      setCompetitiveData(data);
    } catch (error) {
      console.error('Error loading competitive leaderboard:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await getLeaderboard();
      
      if (data.success) {
        setLeaderboard(data.leaderboard);
      } else {
        setError('Failed to load leaderboard');
      }
    } catch (error) {
      setError('Network error loading leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    const urlTab = tabName === 'competitive' ? 'season' : 'alltime';
    navigate(`/leaderboard/${urlTab}`, { replace: true });
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="rank-icon gold" size={24} />;
      case 2:
        return <Trophy className="rank-icon silver" size={22} />;
      case 3:
        return <Medal className="rank-icon bronze" size={20} />;
      default:
        return <Award className="rank-icon default" size={18} />;
    }
  };

  const getRankClass = (rank) => {
    switch (rank) {
      case 1:
        return 'rank-1';
      case 2:
        return 'rank-2';
      case 3:
        return 'rank-3';
      default:
        return 'rank-default';
    }
  };

  if (loading) {
    return (
      <div className="container leaderboard-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>{t('leaderboard.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container leaderboard-page">
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchLeaderboard} className="btn btn-primary">
            {t('leaderboard.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <div className="container">
        <div className="leaderboard-header">
          <h1>{t('leaderboard.title')}</h1>
          <p>{t('leaderboard.subtitle')}</p>
        </div>

        <div className="leaderboard-tabs">
          <div 
            className={`leaderboard-tab ${activeTab === 'alltime' ? 'active' : ''}`}
            onClick={() => handleTabChange('alltime')}
          >
            <Trophy size={20} />
            All-Time Rankings
          </div>
          <div 
            className={`leaderboard-tab ${activeTab === 'competitive' ? 'active' : ''}`}
            onClick={() => handleTabChange('competitive')}
          >
            <Zap size={20} />
            Competitive (24h)
          </div>
        </div>

      
        {activeTab === 'competitive' && competitiveData && (
          <div className="competitive-leaderboard-section">
            <div className="competitive-header">
              <div className="competitive-title">
                <Zap size={24} className="competitive-icon" />
                <div>
                  <h2>Competitive Season #{competitiveData.periodNumber}</h2>
                  <p>Top 5 players earn Gold rewards every 24 hours</p>
                </div>
              </div>
              <div className="competitive-actions">
                <div className="competitive-timer">
                  <Clock size={20} />
                  <div className="timer-content">
                    <span className="timer-label">Resets in</span>
                    <span className="timer-value">{timeRemaining}</span>
                  </div>
                </div>
                <Link to="/shop" className="competitive-shop-link">
                  <ShoppingBag size={18} />
                  Visit Shop
                </Link>
              </div>
            </div>

            <div className="competitive-leaderboard-list">
              {competitiveData.leaderboard.length === 0 ? (
                <div className="empty-competitive">
                  <Zap size={48} />
                  <p>No competitors yet. Be the first to earn XP!</p>
                </div>
              ) : (
                competitiveData.leaderboard.map((user) => (
                  <div key={user.rank} className={`competitive-item rank-${user.rank}`}>
                    <div className="competitive-rank">
                      <div className="rank-number">#{user.rank}</div>
                      {user.rank === 1 && <Crown className="rank-icon gold" size={24} />}
                      {user.rank === 2 && <Trophy className="rank-icon silver" size={22} />}
                      {user.rank === 3 && <Medal className="rank-icon bronze" size={20} />}
                    </div>
                    
                    <div className="competitive-user">
                      <Link to={`/profile/${user.username}`} className="competitive-username">
                        {user.username}
                      </Link>
                      <div className="competitive-level">Level {user.level}</div>
                    </div>
                    
                    <div className="competitive-xp">
                      <Zap size={16} />
                      <span>{user.xpEarned.toLocaleString()} XP</span>
                    </div>
                    
                    <div className="competitive-reward">
                      <Coins size={18} className="gold-icon" />
                      <span className="gold-amount">{user.goldReward}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'alltime' && (
        <div className="leaderboard-container">
          {leaderboard.length === 0 ? (
            <div className="empty-leaderboard">
              <Trophy size={48} className="empty-icon" />
              <h3>{t('leaderboard.noRankings')}</h3>
              <p>{t('leaderboard.noRankingsDesc')}</p>
            </div>
          ) : (
            <div className="leaderboard-list">
              {leaderboard.map((user) => (
                <div key={user.rank} className={`leaderboard-item ${getRankClass(user.rank)}`}>
                  <div className="rank-section">
                    <div className="rank-number">#{user.rank}</div>
                    {getRankIcon(user.rank)}
                  </div>
                  
                  <div className="user-info">
                    <div className="username">
                      <Link 
                        to={`/profile/${user.username}`} 
                        className="leaderboard-username-link"
                        title={`View ${user.username}'s profile`}
                      >
                        {user.username}
                      </Link>
                      <Link 
                        to={`/profile/${user.username}`} 
                        className="leaderboard-profile-link"
                        title={`View ${user.username}'s profile`}
                      >
                        <User size={14} />
                      </Link>
                    </div>
                    <div className="level">{t('leaderboard.level')} {user.level}</div>
                  </div>
                  
                  <div className="xp-section">
                    <div className="xp-amount">{user.xp.toLocaleString()}</div>
                    <div className="xp-label">XP</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}