import { useEffect, useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  ArrowRight, Terminal, Network, Code,
  Check, X, UserPlus,
  ChevronDown, Package, Cpu, HardDrive, Shield, Server, Box,
  HelpCircle, Users, Map
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
  { to: '/exam/acadnet2026local_11_12', meta: 'LOCAL · XI-XII', title: 'AcadNet Calculatoare 2026', info: '50 Questions · Medium' },
  { to: '/exam/acadnet2026county_11_12', meta: 'COUNTY · XI-XII', title: 'AcadNet Calculatoare 2026', info: '50 Questions · Medium' },
  { to: '/exam/acadnet2023national_11_12', meta: 'NATIONAL · XI-XII', title: 'AcadNet Calculatoare 2023', info: '50 Questions · Hard' },
  { to: '/exam/acadnet2026national_11_12', meta: 'NATIONAL · XI-XII', title: 'AcadNet Calculatoare 2026', info: '30 Questions · Hard' },
];

const FEATURES_COMPARISON = [
  { label: 'Access to all questions',  guest: true,  account: true },
  { label: 'Track your progress',      guest: false, account: true },
  { label: 'Exam sessions',            guest: false, account: true },
  { label: 'Daily challenges',         guest: false, account: true },
  { label: 'Terminal practice',        guest: false, account: true },
  { label: 'Debug Challenges',         guest: false, account: true },
  { label: 'Roadmaps',                 guest: false, account: true },
  { label: 'Scripts Interface',        guest: false, account: true },
  { label: 'Forums',                   guest: false, account: true },
];

export default function Hero() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [linuxOverviewOpen, setLinuxOverviewOpen] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') !== 'light');
  const [darkVeilFailed, setDarkVeilFailed] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

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

  const handleStartTest = () => {
    if (!user) {
      navigate('/linux-start-test?requireAuth=1');
    } else {
      navigate('/linux-start-test');
    }
  };

  return (
    <div className="hero-root">

      {isDark && createPortal(
        <div className="h-darkveil-bg">
          {!darkVeilFailed ? (
            <DarkVeil
              hueShift={0}
              noiseIntensity={0}
              scanlineIntensity={0}
              speed={0.5}
              scanlineFrequency={0}
              warpAmount={0}
              onError={() => setDarkVeilFailed(true)}
            />
          ) : (
            <div className="h-darkveil-fallback" />
          )}
        </div>,
        document.body
      )}

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
        </div>
      </section>

      <div className="h-stats-stripe">
        <div className="h-stats-stripe-inner">
          <div className="h-stripe-stat">
            <span className="h-stripe-num">2000+</span>
            <span className="h-stripe-label">Questions</span>
          </div>
          <div className="h-stripe-divider" />
          <div className="h-stripe-stat">
            <span className="h-stripe-num">100+</span>
            <span className="h-stripe-label">Active Users</span>
          </div>
          <div className="h-stripe-divider" />
          <div className="h-stripe-stat">
            <span className="h-stripe-num">1</span>
            <span className="h-stripe-label">Roadmap Available</span>
          </div>
        </div>
      </div>

      <section className="h-section h-t2-section">
        <div className="h-container">
          <div className="h-t2-inner">
            <div className="h-t2-text">
              <h2 className="h-t2-title">Terminal 2.0</h2>
              <p className="h-t2-desc">
                A fresh start for the Terminal section. Terminal 2.0 is a much more comprehensive version than the Legacy one, offering a significantly better user experience.
              </p>
              <Link to="/terminal?v=2" className="h-t2-btn">
                Try Terminal 2.0
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="h-t2-screens">
            
              <div className="h-t2-screen h-t2-screen-legacy">
                <div className="h-t2-screen-bar">
                  <span className="h-t2-dot h-t2-dot-r" />
                  <span className="h-t2-dot h-t2-dot-y" />
                  <span className="h-t2-dot h-t2-dot-g" />
                  <span className="h-t2-screen-label">Legacy</span>
                </div>
                <div className="h-t2-screen-body">
                  <div className="h-t2-mock-line h-t2-mock-prompt"><span className="h-t2-mock-ps">user@net2077:~$</span><span className="h-t2-mock-cursor" /></div>
                  <div className="h-t2-mock-line h-t2-mock-dim">Filter: all  |  Easy  Medium  Hard</div>
                  <div className="h-t2-mock-line">1. List files in directory</div>
                  <div className="h-t2-mock-line h-t2-mock-solved">2. Show current shell ✓</div>
                  <div className="h-t2-mock-line">3. Kill process by PID</div>
                  <div className="h-t2-mock-line h-t2-mock-dim">Solved: 1 / 24</div>
                </div>
              </div>

              <div className="h-t2-screen h-t2-screen-v2">
                <div className="h-t2-screen-bar">
                  <span className="h-t2-dot h-t2-dot-r" />
                  <span className="h-t2-dot h-t2-dot-y" />
                  <span className="h-t2-dot h-t2-dot-g" />
                  <span className="h-t2-screen-label h-t2-screen-label-v2">Terminal 2.0</span>
                </div>
                <div className="h-t2-screen-body">
                  <div className="h-t2-mock-line h-t2-mock-sys">net2077@terminal: <span className="h-t2-mock-white">Select a category</span></div>
                  <div className="h-t2-mock-line h-t2-mock-red">  cd /easy</div>
                  <div className="h-t2-mock-line h-t2-mock-red">  cd /medium</div>
                  <div className="h-t2-mock-line h-t2-mock-red">  cd /hard</div>
                  <div className="h-t2-mock-line h-t2-mock-prompt"><span className="h-t2-mock-ps">user@net2077:~$</span> <span className="h-t2-mock-typed">cd /easy</span><span className="h-t2-mock-cursor" /></div>
                </div>
              </div>
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
                        onClick={() => {
                          const isOpening = !linuxOverviewOpen;
                          setLinuxOverviewOpen(v => !v);
                          if (isOpening) {
                            setTimeout(() => {
                              document.querySelector('.h-linux-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 50);
                          }
                        }}
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

      {/* ── Partners ── */}
      <section className="h-section">
        <div className="h-container">
          <div className="h-section-header">
            <h2 className="h-section-title">Partners</h2>
            <p className="h-section-sub">Platforms we trust and work alongside.</p>
          </div>
          <div className="h-partners">
            <a href="https://atomoschola.vercel.app/" target="_blank" rel="noopener noreferrer" className="h-partner-card">
              <img src="/as.jpeg" alt="AtomoSchola logo" className="h-partner-logo" />
              <div className="h-partner-info">
                <span className="h-partner-name">AtomoSchola</span>
                <p className="h-partner-desc">
                  An educational platform covering both STEM and humanities. Good content, clean experience, worth checking out if you want to learn beyond informatics.
                </p>
              </div>
            </a>
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

            <div className="h-compare-wrap">
              <table className="h-compare-table">
                <thead>
                  <tr>
                    <th className="h-compare-th h-compare-th-feature">Feature</th>
                    <th className="h-compare-th h-compare-th-guest">Without account</th>
                    <th className="h-compare-th h-compare-th-account">
                      <span className="h-compare-account-label">With account</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURES_COMPARISON.map((f, i) => (
                    <tr key={f.label} className={`h-compare-row ${i % 2 === 0 ? 'h-compare-row-even' : ''}`}>
                      <td className="h-compare-td h-compare-td-feature">{f.label}</td>
                      <td className="h-compare-td h-compare-td-center">
                        {f.guest
                          ? <Check size={16} className="h-compare-check" />
                          : <X size={16} className="h-compare-x" />}
                      </td>
                      <td className="h-compare-td h-compare-td-center h-compare-td-account">
                        <Check size={16} className="h-compare-check" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="h-compare-cta">
                <Link to="/register" className="h-register-btn">
                  <UserPlus size={16} /> Create free account
                </Link>
                <span className="h-compare-login-hint">Already have one? <Link to="/login" className="h-compare-login-link">Sign in</Link></span>
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
