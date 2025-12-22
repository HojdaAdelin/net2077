import { useEffect } from 'react';
import { Sparkles, Zap, Bug, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Updates.css';

export default function Updates() {
  const { t } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getUpdatesData = () => [
    {
      version: '1.2.0',
      date: 'December 22, 2025',
      sections: [
        {
          title: t('updates.newFeatures'),
          icon: Sparkles,
          items: [
            {
              text: 'Added Leaderboard system showing top 10 users by XP score',
              link: { text: 'Leaderboard', url: '/leaderboard' }
            },
            {
              text: 'Enhanced user ranking and competitive learning experience'
            }
          ]
        },
        {
          title: t('updates.improvements'),
          icon: Zap,
          items: [
            { text: 'Extended multi-language support to Leaderboard and Questions pages' },
            { text: 'Improved user interface translations for better accessibility' }
          ]
        }
      ]
    },
    {
      version: '1.1.0',
      date: 'December 22, 2025',
      sections: [
        {
          title: t('updates.newFeatures'),
          icon: Sparkles,
          items: [
            {
              text: 'Added comprehensive version history and changelog tracking',
              link: { text: t('updates.updatesPage'), url: '/updates' }
            },
            {
              text: 'Added Romanian and English language options for better accessibility'
            }
          ]
        },
        {
          title: t('updates.improvements'),
          icon: Zap,
          items: [
            { text: 'Enhanced user authentication system' },
            { text: 'Improved cross-origin cookie handling' },
            { text: 'Optimized API routing' }
          ]
        },
        {
          title: t('updates.bugFixes'),
          icon: Bug,
          items: [
            { text: 'Fixed cookie persistence issues' },
            { text: 'Resolved CORS configuration' },
            { text: 'Fixed progress tracking for simulation tests' }
          ]
        }
      ]
    }
  ];

  const updates = getUpdatesData();

  return (
    <div className="updates-page">
      <div className="container">
        <div className="updates-header">
          <h1>{t('updates.title')}</h1>
          <p>{t('updates.subtitle')}</p>
        </div>

        <div className="updates-timeline">
          {updates.map((update) => (
            <article key={update.version} className="update-entry">
              <div className="update-header">
                <div className="update-version">
                  <h2>{t('updates.version')} {update.version}</h2>
                  <time className="update-date">{update.date}</time>
                </div>
              </div>

              <div className="update-content">
                {update.sections.map((section, idx) => {
                  const Icon = section.icon;
                  return (
                    <div key={idx} className="update-section">
                      <h3 className="section-title">
                        <Icon className="section-icon" size={20} />
                        {section.title}
                      </h3>
                      <ul className="update-list">
                        {section.items.map((item, itemIdx) => (
                          <li key={itemIdx}>
                            {item.text}
                            {item.link && (
                              <>
                                {' - '}
                                <a href={item.link.url} className="update-link">
                                  {item.link.text}
                                  <ExternalLink size={14} />
                                </a>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}