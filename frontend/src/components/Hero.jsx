import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
  ArrowRight, Flame, Terminal, Network, Code,
  Check, X, UserPlus, BookOpen, Zap, Trophy
} from 'lucide-react';
import '../styles/Hero.css';

const TRACKS = [
  {
    icon: Terminal,
    number: '01',
    title: 'Linux & Terminal',
    description: 'Learn to navigate the terminal with confidence. Files, permissions, processes, scripting, the stuff you actually use.',
    tags: ['Commands', 'Scripting'],
    primary: { to: '/grile?filter=linux', label: 'Start Learning' },
    secondary: { to: '/terminal', label: 'Try Terminal' },
  },
  {
    icon: Network,
    number: '02',
    title: 'Networking',
    description: 'Understand how the internet works under the hood. IP, routing, protocols and why your packets end up where they do.',
    tags: ['Protocols', 'Security'],
    primary: { to: '/grile?filter=network', label: 'Start Learning' },
    secondary: { to: '/grile', label: 'Practice Quiz' },
  },
  {
    icon: Code,
    number: '03',
    title: 'Programming & Debug',
    description: 'Write, test and fix code under pressure. Real problems, real feedback, the kind you get in competitions.',
    tags: ['C++', 'Debugging'],
    primary: { to: '/is', label: 'Start Coding' },
    secondary: { to: '/grile', label: 'View Theory' },
  },
];

const EXAMS = [
  { to: '/exam/acadnet2026local_11_12', meta: 'LOCAL · XI-XII', title: 'AcadNet 2026', info: '50 Questions · Medium' },
  { to: '/exam/acadnet2026county_11_12', meta: 'COUNTY · XI-XII', title: 'AcadNet 2026', info: '50 Questions · Hard' },
  { to: '/exam/acadnet2023national_11_12', meta: 'NATIONAL · XI-XII', title: 'AcadNet 2023', info: '50 Questions · Hard' },
  { to: '/exam/linux_permissions', meta: 'MISCELLANEOUS', title: 'Linux Permissions', info: '20 Questions · Medium' },
];

const FEATURES_GUEST = [
  { label: 'Access to all questions', available: true },
  { label: 'Access to all resources', available: true },
  { label: 'Track your progress', available: false },
  { label: 'Exam sessions', available: false },
  { label: 'Daily challenges', available: false },
  { label: 'Terminal practice', available: false },
];

const FEATURES_USER = [
  { label: 'Access to all questions', available: true },
  { label: 'Access to all resources', available: true },
  { label: 'Track your progress', available: true },
  { label: 'Exam sessions', available: true },
  { label: 'Daily challenges', available: true },
  { label: 'Terminal practice', available: true },
];

export default function Hero() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ totalQuestions: 0, totalUsers: 0, totalResources: 0 });
  const [display, setDisplay] = useState({ totalQuestions: 0, totalUsers: 0, totalResources: 0 });

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (!stats.totalQuestions && !stats.totalUsers && !stats.totalResources) return;
    const steps = 60;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      const p = step / steps;
      setDisplay({
        totalQuestions: Math.floor(stats.totalQuestions * p),
        totalUsers: Math.floor(stats.totalUsers * p),
        totalResources: Math.floor(stats.totalResources * p),
      });
      if (step >= steps) { setDisplay(stats); clearInterval(iv); }
    }, 2000 / steps);
    return () => clearInterval(iv);
  }, [stats]);

  return (
    <div className="hero-root">

      <section className="h-hero">
        <div className="h-container">
          <div className="h-badge">
            <Zap size={13} />
            <span>Applied Informatics Platform</span>
          </div>
          <h1 className="h-title">Master Applied<br />Informatics</h1>
          <p className="h-sub">
            Linux, networking and programming, practiced through real challenges,
            real tests and head-to-head battles.
          </p>
          <div className="h-cta">
            <Link to="/grile" className="h-btn-primary">
              Start Learning <ArrowRight size={16} />
            </Link>
            <Link to="/learn" className="h-btn-secondary">View Roadmaps</Link>
            <Link to="/leaderboard/season" className="h-btn-season">
              <Flame size={15} /> Season
            </Link>
          </div>
          <div className="h-stats">
            <div className="h-stat">
              <span className="h-stat-num">{display.totalQuestions}+</span>
              <span className="h-stat-label">Questions</span>
            </div>
            <div className="h-stat-divider" />
            <div className="h-stat">
              <span className="h-stat-num">{display.totalUsers}</span>
              <span className="h-stat-label">Learners</span>
            </div>
            <div className="h-stat-divider" />
            <div className="h-stat">
              <span className="h-stat-num">{display.totalResources}</span>
              <span className="h-stat-label">Roadmaps</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tracks ── */}
      <section className="h-section">
        <div className="h-container">
          <div className="h-section-header">
            <h2 className="h-section-title">Pick your track</h2>
            <p className="h-section-sub">Three paths, each with its own depth. Start anywhere.</p>
          </div>

          <div className="h-tracks">
            {TRACKS.map((track) => {
              const Icon = track.icon;
              return (
                <div key={track.number} className="h-track-card">
                  <div className="h-track-top">
                    <div className="h-track-circle">
                      <Icon size={22} />
                    </div>
                    <span className="h-track-num">{track.number}</span>
                  </div>
                  <h3 className="h-track-title">{track.title}</h3>
                  <p className="h-track-desc">{track.description}</p>
                  <div className="h-track-tags">
                    {track.tags.map(t => <span key={t} className="h-tag">{t}</span>)}
                  </div>
                  <div className="h-track-actions">
                    <Link to={track.primary.to} className="h-track-primary">{track.primary.label} <ArrowRight size={14} /></Link>
                    <Link to={track.secondary.to} className="h-track-secondary">{track.secondary.label}</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="h-section h-section-alt">
        <div className="h-container">
          <div className="h-section-header h-section-header-row">
            <div>
              <h2 className="h-section-title">Competitive Exams</h2>
              <p className="h-section-sub">Timed simulations based on real competition formats.</p>
            </div>
            <Link to="/exam-selection" className="h-view-all">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="h-exams">
            {EXAMS.map((exam) => (
              <Link key={exam.to} to={exam.to} className="h-exam-card">
                <span className="h-exam-meta">{exam.meta}</span>
                <h3 className="h-exam-title">{exam.title}</h3>
                <span className="h-exam-info">{exam.info}</span>
                <span className="h-exam-arrow"><ArrowRight size={15} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {!user && (
        <section className="h-section">
          <div className="h-container">
            <div className="h-section-header">
              <h2 className="h-section-title">Free to start, better with an account</h2>
              <p className="h-section-sub">You can browse questions without signing up. But you'll want to track where you're going.</p>
            </div>

            <div className="h-benefits">
              <div className="h-benefits-col">
                <div className="h-benefits-label">Without account</div>
                <ul className="h-benefits-list">
                  {FEATURES_GUEST.map(f => (
                    <li key={f.label} className={`h-benefit-item ${f.available ? 'yes' : 'no'}`}>
                      {f.available ? <Check size={15} /> : <X size={15} />}
                      <span>{f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="h-benefits-col h-benefits-col-featured">
                <div className="h-benefits-label">With account</div>
                <ul className="h-benefits-list">
                  {FEATURES_USER.map(f => (
                    <li key={f.label} className="h-benefit-item yes">
                      <Check size={15} />
                      <span>{f.label}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="h-register-btn">
                  <UserPlus size={16} /> Create free account
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
