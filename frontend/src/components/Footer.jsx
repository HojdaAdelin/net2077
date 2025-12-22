import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Footer.css';

export default function Footer() {
  const { t } = useLanguage();
  
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">NET2077</div>
            <p className="footer-description">
              {t('footer.description')}
            </p>
          </div>

          <div className="footer-section">
            <h3>{t('footer.learn')}</h3>
            <div className="footer-links">
              <Link to="/grile">{t('footer.questions')}</Link>
              <Link to="/resurse">{t('footer.resources')}</Link>
              <Link to="/progress">{t('footer.progress')}</Link>
            </div>
          </div>

          <div className="footer-section">
            <h3>{t('footer.links')}</h3>
            <div className="footer-links">
              <Link to="/updates">{t('footer.updates')}</Link>
              <a href="https://github.com/HojdaAdelin/net2077" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2025 NET2077. {t('footer.rights')}</p>
          <p>{t('footer.version')} 1.1.0</p>
        </div>
      </div>
    </footer>
  );
}
