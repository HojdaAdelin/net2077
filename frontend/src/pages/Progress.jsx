import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getUserProgress, checkPendingRewards, claimLevelRewards } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { Monitor, Globe, Award, Terminal, Info, Zap, TrendingUp, Gift, X, Coins } from 'lucide-react';
import LoginRequired from '../components/LoginRequired';
import '../styles/Progress.css';

export default function Progress() {
  const { user } = useContext(AuthContext);
  const [progress, setProgress] = useState(null);
  const [pendingRewards, setPendingRewards] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [rewardDialog, setRewardDialog] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (user) {
      getUserProgress().then(setProgress).catch(() => {});
      checkPendingRewards().then(setPendingRewards).catch(() => {});
    }
  }, [user]);

  if (!user) {
    return (
      <LoginRequired 
        icon={TrendingUp}
        title="Progress Tracking Required"
        description="Please login to track your learning progress, view statistics and earn badges."
      />
    );
  }

  if (!progress) {
    return (
      <div className="container progress-page">
        <div className="progress-skeleton">
          <div className="skeleton-header">
            <div className="skeleton-title"></div>
          </div>

          <div className="progress-grid">
            <div className="skeleton-level-card">
              <div className="skeleton-level-info">
                <div className="skeleton-level-text"></div>
                <div className="skeleton-level-number"></div>
              </div>
              <div className="skeleton-progress-bar"></div>
            </div>

            <div className="skeleton-stat-card">
              <div className="skeleton-stat-label"></div>
              <div className="skeleton-stat-value"></div>
            </div>

            <div className="skeleton-stat-card">
              <div className="skeleton-stat-label"></div>
              <div className="skeleton-stat-value"></div>
            </div>
          </div>

          <div className="skeleton-category-section">
            <div className="skeleton-section-title"></div>
            <div className="skeleton-category-grid">
              <div className="skeleton-category-card">
                <div className="skeleton-category-header"></div>
                <div className="skeleton-category-stat"></div>
                <div className="skeleton-badge-progress"></div>
              </div>
              <div className="skeleton-category-card">
                <div className="skeleton-category-header"></div>
                <div className="skeleton-category-stat"></div>
                <div className="skeleton-badge-progress"></div>
              </div>
              <div className="skeleton-category-card">
                <div className="skeleton-category-header"></div>
                <div className="skeleton-category-stat"></div>
                <div className="skeleton-badge-progress"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const xpToNextLevel = 100 - (progress.xp % 100);
  const progressPercent = (progress.xp % 100);

  const handleClaimRewards = async () => {
    if (claiming || !pendingRewards?.hasPendingRewards) return;
    
    setClaiming(true);
    try {
      const result = await claimLevelRewards();
      if (result.success) {

        setRewardDialog({
          goldEarned: result.goldEarned,
          levelsRewarded: result.levelsRewarded,
          newGoldTotal: result.newGoldTotal
        });
        

        const newProgress = await getUserProgress();
        setProgress(newProgress);
        const newPending = await checkPendingRewards();
        setPendingRewards(newPending);
      }
    } catch (error) {
      console.error('Error claiming rewards:', error);
    } finally {
      setClaiming(false);
    }
  };

  // Badge requirements
  const linuxBadgeRequired = 500;
  const linuxLegendaryRequired = 1000;
  const networkBadgeRequired = 50;
  const networkLegendaryRequired = 300;
  const terminalBadgeRequired = 50;
  const terminalLegendaryRequired = 150;
  const levelBadgeRequired = 50;
  const levelLegendaryRequired = 100;
  
  const linuxSolved = progress.solvedByTag?.LINUX || 0;
  const networkSolved = progress.solvedByTag?.NETWORK || 0;
  const terminalSolved = progress.terminalStats?.solved || 0;
  
  const linuxBadgeUnlocked = linuxSolved >= linuxBadgeRequired;
  const networkBadgeUnlocked = networkSolved >= networkBadgeRequired;
  const terminalBadgeUnlocked = terminalSolved >= terminalBadgeRequired;
  const levelBadgeUnlocked = progress.level >= levelBadgeRequired;
  
  const linuxRemaining = Math.max(0, linuxBadgeRequired - linuxSolved);
  const networkRemaining = Math.max(0, networkBadgeRequired - networkSolved);
  const terminalRemaining = Math.max(0, terminalBadgeRequired - terminalSolved);
  const levelRemaining = Math.max(0, levelBadgeRequired - progress.level);
  
  const linuxLegendaryRemaining = Math.max(0, linuxLegendaryRequired - linuxSolved);
  const networkLegendaryRemaining = Math.max(0, networkLegendaryRequired - networkSolved);
  const terminalLegendaryRemaining = Math.max(0, terminalLegendaryRequired - terminalSolved);
  const levelLegendaryRemaining = Math.max(0, levelLegendaryRequired - progress.level);

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
            {pendingRewards?.hasPendingRewards && (
              <button 
                className={`level-rewards-btn ${claiming ? 'claiming' : 'pulse'}`}
                onClick={handleClaimRewards}
                disabled={claiming}
                title={`Claim ${pendingRewards.pendingGold} Gold for ${pendingRewards.pendingLevels} level(s)`}
              >
                <Gift size={18} />
                <span>Lvl Rewards</span>
                <span className="rewards-count">{pendingRewards.pendingGold}</span>
              </button>
            )}
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

          <div className={`badge-progress ${levelBadgeUnlocked ? 'unlocked' : ''}`} style={{ marginTop: '24px' }}>
            <div className="badge-progress-icon">
              {levelBadgeUnlocked ? <Award size={16} /> : <Zap size={16} />}
            </div>
            <div className="badge-progress-content">
              <div className="badge-progress-text">
                {levelBadgeUnlocked ? (
                  <span className="badge-unlocked-text">Master User Badge Unlocked!</span>
                ) : (
                  <span className="badge-locked-text">{levelRemaining} more levels to unlock badge</span>
                )}
              </div>
              {levelBadgeUnlocked && (
                <div className="badge-next-tier">
                  <Info size={14} />
                  <span className="next-tier-tooltip">{levelLegendaryRemaining} more levels for Legendary</span>
                </div>
              )}
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
              <div className="stat-number">{linuxSolved}</div>
              <div className="stat-text">{t('progress.questionsSolved')}</div>
            </div>
            
            {/* Badge Progress */}
            <div className={`badge-progress ${linuxBadgeUnlocked ? 'unlocked' : ''}`}>
              <div className="badge-progress-icon">
                {linuxBadgeUnlocked ? <Award size={16} /> : <Monitor size={16} />}
              </div>
              <div className="badge-progress-content">
                <div className="badge-progress-text">
                  {linuxBadgeUnlocked ? (
                    <span className="badge-unlocked-text">Linux Master Badge Unlocked!</span>
                  ) : (
                    <span className="badge-locked-text">{linuxRemaining} more to unlock badge</span>
                  )}
                </div>
                {linuxBadgeUnlocked && (
                  <div className="badge-next-tier">
                    <Info size={14} />
                    <span className="next-tier-tooltip">{linuxLegendaryRemaining} more for Legendary</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="category-progress-card">
            <div className="category-header">
              <h3>Network</h3>
              <span className="category-badge network">NETWORK</span>
            </div>
            <div className="category-stat-large">
              <div className="stat-number">{networkSolved}</div>
              <div className="stat-text">{t('progress.questionsSolved')}</div>
            </div>
            
            {/* Badge Progress */}
            <div className={`badge-progress ${networkBadgeUnlocked ? 'unlocked' : ''}`}>
              <div className="badge-progress-icon">
                {networkBadgeUnlocked ? <Award size={16} /> : <Globe size={16} />}
              </div>
              <div className="badge-progress-content">
                <div className="badge-progress-text">
                  {networkBadgeUnlocked ? (
                    <span className="badge-unlocked-text">Network Expert Badge Unlocked!</span>
                  ) : (
                    <span className="badge-locked-text">{networkRemaining} more to unlock badge</span>
                  )}
                </div>
                {networkBadgeUnlocked && (
                  <div className="badge-next-tier">
                    <Info size={14} />
                    <span className="next-tier-tooltip">{networkLegendaryRemaining} more for Legendary</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="category-progress-card">
            <div className="category-header">
              <h3>Terminal</h3>
              <span className="category-badge terminal">TERMINAL</span>
            </div>
            <div className="category-stat-large">
              <div className="stat-number">{terminalSolved}</div>
              <div className="stat-text">Terminal Commands</div>
            </div>
            
            {/* Badge Progress */}
            <div className={`badge-progress ${terminalBadgeUnlocked ? 'unlocked' : ''}`}>
              <div className="badge-progress-icon">
                {terminalBadgeUnlocked ? <Award size={16} /> : <Terminal size={16} />}
              </div>
              <div className="badge-progress-content">
                <div className="badge-progress-text">
                  {terminalBadgeUnlocked ? (
                    <span className="badge-unlocked-text">Terminal Pro Badge Unlocked!</span>
                  ) : (
                    <span className="badge-locked-text">{terminalRemaining} more to unlock badge</span>
                  )}
                </div>
                {terminalBadgeUnlocked && (
                  <div className="badge-next-tier">
                    <Info size={14} />
                    <span className="next-tier-tooltip">{terminalLegendaryRemaining} more for Legendary</span>
                  </div>
                )}
              </div>
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

      {rewardDialog && (
        <div className="reward-dialog-overlay" onClick={() => setRewardDialog(null)}>
          <div className="reward-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="reward-dialog-close" onClick={() => setRewardDialog(null)}>
              <X size={20} />
            </button>
            
            <div className="reward-dialog-content">
              <div className="reward-dialog-icon">
                <Gift size={48} />
              </div>
              
              <h3>Level Rewards Claimed!</h3>
              
              <div className="reward-dialog-info">
                <div className="reward-amount">
                  <Coins size={32} className="gold-icon" />
                  <span className="gold-value">+{rewardDialog.goldEarned}</span>
                </div>
                
                <p className="reward-description">
                  Rewards for {rewardDialog.levelsRewarded} level{rewardDialog.levelsRewarded > 1 ? 's' : ''}
                </p>
                
                <div className="reward-total">
                  Total Gold: <span>{rewardDialog.newGoldTotal}</span>
                </div>
              </div>
              
              <button className="reward-dialog-btn" onClick={() => setRewardDialog(null)}>
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
