import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Terminal, Network, LayoutGrid, Flame } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import '../styles/Register.css';

const GOALS = [
  { id: 'acadnet',    label: 'Acadnet Prep',   icon: GraduationCap, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.3)' },
  { id: 'linux',      label: 'Linux',          icon: Terminal,      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)' },
  { id: 'networking', label: 'Networking',     icon: Network,       color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)' },
  { id: 'all',        label: 'All Categories', icon: LayoutGrid,    color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.3)'  },
];

const LEVELS = [
  { id: 'beginner',     label: 'Beginner',     desc: 'Just getting started' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Some experience already' },
  { id: 'expert',       label: 'Expert',       desc: 'Ready for a challenge' },
];

const STREAKS = [
  { days: 7,  gold: 40,  label: '7 days' },
  { days: 14, gold: 100, label: '14 days' },
  { days: 30, gold: 225, label: '30 days' },
];

export default function Onboarding() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [goal, setGoal]             = useState(null);
  const [level, setLevel]           = useState(null);
  const [streakGoal, setStreakGoal] = useState(null);
  const [saving, setSaving]         = useState(false);

  if (!user) { navigate('/login'); return null; }

  const handleSave = async () => {
    if (!goal || !level || !streakGoal) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/profile/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ goal, level, streakGoal }),
      });
    } finally {
      navigate('/progress');
    }
  };

  return (
    <div className="register-page">
      <div className="register-card" style={{ gridTemplateColumns: '1fr' }}>
        <div className="register-right" style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>

          <div className="register-right-header">
            <h1>Customize your experience</h1>
            <p>Help us tailor the platform to you, takes 30 seconds.</p>
          </div>

          <div className="register-onboarding">
            {/* Goal */}
            <div className="register-ob-section">
              <div className="register-ob-label">What's your goal?</div>
              <div className="register-ob-grid">
                {GOALS.map(g => (
                  <button
                    key={g.id}
                    className={`register-ob-card ${goal === g.id ? 'selected' : ''}`}
                    style={goal === g.id ? { borderColor: g.color, background: g.bg } : {}}
                    onClick={() => setGoal(g.id)}
                  >
                    <div className="register-ob-card-icon" style={{ color: g.color, background: g.bg, border: `1px solid ${g.border}` }}>
                      <g.icon size={18} />
                    </div>
                    <span style={goal === g.id ? { color: g.color } : {}}>{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Level */}
            <div className="register-ob-section">
              <div className="register-ob-label">What's your level?</div>
              <div className="register-ob-row">
                {LEVELS.map(l => (
                  <button
                    key={l.id}
                    className={`register-ob-level ${level === l.id ? 'selected' : ''}`}
                    onClick={() => setLevel(l.id)}
                  >
                    <strong>{l.label}</strong>
                    <span>{l.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Streak */}
            <div className="register-ob-section">
              <div className="register-ob-label">Your streak goal</div>
              <div className="register-ob-row">
                {STREAKS.map(s => (
                  <button
                    key={s.days}
                    className={`register-ob-streak ${streakGoal === s.days ? 'selected' : ''}`}
                    onClick={() => setStreakGoal(s.days)}
                  >
                    <Flame size={16} className="register-ob-streak-icon" />
                    <strong>{s.label}</strong>
                    <span>🪙 {s.gold} gold</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              className="register-submit"
              onClick={handleSave}
              disabled={!goal || !level || !streakGoal || saving}
            >
              {saving ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
