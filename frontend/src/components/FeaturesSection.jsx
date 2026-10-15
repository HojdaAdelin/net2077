import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Network, Cpu, BookOpen, FlaskConical, Map, ArrowRight } from 'lucide-react';
import ShaderBackground from './ShaderBackground';
import './FeaturesSection.css';

const LINUX_ROADMAP_ID = '69bff0909aa18fbfacf3a844';

const CARDS = [
  {
    id: 'linux',
    title: 'Linux',
    description: 'Explore Linux questions, tests, terminal practice, and structured learning roadmaps.',
    Icon: Terminal,
    align: 'left',
    shader: { intensity: 1, speed: 0.5, focusX: 0.70, focusY: 0.68 },
    entries: [
      { icon: BookOpen, label: '1500+ Questions', to: '/grile?filter=linux' },
      { icon: FlaskConical, label: '9+ Tests', to: '/exam-selection' },
      { icon: Map, label: 'Introduction Roadmap', to: `/learn/roadmap/${LINUX_ROADMAP_ID}` },
      { icon: Terminal, label: '150+ Terminal Problems', to: '/terminal' },
    ],
  },
  {
    id: 'network',
    title: 'Network',
    description: 'Networking questions and tests covering protocols, routing, security, and core concepts.',
    Icon: Network,
    align: 'right',
    shader: { intensity: 0.6, speed: 0.35, focusX: 0.75, focusY: 0.66 },
    entries: [
      { icon: BookOpen, label: '300+ Questions', to: '/grile?filter=network' },
      { icon: FlaskConical, label: '5+ Tests', to: '/exam-selection' },
    ],
  },
  {
    id: 'embedded',
    title: 'Embedded Systems',
    description: 'Questions on hardware, microcontrollers, and low-level programming.',
    Icon: Cpu,
    align: 'left',
    shader: { intensity: 0.4, speed: 0.25, focusX: 0.53, focusY: 0.77 },
    entries: [
      { icon: BookOpen, label: '300+ Questions', to: '/grile?filter=all' },
    ],
  },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event) => setReduced(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function FeatureCard({ card, reducedMotion }) {
  const cardRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.08 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  const Icon = card.Icon;
  return (
    <article ref={cardRef} className={`fc-card fc-card--${card.id} fc-card--${card.align} ${visible ? 'fc-visible' : ''}`}>
      <div className="fc-shader-wrap" aria-hidden="true">
        <ShaderBackground {...card.shader} reducedMotion={reducedMotion} />
      </div>
      <div className="fc-card-inner">
        <div className="fc-card-top">
          <div className="fc-card-header">
            <div className="fc-icon-wrap" aria-hidden="true"><Icon size={20} strokeWidth={1.75} /></div>
            <h3 className="fc-card-title">{card.title}</h3>
          </div>
          <p className="fc-card-desc">{card.description}</p>
        </div>
        <ul className="fc-entries">
          {card.entries.map((entry) => {
            const EntryIcon = entry.icon;
            return (
              <li key={entry.label}>
                <Link to={entry.to} className="fc-entry" aria-label={`Go to ${entry.label}`}>
                  <EntryIcon size={15} className="fc-entry-icon" aria-hidden="true" />
                  <span className="fc-entry-label">{entry.label}</span>
                  <ArrowRight size={14} className="fc-entry-arrow" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

export default function FeaturesSection() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="fs-section" aria-labelledby="features-heading">
      <div className="fs-container">
        <h2 id="features-heading" className="fs-title">Features</h2>
        <div className="fs-cards">
          {CARDS.map((card) => <FeatureCard key={card.id} card={card} reducedMotion={reducedMotion} />)}
        </div>
      </div>
    </section>
  );
}
