import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { Check, X } from 'lucide-react';
import '../styles/Hero.css';

export default function Hero() {
  const [stats, setStats] = useState({ totalQuestions: 0, totalUsers: 0, totalResources: 0 });
  const { t } = useLanguage();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="hero">
      <div className="container">
        <div className="hero-content">
          <h1 className="hero-title">{t('hero.title')}</h1>
          <p className="hero-subtitle">
            {t('hero.subtitle')}
          </p>
          
          <div className="hero-cta">
            <Link to="/grile" className="btn btn-primary">{t('hero.browseQuestions')}</Link>
            <Link to="/resurse" className="btn btn-secondary">{t('hero.browseResources')}</Link>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">{stats.totalQuestions}</div>
            <div className="stat-label">{t('hero.practiceQuestions')}</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.totalUsers}</div>
            <div className="stat-label">{t('hero.activeLearners')}</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.totalResources}</div>
            <div className="stat-label">{t('hero.learningResources')}</div>
          </div>
        </div>

        <div className="features-section">
          <div className="feature-card terminal-feature-card">
            <div className="terminal-feature-content">
              <div className="terminal-feature-badge">NEW FEATURE</div>
              <h3 className="terminal-feature-title">Linux Terminal Practice</h3>
              <p className="terminal-feature-description">
                Practice real Linux commands in an interactive terminal environment. 
                Master command-line skills with hands-on exercises.
              </p>
              {user ? (
                <Link to="/terminal" className="btn btn-primary terminal-feature-btn">
                  Start Terminal Practice
                </Link>
              ) : (
                <div className="terminal-feature-auth-required">
                  <p className="terminal-auth-text">Available for registered users only</p>
                  <Link to="/register" className="btn btn-secondary terminal-feature-btn">
                    Register to Access
                  </Link>
                </div>
              )}
            </div>
            <div className="terminal-feature-visual">
              <div className="terminal-preview">
                <div className="terminal-preview-header">
                  <div className="terminal-preview-buttons">
                    <span className="terminal-preview-button red"></span>
                    <span className="terminal-preview-button yellow"></span>
                    <span className="terminal-preview-button green"></span>
                  </div>
                  <div className="terminal-preview-title">user@net2077: ~</div>
                </div>
                <div className="terminal-preview-body">
                  <div className="terminal-preview-line">
                    <span className="terminal-preview-prompt">user@net2077:~$ </span>
                    <span className="terminal-preview-command">uname -r</span>
                  </div>
                  <div className="terminal-preview-output">5.15.0-generic</div>
                  <div className="terminal-preview-line">
                    <span className="terminal-preview-prompt">user@net2077:~$ </span>
                    <span className="terminal-preview-cursor">_</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="feature-card is-feature-card">
            <div className="is-feature-content">
              <div className="is-feature-badge">NEW SECTION</div>
              <h3 className="is-feature-title">IS/Debug Environment</h3>
              <p className="is-feature-description">
                Solve programming challenges and debug code errors. 
                Improve your coding skills with hands-on C++ problems.
              </p>
              {user ? (
                <Link to="/is" className="btn btn-primary is-feature-btn">
                  Start Coding Challenge
                </Link>
              ) : (
                <div className="is-feature-auth-required">
                  <p className="is-auth-text">Available for registered users only</p>
                  <Link to="/register" className="btn btn-secondary is-feature-btn">
                    Register to Access
                  </Link>
                </div>
              )}
            </div>
            <div className="is-feature-visual">
              <div className="code-preview">
                <div className="code-preview-header">
                  <div className="code-preview-buttons">
                    <span className="code-preview-button red"></span>
                    <span className="code-preview-button yellow"></span>
                    <span className="code-preview-button green"></span>
                  </div>
                  <div className="code-preview-title">main.cpp</div>
                </div>
                <div className="code-preview-body">
                  <div className="code-preview-line">
                    <span className="code-line-number">1</span>
                    <span className="code-content">#include &lt;iostream&gt;</span>
                  </div>
                  <div className="code-preview-line">
                    <span className="code-line-number">2</span>
                    <span className="code-content">using namespace std;</span>
                  </div>
                  <div className="code-preview-line">
                    <span className="code-line-number">3</span>
                    <span className="code-content">int main() {'{'}</span>
                  </div>
                  <div className="code-preview-line error-line">
                    <span className="code-line-number">4</span>
                    <span className="code-content">    cout &lt;&lt; "Hello"</span>
                    <span className="error-indicator">❌</span>
                  </div>
                  <div className="code-preview-line">
                    <span className="code-line-number">5</span>
                    <span className="code-content">    return 0;</span>
                  </div>
                  <div className="code-preview-line">
                    <span className="code-line-number">6</span>
                    <span className="code-content">{'}'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="start-here-section">
          <h2 className="start-here-title">{t('hero.startHere')}</h2>
          
          <div className="learning-paths-grid">
            <div className="path-row">
              <div className="path-category">
                <h3>Linux</h3>
              </div>
              <div className="path-options">
                <Link to="/roadmap/Linux" className="path-option roadmap-option">
                  <span className="option-label">{t('hero.linuxRoadmap')}</span>
                </Link>
                <div className="path-exams">
                  <Link to="/exam/easy_linux" className="path-option exam-option">
                    <span className="option-label">{t('hero.easyExam')}</span>
                  </Link>
                  <Link to="/exam/medium_linux" className="path-option exam-option">
                    <span className="option-label">{t('hero.mediumExam')}</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="path-row">
              <div className="path-category">
                <h3>Network</h3>
              </div>
              <div className="path-options">
                <Link to="/roadmap/Network" className="path-option roadmap-option">
                  <span className="option-label">{t('hero.networkRoadmap')}</span>
                </Link>
                <div className="path-exams">
                  <Link to="/exam/easy_network" className="path-option exam-option">
                    <span className="option-label">{t('hero.easyExam')}</span>
                  </Link>
                  <Link to="/exam/medium_network" className="path-option exam-option">
                    <span className="option-label">{t('hero.mediumExam')}</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="new-exams-section">
          <h2 className="new-exams-title">{t('hero.newExams')}</h2>
          
          <div className="new-exams-table">
            <div className="new-exam-row">
              <div className="new-tag">NEW</div>
              <Link to="/exam/acadnet2026local_11_12" className="exam-name">
                AcadNet 2026 - Local Phase XI-XII
              </Link>
            </div>
            <div className="new-exam-row">
              <div className="new-tag">NEW</div>
              <Link to="/exam/acadnet2024county_11_12" className="exam-name">
                AcadNet 2024 - County Phase XI-XII
              </Link>
            </div>
            <div className="new-exam-row">
              <div className="new-tag">NEW</div>
              <Link to="/exam/linux_security" className="exam-name">
                Linux - Security
              </Link>
            </div>
            <div className="new-exam-row">
              <div className="new-tag">NEW</div>
              <Link to="/exam/linux_permissions" className="exam-name">
                Linux - Permissions
              </Link>
            </div>
          </div>
        </div>

        {!user && (
          <div className="benefits-section">
            <h2 className="benefits-title">{t('hero.benefitsTitle')}</h2>
            
            <div className="benefits-table">
              <div className="benefits-header">
                <div className="benefit-feature"></div>
                <div className="benefit-column">{t('hero.guest')}</div>
                <div className="benefit-column">{t('hero.user')}</div>
              </div>
              
              <div className="benefits-row">
                <div className="benefit-feature">{t('hero.accessQuestions')}</div>
                <div className="benefit-status">
                  <Check size={20} className="check-icon" />
                </div>
                <div className="benefit-status">
                  <Check size={20} className="check-icon" />
                </div>
              </div>
              
              <div className="benefits-row">
                <div className="benefit-feature">{t('hero.accessResources')}</div>
                <div className="benefit-status">
                  <Check size={20} className="check-icon" />
                </div>
                <div className="benefit-status">
                  <Check size={20} className="check-icon" />
                </div>
              </div>
              
              <div className="benefits-row">
                <div className="benefit-feature">{t('hero.trackProgress')}</div>
                <div className="benefit-status">
                  <X size={20} className="x-icon" />
                </div>
                <div className="benefit-status">
                  <Check size={20} className="check-icon" />
                </div>
              </div>
              
              <div className="benefits-row">
                <div className="benefit-feature">{t('hero.betterExams')}</div>
                <div className="benefit-status">
                  <X size={20} className="x-icon" />
                </div>
                <div className="benefit-status">
                  <Check size={20} className="check-icon" />
                </div>
              </div>
              <div className="benefits-row">
                <div className="benefit-feature">{t('hero.dailyChallenge')}</div>
                <div className="benefit-status">
                  <X size={20} className="x-icon" />
                </div>
                <div className="benefit-status">
                  <Check size={20} className="check-icon" />
                </div>
              </div>
              <div className="benefits-row">
                <div className="benefit-feature">{t('hero.terminal')}</div>
                <div className="benefit-status">
                  <X size={20} className="x-icon" />
                </div>
                <div className="benefit-status">
                  <Check size={20} className="check-icon" />
                </div>
              </div>
            </div>
            
            <div className="benefits-cta">
              <Link to="/register" className="btn btn-register">
                {t('hero.registerNow')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
