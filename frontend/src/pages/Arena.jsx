import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Trophy, Swords } from 'lucide-react';
import { API_URL } from '../config';
import '../styles/Arena.css';

export default function Arena() {
  const { user } = useContext(AuthContext);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);

  useEffect(() => {
    if (user) {
      loadLeaderboard();
      loadMyStats();
    }
  }, [user]);

  const loadLeaderboard = async () => {
    try {
      const response = await fetch(`${API_URL}/arena/leaderboard`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const loadMyStats = async () => {
    try {
      const response = await fetch(`${API_URL}/arena/my-stats`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setMyStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
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
      <h1 className="arena-main-title">Arena</h1>
      
      <div className="arena-main-grid">
        <div className="arena-leaderboard-card">
          <div className="card-header">
            <Trophy size={24} />
            <h2>Leaderboard</h2>
          </div>
          <div className="leaderboard-list">
            {leaderboard.length === 0 ? (
              <div className="empty-state">
                <p>No players yet. Be the first!</p>
              </div>
            ) : (
              leaderboard.map((player, idx) => (
                <div key={idx} className="leaderboard-item">
                  <div className="rank">#{idx + 1}</div>
                  <div className="player-info">
                    <div className="player-name">{player.username}</div>
                    <div className="player-stats">
                      {player.wins}W / {player.losses}L • {player.winRate}% WR
                    </div>
                  </div>
                  <div className="player-xp">{player.totalXP} XP</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="arena-play-card">
          <div className="card-header">
            <Swords size={24} />
            <h2>Play Now</h2>
          </div>
          <div className="play-card-content">
            <div className="stats-overview">
              {myStats && (
                <>
                  <div className="stat-item">
                    <div className="stat-value">{myStats.wins}</div>
                    <div className="stat-label">Wins</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{myStats.losses}</div>
                    <div className="stat-label">Losses</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{myStats.totalXP}</div>
                    <div className="stat-label">Total XP</div>
                  </div>
                </>
              )}
            </div>
            <Link to="/arena/play" className="btn btn-primary btn-large play-btn">
              <Swords size={20} />
              Start Playing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
