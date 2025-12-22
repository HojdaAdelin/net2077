import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { getLeaderboard } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Leaderboard.css';

export default function Leaderboard() {
  const { t } = useLanguage();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

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
          <p>Loading leaderboard...</p>
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
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <div className="container">
        <div className="leaderboard-header">
          <h1>Leaderboard</h1>
          <p>Top performers ranked by experience points</p>
        </div>

        <div className="leaderboard-container">
          {leaderboard.length === 0 ? (
            <div className="empty-leaderboard">
              <Trophy size={48} className="empty-icon" />
              <h3>No rankings yet</h3>
              <p>Be the first to earn XP and claim the top spot!</p>
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
                    <div className="username">{user.username}</div>
                    <div className="level">Level {user.level}</div>
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
      </div>
    </div>
  );
}