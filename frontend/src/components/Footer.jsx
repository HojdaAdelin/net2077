import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Footer.css';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="ft-root">
      <div className="ft-container">
        <div className="ft-top">

          <div className="ft-brand">
            <span className="ft-logo">NET2077</span>
            <p className="ft-desc">{t('footer.description')}</p>
          </div>

          <div className="ft-cols">
            <div className="ft-col">
              <span className="ft-col-label">{t('footer.learn')}</span>
              <Link to="/grile" className="ft-link">{t('footer.questions')}</Link>
              <Link to="/learn" className="ft-link">{t('footer.resources')}</Link>
              <Link to="/progress" className="ft-link">{t('footer.progress')}</Link>
            </div>

            <div className="ft-col">
              <span className="ft-col-label">{t('footer.links')}</span>
              <Link to="/updates" className="ft-link">{t('footer.updates')}</Link>
              <a
                href="https://github.com/HojdaAdelin/net2077"
                target="_blank"
                rel="noopener noreferrer"
                className="ft-link"
              >
                GitHub
              </a>
            </div>
          </div>

        </div>

        <div className="ft-bottom">
          <span>© 2025-2026 NET2077. {t('footer.rights')}</span>
          <span>{t('footer.version')} 1.2.0</span>
        </div>
      </div>
    </footer>
  );
}
