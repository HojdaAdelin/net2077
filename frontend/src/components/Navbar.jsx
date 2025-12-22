import { Link } from 'react-router-dom';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Languages, ChevronDown } from 'lucide-react';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { language, changeLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const toggleLangDropdown = () => setLangDropdownOpen(!langDropdownOpen);

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
    setLangDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setLangDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="container nav-content">
        <Link to="/" className="logo" onClick={closeMobileMenu}>NET2077</Link>
        
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          <span className="menu-icon"></span>
        </button>

        <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
          <Link to="/grile" onClick={closeMobileMenu}>{t('navbar.questions')}</Link>
          <Link to="/resurse" onClick={closeMobileMenu}>{t('navbar.resources')}</Link>
          <Link to="/leaderboard" onClick={closeMobileMenu}>Leaderboard</Link>
          {user && <Link to="/progress" onClick={closeMobileMenu}>{t('navbar.progress')}</Link>}
          
          <div className="nav-auth">
            <div className="language-selector" ref={dropdownRef}>
              <button className="lang-btn" onClick={toggleLangDropdown}>
                <Languages size={18} />
                <span>{language.toUpperCase()}</span>
                <ChevronDown size={16} />
              </button>
              {langDropdownOpen && (
                <div className="lang-dropdown">
                  <button 
                    onClick={() => handleLanguageChange('en')}
                    className={language === 'en' ? 'active' : ''}
                  >
                    English
                  </button>
                  <button 
                    onClick={() => handleLanguageChange('ro')}
                    className={language === 'ro' ? 'active' : ''}
                  >
                    Română
                  </button>
                </div>
              )}
            </div>
            
            {user ? (
              <button onClick={() => { logout(); closeMobileMenu(); }} className="btn btn-secondary">
                {t('navbar.logout')}
              </button>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary" onClick={closeMobileMenu}>
                  {t('navbar.login')}
                </Link>
                <Link to="/register" className="btn btn-primary" onClick={closeMobileMenu}>
                  {t('navbar.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
