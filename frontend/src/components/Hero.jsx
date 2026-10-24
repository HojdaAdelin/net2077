import { useEffect, useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  ArrowRight, Terminal, Network, Code,
  Check, X, UserPlus,
  Package, Cpu, HardDrive, Shield, Server, Box,
  HelpCircle, Users, Map
} from 'lucide-react';
import AcadnetPreparation from './AcadnetPreparation';
import AccountBenefits from './AccountBenefits';
import DarkVeil from './DarkVeil';
import FeaturesSection from './FeaturesSection';
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

const TRACKS = [];





export default function Hero() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [linuxOverviewOpen] = useState(false);
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
            <Link to="#features" className="h-btn-primary h-btn-start-learning" onClick={(e) => {
              e.preventDefault();
              document.getElementById('features')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
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

      <FeaturesSection />

      <AcadnetPreparation />

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

      {!user && <AccountBenefits />}

    </div>
  );
}
