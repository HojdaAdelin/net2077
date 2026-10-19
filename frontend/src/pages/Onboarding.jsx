import { useState, useContext } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Terminal, Network, LayoutGrid, Flame, Coins, Check, ArrowLeft } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import '../styles/Onboarding.css';

const GOALS = [
  { id: 'acadnet', label: 'AcadNet Prep', Icon: GraduationCap, color: '#8b5cf6' },
  { id: 'linux', label: 'Linux', Icon: Terminal, color: '#d99119' },
  { id: 'networking', label: 'Networking', Icon: Network, color: '#3b82f6' },
  { id: 'all', label: 'All Categories', Icon: LayoutGrid, color: '#0891b2' },
];
const LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'Just getting started' },
  { id: 'intermediate', label: 'Intermediate', description: 'Some experience already' },
  { id: 'expert', label: 'Expert', description: 'Ready for a challenge' },
];
const STREAKS = [{ days: 7, gold: 40 }, { days: 14, gold: 100 }, { days: 30, gold: 225 }];

function Choice({ name, value, selected, onChange, children }) {
  return (
    <label className={`onboarding-choice${selected ? ' is-selected' : ''}`}>
      <input type="radio" name={name} value={value} checked={selected} onChange={onChange} required />
      <span className="onboarding-choice-content">{children}</span>
      <span className="onboarding-choice-indicator" aria-hidden="true">{selected && <Check size={11} />}</span>
    </label>
  );
}

export default function Onboarding() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [level, setLevel] = useState(null);
  const [streakGoal, setStreakGoal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user) return <Navigate to="/login" replace />;

  const handleSave = async event => {
    event.preventDefault();
    if (!goal || !level || !streakGoal || saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/profile/onboarding`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ goal, level, streakGoal }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Could not save your profile. Please try again.');
      }
      navigate('/progress');
    } catch (error) {
      setError(error.message || 'Could not save your profile. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <main className="onboarding-page">
      <Link to="/progress" className="onboarding-back"><ArrowLeft size={16} aria-hidden="true" /> Back to Progress</Link>
      <header className="onboarding-heading">
        <h1>Customize your learning</h1>
        <p>Choose your focus, experience level, and a streak goal.</p>
      </header>

      <form className="onboarding-form" onSubmit={handleSave} aria-busy={saving}>
        <div className="onboarding-section">
          <div className="onboarding-section-heading">
            <h2 id="onboarding-goal-heading">Learning goal</h2>
            <p>What would you like to focus on?</p>
          </div>
          <fieldset className="onboarding-options onboarding-options--goals" disabled={saving} aria-labelledby="onboarding-goal-heading">
            {GOALS.map(({ id, label, Icon, color }) => (
              <Choice key={id} name="goal" value={id} selected={goal === id} onChange={() => setGoal(id)}>
                <span className="onboarding-goal-label"><Icon size={19} style={{ color }} aria-hidden="true" /><strong>{label}</strong></span>
              </Choice>
            ))}
          </fieldset>
        </div>

        <div className="onboarding-section">
          <div className="onboarding-section-heading">
            <h2 id="onboarding-level-heading">Experience level</h2>
            <p>Pick the description that fits you.</p>
          </div>
          <fieldset className="onboarding-options" disabled={saving} aria-labelledby="onboarding-level-heading">
            {LEVELS.map(({ id, label, description }) => (
              <Choice key={id} name="level" value={id} selected={level === id} onChange={() => setLevel(id)}>
                <strong>{label}</strong><span className="onboarding-choice-note">{description}</span>
              </Choice>
            ))}
          </fieldset>
        </div>

        <div className="onboarding-section">
          <div className="onboarding-section-heading">
            <h2 id="onboarding-streak-heading">Streak goal</h2>
            <p>Build a habit, one day at a time.</p>
          </div>
          <fieldset className="onboarding-options" disabled={saving} aria-labelledby="onboarding-streak-heading">
            {STREAKS.map(({ days, gold }) => (
              <Choice key={days} name="streak" value={days} selected={streakGoal === days} onChange={() => setStreakGoal(days)}>
                <span className="onboarding-streak-label"><Flame size={16} aria-hidden="true" /><strong>{days} days</strong></span>
                <span className="onboarding-choice-note onboarding-gold"><Coins size={13} aria-hidden="true" /> {gold} gold</span>
              </Choice>
            ))}
          </fieldset>
        </div>

        <footer className="onboarding-footer">
          {error && <p className="onboarding-error" role="alert">{error}</p>}
          <p className="onboarding-footer-note">You can update these choices from Progress.</p>
          <button type="submit" className="onboarding-save" disabled={!goal || !level || !streakGoal || saving}>
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </footer>
      </form>
    </main>
  );
}
