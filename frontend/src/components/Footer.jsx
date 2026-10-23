import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import '../styles/Footer.css';

export default function Footer() {
  const { t } = useLanguage();
  return <footer className="ft-root">
    <div className="ft-container">
      <div className="ft-top">
        <div className="ft-brand">
          <Link to="/" className="ft-logo" aria-label="NET2077 home">NET2077</Link>
          <p className="ft-desc">{t('footer.description')}</p>
        </div>
        <button type="button" className="ft-back-top" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>
          <span>Back to top</span><ArrowUp size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="ft-cols">
        <nav className="ft-col" aria-label={t('footer.learn')}>
          <h2 className="ft-col-label">{t('footer.learn')}</h2>
          <div className="ft-nav-links">
            <Link to="/grile" className="ft-link"><span className="ft-link-text">{t('footer.questions')}</span></Link>
            <Link to="/learn" className="ft-link"><span className="ft-link-text">{t('footer.resources')}</span></Link>
            <Link to="/progress" className="ft-link"><span className="ft-link-text">{t('footer.progress')}</span></Link>
          </div>
        </nav>
        <nav className="ft-col" aria-label={t('footer.links')}>
          <h2 className="ft-col-label">{t('footer.links')}</h2>
          <div className="ft-nav-links">
            <Link to="/updates" className="ft-link"><span className="ft-link-text">{t('footer.updates')}</span></Link>
            <a href="https://github.com/HojdaAdelin/net2077" target="_blank" rel="noopener noreferrer" className="ft-link">
              <span className="ft-link-text">GitHub</span> <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </nav>
      </div>
      <div className="ft-bottom">
        <span className="ft-copyright">{'\u00a9'} 2025-{new Date().getFullYear()} NET2077. {t('footer.rights')}</span>
        <Link to="/terms" className="ft-legal"><span className="ft-link-text">Terms &amp; Conditions</span></Link>
      </div>
    </div>
  </footer>;
}
