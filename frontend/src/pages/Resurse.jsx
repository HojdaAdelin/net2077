import { useState, useEffect } from 'react';
import { getRoadmaps } from '../services/api';
import { BookOpen, Layers, Lock, Sparkles } from 'lucide-react';
import '../styles/Resurse.css';

export default function Resurse() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRoadmaps()
      .then(setRoadmaps)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container resurse-page">
        <div className="learn-loading">
          <div className="learn-spinner"></div>
          <p>Loading learning paths...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container resurse-page">
      <div className="learn-hero">
        <div className="learn-hero-badge">
          <Sparkles size={16} />
          <span>Start Your Journey</span>
        </div>
        <h1 className="learn-hero-title">Choose Your Path</h1>
        <p className="learn-hero-subtitle">
          Structured learning paths designed to take you from beginner to expert. 
          Master the skills that matter.
        </p>
      </div>

      {roadmaps.length > 0 ? (
        <div className="learn-roadmaps-grid">
          {roadmaps.map((roadmap) => (
            <div key={roadmap._id} className="learn-roadmap-card">
              <div className="learn-card-glow"></div>
              
              <div className="learn-card-image">
                <img 
                  src={`/${roadmap.image}`} 
                  alt={roadmap.title}
                  loading="lazy"
                />
                <div className="learn-card-overlay"></div>
              </div>

              <div className="learn-card-content">
                <div className="learn-card-header">
                  <h3 className="learn-card-title">{roadmap.title}</h3>
                  {roadmap.type === 'premium' && (
                    <div className="learn-premium-badge">
                      <Lock size={14} />
                      <span>Premium</span>
                    </div>
                  )}
                  {roadmap.type === 'free' && (
                    <div className="learn-free-badge">
                      <span>Free</span>
                    </div>
                  )}
                </div>

                <p className="learn-card-description">{roadmap.description}</p>

                <div className="learn-card-stats">
                  <div className="learn-stat-item">
                    <Layers size={16} />
                    <span>{roadmap.chapters?.length || 0} Chapters</span>
                  </div>
                  <div className="learn-stat-item">
                    <BookOpen size={16} />
                    <span>
                      {roadmap.chapters?.reduce((acc, ch) => acc + (ch.topics?.length || 0), 0) || 0} Topics
                    </span>
                  </div>
                </div>

                <button className="learn-card-button">
                  <span>Start Learning</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="learn-empty-state">
          <BookOpen size={48} />
          <h3>No learning paths available yet</h3>
          <p>Check back soon for new content</p>
        </div>
      )}
    </div>
  );
}
