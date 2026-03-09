import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import '../styles/LoginRequired.css';

export default function LoginRequired({ icon: Icon, title, description }) {
  return (
    <div className="login-required-container">
      <div className="login-required-content">
        {Icon && <Icon size={64} className="login-required-icon" />}
        <h2 className="login-required-title">{title || 'Login Required'}</h2>
        <p className="login-required-description">
          {description || 'Please login to access this feature.'}
        </p>
        <Link to="/login" className="btn btn-primary login-required-btn">
          <LogIn size={18} />
          Login to Continue
        </Link>
        <p className="login-required-footer">
          Don't have an account? <Link to="/register" className="login-required-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
