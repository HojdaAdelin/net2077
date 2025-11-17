import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../services/api';
import '../styles/Hero.css';

export default function Hero() {
  const [stats, setStats] = useState({ totalQuestions: 0, totalUsers: 0, totalResources: 0 });

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="hero">
      <div className="container">
        <div className="hero-content">
          <h1 className="hero-title">Master Applied Informatics</h1>
          <p className="hero-subtitle">
            Practice computer science fundamentals through interactive questions and curated learning resources
          </p>
          
          <div className="hero-cta">
            <Link to="/grile" className="btn btn-primary">Get Started</Link>
            <Link to="/resurse" className="btn btn-secondary">Browse Resources</Link>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">{stats.totalQuestions}</div>
            <div className="stat-label">Practice Questions</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.totalUsers}</div>
            <div className="stat-label">Active Learners</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.totalResources}</div>
            <div className="stat-label">Learning Resources</div>
          </div>
        </div>
      </div>
    </div>
  );
}
