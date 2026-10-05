import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Clock, ShoppingBag, Crown, Trophy, Medal, Coins } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import SeasonBox from '../components/SeasonBox';
import AvatarFrame from '../components/AvatarFrame';
import NameEffectRenderer from '../components/NameEffectRenderer';
import '../styles/AvatarFrame.css';
import '../styles/NameEffects.css';
import '../styles/Season.css';

export default function Season() {
  const { user, updateUser } = useContext(AuthContext);
  const [competitiveData, setCompetitiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    fetchCompetitiveLeaderboard();
  }, []);

  useEffect(() => {
    if (!competitiveData) return;
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [competitiveData]);

  const updateTimeRemaining = () => {
    if (!competitiveData) return;
    const remaining = new Date(competitiveData.endDate).getTime() - Date.now();
    if (remaining <= 0) {
      setTimeRemaining('Resetting...');
      fetchCompetitiveLeaderboard();
      return;
    }
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    setTimeRemaining(`${h}h ${m}m ${s}s`);
  };

  const fetchCompetitiveLeaderboard = async (retries = 2) => {
    try {
      const res = await fetch(`${API_URL}/competitive/leaderboard`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCompetitiveData(data);
    } catch {
      if (retries > 0) setTimeout(() => fetchCompetitiveLeaderboard(retries - 1), 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="season-page">
      <div className="container">

        {/* Season header card */}
        <div className="season-header-card">
          <div className="season-header-left">
            <div className="season-header-title">
              <Zap size={20} className="season-header-icon" />
              <span>Competitive Season</span>
            </div>
            
          </div>
          <div className="season-header-right">
            <div className="season-timer">
              <Clock size={15} />
              <span>{loading ? '...' : timeRemaining}</span>
            </div>
            <Link to="/shop" className="season-shop-link">
              <ShoppingBag size={14} />
              View Shop
            </Link>
          </div>
        </div>

        {/* Main content: SeasonBox left, Leaderboard right */}
        <div className="season-main-card">
          {/* Season Box */}
          <div className="season-box-section">
            <h3 className="season-section-title">Season Box</h3>
            {user ? (
              <SeasonBox
                userGold={user.gold ?? 0}
                onGoldChange={(g) => updateUser({ gold: g })}
                onInventoryChange={(inv) => updateUser({ inventory: inv })}
              />
            ) : (
              <div className="season-login-prompt">
                <p>Log in to open Season Boxes</p>
                <Link to="/login" className="btn btn-primary">Login</Link>
              </div>
            )}
          </div>

          {/* Competitive Leaderboard */}
          <div className="season-leaderboard-section">
            <h3 className="season-section-title">Rankings</h3>
            {loading ? (
              <div className="season-loading">
                <div className="loading-spinner" />
              </div>
            ) : competitiveData ? (
              <div className="season-lb-list">
                {competitiveData.leaderboard.length === 0 ? (
                  <div className="season-lb-empty">
                    <Zap size={40} />
                    <p>No competitors yet. Be the first!</p>
                  </div>
                ) : (
                  competitiveData.leaderboard.map((entry) => (
                    <div key={entry.rank} className={`season-lb-item rank-${entry.rank}`}>
                      <div className="season-lb-rank">
                        <span className="season-lb-num">#{entry.rank}</span>
                        {entry.rank === 1 && <Crown size={18} className="rank-icon gold" />}
                        {entry.rank === 2 && <Trophy size={16} className="rank-icon silver" />}
                        {entry.rank === 3 && <Medal size={15} className="rank-icon bronze" />}
                      </div>
                      <AvatarFrame frame={entry.activeFrame} size={32} />
                      <div className="season-lb-user">
                        <span className="season-lb-name-wrap">
                          <NameEffectRenderer effect={entry.activeNameEffect}>
                            <Link to={`/profile/${entry.username}`} className="season-lb-username">
                              {entry.username}
                            </Link>
                          </NameEffectRenderer>
                        </span>
                        <span className="season-lb-level">Lv. {entry.level}</span>
                      </div>
                      <div className="season-lb-stats">
                        <span className="season-lb-xp">
                          <Zap size={13} /> {entry.xpEarned.toLocaleString()} XP
                        </span>
                        <span className="season-lb-gold">
                          <Coins size={13} /> {entry.goldReward}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
}
