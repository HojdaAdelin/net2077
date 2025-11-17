import { Link } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="container nav-content">
        <Link to="/" className="logo" onClick={closeMobileMenu}>NET2077</Link>
        
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          <span className="menu-icon"></span>
        </button>

        <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
          <Link to="/grile" onClick={closeMobileMenu}>Questions</Link>
          <Link to="/resurse" onClick={closeMobileMenu}>Resources</Link>
          {user && <Link to="/progress" onClick={closeMobileMenu}>Progress</Link>}
          
          <div className="nav-auth">
            {user ? (
              <button onClick={() => { logout(); closeMobileMenu(); }} className="btn btn-secondary">
                Logout
              </button>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary" onClick={closeMobileMenu}>
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary" onClick={closeMobileMenu}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
