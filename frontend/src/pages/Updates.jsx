import { Sparkles, Zap, Bug, ExternalLink } from 'lucide-react';
import '../styles/Updates.css';

export default function Updates() {
  const updates = [
    {
      version: '1.1.0',
      date: 'December 22, 2025',
      sections: [
        {
          title: 'New Features',
          icon: Sparkles,
          items: [
            {
              text: 'Added comprehensive version history and changelog tracking',
              link: { text: 'Updates Page', url: '/updates' }
            },
            {
              text: 'Enhanced security with email verification during registration process'
            },
            {
              text: 'Added Romanian and English language options for better accessibility'
            }
          ]
        },
        {
          title: 'Improvements',
          icon: Zap,
          items: [
            { text: 'Enhanced user authentication system' },
            { text: 'Improved cross-origin cookie handling for Vercel deployment' },
            { text: 'Optimized API routing for production environment' }
          ]
        },
        {
          title: 'Bug Fixes',
          icon: Bug,
          items: [
            { text: 'Fixed cookie persistence issues on page refresh' },
            { text: 'Resolved CORS configuration for production deployment' },
            { text: 'Fixed progress tracking for simulation tests' }
          ]
        }
      ]
    }
  ];

  return (
    <div className="updates-page">
      <div className="container">
        <div className="updates-header">
          <h1>Updates & Changelog</h1>
          <p>Stay up to date with the latest features, improvements, and bug fixes</p>
        </div>

        <div className="updates-timeline">
          {updates.map((update) => (
            <article key={update.version} className="update-entry">
              <div className="update-header">
                <div className="update-version">
                  <h2>Version {update.version}</h2>
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
