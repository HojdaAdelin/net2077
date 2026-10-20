import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { getLeaderboard } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
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

function MyLeaderboardPosition() {
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(`${API_URL}/leaderboard/me`, { credentials: 'include', signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error('Unable to load position');
        if (!controller.signal.aborted) setEntry(data.entry);
      })
      .catch(error => { if (error.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, [retry]);
  return (
    <section className="lb-my-position" aria-labelledby="lb-my-position-heading">
      <h2 id="lb-my-position-heading">Your position</h2>
      {error ? <div className="lb-position-message" role="alert">
        Could not load your position.
        <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button>
      </div> : entry ? <ListRow entry={entry} index={0} /> :
        <p className="lb-position-message" role="status">Loading your position...</p>}
    </section>
  );
}

export default function Leaderboard() {
  const { user } = useContext(AuthContext);
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

        {user && <MyLeaderboardPosition key={user.id || user.username} />}
      </div>
    </div>
  );
}
