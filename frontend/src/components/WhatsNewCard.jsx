import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Zap, Bug, X, ArrowRight } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import '../styles/WhatsNewCard.css';

const SECTIONS = [
  { key: 'features',     label: 'New Features',  Icon: Sparkles },
  { key: 'improvements', label: 'Improvements',  Icon: Zap },
  { key: 'bugFixes',     label: 'Bug Fixes',      Icon: Bug },
];

export default function WhatsNewCard() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);   // { latestVersion, sections }
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/updates/whats-new`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.hasNew) {
          setData(d);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, [user]);

  const dismiss = () => {
    setVisible(false);
    if (!data?.latestVersion) return;
    fetch(`${API_URL}/updates/mark-seen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ version: data.latestVersion }),
    }).catch(() => {});
  };

  if (!visible || !data) return null;

  const hasContent = SECTIONS.some(s => data.sections?.[s.key]?.length > 0);
  if (!hasContent) return null;

  return (
    <div className="wnc-overlay" onClick={dismiss}>
      <div className="wnc-card" onClick={e => e.stopPropagation()}>
        <div className="wnc-header">
          <div className="wnc-title-row">
            <Sparkles size={18} className="wnc-title-icon" />
            <span className="wnc-title">What's new</span>
            <span className="wnc-version">v{data.latestVersion}</span>
          </div>
          <button className="wnc-close" onClick={dismiss} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>

        <div className="wnc-body">
          {SECTIONS.map(({ key, label, Icon }) => {
            const items = data.sections?.[key]?.filter(i => i.trim());
            if (!items?.length) return null;
            return (
              <div key={key} className="wnc-section">
                <div className="wnc-section-title">
                  <Icon size={14} />
                  <span>{label}</span>
                </div>
                <ul className="wnc-list">
                  {items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="wnc-footer">
          <Link to="/updates" className="wnc-link" onClick={dismiss}>
            Full changelog <ArrowRight size={13} />
          </Link>
          <button className="wnc-dismiss-btn" onClick={dismiss}>Got it</button>
        </div>
      </div>
    </div>
  );
}
