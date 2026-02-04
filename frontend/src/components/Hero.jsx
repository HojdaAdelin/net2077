import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { Check, X, Terminal, Network, Code, BookOpen, Play, Zap, Sparkles, Clock, User, UserPlus, BarChart3, Trophy, Calendar, Monitor } from 'lucide-react';
import '../styles/Hero.css';

export default function Hero() {
  const [stats, setStats] = useState({ totalQuestions: 0, totalUsers: 0, totalResources: 0 });
  const { t } = useLanguage();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  const scrollToNewExams = () => {
    const newExamsSection = document.querySelector('.hero-exams-showcase');
    if (newExamsSection) {
      newExamsSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

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
            <button onClick={scrollToNewExams} className="btn btn-accent">
              <Sparkles size={16} />
              New Tests
            </button>
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

        <div className="hero-journey-section">
          <h2 className="hero-journey-title">{t('hero.startHere')}</h2>
          
          <div className="hero-bubbles-container">
            <div className="hero-bubble linux-bubble">
              <div className="bubble-glow linux-glow"></div>
              <div className="bubble-content">
                <div className="bubble-icon">
                  <Terminal size={32} />
                </div>
                <h3>Linux Administration</h3>
                <p>Master command line and system administration with hands-on practice</p>
                <div className="bubble-stats">
                  <span className="stat-badge">50+ Commands</span>
                  <span className="stat-badge">Interactive Terminal</span>
                </div>
                <div className="bubble-actions">
                  <Link to="/roadmap/Linux" className="bubble-primary-btn">
                    <BookOpen size={16} />
                    Start Learning
                  </Link>
                  <Link to="/terminal" className="bubble-feature-btn">
                    <Play size={16} />
                    Try Terminal
                  </Link>
                </div>
                <div className="bubble-exams">
                  <Link to="/exam/easy_linux" className="exam-bubble easy">Easy</Link>
                  <Link to="/exam/medium_linux" className="exam-bubble medium">Medium</Link>
                </div>
              </div>
            </div>

            <div className="hero-bubble network-bubble">
              <div className="bubble-glow network-glow"></div>
              <div className="bubble-content">
                <div className="bubble-icon">
                  <Network size={32} />
                </div>
                <h3>Network Engineering</h3>
                <p>Build and secure modern network infrastructures from basics to advanced</p>
                <div className="bubble-stats">
                  <span className="stat-badge">Network Protocols</span>
                  <span className="stat-badge">Security Concepts</span>
                </div>
                <div className="bubble-actions">
                  <Link to="/roadmap/Network" className="bubble-primary-btn">
                    <BookOpen size={16} />
                    Start Learning
                  </Link>
                  <Link to="/grile" className="bubble-feature-btn">
                    <Zap size={16} />
                    Practice Quiz
                  </Link>
                </div>
                <div className="bubble-exams">
                  <Link to="/exam/easy_network" className="exam-bubble easy">Easy</Link>
                  <Link to="/exam/medium_network" className="exam-bubble medium">Medium</Link>
                </div>
              </div>
            </div>

            <div className="hero-bubble coding-bubble">
              <div className="bubble-glow coding-glow"></div>
              <div className="bubble-content">
                <div className="bubble-icon">
                  <Code size={32} />
                </div>
                <h3>Programming & Debug</h3>
                <p>Develop problem-solving skills and debug real-world coding challenges</p>
                <div className="bubble-stats">
                  <span className="stat-badge">C++ Problems</span>
                  <span className="stat-badge">Real-time Testing</span>
                </div>
                <div className="bubble-actions">
                  <Link to="/is" className="bubble-primary-btn">
                    <Code size={16} />
                    Start Coding
                  </Link>
                  <Link to="/grile" className="bubble-feature-btn">
                    <BookOpen size={16} />
                    Theory
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-exams-showcase">
          <div className="showcase-header">
            <div className="showcase-icon">
              <Sparkles size={24} />
            </div>
            <h2 className="showcase-title">{t('hero.newExams')}</h2>
            <div className="showcase-pulse"></div>
          </div>
          
          <div className="exams-carousel">
            <div className="exam-card featured">
              <div className="exam-glow"></div>
              <div className="exam-badge">
                <Clock size={12} />
                <span>FRESH</span>
              </div>
              <Link to="/exam/acadnet2026local_11_12" className="exam-content">
                <div className="exam-title">AcadNet 2026</div>
                <div className="exam-subtitle">Local Phase XI-XII</div>
              </Link>
            </div>

            <div className="exam-card">
              <div className="exam-glow"></div>
              <div className="exam-badge">
                <Clock size={12} />
                <span>NEW</span>
              </div>
              <Link to="/exam/misc_linux" className="exam-content">
                <div className="exam-title">Linux</div>
                <div className="exam-subtitle">Misc</div>
              </Link>
            </div>

            <div className="exam-card">
              <div className="exam-glow"></div>
              <div className="exam-badge">
                <Clock size={12} />
                <span>NEW</span>
              </div>
              <Link to="/exam/acadnet2023national_11_12" className="exam-content">
                <div className="exam-title">AcadNet 2023</div>
                <div className="exam-subtitle">National Phase XI-XII</div>
              </Link>
            </div>

            <div className="exam-card">
              <div className="exam-glow"></div>
              <div className="exam-badge">
                <Clock size={12} />
                <span>NEW</span>
              </div>
              <Link to="/exam/linux_permissions" className="exam-content">
                <div className="exam-title">Linux</div>
                <div className="exam-subtitle">Permissions</div>
              </Link>
            </div>
          </div>
        </div>

        {!user && (
          <div className="hero-benefits-showcase">
            <div className="benefits-header-section">
              <div className="benefits-icon-wrapper">
                <UserPlus size={32} className="benefits-main-icon" />
                <div className="benefits-icon-glow"></div>
              </div>
              <h2 className="benefits-showcase-title">{t('hero.benefitsTitle')}</h2>
              
            </div>
            
            <div className="benefits-comparison-cards">
              <div className="comparison-card guest-card">
                <div className="card-header">
                  <div className="card-icon">
                    <User size={24} />
                  </div>
                  <h3>{t('hero.guest')}</h3>
                  <div className="card-badge guest-badge">Limited</div>
                </div>
                <div className="features-list">
                  <div className="feature-item available">
                    <div className="feature-icon">
                      <Check size={16} />
                    </div>
                    <span>{t('hero.accessQuestions')}</span>
                  </div>
                  <div className="feature-item available">
                    <div className="feature-icon">
                      <Check size={16} />
                    </div>
                    <span>{t('hero.accessResources')}</span>
                  </div>
                  <div className="feature-item unavailable">
                    <div className="feature-icon">
                      <X size={16} />
                    </div>
                    <span>{t('hero.trackProgress')}</span>
                  </div>
                  <div className="feature-item unavailable">
                    <div className="feature-icon">
                      <X size={16} />
                    </div>
                    <span>{t('hero.betterExams')}</span>
                  </div>
                  <div className="feature-item unavailable">
                    <div className="feature-icon">
                      <X size={16} />
                    </div>
                    <span>{t('hero.dailyChallenge')}</span>
                  </div>
                  <div className="feature-item unavailable">
                    <div className="feature-icon">
                      <X size={16} />
                    </div>
                    <span>{t('hero.terminal')}</span>
                  </div>
                </div>
              </div>

              <div className="comparison-card user-card featured">
                <div className="card-glow"></div>
                <div className="card-header">
                  <div className="card-icon">
                    <Trophy size={24} />
                  </div>
                  <h3>{t('hero.user')}</h3>
                  <div className="card-badge user-badge">Full Access</div>
                </div>
                <div className="features-list">
                  <div className="feature-item available">
                    <div className="feature-icon">
                      <Check size={16} />
                    </div>
                    <span>{t('hero.accessQuestions')}</span>
                  </div>
                  <div className="feature-item available">
                    <div className="feature-icon">
                      <Check size={16} />
                    </div>
                    <span>{t('hero.accessResources')}</span>
                  </div>
                  <div className="feature-item available premium">
                    <div className="feature-icon">
                      <BarChart3 size={16} />
                    </div>
                    <span>{t('hero.trackProgress')}</span>
                  </div>
                  <div className="feature-item available premium">
                    <div className="feature-icon">
                      <Trophy size={16} />
                    </div>
                    <span>{t('hero.betterExams')}</span>
                  </div>
                  <div className="feature-item available premium">
                    <div className="feature-icon">
                      <Calendar size={16} />
                    </div>
                    <span>{t('hero.dailyChallenge')}</span>
                  </div>
                  <div className="feature-item available premium">
                    <div className="feature-icon">
                      <Monitor size={16} />
                    </div>
                    <span>{t('hero.terminal')}</span>
                  </div>
                </div>
                <div className="premium-highlight">
                  <Sparkles size={16} />
                  <span>Premium Features</span>
                </div>
              </div>
            </div>
            
            <div className="benefits-cta-section">
              <Link to="/register" className="benefits-cta-btn">
                <UserPlus size={20} />
                {t('hero.registerNow')}
                <div className="btn-shine"></div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
