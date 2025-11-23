import { useState, useEffect } from 'react';
import { getUserProgress } from '../services/api';
import '../styles/Progress.css';

export default function Progress() {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    getUserProgress().then(setProgress).catch(() => {});
  }, []);

  if (!progress) {
    return (
      <div className="container progress-page">
        <div className="loading">Loading your progress...</div>
      </div>
    );
  }

  const xpToNextLevel = 100 - (progress.xp % 100);
  const progressPercent = (progress.xp % 100);

  return (
    <div className="container progress-page">
      <div className="progress-header">
        <h1>Your Progress</h1>
      </div>

      <div className="progress-grid">
        <div className="level-card">
          <div className="level-info">
            <div className="level-details">
              <h2>Current Level</h2>
              <div className="level-number">{progress.level}</div>
            </div>
            <div className="xp-badge">{progress.xp} XP</div>
          </div>
          
          <div className="progress-bar-container">
            <div className="progress-bar-label">
              <span>Progress to Level {progress.level + 1}</span>
              <span>{xpToNextLevel} XP remaining</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        <div className="stat-card-progress">
          <div className="stat-label-small">Questions Solved</div>
          <div className="stat-value">{progress.solvedCount}</div>
        </div>

        <div className="stat-card-progress">
          <div className="stat-label-small">Simulations</div>
          <div className="stat-value">{progress.simulations.length}</div>
        </div>
      </div>

      <div className="category-progress-section">
        <h2>Progress by Category</h2>
        <div className="category-cards">
          <div className="category-progress-card">
            <div className="category-header">
              <h3>Linux</h3>
              <span className="category-badge linux">LINUX</span>
            </div>
            <div className="category-stat-large">
              <div className="stat-number">{progress.solvedByTag?.LINUX || 0}</div>
              <div className="stat-text">Questions Solved</div>
            </div>
          </div>

          <div className="category-progress-card">
            <div className="category-header">
              <h3>Network</h3>
              <span className="category-badge network">NETWORK</span>
            </div>
            <div className="category-stat-large">
              <div className="stat-number">{progress.solvedByTag?.NETWORK || 0}</div>
              <div className="stat-text">Questions Solved</div>
            </div>
          </div>
        </div>
      </div>

      {progress.simulations.length > 0 && (
        <div className="simulations-section">
          <h2>Recent Simulations</h2>
          <div className="simulations-grid">
            {progress.simulations.slice(-6).reverse().map((sim, i) => {
              const percentage = Math.round((sim.score / sim.total) * 100);
              const isPassed = percentage >= 70;
              
              return (
                <div key={i} className="simulation-card">
                  <div className="simulation-header">
                    <span className={`simulation-badge ${isPassed ? 'passed' : 'failed'}`}>
                      {isPassed ? 'Passed' : 'Failed'}
                    </span>
                    <span className="simulation-date">
                      {new Date(sim.date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="simulation-score">
                    <div className="score-display">{percentage}%</div>
                  </div>
                  
                  <div className="simulation-details">
                    <div>{sim.score} points</div>
                    <div>{sim.score/2} / {sim.total/2} correct answers</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
