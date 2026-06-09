import { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStats } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
  ArrowRight, Terminal, Network, Code,
  Check, X, UserPlus,
  ChevronDown, Package, Cpu, HardDrive, Shield, Server, Box
} from 'lucide-react';
import MagicBento from './MagicBento';
import DarkVeil from './DarkVeil';
import '../styles/Hero.css';

const LINUX_CHAPTERS = [
  { id: 'CHAPTER3',  name: 'Packages',        icon: Package },
  { id: 'CHAPTER4',  name: 'Processes',        icon: Cpu },
  { id: 'CHAPTER5',  name: 'Users',            icon: UserPlus },
  { id: 'CHAPTER6',  name: 'Dev',              icon: Code },
  { id: 'CHAPTER7',  name: 'CLI',              icon: Terminal },
  { id: 'CHAPTER8',  name: 'Hardware',         icon: HardDrive },
  { id: 'CHAPTER9',  name: 'System',           icon: Server },
  { id: 'CHAPTER10', name: 'System Storage',   icon: HardDrive },
  { id: 'CHAPTER11', name: 'Network',          icon: Network },
  { id: 'CHAPTER12', name: 'Security',         icon: Shield },
  { id: 'CHAPTER14', name: 'VM',               icon: Box },
  { id: 'CHAPTER15', name: 'Embedded Systems', icon: Cpu },
];

const TRACKS = [
{
    icon: Terminal,
    number: '01',
    title: 'Linux & Terminal',
    description: 'Learn to navigate the terminal with confidence. Files, permissions, processes, scripting, the stuff you actually use.',
    tags: ['Commands', 'Scripting'],
    hasOverview: true,
  },
  {
    icon: Network,
    number: '02',
    title: 'Networking',
    description: 'Understand how the internet works under the hood. IP, routing, protocols and why your packets end up where they do.',
    tags: ['Protocols', 'Security'],
    primary: { to: '/grile?filter=network', label: 'Get Started' },
  },
  {
    icon: Code,
    number: '03',
    title: 'Programming & Debug',
    description: 'Write, test and fix code under pressure. Real problems, real feedback, the kind you get in competitions.',
    tags: ['C++', 'Debugging'],
    primary: { to: '/is', label: 'Get Started' },
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
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalQuestions: 0, totalUsers: 0, totalResources: 0 });
  const [display, setDisplay] = useState({ totalQuestions: 0, totalUsers: 0, totalResources: 0 });
  const [linuxOverviewOpen, setLinuxOverviewOpen] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState(null);

  // Typing effect for subtitle
  const SUBTITLE = 'A place for people who enjoy systems, networks, code and everything in between.';
  const [typedText, setTypedText] = useState('');
  const [typingDone, setTypingDone] = useState(false);

  useEffect(() => {
    let i = 0;
    // small delay before typing starts so title fade is visible first
    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setTypedText(SUBTITLE.slice(0, i));
        if (i >= SUBTITLE.length) {
          clearInterval(interval);
          setTypingDone(true);
        }
      }, 22);
      return () => clearInterval(interval);
    }, 600);
    return () => clearTimeout(delay);
  }, []);

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

  const handleStartTest = () => {
    if (!user) {
      navigate('/linux-start-test?requireAuth=1');
    } else {
      navigate('/linux-start-test');
    }
  };

  return (
    <div className="hero-root">

      <div className="h-darkveil-bg">
        <DarkVeil
          hueShift={0}
          noiseIntensity={0}
          scanlineIntensity={0}
          speed={0.5}
          scanlineFrequency={0}
          warpAmount={0}
        />
      </div>

      <section className="h-hero">
        <div className="h-container">
          <h1 className="h-title">
            <span className="h-title-word h-title-word-1">Build.</span>
            <span className="h-title-word h-title-word-2">Break.</span>
            <span className="h-title-word h-title-word-3">Understand.</span>
          </h1>
          <p className="h-sub">
            {typedText}<span className={`h-cursor ${typingDone ? 'h-cursor-blink' : ''}`}>|</span>
          </p>
          <div className="h-cta">
            <Link to="#tracks" className="h-btn-primary h-btn-start-learning" onClick={(e) => {
              e.preventDefault();
              document.getElementById('tracks')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Start Learning <ArrowRight size={16} />
            </Link>
            <Link to="#prepare-acadnet" className="h-btn-acadnet" onClick={(e) => {
              e.preventDefault();
              document.getElementById('prepare-acadnet')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Prepare for AcadNet <ArrowRight size={16} />
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

      <section className="h-section" id="tracks">
        <div className="h-container">
          <div className="h-section-header">
            <h2 className="h-section-title">Pick your track</h2>
            <p className="h-section-sub">Three paths, each with its own depth. Start anywhere.</p>
          </div>

          <div className="h-tracks">
            {TRACKS.map((track) => {
              const Icon = track.icon;
              const isLinux = track.hasOverview;
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
                    {isLinux ? (
                      <button
                        className="h-track-get-started"
                        onClick={() => setLinuxOverviewOpen(v => !v)}
                      >
                        Get Started <ChevronDown size={14} className={`h-track-chevron ${linuxOverviewOpen ? 'open' : ''}`} />
                      </button>
                    ) : (
                      <Link to={track.primary.to} className="h-track-get-started">
                        Get Started <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`h-linux-overview ${linuxOverviewOpen ? 'open' : ''}`}>
            <div className="h-linux-overview-inner">
              <div className="h-linux-overview-header">
                <h2 className="h-linux-overview-title">Linux Overview</h2>
                <p className="h-linux-overview-sub">
                  Put your Linux knowledge to the test. This assessment covers all core topics from the command line to system internals so you can see exactly where you stand.
                </p>
                <div className="h-linux-overview-meta">
                  <span className="h-linux-meta-pill">12 chapters</span>
                  <span className="h-linux-meta-pill">5 questions each</span>
                  <span className="h-linux-meta-pill h-linux-meta-pill--accent">60 questions total</span>
                </div>
              </div>

              <div className="h-linux-chapters">
                {LINUX_CHAPTERS.map((ch, i) => {
                  const ChIcon = ch.icon;
                  return (
                    <div key={ch.id} className="h-linux-chapter-item">
                      <div className="h-linux-chapter-num">{String(i + 1).padStart(2, '0')}</div>
                      <div className="h-linux-chapter-icon">
                        <ChIcon size={15} />
                      </div>
                      <span className="h-linux-chapter-name">{ch.name}</span>
                      <span className="h-linux-chapter-count">5 questions</span>
                    </div>
                  );
                })}
              </div>

              <div className="h-linux-overview-footer">
                <button className="h-linux-start-btn" onClick={handleStartTest}>
                  Start Test <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

    
      <section className="h-section h-acadnet-section" id="prepare-acadnet">
        <div className="h-container">
          <div className="h-section-header">
            <h2 className="h-section-title">Prepare for AcadNet</h2>
            <p className="h-section-sub h-acadnet-subtitle">
              Net2077 offers a variety of questions from all possible chapters in Linux (AcadNet - Calculatoare), Network (AcadNet - Rețelistică) and Debugging (AcadNet - IS)
            </p>
          </div>

          <MagicBento spotlightRadius={400} glowColor="99, 102, 241">
           
            <div className="h-acadnet-exams">
              {EXAMS.map((exam) => (
                <Link key={exam.to} to={exam.to} className="h-acadnet-exam-card magic-card">
                  <div className="h-acadnet-exam-meta">{exam.meta}</div>
                  <h3 className="h-acadnet-exam-title">{exam.title}</h3>
                  <div className="h-acadnet-exam-info">{exam.info}</div>
                  <div className="h-acadnet-exam-arrow"><ArrowRight size={16} /></div>
                </Link>
              ))}
            </div>

            
            <div className="h-acadnet-domains">
             
              <div className={`h-acadnet-domain-card magic-card ${expandedDomain === 'linux' ? 'expanded' : ''}`}
                   onClick={() => setExpandedDomain(expandedDomain === 'linux' ? null : 'linux')}>
                <div className="h-acadnet-domain-header">
                  <div className="h-acadnet-domain-icon h-acadnet-domain-icon--linux">
                    <Terminal size={24} />
                  </div>
                  <div className="h-acadnet-domain-info">
                    <h3 className="h-acadnet-domain-title">Linux (Calculatoare)</h3>
                    <p className="h-acadnet-domain-subtitle">CLI & GUI</p>
                  </div>
                  <div className="h-acadnet-expand-icon">
                    <ChevronDown size={20} />
                  </div>
                </div>

                <div className="h-acadnet-domain-details">
                  <Link to="/learn/roadmap/69bff0909aa18fbfacf3a844" className="h-acadnet-step" onClick={(e) => e.stopPropagation()}>
                    <div className="h-acadnet-step-content">
                      <h4 className="h-acadnet-step-title">Learn Linux Basics</h4>
                      <p className="h-acadnet-step-desc">Master file systems, permissions, and core commands</p>
                    </div>
                    <div className="h-acadnet-step-link">
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                  <Link to="/grile?filter=linux" className="h-acadnet-step" onClick={(e) => e.stopPropagation()}>
                    <div className="h-acadnet-step-content">
                      <h4 className="h-acadnet-step-title">Practice Linux Questions</h4>
                      <p className="h-acadnet-step-desc">Test your knowledge with curated questions</p>
                    </div>
                    <div className="h-acadnet-step-link">
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                </div>
              </div>

              <div className={`h-acadnet-domain-card magic-card ${expandedDomain === 'network' ? 'expanded' : ''}`}
                   onClick={() => setExpandedDomain(expandedDomain === 'network' ? null : 'network')}>
                <div className="h-acadnet-domain-header">
                  <div className="h-acadnet-domain-icon h-acadnet-domain-icon--network">
                    <Network size={24} />
                  </div>
                  <div className="h-acadnet-domain-info">
                    <h3 className="h-acadnet-domain-title">Networking (Retelistica)</h3>
                    <p className="h-acadnet-domain-subtitle">Protocol understanding</p>
                  </div>
                  <div className="h-acadnet-expand-icon">
                    <ChevronDown size={20} />
                  </div>
                </div>

                <div className="h-acadnet-domain-details">
                  <Link to="/grile?filter=network" className="h-acadnet-step" onClick={(e) => e.stopPropagation()}>
                    <div className="h-acadnet-step-content">
                      <h4 className="h-acadnet-step-title">Practice Network Questions</h4>
                      <p className="h-acadnet-step-desc">Deep dive into protocols, routing, and infrastructure</p>
                    </div>
                    <div className="h-acadnet-step-link">
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                </div>
              </div>

              <div className={`h-acadnet-domain-card magic-card ${expandedDomain === 'debug' ? 'expanded' : ''}`}
                   onClick={() => setExpandedDomain(expandedDomain === 'debug' ? null : 'debug')}>
                <div className="h-acadnet-domain-header">
                  <div className="h-acadnet-domain-icon h-acadnet-domain-icon--debug">
                    <Code size={24} />
                  </div>
                  <div className="h-acadnet-domain-info">
                    <h3 className="h-acadnet-domain-title">Debugging (IS)</h3>
                    <p className="h-acadnet-domain-subtitle">Problem solving skills</p>
                  </div>
                  <div className="h-acadnet-expand-icon">
                    <ChevronDown size={20} />
                  </div>
                </div>

                <div className="h-acadnet-domain-details">
                  <Link to="/is" className="h-acadnet-step" onClick={(e) => e.stopPropagation()}>
                    <div className="h-acadnet-step-content">
                      <h4 className="h-acadnet-step-title">Debug Challenges</h4>
                      <p className="h-acadnet-step-desc">Solve complex programming and system issues</p>
                    </div>
                    <div className="h-acadnet-step-link">
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </MagicBento>
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
