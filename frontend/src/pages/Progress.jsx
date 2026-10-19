import DailyActivityChart from '../components/DailyActivityChart';
import ProgressAchievements from '../components/ProgressAchievements';
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getUserProgress, checkPendingRewards, claimLevelRewards } from '../services/api';
import { API_URL } from '../config';
import { useLanguage } from '../context/LanguageContext';
import { Monitor, Globe, Award, Terminal, Info, Zap, TrendingUp, Gift, X, Coins, CheckCircle, XCircle, Sparkles, Flame, Target, Pencil, Clock, ChevronDown, Palette, Cpu } from 'lucide-react';
import { xpProgressInLevel } from '../utils/xpUtils.js';
import AvatarFrame from '../components/AvatarFrame';
import LevelXpDialog from '../components/LevelXpDialog';
import ProgressNavigation from '../components/ProgressNavigation';
import '../styles/AvatarFrame.css';
import '../styles/NameEffects.css';
import '../styles/Progress.css';
import '../styles/ProgressOverview.css';

export default function Progress() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [pendingRewards, setPendingRewards] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [rewardDialog, setRewardDialog] = useState(null);
  const [claimingStreak, setClaimingStreak] = useState(false);
  const [streakRewardDone, setStreakRewardDone] = useState(false);
  const [editGoal, setEditGoal] = useState(false);
  const [showXpInfo, setShowXpInfo] = useState(false);
  const [activeFrame, setActiveFrame]   = useState(null);
  const [frameChanging, setFrameChanging] = useState(false);
  const [activeNameEffect, setActiveNameEffect] = useState(null);
  const [achievementSummary, setAchievementSummary] = useState(null);
  const [effectChanging, setEffectChanging] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (user) {
      getUserProgress().then(data => {
        setProgress(data);
        setActiveFrame(data?.frames?.active ?? null);
        setActiveNameEffect(data?.nameEffects?.active ?? null);
      }).catch(() => {});
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
            <div className="category-stats-panel" aria-hidden="true">
              {[0, 1, 2, 3].map(row => (
                <div className="category-stats-row category-stats-row--loading" key={row}>
                  <div className="skeleton-category-header" />
                  <div className="skeleton-category-stat" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { currentLevelXp, xpForNextLevel, progressPercent } = xpProgressInLevel(progress.xp);
  const xpToNextLevel = xpForNextLevel - currentLevelXp;

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

  const handleClaimStreakReward = async () => {
    setClaimingStreak(true);
    try {
      const res = await fetch(`${API_URL}/progress/claim-streak-reward`, {
        method: 'POST', credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setStreakRewardDone(true);
        const newProgress = await getUserProgress();
        setProgress(newProgress);
      }
    } finally {
      setClaimingStreak(false);
    }
  };

  const handleSetFrame = async (frameKey) => {
    if (frameChanging) return;
    setFrameChanging(true);
    try {
      const resp = await fetch(`${API_URL}/season-box/frame`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ frame: frameKey }),
      });
      const data = await resp.json();
      if (data.success) setActiveFrame(data.frames.active);
    } catch { /* silent */ } finally {
      setFrameChanging(false);
    }
  };

  const handleSetNameEffect = async (effectKey) => {
    if (effectChanging) return;
    setEffectChanging(true);
    try {
      const resp = await fetch(`${API_URL}/season-box/name-effect`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ effect: effectKey }),
      });
      const data = await resp.json();
      if (data.success) setActiveNameEffect(data.nameEffects.active);
    } catch { /* silent */ } finally {
      setEffectChanging(false);
    }
  };

  const GOAL_LABELS = { acadnet: 'Acadnet Prep', linux: 'Linux', networking: 'Networking', all: 'All Categories' };
  const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' };
  const STREAK_GOLD = { 7: 40, 14: 100, 30: 225 };

  const onboarding = progress.onboarding;
  const hasLinuxOverview = Boolean(progress.linuxChapterStats?.chapters &&
    Object.keys(progress.linuxChapterStats.chapters).length);
  const hasSimulations = Boolean(progress.simulations?.length);
  const currentStreak = progress.streak?.current || 0;
  const streakGoal = onboarding?.streakGoal;
  const streakReached = streakGoal && currentStreak >= streakGoal;
  const streakClaimed = onboarding?.streakRewardClaimed || streakRewardDone;
  const linuxSolved = progress.solvedByTag?.LINUX || 0;
  const networkSolved = progress.solvedByTag?.NETWORK || 0;
  const terminalSolved = progress.terminalStats?.solved || 0;
  const arduinoSolved = progress.solvedByTag?.ARDUINO || 0;
  
  
  

  return (
    <div className="container progress-page">
      <ProgressNavigation hasProfile hasLinuxOverview={hasLinuxOverview} hasSimulations={hasSimulations} />

      <section id="progress-general" className="progress-anchor-section" aria-label="General" tabIndex={-1}>
      <div className="progress-section-heading">
        <h2>General</h2>
        <p>Your learning at a glance.</p>
      </div>
      {progress && !progress.onboarding?.completed && (
        <div className="progress-onboarding-banner">
          <div className="progress-onboarding-icon"><Sparkles size={20} /></div>
          <div className="progress-onboarding-text">
            <strong>Personalize your experience</strong>
            <span>Set your learning goal, level and streak target to get the most out of the platform.</span>
          </div>
          <button className="progress-onboarding-btn" onClick={() => navigate('/onboarding')}>
            Complete Profile
          </button>
        </div>
      )}

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
              <div className="xp-label-right">
                <span>{xpToNextLevel} XP {t('progress.xpRemaining')}</span>
                <div className="xp-info-wrap">
                  <button
                    className="xp-info-btn"
                    onClick={() => setShowXpInfo(v => !v)}
                    type="button"
                    aria-label="View level XP requirements"
                    aria-haspopup="dialog"
                    aria-expanded={showXpInfo}
                    aria-controls={showXpInfo ? 'level-xp-dialog' : undefined}
                    title="How levels work"
                  >
                    <Info size={13} />
                  </button>
                  {showXpInfo && (
                    <LevelXpDialog level={progress.level} onClose={() => setShowXpInfo(false)} />
                  )}
                </div>
              </div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>


        </div>

        <div className="stat-card-progress">
          <span className="overview-stat-icon"><CheckCircle size={20} aria-hidden="true" /></span>
          <div className="stat-label-small">{t('progress.questionsSolved')}</div>
          <div className="stat-value">{progress.solvedCount}</div>
        </div>

        <div className="stat-card-progress">
          <span className="overview-stat-icon"><Award size={20} aria-hidden="true" /></span>
          <div className="stat-label-small">{t('progress.simulations')}</div>
          <div className="stat-value">{progress.simulations?.length || 0}</div>
        </div>
      </div>

      </section>

      <section id="progress-profile" className="progress-anchor-section" aria-label="Profile" tabIndex={-1}>
      <details id="progress-profile-panel" className="progress-profile-panel">
        <summary className="progress-profile-toggle">
          <span className="progress-profile-icon"><Palette size={22} aria-hidden="true" /></span>
          <span className="progress-profile-heading">
            <span className="progress-profile-title">Profile</span>
            <span className="progress-profile-subtitle">Avatar Frame, Name Effect &amp; Achievements</span>
          </span>
          {achievementSummary && (
            <span className="progress-profile-count">{achievementSummary.unlocked}/{achievementSummary.total} unlocked</span>
          )}
          <ChevronDown className="progress-profile-chevron" size={20} aria-hidden="true" />
        </summary>
        <div className="progress-profile-content">
      {/* ── Frame Selector ── */}
        <div className="frame-selector-card">
          <div className="frame-selector-header">
            <span className="frame-selector-title">Avatar Frame</span>
            {activeFrame && (
              <button
                className="frame-selector-remove"
                onClick={() => handleSetFrame(null)}
                disabled={frameChanging}
              >
                Remove
              </button>
            )}
          </div>
          <div className="frame-selector-list">
            {/* None option */}
            <button
              className={`frame-selector-item ${!activeFrame ? 'active' : ''}`}
              onClick={() => handleSetFrame(null)}
              disabled={frameChanging}
              title="No frame"
            >
              <AvatarFrame frame={null} size={56} />
              <span className="frame-selector-label">None</span>
            </button>

            {(progress.frames?.owned || []).map((fk) => (
              <button
                key={fk}
                className={`frame-selector-item ${activeFrame === fk ? 'active' : ''}`}
                onClick={() => handleSetFrame(fk)}
                disabled={frameChanging}
                title={fk}
              >
                <AvatarFrame frame={fk} size={56} />
                <span className="frame-selector-label">
                  {fk.replace('-season', ' S')}
                </span>
              </button>
            ))}
          </div>
          {!progress.frames?.owned?.length && <p className="progress-profile-empty">Your unlocked avatar frames will appear here.</p>}
        </div>

      {/* ── Name Effect Selector ── */}
        <div className="frame-selector-card">
          <div className="frame-selector-header">
            <span className="frame-selector-title">Name Effect</span>
            {activeNameEffect && (
              <button
                className="frame-selector-remove"
                onClick={() => handleSetNameEffect(null)}
                disabled={effectChanging}
              >
                Remove
              </button>
            )}
          </div>
          <div className="frame-selector-list">
            <button
              className={`frame-selector-item ${!activeNameEffect ? 'active' : ''}`}
              onClick={() => handleSetNameEffect(null)}
              disabled={effectChanging}
              title="No effect"
            >
              <div className="ne-preview-wrap ne-preview-none">
                <span className="ne-preview-text">Aa</span>
              </div>
              <span className="frame-selector-label">None</span>
            </button>

            {(progress.nameEffects?.owned || []).map((ek) => (
              <button
                key={ek}
                className={`frame-selector-item ${activeNameEffect === ek ? 'active' : ''}`}
                onClick={() => handleSetNameEffect(ek)}
                disabled={effectChanging}
                title={ek}
              >
                <div className="ne-preview-wrap">
                  <span className={`ne-preview-text name-effect-${ek}`}>Aa</span>
                </div>
                <span className="frame-selector-label">
                  {ek.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              </button>
            ))}
          </div>
          {!progress.nameEffects?.owned?.length && <p className="progress-profile-empty">Your unlocked name effects will appear here.</p>}
        </div>
        <ProgressAchievements username={user.username} onSummaryChange={setAchievementSummary} />
        </div>
        <button
          type="button"
          className="progress-profile-collapse"
          aria-controls="progress-profile-panel"
          onClick={(event) => {
            const panel = event.currentTarget.closest('details');
            panel.open = false;
            panel.querySelector('summary').focus({ preventScroll: true });
            panel.closest('section').scrollIntoView({ block: 'start', behavior:
              window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
          }}
        >
          <ChevronDown size={18} aria-hidden="true" />
          Collapse Profile
        </button>
      </details>
      </section>

      <div id="progress-categories" className="category-progress-section progress-anchor-section" aria-label="Progress by Category" tabIndex={-1}>
        <div className="progress-section-heading">
          <h2>{t('progress.progressByCategory')}</h2>
        </div>
        <div className="category-stats-panel">
          <div className="category-stats-columns" aria-hidden="true">
            <span>Category</span>
            <span>Solved</span>
          </div>
          <dl className="category-stats-list">
            {[
              { name: 'Linux', Icon: Monitor, solved: linuxSolved, color: '#d99119' },
              { name: 'Network', Icon: Globe, solved: networkSolved, color: '#3b82f6' },
              { name: 'Terminal', Icon: Terminal, solved: terminalSolved, color: '#22a66c' },
              { name: 'Arduino', Icon: Cpu, solved: arduinoSolved, color: '#ec4899' },
            ].map(({ name, Icon, solved, color }) => (
              <div key={name} className="category-stats-row">
                <dt className="category-stats-name">
                  <Icon size={20} style={{ color }} aria-hidden="true" />
                  <span>{name}</span>
                </dt>
                <dd className="category-stats-value">
                  <strong>{solved.toLocaleString()}</strong>
                  <span>{name === 'Terminal' ? 'commands solved' : 'questions solved'}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* ── Onboarding cards ── */}
      {onboarding?.completed && (
        <section className="category-progress-section" aria-labelledby="learning-profile-heading">
          <div className="progress-section-heading">
            <h2 id="learning-profile-heading">Your Learning Profile</h2>
          </div>
          <div className="learning-profile-card">
            <div className="learning-profile-overview">
              <dl className="learning-profile-meta">
                <div>
                  <dt>Learning goal</dt>
                  <dd>
                    <Target size={18} aria-hidden="true" />
                    {GOAL_LABELS[onboarding.goal] || 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt>Experience</dt>
                  <dd>{LEVEL_LABELS[onboarding.level] || 'Not set'}</dd>
                </div>
              </dl>
              <button className="learning-profile-edit" onClick={() => navigate('/onboarding')}>
                <Pencil size={14} aria-hidden="true" /> Edit profile
              </button>
            </div>

            <div className="learning-profile-streak">
              <div className="learning-profile-streak-heading">
                <h3><Flame size={18} aria-hidden="true" /> Streak goal</h3>
                {streakGoal && <span><strong>{currentStreak}</strong> / {streakGoal} days</span>}
              </div>
              {streakGoal ? (
                <>
                  <progress className="learning-profile-streak-bar"
                    value={Math.min(currentStreak, streakGoal)} max={streakGoal}
                    aria-label={`Streak goal: ${currentStreak} of ${streakGoal} days`} />
                  <div className="learning-profile-reward-row">
                    {streakClaimed ? (
                      <span className="learning-profile-claimed"><CheckCircle size={15} aria-hidden="true" /> Reward claimed</span>
                    ) : (
                      <>
                        <span className="learning-profile-streak-note">
                          {streakReached ? 'Streak goal reached' : `${streakGoal - currentStreak} days to go`}
                        </span>
                        {streakReached ? (
                          <button className="learning-profile-claim" onClick={handleClaimStreakReward} disabled={claimingStreak}>
                            <Gift size={15} aria-hidden="true" />
                            {claimingStreak ? 'Claiming...' : `Claim ${STREAK_GOLD[streakGoal]} gold`}
                          </button>
                        ) : (
                          <span className="learning-profile-reward"><Coins size={15} aria-hidden="true" /> {STREAK_GOLD[streakGoal]} gold reward</span>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="learning-profile-streak-note">No streak goal set. <button className="learning-profile-inline-link" onClick={() => navigate('/onboarding')}>Set one</button></p>
              )}
            </div>

            <div className="learning-profile-plan">
              <Clock size={18} aria-hidden="true" />
              <div>
                <h3>Personalized plan <span>Coming soon</span></h3>
                <p>A study plan based on your goal and experience level.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <div id="progress-activity" className="category-progress-section progress-anchor-section" aria-label="Daily Activity" tabIndex={-1}>
        <div className="progress-section-heading">
          <h2>Daily Activity</h2>
        </div>
        <DailyActivityChart data={progress.dailyActivity} />
      </div>

      {hasLinuxOverview && (
        <div id="progress-linux" className="category-progress-section progress-anchor-section" aria-label="Linux Overview" tabIndex={-1}>
          <h2>Linux Overview — Chapter Results</h2>
          {progress.linuxChapterStats.lastTaken && (
            <p className="linux-chapter-last-taken">
              Last taken: {new Date(progress.linuxChapterStats.lastTaken).toLocaleDateString()}
            </p>
          )}
          <div className="linux-chapter-list">
            {Object.entries(progress.linuxChapterStats.chapters)
              .map(([ch, s]) => ({ ch, ...s }))
              .sort((a, b) => b.correct - a.correct)
              .map((row, i) => {
                const CHAPTER_NAMES = {
                  CHAPTER3: 'Packages', CHAPTER4: 'Processes', CHAPTER5: 'Users',
                  CHAPTER6: 'Dev', CHAPTER7: 'CLI', CHAPTER8: 'Hardware',
                  CHAPTER9: 'System', CHAPTER10: 'System Storage', CHAPTER11: 'Network',
                  CHAPTER12: 'Security', CHAPTER14: 'VM', CHAPTER15: 'Embedded Systems',
                };
                const name = CHAPTER_NAMES[row.ch] || row.ch;
                const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
                const isBest = i === 0;
                return (
                  <div key={row.ch} className={`linux-chapter-row ${isBest ? 'linux-chapter-row--best' : ''}`}>
                    <div className="linux-chapter-rank">#{i + 1}</div>
                    <div className="linux-chapter-info">
                      <span className="linux-chapter-name">{name}</span>
                      <div className="linux-chapter-bar-wrap">
                        <div className="linux-chapter-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="linux-chapter-score">
                      {row.correct === row.total
                        ? <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                        : row.correct === 0
                          ? <XCircle size={14} style={{ color: 'var(--error)' }} />
                          : null}
                      <span>{row.correct}/{row.total}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {hasSimulations && (
        <div id="progress-simulations" className="simulations-section progress-anchor-section" aria-label="Simulations" tabIndex={-1}>
          <div className="progress-section-heading">
            <h2>{t('progress.recentSimulations')}</h2>
            <p>Your latest results, from most recent to oldest.</p>
          </div>
          <div className="simulations-grid">
            {progress.simulations.slice(-6).reverse().map((sim, i) => {
              const percentage = sim.totalPoints > 0 ? Math.round((sim.score / sim.totalPoints) * 100) : 0;
              const isPassed = percentage >= 70;
              
              return (
                <div key={i} className="simulation-card">
                  <div className="simulation-header">
                    <div className="simulation-heading">
                      <h3 className="simulation-title">{sim.examTitle || 'Exam simulation'}</h3>
                      <time className="simulation-date" dateTime={sim.date}>
                        {new Date(sim.date).toLocaleDateString()}
                      </time>
                    </div>
                    <span className={`simulation-badge ${isPassed ? 'passed' : 'failed'}`}>
                      {isPassed ? <CheckCircle size={12} aria-hidden="true" /> : <XCircle size={12} aria-hidden="true" />}
                      {isPassed ? t('progress.passed') : t('progress.failed')}
                    </span>
                  </div>
                  <div className={`simulation-result ${isPassed ? 'is-passed' : 'is-failed'}`}>
                    <div className="simulation-score">
                      <div className="score-display">{percentage}<span>%</span></div>
                      <span className="simulation-score-label">Score</span>
                    </div>
                    <progress className="simulation-result-bar" value={Math.max(0, Math.min(100, percentage))} max={100}
                      aria-label={`Simulation score: ${percentage}%`} />
                  </div>
                  <div className="simulation-details">
                    <div><span>{t('progress.points')}</span><strong>{sim.score} <span>/ {sim.totalPoints}</span></strong></div>
                    <div><span>{t('progress.correctAnswers')}</span><strong>{sim.correctAnswers} <span>/ {sim.totalQuestions}</span></strong></div>
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
