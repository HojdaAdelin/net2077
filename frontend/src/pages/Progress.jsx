import { useState, useEffect } from 'react';
import { getUserProgress } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Progress.css';

export default function Progress() {
  const [progress, setProgress] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    getUserProgress().then(setProgress).catch(() => {});
  }, []);

  if (!progress) {
    return (
      <div className="container progress-page">
        <div className="loading">{t('progress.loading')}</div>
      </div>
    );
  }

  const xpToNextLevel = 100 - (progress.xp % 100);
  const progressPercent = (progress.xp % 100);

  return (
    <div className="container progress-page">
      <div className="progress-header">
        <h1>{t('progress.title')}</h1>
      </div>

      <div className="progress-grid">
        <div className="level-card">
          <div className="level-info">
            <div className="level-details">
              <h2>{t('progress.currentLevel')}</h2>
              <div className="level-number">{progress.level}</div>
            </div>
            <div className="xp-badge">{progress.xp} XP</div>
          </div>
          
          <div className="progress-bar-container">
            <div className="progress-bar-label">
              <span>{t('progress.progressToLevel')} {progress.level + 1}</span>
              <span>{xpToNextLevel} XP {t('progress.xpRemaining')}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        <div className="stat-card-progress">
          <div className="stat-label-small">{t('progress.questionsSolved')}</div>
          <div className="stat-value">{progress.solvedCount}</div>
        </div>

        <div className="stat-card-progress">
          <div className="stat-label-small">{t('progress.simulations')}</div>
          <div className="stat-value">{progress.simulations?.length || 0}</div>
        </div>
      </div>

      <div className="category-progress-section">
        <h2>{t('progress.progressByCategory')}</h2>
        <div className="category-cards">
          <div className="category-progress-card">
            <div className="category-header">
              <h3>Linux</h3>
              <span className="category-badge linux">LINUX</span>
            </div>
            <div className="category-stat-large">
              <div className="stat-number">{progress.solvedByTag?.LINUX || 0}</div>
              <div className="stat-text">{t('progress.questionsSolved')}</div>
            </div>
          </div>

          <div className="category-progress-card">
            <div className="category-header">
              <h3>Network</h3>
              <span className="category-badge network">NETWORK</span>
            </div>
            <div className="category-stat-large">
              <div className="stat-number">{progress.solvedByTag?.NETWORK || 0}</div>
              <div className="stat-text">{t('progress.questionsSolved')}</div>
            </div>
          </div>

          <div className="category-progress-card">
            <div className="category-header">
              <h3>Terminal</h3>
              <span className="category-badge terminal">TERMINAL</span>
            </div>
            <div className="category-stat-large">
              <div className="stat-number">{progress.terminalStats?.solved || 0}</div>
              <div className="stat-text">Terminal Commands</div>
            </div>
          </div>
        </div>
      </div>

      {progress.simulations?.length > 0 && (
        <div className="simulations-section">
          <h2>{t('progress.recentSimulations')}</h2>
          <div className="simulations-grid">
            {progress.simulations.slice(-6).reverse().map((sim, i) => {
              const percentage = sim.totalPoints > 0 ? Math.round((sim.score / sim.totalPoints) * 100) : 0;
              const isPassed = percentage >= 70;
              
              return (
                <div key={i} className="simulation-card">
                  <div className="simulation-header">
                    <span className={`simulation-badge ${isPassed ? 'passed' : 'failed'}`}>
                      {isPassed ? t('progress.passed') : t('progress.failed')}
                    </span>
                    <span className="simulation-date">
                      {new Date(sim.date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {sim.examTitle && (
                    <div className="simulation-title">
                      {sim.examTitle}
                    </div>
                  )}
                  
                  <div className="simulation-score">
                    <div className="score-display">{percentage}%</div>
                  </div>
                  
                  <div className="simulation-details">
                    <div>{sim.score} / {sim.totalPoints} {t('progress.points')}</div>
                    <div>{sim.correctAnswers} / {sim.totalQuestions} {t('progress.correctAnswers')}</div>
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
