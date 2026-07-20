import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Zap, Bug } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { API_URL } from '../config';
import '../styles/Updates.css';

const ROLE_COLORS = {
  helper:       '#22c55e',
  mod:          '#3b82f6',
  'head-mod':   '#8b5cf6',
  admin:        '#f59e0b',
  'head-admin': '#ef4444',
  root:         '#ec4899',
  user:         'var(--text-muted)',
};

const SECTION_CONFIG = [
  { key: 'features',     label: 'New Features',   icon: Sparkles },
  { key: 'improvements', label: 'Improvements',   icon: Zap },
  { key: 'bugFixes',     label: 'Bug Fixes',       icon: Bug },
];

export default function Updates() {
  const { t } = useLanguage();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetch(`${API_URL}/updates`)
      .then(r => r.json())
      .then(d => setUpdates(d.updates || []))
      .catch(() => setUpdates([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="updates-page">
      <div className="container">
        <div className="updates-header">
          <h1>{t('updates.title')}</h1>
          <p>{t('updates.subtitle')}</p>
        </div>

        {loading ? (
          <div className="updates-loading">Loading...</div>
        ) : updates.length === 0 ? (
          <div className="updates-empty">No updates yet.</div>
        ) : (
          <div className="updates-timeline">
            {updates.map((update) => (
              <article key={update._id} className="update-entry">
                <div className="update-header">
                  <div className="update-version">
                    <h2>{t('updates.version')} {update.version}</h2>
                    <time className="update-date">{update.date}</time>
                  </div>
                  {update.author && (
                    <Link
                      to={`/profile/${update.author}`}
                      className="update-author"
                      style={{ color: ROLE_COLORS[update.authorRole] || ROLE_COLORS.user }}
                    >
                      {update.author}
                    </Link>
                  )}
                </div>

                <div className="update-content">
                  {SECTION_CONFIG.map(({ key, label, icon: Icon }) => {
                    const items = update.sections?.[key]?.filter(i => i.trim());
                    if (!items?.length) return null;
                    return (
                      <div key={key} className="update-section">
                        <h3 className="section-title">
                          <Icon className="section-icon" size={20} />
                          {label}
                        </h3>
                        <ul className="update-list">
                          {items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
