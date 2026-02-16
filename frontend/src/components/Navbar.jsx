import { Link } from 'react-router-dom';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useMessage } from '../context/MessageContext';
import { useInbox } from '../context/InboxContext';
import { Languages, ChevronDown, LogIn, UserPlus, LogOut, User, Sun, Moon, Inbox, UserCircle, BookOpen, Monitor, Globe, Terminal, CircleAlert } from 'lucide-react';
import StreakIndicator from './StreakIndicator';
import InboxDropdown from './InboxDropdown';
import SupportButton from './SupportButton';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { language, changeLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { showMessage } = useMessage();
  
  // Try to use InboxContext, but provide fallback if not available
  let unreadCount = 0;
  let refreshUnreadCount = () => {};
  
  try {
    const inboxContext = useInbox();
    unreadCount = inboxContext.unreadCount;
    refreshUnreadCount = inboxContext.refreshUnreadCount;
  } catch (error) {
    // InboxProvider not available, use default values
  }

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [inboxDropdownOpen, setInboxDropdownOpen] = useState(false);
  const [practiceDropdownOpen, setPracticeDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const inboxRef = useRef(null);
  const practiceRef = useRef(null);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const toggleLangDropdown = () => setLangDropdownOpen(!langDropdownOpen);
  const toggleProfileDropdown = () => setProfileDropdownOpen(!profileDropdownOpen);
  const toggleInboxDropdown = () => setInboxDropdownOpen(!inboxDropdownOpen);
  const togglePracticeDropdown = () => setPracticeDropdownOpen(!practiceDropdownOpen);

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
    setLangDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
    closeMobileMenu();
  };

  const handleMessageClick = (message) => {
    showMessage(message);
    // Refresh unread count after viewing message
    if (!message.isRead) {
      refreshUnreadCount();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setLangDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (inboxRef.current && !inboxRef.current.contains(event.target)) {
        setInboxDropdownOpen(false);
      }
      if (practiceRef.current && !practiceRef.current.contains(event.target)) {
        setPracticeDropdownOpen(false);
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
          { /*
          <Link to="/lab" className="nav-link-new" onClick={closeMobileMenu}>
            {t('navbar.lab')}
            <span className="new-badge">NEW</span>
          </Link> */
          } 
          <Link to="/is" onClick={closeMobileMenu}>IS/Debug</Link>
          <Link to="/forum" onClick={closeMobileMenu}>Forum</Link>
          
          <div 
            className="practice-dropdown-container" 
            ref={practiceRef}
            onMouseEnter={() => setPracticeDropdownOpen(true)}
            onMouseLeave={() => setPracticeDropdownOpen(false)}
          >
            <Link 
              to="/grile" 
              className="nav-link-with-dropdown"
              onClick={() => {
                closeMobileMenu();
                setPracticeDropdownOpen(false);
              }}
            >
              {t('navbar.questions')}
              <ChevronDown size={16} className="dropdown-icon" />
            </Link>
            {practiceDropdownOpen && (
              <div className="practice-dropdown">
                <Link 
                  to="/grile?filter=all" 
                  className="practice-dropdown-item"
                  onClick={() => {
                    closeMobileMenu();
                    setPracticeDropdownOpen(false);
                  }}
                >
                  <BookOpen size={18} className="practice-item-icon" />
                  <div className="practice-item-content">
                    <div className="practice-item-title">All Questions</div>
                    <div className="practice-item-desc">Practice all categories</div>
                  </div>
                </Link>
                <Link 
                  to="/grile?filter=linux" 
                  className="practice-dropdown-item"
                  onClick={() => {
                    closeMobileMenu();
                    setPracticeDropdownOpen(false);
                  }}
                >
                  <Monitor size={18} className="practice-item-icon" />
                  <div className="practice-item-content">
                    <div className="practice-item-title">Linux</div>
                    <div className="practice-item-desc">Linux questions & commands</div>
                  </div>
                </Link>
                <Link 
                  to="/grile?filter=network" 
                  className="practice-dropdown-item"
                  onClick={() => {
                    closeMobileMenu();
                    setPracticeDropdownOpen(false);
                  }}
                >
                  <Globe size={18} className="practice-item-icon" />
                  <div className="practice-item-content">
                    <div className="practice-item-title">Network</div>
                    <div className="practice-item-desc">Network questions & protocols</div>
                  </div>
                </Link>
                <Link 
                  to="/terminal" 
                  className="practice-dropdown-item"
                  onClick={() => {
                    closeMobileMenu();
                    setPracticeDropdownOpen(false);
                  }}
                >
                  <Terminal size={18} className="practice-item-icon" />
                  <div className="practice-item-content">
                    <div className="practice-item-title">Terminal</div>
                    <div className="practice-item-desc">Practice terminal commands</div>
                  </div>
                </Link>
              </div>
            )}
          </div>
          
          <Link to="/resurse" onClick={closeMobileMenu}>{t('navbar.resources')}</Link>
          <Link to="/leaderboard" onClick={closeMobileMenu}>{t('navbar.leaderboard')}</Link>
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

            <button className="theme-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            {user ? (
              <>
                <div className="profile-selector" ref={profileDropdownRef}>
                  <button className="profile-btn" onClick={toggleProfileDropdown}>
                    <User size={16} />
                    <span>{user.username}</span>
                    <ChevronDown size={16} />
                  </button>
                  {profileDropdownOpen && (
                    <div className="profile-dropdown">
                      <Link to={`/profile/${user.username}`} onClick={() => setProfileDropdownOpen(false)}>
                        <UserCircle size={16} />
                        Profile
                      </Link>
                      <button onClick={handleLogout}>
                        <LogOut size={16} />
                        {t('navbar.logout')}
                      </button>
                    </div>
                  )}
                </div>
                <div className="inbox-container" ref={inboxRef}>
                  <button className="inbox-btn" onClick={toggleInboxDropdown} title="Inbox">
                    <Inbox size={18} />
                    {unreadCount > 0 && (
                      <span className="inbox-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </button>
                  <InboxDropdown 
                    isOpen={inboxDropdownOpen}
                    onClose={() => setInboxDropdownOpen(false)}
                    onMessageClick={handleMessageClick}
                  />
                </div>
                <StreakIndicator streak={user.streak} />
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary" onClick={closeMobileMenu}>
                  <LogIn size={16} />
                  {t('navbar.login')}
                </Link>
                <Link to="/register" className="btn btn-secondary" onClick={closeMobileMenu}>
                  <UserPlus size={16} />
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
