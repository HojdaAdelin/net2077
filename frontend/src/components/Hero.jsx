import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { Check, X, Terminal, Network, Code, UserPlus, ArrowRight } from 'lucide-react';
import '../styles/Hero.css';

export default function Hero() {
  const [stats, setStats] = useState({ totalQuestions: 0, totalUsers: 0, totalResources: 0 });
  const { user } = useContext(AuthContext);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);



  return (
    <div className="hero">
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-grid">
            <div className="hero-content">
              <h1 className="hero-title">Master Applied Informatics</h1>
              <p className="hero-subtitle">
                Practice Linux, Networking and Programming through structured challenges, real-time battles and curated learning paths.
              </p>
              
              <div className="hero-cta-group">
                <Link to="/grile" className="hero-primary-cta">
                  Start Learning
                  <ArrowRight size={18} />
                </Link>
                <Link to="/roadmap/linux" className="hero-secondary-cta">
                  View Roadmap
                </Link>
              </div>

              <div className="hero-stats-inline">
                <span className="hero-stat-item">{stats.totalQuestions}+ Questions</span>
                <span className="hero-stat-separator">•</span>
                <span className="hero-stat-item">{stats.totalUsers} Active Learners</span>
                <span className="hero-stat-separator">•</span>
                <span className="hero-stat-item">{stats.totalResources} Learning Roadmaps</span>
              </div>
            </div>

            <div className="hero-preview">
              <div className="hero-preview-card">
                <div className="preview-header">
                  <div className="preview-tabs">
                    <div className="preview-tab active">Quiz</div>
                    <div className="preview-tab">Terminal</div>
                  </div>
                </div>
                <div className="preview-body">
                  <div className="preview-question">
                    <div className="question-badge">Linux</div>
                    <p className="question-text">Which command displays the current directory?</p>
                  </div>
                  <div className="preview-options">
                    <div className="preview-option">
                      <div className="option-radio"></div>
                      <span>ls</span>
                    </div>
                    <div className="preview-option correct">
                      <div className="option-radio checked"></div>
                      <span>pwd</span>
                    </div>
                    <div className="preview-option">
                      <div className="option-radio"></div>
                      <span>cd</span>
                    </div>
                  </div>
                  <div className="preview-footer">
                    <div className="preview-progress">
                      <div className="progress-dot filled"></div>
                      <div className="progress-dot filled"></div>
                      <div className="progress-dot current"></div>
                      <div className="progress-dot"></div>
                      <div className="progress-dot"></div>
                    </div>
                    <div className="preview-score">+10 XP</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="mls-section">
          <div className="mls-container">
            <div className="mls-header">
              <h2 className="mls-title">Start Your Learning Path</h2>
              <p className="mls-subtitle">
                Structured tracks and hands-on environments to master applied informatics.
              </p>
            </div>

            <div className="mls-grid">
              <div className="mls-tracks-column">
                <div className="mls-track-card">
                  <div className="mls-track-icon">
                    <Terminal size={28} />
                  </div>
                  <div className="mls-track-content">
                    <h3 className="mls-track-title">Linux Administration</h3>
                    <p className="mls-track-description">
                      Master command line and system administration with hands-on practice
                    </p>
                    <div className="mls-track-meta">
                      <span className="mls-meta-tag">50+ Commands</span>
                      <span className="mls-meta-tag">Interactive Terminal</span>
                    </div>
                    <div className="mls-track-actions">
                      <Link to="/grile?filter=linux" className="mls-track-primary">
                        Start Learning
                      </Link>
                      <Link to="/terminal" className="mls-track-secondary">
                        Try Terminal
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="mls-track-card">
                  <div className="mls-track-icon">
                    <Network size={28} />
                  </div>
                  <div className="mls-track-content">
                    <h3 className="mls-track-title">Network Engineering</h3>
                    <p className="mls-track-description">
                      Build and secure modern network infrastructures from basics to advanced
                    </p>
                    <div className="mls-track-meta">
                      <span className="mls-meta-tag">Network Protocols</span>
                      <span className="mls-meta-tag">Security Concepts</span>
                    </div>
                    <div className="mls-track-actions">
                      <Link to="/grile?filter=network" className="mls-track-primary">
                        Start Learning
                      </Link>
                      <Link to="/grile" className="mls-track-secondary">
                        Practice Quiz
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="mls-track-card">
                  <div className="mls-track-icon">
                    <Code size={28} />
                  </div>
                  <div className="mls-track-content">
                    <h3 className="mls-track-title">Programming & Debug</h3>
                    <p className="mls-track-description">
                      Develop problem-solving skills and debug real-world coding challenges
                    </p>
                    <div className="mls-track-meta">
                      <span className="mls-meta-tag">C++ Problems</span>
                      <span className="mls-meta-tag">Real-time Testing</span>
                    </div>
                    <div className="mls-track-actions">
                      <Link to="/is" className="mls-track-primary">
                        Start Coding
                      </Link>
                      <Link to="/grile" className="mls-track-secondary">
                        View Theory
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mls-tools-column">
                <h3 className="mls-tools-title">Hands-On Environments</h3>
                <p className="mls-tools-description">
                  Real interactive systems for terminal training and debugging challenges.
                </p>

                <div className="mls-tool-item">
                  <div className="mls-tool-icon">
                    <Terminal size={24} />
                  </div>
                  <div className="mls-tool-content">
                    <h4 className="mls-tool-name">Linux Terminal Practice</h4>
                    <p className="mls-tool-desc">
                      Practice real Linux commands in an interactive environment
                    </p>
                    {user ? (
                      <Link to="/terminal" className="mls-tool-cta">
                        Launch Terminal
                        <ArrowRight size={16} />
                      </Link>
                    ) : (
                      <Link to="/register" className="mls-tool-cta-secondary">
                        Register to Access
                      </Link>
                    )}
                  </div>
                </div>

                <div className="mls-tool-item">
                  <div className="mls-tool-icon">
                    <Code size={24} />
                  </div>
                  <div className="mls-tool-content">
                    <h4 className="mls-tool-name">IS / Debug Environment</h4>
                    <p className="mls-tool-desc">
                      Solve programming challenges and debug code errors
                    </p>
                    {user ? (
                      <Link to="/is" className="mls-tool-cta">
                        Solve Challenges
                        <ArrowRight size={16} />
                      </Link>
                    ) : (
                      <Link to="/register" className="mls-tool-cta-secondary">
                        Register to Access
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="exams-section">
          <div className="exams-container">
            <div className="exams-header">
              <div className="exams-header-content">
                <h2 className="exams-title">Competitive Exams & Challenges</h2>
                <p className="exams-subtitle">
                  Practice with structured exam simulations and curated competition sets.
                </p>
              </div>
              <Link to="/exam-selection" className="exams-view-all">
                View All Exams
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="exams-grid">
              <Link to="/exam/acadnet2026local_11_12" className="exam-card">
                <div className="exam-meta">LOCAL PHASE XI-XII</div>
                <h3 className="exam-title">AcadNet 2026</h3>
                <div className="exam-info-row">
                  <span>50 Questions</span>
                  <span>•</span>
                  <span>Timed</span>
                  <span>•</span>
                  <span>Medium</span>
                </div>
                <div className="exam-cta">
                  Start Exam
                  <ArrowRight size={16} />
                </div>
              </Link>

              <Link to="/exam/misc_linux" className="exam-card">
                <div className="exam-meta">MISCELLANEOUS</div>
                <h3 className="exam-title">Linux</h3>
                <div className="exam-info-row">
                  <span>20 Questions</span>
                  <span>•</span>
                  <span>Timed</span>
                  <span>•</span>
                  <span>Easy</span>
                </div>
                <div className="exam-cta">
                  Start Exam
                  <ArrowRight size={16} />
                </div>
              </Link>

              <Link to="/exam/acadnet2023national_11_12" className="exam-card">
                <div className="exam-meta">NATIONAL PHASE XI-XII</div>
                <h3 className="exam-title">AcadNet 2023</h3>
                <div className="exam-info-row">
                  <span>50 Questions</span>
                  <span>•</span>
                  <span>Timed</span>
                  <span>•</span>
                  <span>Hard</span>
                </div>
                <div className="exam-cta">
                  Start Exam
                  <ArrowRight size={16} />
                </div>
              </Link>

              <Link to="/exam/linux_permissions" className="exam-card">
                <div className="exam-meta">MISCELLANEOUS</div>
                <h3 className="exam-title">Linux Permissions</h3>
                <div className="exam-info-row">
                  <span>20 Questions</span>
                  <span>•</span>
                  <span>Timed</span>
                  <span>•</span>
                  <span>Medium</span>
                </div>
                <div className="exam-cta">
                  Start Exam
                  <ArrowRight size={16} />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {!user && (
          <section className="account-benefits-section">
            <div className="benefits-container">
              <div className="benefits-header">
                <h2 className="benefits-title">Unlock the Full Learning Experience</h2>
                <p className="benefits-subtitle">
                  Create an account to track progress, access advanced features and compete in challenges.
                </p>
              </div>

              <div className="benefits-comparison">
                <div className="benefits-column guest-column">
                  <h3 className="column-title">Guest Access</h3>
                  <ul className="benefits-feature-list">
                    <li className="benefit-item available">
                      <Check size={18} className="benefit-icon" />
                      <span>Access to all questions</span>
                    </li>
                    <li className="benefit-item available">
                      <Check size={18} className="benefit-icon" />
                      <span>Access to all resources</span>
                    </li>
                    <li className="benefit-item unavailable">
                      <X size={18} className="benefit-icon" />
                      <span>Track progress</span>
                    </li>
                    <li className="benefit-item unavailable">
                      <X size={18} className="benefit-icon" />
                      <span>Exam sessions</span>
                    </li>
                    <li className="benefit-item unavailable">
                      <X size={18} className="benefit-icon" />
                      <span>Daily challenges</span>
                    </li>
                    <li className="benefit-item unavailable">
                      <X size={18} className="benefit-icon" />
                      <span>Terminal practice</span>
                    </li>
                  </ul>
                </div>

                <div className="benefits-column user-column">
                  <h3 className="column-title">Full Access</h3>
                  <ul className="benefits-feature-list">
                    <li className="benefit-item available">
                      <Check size={18} className="benefit-icon" />
                      <span>Access to all questions</span>
                    </li>
                    <li className="benefit-item available">
                      <Check size={18} className="benefit-icon" />
                      <span>Access to all resources</span>
                    </li>
                    <li className="benefit-item available">
                      <Check size={18} className="benefit-icon" />
                      <span>Track progress</span>
                    </li>
                    <li className="benefit-item available">
                      <Check size={18} className="benefit-icon" />
                      <span>Exam sessions</span>
                    </li>
                    <li className="benefit-item available">
                      <Check size={18} className="benefit-icon" />
                      <span>Daily challenges</span>
                    </li>
                    <li className="benefit-item available">
                      <Check size={18} className="benefit-icon" />
                      <span>Terminal practice</span>
                    </li>
                  </ul>
                  <Link to="/register" className="benefits-register-cta">
                    <UserPlus size={18} />
                    Create Free Account
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
