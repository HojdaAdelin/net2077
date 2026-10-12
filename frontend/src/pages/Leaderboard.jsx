import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { getLeaderboard } from '../services/api';
import AvatarFrame from '../components/AvatarFrame';
import NameEffectRenderer from '../components/NameEffectRenderer';
import '../styles/AvatarFrame.css';
import '../styles/NameEffects.css';
import '../styles/Leaderboard.css';

const ROLE_CONFIG = {
  'helper':     { color: '#22c55e', label: 'Helper' },
  'mod':        { color: '#3b82f6', label: 'Moderator' },
  'head-mod':   { color: '#8b5cf6', label: 'Head Moderator' },
  'admin':      { color: '#f59e0b', label: 'Administrator' },
  'head-admin': { color: '#ef4444', label: 'Head Administrator' },
  'root':       { color: '#ec4899', label: 'Root' },
};


function StaffBadge({ role }) {
  const [visible, setVisible] = useState(false);
  const config = ROLE_CONFIG[role];
  if (!config) return null;
  return (
    <div
      className="lb-staff-badge"
      style={{ '--staff-color': config.color }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <Shield size={12} />
      {visible && (
        <div className="lb-staff-tooltip">
          <span className="lb-staff-tooltip-title">Staff</span>
          <span className="lb-staff-tooltip-role">{config.label}</span>
        </div>
      )}
    </div>
  );
}

function PodiumCard({ entry, position }) {
  if (!entry) return <div className="podium-card podium-empty" />;

  return (
    <div className={`podium-card podium-pos-${position}`}>
      <div className="podium-avatar">
        <AvatarFrame frame={entry.activeFrame} size={position === 1 ? 64 : 52} />
      </div>
      <div className="podium-username-wrap">
        <NameEffectRenderer effect={entry.activeNameEffect}>
          <Link to={`/profile/${entry.username}`} className="podium-username">
            {entry.username}
          </Link>
        </NameEffectRenderer>
        {entry.role && entry.role !== 'user' && <StaffBadge role={entry.role} />}
      </div>
      <div className="podium-level">Lv. {entry.level}</div>
      <div className="podium-xp">{entry.xp.toLocaleString()} XP</div>
      <div className="podium-base" />
    </div>
  );
}

function ListRow({ entry, index }) {
  return (
    <div className="lb-row" style={{ '--row-delay': `${index * 40}ms` }}>
      <span className="lb-row-rank">#{entry.rank}</span>
      <div className="lb-row-left">
        <AvatarFrame frame={entry.activeFrame} size={36} />
        <div className="lb-row-info">
          <div className="lb-row-name-line">
            <NameEffectRenderer effect={entry.activeNameEffect}>
              <Link to={`/profile/${entry.username}`} className="lb-row-username">
                {entry.username}
              </Link>
            </NameEffectRenderer>
            {entry.role && entry.role !== 'user' && <StaffBadge role={entry.role} />}
          </div>
          <span className="lb-row-level">Level {entry.level}</span>
        </div>
      </div>
      <div className="lb-row-xp">
        <span className="lb-row-xp-val">{entry.xp.toLocaleString()}</span>
        <span className="lb-row-xp-label">XP</span>
      </div>
    </div>
  );
}

export default function Leaderboard() {
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
    } catch {
      setError('Network error loading leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  if (loading) {
    return (
      <div className="lb-page">
        <div className="lb-loading">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lb-page">
        <div className="lb-error">
          <p>{error}</p>
          <button onClick={fetchLeaderboard} className="btn btn-primary">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="lb-page">
      <div className="container">

        <div className="lb-header">
          <h1 className="lb-title">Leaderboard</h1>
        </div>

        {leaderboard.length === 0 ? (
          <div className="lb-empty">
            <p>No rankings yet. Start practicing to get on the board.</p>
          </div>
        ) : (
          <>
            {/* Podium — top 3 */}
            <div className="lb-podium">
              <PodiumCard entry={top3[1]} position={2} />
              <PodiumCard entry={top3[0]} position={1} />
              <PodiumCard entry={top3[2]} position={3} />
            </div>

            {/* Rest — 4 to 10 */}
            {rest.length > 0 && (
              <div className="lb-list">
                {rest.map((entry, i) => (
                  <ListRow key={entry.rank} entry={entry} index={i} />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
