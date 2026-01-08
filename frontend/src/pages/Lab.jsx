import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Lab.css';

export default function Lab() {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();

  return (
    <div className="lab-page">
      <div className="container">
        {!user && (
          <div className="lab-auth-notice">
            <h2>Register now to learn more things...</h2>
            <p>Join our community and unlock advanced learning paths designed for cybersecurity professionals and enthusiasts.</p>
            <Link to="/register" className="btn btn-primary">
              Get Started
            </Link>
          </div>
        )}

        <div className="lab-content">
          <div className="lab-header">
            <h1>Learning Lab</h1>
            <p>Advanced learning paths for cybersecurity and system administration</p>
          </div>

          <div className="lab-cards">
            <div className="lab-card">
              <div className="card-background-image">
                <img src="/linux.png" alt="Linux" />
              </div>
              <div className="card-content">
                <h3>Linux - Ultimate Edition</h3>
                <p className="card-description">15 chapters</p>
                <p className="card-details">
                  Comprehensive Linux mastery course covering everything from basics to advanced system administration, 
                  security hardening, and automation.
                </p>
                <button className="btn btn-secondary coming-soon" disabled>
                  Coming Soon...
                </button>
              </div>
            </div>

            <div className="lab-card">
              <div className="card-background-image">
                <img src="/linux-red.png" alt="Linux Red Team" />
              </div>
              <div className="card-content">
                <h3>Linux - Escalation</h3>
                <p className="card-description">Red Team learning path</p>
                <p className="card-details">
                  Advanced penetration testing and privilege escalation techniques on Linux systems. 
                  Learn offensive security methodologies and red team tactics.
                </p>
                <button className="btn btn-secondary coming-soon" disabled>
                  Coming Soon...
                </button>
              </div>
            </div>

            <div className="lab-card">
              <div className="card-background-image">
                <img src="/network.png" alt="Network" />
              </div>
              <div className="card-content">
                <h3>Network - Ultimate Edition</h3>
                <p className="card-description">Complete networking mastery</p>
                <p className="card-details">
                  Master network protocols, security, troubleshooting, and infrastructure design. 
                  From CCNA fundamentals to enterprise-level networking solutions.
                </p>
                <button className="btn btn-secondary coming-soon" disabled>
                  Coming Soon...
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}