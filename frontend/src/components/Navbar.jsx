import { Link } from 'react-router-dom';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useMessage } from '../context/MessageContext';
import { useInbox } from '../context/InboxContext';
import { Languages, ChevronDown, LogIn, UserPlus, LogOut, User, Sun, Moon, Inbox, UserCircle, BookOpen, Monitor, Globe, Terminal, CircleAlert, Coins, Package, Zap } from 'lucide-react';
import StreakIndicator from './StreakIndicator';
import InboxDropdown from './InboxDropdown';
import SupportButton from './SupportButton';
import { API_URL } from '../config';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, logout, updateUser } = useContext(AuthContext);
  const { language, changeLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { showMessage } = useMessage();
  
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
  const [inventoryDropdownOpen, setInventoryDropdownOpen] = useState(false);
  const [inboxDropdownOpen, setInboxDropdownOpen] = useState(false);
  const [practiceDropdownOpen, setPracticeDropdownOpen] = useState(false);
  const [usingItem, setUsingItem] = useState(false);
  const [dialog, setDialog] = useState({ show: false, type: '', title: '', message: '' });
  const dropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const inventoryRef = useRef(null);
  const inboxRef = useRef(null);
  const practiceRef = useRef(null);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const toggleLangDropdown = () => setLangDropdownOpen(!langDropdownOpen);
  const toggleProfileDropdown = () => setProfileDropdownOpen(!profileDropdownOpen);
  const toggleInventoryDropdown = () => setInventoryDropdownOpen(!inventoryDropdownOpen);
  const toggleInboxDropdown = () => setInboxDropdownOpen(!inboxDropdownOpen);
  const togglePracticeDropdown = () => setPracticeDropdownOpen(!practiceDropdownOpen);

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
    setLangDropdownOpen(false);
  };

  const handleUseItem = async (itemId) => {
    if (usingItem) return; // Prevent spam
    
    try {
      setUsingItem(true);
      
      const response = await fetch(`${API_URL}/shop/use/${itemId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        updateUser({ 
          inventory: data.inventory,
          activeBoosts: data.activeBoosts 
        });
        setDialog({
          show: true,
          type: 'success',
          title: 'Item Used Successfully!',
          message: data.message
        });
        setInventoryDropdownOpen(false);
      } else {
        setDialog({
          show: true,
          type: 'error',
          title: 'Failed to Use Item',
          message: data.message
        });
      }
    } catch (error) {
      console.error('Error using item:', error);
      setDialog({
        show: true,
        type: 'error',
        title: 'Failed to Use Item',
        message: 'Failed to use item. Please try again.'
      });
    } finally {
      setTimeout(() => {
        setUsingItem(false);
      }, 1000);
    }
  };

  const closeDialog = () => {
    setDialog({ show: false, type: '', title: '', message: '' });
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
      if (inventoryRef.current && !inventoryRef.current.contains(event.target)) {
        setInventoryDropdownOpen(false);
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
    <>
    <nav className="navbar">
      <div className="container nav-content">
        <Link to="/" className="logo" onClick={closeMobileMenu}>NET2077</Link>
        
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          <span className="menu-icon"></span>
        </button>

        <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
          <Link to="/forum" onClick={closeMobileMenu}>Forum</Link>
          <Link to="/arena" className="nav-link-new" onClick={closeMobileMenu}>
            Arena
            <span className="new-badge">NEW</span>
          </Link>
          <Link to="/is" onClick={closeMobileMenu}>IS/Debug</Link>
          
          <div 
            className="practice-dropdown-container" 
            ref={practiceRef}
            onMouseEnter={() => setPracticeDropdownOpen(true)}
            onMouseLeave={() => setPracticeDropdownOpen(false)}
          >
            <Link 
              to="/grile" 
              className="nav-link-with-dropdown practice-link-desktop"
              onClick={(e) => {
                
                if (window.innerWidth <= 768) {
                  e.preventDefault();
                  setPracticeDropdownOpen(!practiceDropdownOpen);
                } else {
                 
                  closeMobileMenu();
                  setPracticeDropdownOpen(false);
                }
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
          
          <Link to="/learn" onClick={closeMobileMenu}>{t('navbar.resources')}</Link>
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
                      <Link to="/shop" className="profile-dropdown-gold-item" onClick={() => setProfileDropdownOpen(false)}>
                        <Coins size={16} className="gold-icon" />
                        <span>Gold: {user.gold || 0}</span>
                      </Link>
                    </div>
                  )}
                </div>
                <div className="inventory-container" ref={inventoryRef}>
                  <button className="inventory-btn" onClick={toggleInventoryDropdown} title="Inventory">
                    <Package size={18} />
                    {user.inventory && user.inventory.length > 0 && (
                      <span className="inventory-badge">{user.inventory.length}</span>
                    )}
                  </button>
                  {inventoryDropdownOpen && (
                    <div className="inventory-dropdown">
                      <div className="inventory-header">
                        <Package size={18} />
                        <span>Inventory</span>
                      </div>
                      <div className="inventory-items">
                        {user.activeBoosts && user.activeBoosts.length > 0 && (
                          <div className="active-boosts-section">
                            <div className="active-boosts-header">Active Boosts</div>
                            {user.activeBoosts.map((boost, index) => (
                              <div key={index} className="active-boost-item">
                                <div className="boost-icon">
                                  <Zap size={16} />
                                </div>
                                <div className="boost-info">
                                  <span className="boost-name">{boost.multiplier}x XP Boost</span>
                                  <span className="boost-timer">
                                    {Math.max(0, Math.ceil((new Date(boost.expiresAt) - new Date()) / 60000))} min left
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {user.inventory && user.inventory.length > 0 ? (
                          user.inventory.map((item, index) => (
                            <div key={index} className="inventory-item" title={item.name}>
                              <div className="inventory-item-icon">
                                {item.icon === 'Zap' && <Zap size={16} />}
                                {item.icon === 'Sparkles' && <CircleAlert size={16} />}
                                {item.icon === 'RotateCcw' && <CircleAlert size={16} />}
                              </div>
                              <div className="inventory-item-info">
                                <span className="inventory-item-name">{item.name}</span>
                                <span className="inventory-item-quantity">x{item.quantity}</span>
                              </div>
                              <button 
                                className={`inventory-use-btn ${
                                  (item.category === 'boost' && user.activeBoosts?.some(boost => 
                                    boost.type === 'xp_multiplier' && new Date(boost.expiresAt) > new Date()
                                  )) || usingItem ? 'disabled' : ''
                                }`}
                                onClick={() => handleUseItem(item.itemId)}
                                disabled={
                                  (item.category === 'boost' && user.activeBoosts?.some(boost => 
                                    boost.type === 'xp_multiplier' && new Date(boost.expiresAt) > new Date()
                                  )) || usingItem
                                }
                              >
                                {usingItem ? 'Using...' : 
                                 (item.category === 'boost' && user.activeBoosts?.some(boost => 
                                   boost.type === 'xp_multiplier' && new Date(boost.expiresAt) > new Date()
                                 ) ? 'Active' : 'Use')}
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="inventory-empty">
                            <Package size={32} />
                            <p>No items in inventory</p>
                          </div>
                        )}
                      </div>
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

    {/* Custom Dialog */}
    {dialog.show && (
      <div className="navbar-dialog-overlay" onClick={closeDialog}>
        <div className="navbar-dialog" onClick={(e) => e.stopPropagation()}>
          <div className={`navbar-dialog-header ${dialog.type}`}>
            <div className="navbar-dialog-icon">
              {dialog.type === 'success' ? '✅' : '❌'}
            </div>
            <h3 className="navbar-dialog-title">{dialog.title}</h3>
          </div>
          <div className="navbar-dialog-body">
            <p>{dialog.message}</p>
          </div>
          <div className="navbar-dialog-footer">
            <button className="btn btn-primary" onClick={closeDialog}>
              OK
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
