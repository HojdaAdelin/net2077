import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye, EyeOff, ShieldCheck, Zap, Trophy, BookOpen,
  UserCircle, ArrowRight, GraduationCap, Terminal, Network, LayoutGrid,
  Flame
} from 'lucide-react';
import { register as apiRegister } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { API_URL } from '../config';
import '../styles/Register.css';

const GOALS = [
  { id: 'acadnet',    label: 'Acadnet Prep',  icon: GraduationCap, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.3)' },
  { id: 'linux',      label: 'Linux',         icon: Terminal,      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  { id: 'networking', label: 'Networking',    icon: Network,       color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
  { id: 'all',        label: 'All Categories',icon: LayoutGrid,    color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',  border: 'rgba(6,182,212,0.3)'  },
];

const LEVELS = [
  { id: 'beginner',     label: 'Beginner',     desc: 'Just getting started' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Some experience already' },
  { id: 'expert',       label: 'Expert',       desc: 'Ready for a challenge' },
];

const STREAKS = [
  { days: 7,  gold: 40,  label: '7 days',  sub: '40 gold reward' },
  { days: 14, gold: 100, label: '14 days', sub: '100 gold reward' },
  { days: 30, gold: 225, label: '30 days', sub: '225 gold reward' },
];

const PERKS = [
  { icon: BookOpen,    title: 'Learn & Practice', desc: '2000+ questions on Linux, Networking & Debugging' },
  { icon: Trophy,      title: 'Leaderboards',     desc: 'Compete and climb the ranks' },
  { icon: Zap,         title: 'Arena Battles',    desc: 'Real-time 1v1 competitive mode' },
  { icon: ShieldCheck, title: 'Free Forever',     desc: 'No paywalls, no hidden fees' },
];

const getPasswordStrength = (pass) => {
  if (!pass) return { strength: 0, label: '', color: '' };
  let s = 0;
  if (pass.length >= 8) s++;
  if (pass.length >= 12) s++;
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) s++;
  if (/\d/.test(pass)) s++;
  if (/[^a-zA-Z0-9]/.test(pass)) s++;
  if (s <= 2) return { strength: s, label: 'Weak',   color: 'var(--error)' };
  if (s <= 3) return { strength: s, label: 'Medium', color: 'var(--warning)' };
  return { strength: s, label: 'Strong', color: 'var(--success)' };
};

export default function Register() {
  const [step, setStep]                       = useState(1);
  const [username, setUsername]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                     = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [agreedToTerms, setAgreedToTerms]     = useState(false);

  const [goal, setGoal]           = useState(null);
  const [level, setLevel]         = useState(null);
  const [streakGoal, setStreakGoal] = useState(null);
  const [saving, setSaving]       = useState(false);

  const { login }  = useContext(AuthContext);
  const { t }      = useLanguage();
  const navigate   = useNavigate();

  const pwStrength   = getPasswordStrength(password);
  const pwMatch      = confirmPassword.length > 0 && password === confirmPassword;
  const pwMismatch   = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError(t('register.passwordRequirement')); return; }
    if (password !== confirmPassword) { setError(t('register.passwordMismatch')); return; }
    setLoading(true);
    try {
      const data = await apiRegister(username, email, password);
      if (data.success) { login(data.user); setStep(2); }
      else setError(data.message || 'Registration failed');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOnboarding = async () => {
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
      navigate('/');
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">

        {/* ── Left panel ── */}
        <div className="register-left">
          <div className="register-brand">
            <h2 className="register-brand-title">Join net2077</h2>
            <p className="register-brand-subtitle">
              Your Linux, Networking & Debugging learning hub. Train, compete, and level up your skills.
            </p>
          </div>

          <div className="register-perks">
            {PERKS.map(({ icon: Icon, title, desc }) => (
              <div className="register-perk" key={title}>
                <div className="register-perk-icon"><Icon size={16} /></div>
                <div className="register-perk-text">
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="register-right">

          {/* Step indicator */}
          <div className="register-steps">
            <div className={`register-step ${step >= 1 ? 'done' : ''}`}>
              <div className="register-step-dot">{step > 1 ? '✓' : '1'}</div>
              <span>Account</span>
            </div>
            <div className="register-step-line" />
            <div className={`register-step ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>
              <div className="register-step-dot">{step > 2 ? '✓' : '2'}</div>
              <span>Setup</span>
            </div>
            <div className="register-step-line" />
            <div className={`register-step ${step === 3 ? 'active' : ''}`}>
              <div className="register-step-dot">3</div>
              <span>Profile</span>
            </div>
          </div>

          {step === 1 && (
            <>
              <div className="register-right-header">
                <h1>{t('register.title')}</h1>
                <p>{t('register.subtitle')}</p>
              </div>

              {error && <div className="register-error">{error}</div>}

              <form onSubmit={handleSubmit} className="register-form" autoComplete="on">
                <div className="register-field">
                  <label className="register-label">{t('register.username')}</label>
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    placeholder={t('register.usernamePlaceholder')}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="register-input"
                    required
                  />
                </div>

                <div className="register-field">
                  <label className="register-label">{t('register.email')}</label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder={t('register.emailPlaceholder')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="register-input"
                    required
                  />
                </div>

                <div className="register-field">
                  <label className="register-label">{t('register.password')}</label>
                  <div className="register-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="new-password"
                      placeholder={t('register.passwordPlaceholder')}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="register-input"
                      required
                      minLength={6}
                    />
                    <button type="button" className="register-eye" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {password && (
                    <div className="register-strength">
                      <div className="register-strength-bars">
                        {[1,2,3,4,5].map(b => (
                          <div
                            key={b}
                            className="register-strength-bar"
                            style={{ background: b <= pwStrength.strength ? pwStrength.color : 'var(--border)' }}
                          />
                        ))}
                      </div>
                      <span className="register-strength-label" style={{ color: pwStrength.color }}>
                        {pwStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="register-field">
                  <label className="register-label">{t('register.confirmPassword')}</label>
                  <div className="register-input-wrap">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      name="confirmPassword"
                      autoComplete="new-password"
                      placeholder={t('register.confirmPasswordPlaceholder')}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="register-input"
                      required
                      minLength={6}
                    />
                    <button type="button" className="register-eye" onClick={() => setShowConfirm(v => !v)}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pwMatch    && <div className="register-match ok">✓ Passwords match</div>}
                  {pwMismatch && <div className="register-match no">✗ Passwords don't match</div>}
                </div>

                <button type="submit" className="register-submit" disabled={loading || !agreedToTerms}>
                  {loading ? 'Creating account...' : t('register.createAccount')}
                </button>

                <div className="register-terms-row">
                  <input
                    type="checkbox"
                    id="terms-check"
                    className="register-terms-check"
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                  />
                  <label htmlFor="terms-check" className="register-terms-label">
                    I agree to the{' '}
                    <Link to="/terms" target="_blank" rel="noopener noreferrer" className="register-terms-link">
                      Terms &amp; Conditions
                    </Link>
                  </label>
                </div>
              </form>

              <div className="register-divider">{t('register.or')}</div>
              <div className="register-footer">
                {t('register.haveAccount')} <Link to="/login">{t('register.signIn')}</Link>
              </div>
            </>
          )}

          {/* ── Step 2: profile choice ── */}
          {step === 2 && (
            <div className="register-choice">
              <div className="register-right-header">
                <h1>Welcome, {username}!</h1>
                <p>Do you want to set up your profile now or jump straight in?</p>
              </div>

              <div className="register-choice-btns">
                <button className="register-choice-btn" onClick={() => setStep(3)}>
                  <div className="register-choice-icon"><UserCircle size={28} /></div>
                  <div className="register-choice-text">
                    <strong>Complete Profile</strong>
                    <span>Add a bio, avatar and more</span>
                  </div>
                  <ArrowRight size={18} className="register-choice-arrow" />
                </button>

                <button className="register-choice-btn secondary" onClick={() => navigate('/')}>
                  <div className="register-choice-icon"><ArrowRight size={28} /></div>
                  <div className="register-choice-text">
                    <strong>Skip for now</strong>
                    <span>Go straight to the platform</span>
                  </div>
                  <ArrowRight size={18} className="register-choice-arrow" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: onboarding ── */}
          {step === 3 && (
            <div className="register-onboarding">
              <div className="register-right-header">
                <h1>Customize your experience</h1>
                <p>Help us tailor the platform to you.</p>
              </div>

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

              {/* Streak goal */}
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
                onClick={handleSaveOnboarding}
                disabled={!goal || !level || !streakGoal || saving}
              >
                {saving ? 'Saving...' : 'Finish & Go to Platform'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
