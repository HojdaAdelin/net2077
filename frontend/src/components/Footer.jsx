import { Link } from 'react-router-dom';
import '../styles/Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">NET2077</div>
            <p className="footer-description">
              Your comprehensive platform for mastering applied informatics through interactive learning and practice.
            </p>
          </div>

          <div className="footer-section">
            <h3>Learn</h3>
            <div className="footer-links">
              <Link to="/grile">Questions</Link>
              <Link to="/resurse">Resources</Link>
              <Link to="/progress">Progress</Link>
            </div>
          </div>

          <div className="footer-section">
            <h3>LINKS</h3>
            <div className="footer-links">
              <a href="https://github.com/HojdaAdelin/net2077" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2025 NET2077. All rights reserved.</p>
          <p>Version: 1.0.0</p>
        </div>
      </div>
    </footer>
  );
}
