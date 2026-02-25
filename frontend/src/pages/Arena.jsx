import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Trophy, Swords, Loader2 } from 'lucide-react';
import { API_URL } from '../config';
import '../styles/Arena.css';

export default function Arena() {
  const { user } = useContext(AuthContext);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLeaderboard();
      loadMyStats();
    }
  }, [user]);

  const loadLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const response = await fetch(`${API_URL}/arena/leaderboard`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const loadMyStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch(`${API_URL}/arena/my-stats`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setMyStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="arena-page">
        <div className="arena-auth-notice">
          <Swords size={64} />
          <h2>Login Required</h2>
          <p>Please login to access the Arena and compete with other players.</p>
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container arena-page">
      <h1 className="arena-new-main-title">Arena</h1>
      
      <div className="arena-new-main-grid">
        <div className="arena-new-leaderboard-card">
          <div className="arena-new-card-header">
            <Trophy size={24} />
            <h2>Leaderboard</h2>
          </div>
          <div className="arena-new-leaderboard-list">
            {leaderboardLoading ? (
              <div className="arena-new-loading-state">
                <Loader2 size={32} className="spinner" />
                <p>Loading leaderboard...</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="arena-new-empty-state">
                <p>No players yet. Be the first!</p>
              </div>
            ) : (
              leaderboard.map((player, idx) => (
                <div key={idx} className="arena-new-leaderboard-item">
                  <div className="arena-new-rank">#{idx + 1}</div>
                  <div className="arena-new-player-info">
                    <div className="arena-new-player-name">{player.username}</div>
                    <div className="arena-new-player-stats">
                      {player.wins}W / {player.losses}L • {player.winRate}% WR
                    </div>
                  </div>
                  <div className="arena-new-player-xp">{player.totalXP} XP</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="arena-new-play-card">
          <div className="arena-new-card-header">
            <Swords size={24} />
            <h2>Play Now</h2>
          </div>
          <div className="arena-new-play-card-content">
            <div className="arena-new-stats-overview">
              {statsLoading ? (
                <div className="arena-new-loading-state arena-new-stats-loading">
                  <Loader2 size={32} className="spinner" />
                  <p>Loading stats...</p>
                </div>
              ) : myStats ? (
                <>
                  <div className="arena-new-stat-item">
                    <div className="arena-new-stat-value">{myStats.wins}</div>
                    <div className="arena-new-stat-label">Wins</div>
                  </div>
                  <div className="arena-new-stat-item">
                    <div className="arena-new-stat-value">{myStats.losses}</div>
                    <div className="arena-new-stat-label">Losses</div>
                  </div>
                  <div className="arena-new-stat-item">
                    <div className="arena-new-stat-value">{myStats.totalXP}</div>
                    <div className="arena-new-stat-label">Total XP</div>
                  </div>
                </>
              ) : null}
            </div>
            <Link to="/arena/play" className="btn btn-primary btn-large arena-new-play-btn">
              <Swords size={20} />
              Start Playing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
