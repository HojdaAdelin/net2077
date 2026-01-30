import { Link } from 'react-router-dom';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useMessage } from '../context/MessageContext';
import { Languages, ChevronDown, LogIn, UserPlus, LogOut, User, Sun, Moon, Inbox } from 'lucide-react';
import { API_URL } from '../config';
import StreakIndicator from './StreakIndicator';
import InboxDropdown from './InboxDropdown';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { language, changeLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { showMessage } = useMessage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [inboxDropdownOpen, setInboxDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const inboxRef = useRef(null);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const toggleLangDropdown = () => setLangDropdownOpen(!langDropdownOpen);
  const toggleProfileDropdown = () => setProfileDropdownOpen(!profileDropdownOpen);
  const toggleInboxDropdown = () => setInboxDropdownOpen(!inboxDropdownOpen);

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
      fetchUnreadCount();
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_URL}/inbox/unread-count`, {
        credentials: 'include'
      });
      const data = await response.json();
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    
    // Refresh unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

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
          <Link to="/terminal" onClick={closeMobileMenu}>Terminal</Link>
          <Link to="/is" onClick={closeMobileMenu}>IS/Debug</Link>
          <Link to="/grile" onClick={closeMobileMenu}>{t('navbar.questions')}</Link>
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
