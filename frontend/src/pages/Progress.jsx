import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getUserProgress, checkPendingRewards, claimLevelRewards } from '../services/api';
import { API_URL } from '../config';
import { useLanguage } from '../context/LanguageContext';
import { Monitor, Globe, Award, Terminal, Info, Zap, TrendingUp, Gift, X, Coins, CheckCircle, XCircle, Activity, Sparkles, Flame, Target, Pencil, Clock } from 'lucide-react';
import LoginRequired from '../components/LoginRequired';
import '../styles/Progress.css';

// ── Daily Activity Chart ──
function DailyActivityChart({ data }) {
  const DAYS = 30;
  const W = 600, H = 140, PAD = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  // Build last 30 days array (fill missing days with 0)
  const today = new Date();
  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (DAYS - 1 - i));
    const dateStr = d.toISOString().split('T')[0];
    const entry = (data || []).find(e => e.date === dateStr);
    return { date: dateStr, count: entry ? entry.count : 0, label: d.getDate() };
  });

  const maxCount = Math.max(...days.map(d => d.count), 1);

  // SVG points for the line
  const points = days.map((d, i) => {
    const x = PAD.left + (i / (DAYS - 1)) * innerW;
    const y = PAD.top + innerH - (d.count / maxCount) * innerH;
    return { x, y, ...d };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

  // Area fill path
  const area = [
    `M ${points[0].x},${PAD.top + innerH}`,
    ...points.map(p => `L ${p.x},${p.y}`),
    `L ${points[points.length - 1].x},${PAD.top + innerH}`,
    'Z'
  ].join(' ');

  // Y-axis labels
  const yLabels = [0, Math.round(maxCount / 2), maxCount];

  // X-axis: show label every 5 days
  const xLabels = points.filter((_, i) => i % 5 === 0 || i === DAYS - 1);

  const [tooltip, setTooltip] = useState(null);

  return (
    <div className="dac-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="dac-svg"
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="dacGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yLabels.map((v, i) => {
          const y = PAD.top + innerH - (v / maxCount) * innerH;
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y}
                stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 3" />
              <text x={PAD.left - 6} y={y + 4} fontSize="10" fill="var(--text-muted)"
                textAnchor="end">{v}</text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={area} fill="url(#dacGrad)" />

        {/* Line */}
        <polyline points={polyline}
          fill="none" stroke="var(--accent-primary)" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />

        {/* X-axis labels */}
        {xLabels.map((p, i) => (
          <text key={i} x={p.x} y={H - 4} fontSize="10"
            fill="var(--text-muted)" textAnchor="middle">{p.label}</text>
        ))}

        {/* Hover targets */}
        {points.map((p, i) => (
          <rect key={i}
            x={p.x - (innerW / DAYS) / 2} y={PAD.top}
            width={innerW / DAYS} height={innerH}
            fill="transparent"
            onMouseEnter={() => setTooltip(p)}
            style={{ cursor: 'crosshair' }}
          />
        ))}

        {/* Tooltip dot */}
        {tooltip && (
          <>
            <line x1={tooltip.x} y1={PAD.top} x2={tooltip.x} y2={PAD.top + innerH}
              stroke="var(--accent-primary)" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
            <circle cx={tooltip.x} cy={tooltip.y} r="4"
              fill="var(--accent-primary)" stroke="var(--bg-card)" strokeWidth="2" />
          </>
        )}
      </svg>

      {tooltip && (
        <div className="dac-tooltip">
          <span className="dac-tooltip-date">{tooltip.date}</span>
          <span className="dac-tooltip-count">{tooltip.count} questions</span>
        </div>
      )}
    </div>
  );
}

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

  const GOAL_LABELS = { acadnet: 'Acadnet Prep', linux: 'Linux', networking: 'Networking', all: 'All Categories' };
  const GOAL_COLORS = { acadnet: '#8b5cf6', linux: '#f59e0b', networking: '#3b82f6', all: '#06b6d4' };
  const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' };
  const STREAK_GOLD = { 7: 40, 14: 100, 30: 225 };

  const onboarding = progress.onboarding;
  const currentStreak = progress.streak?.current || 0;
  const streakGoal = onboarding?.streakGoal;
  const streakReached = streakGoal && currentStreak >= streakGoal;
  const streakClaimed = onboarding?.streakRewardClaimed || streakRewardDone;
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

      {!user.onboardingCompleted && (
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

      {/* ── Onboarding cards ── */}
      {onboarding?.completed && (
        <div className="category-progress-section">
          <h2>Your Learning Profile</h2>
          <div className="ob-cards-grid">

            {/* Streak Goal card */}
            <div className="ob-card">
              <div className="ob-card-header">
                <div className="ob-card-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                  <Flame size={18} />
                </div>
                <span className="ob-card-title">Streak Goal</span>
              </div>
              {streakGoal ? (
                <>
                  <div className="ob-streak-display">
                    <span className="ob-streak-days">{streakGoal}</span>
                    <span className="ob-streak-label">days</span>
                  </div>
                  <div className="ob-streak-progress">
                    <div className="ob-streak-bar">
                      <div className="ob-streak-fill" style={{ width: `${Math.min(100, (currentStreak / streakGoal) * 100)}%` }} />
                    </div>
                    <span className="ob-streak-count">{currentStreak} / {streakGoal}</span>
                  </div>
                  {!streakClaimed ? (
                    streakReached ? (
                      <button className="ob-claim-btn" onClick={handleClaimStreakReward} disabled={claimingStreak}>
                        <Gift size={14} /> {claimingStreak ? 'Claiming...' : `Claim 🪙 ${STREAK_GOLD[streakGoal]} gold`}
                      </button>
                    ) : (
                      <div className="ob-streak-hint">{streakGoal - currentStreak} days to go · 🪙 {STREAK_GOLD[streakGoal]} gold reward</div>
                    )
                  ) : (
                    <div className="ob-claimed-badge"><CheckCircle size={13} /> Reward claimed</div>
                  )}
                </>
              ) : (
                <div className="ob-card-empty">No streak goal set. <button onClick={() => navigate('/onboarding')}>Set one</button></div>
              )}
            </div>

            {/* Goal card */}
            <div className="ob-card">
              <div className="ob-card-header">
                <div className="ob-card-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                  <Target size={18} />
                </div>
                <span className="ob-card-title">Goal</span>
                <button className="ob-edit-btn" onClick={() => navigate('/onboarding')} title="Change goal & level">
                  <Pencil size={13} />
                </button>
              </div>
              {onboarding?.goal ? (
                <>
                  <div className="ob-goal-name" style={{ color: GOAL_COLORS[onboarding.goal] }}>
                    {GOAL_LABELS[onboarding.goal]}
                  </div>
                  <div className="ob-goal-level">
                    <span className={`ob-level-badge ob-level-${onboarding.level}`}>
                      {LEVEL_LABELS[onboarding.level]}
                    </span>
                  </div>
                </>
              ) : (
                <div className="ob-card-empty">No goal set. <button onClick={() => navigate('/onboarding')}>Set one</button></div>
              )}
            </div>

            {/* Personalized Plan card */}
            <div className="ob-card ob-card-coming-soon">
              <div className="ob-card-header">
                <div className="ob-card-icon" style={{ background: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)' }}>
                  <Clock size={18} />
                </div>
                <span className="ob-card-title">Personalized Plan</span>
              </div>
              <div className="ob-coming-soon">
                <span>Coming soon</span>
                <p>A custom study plan based on your goal and level is in the works.</p>
              </div>
            </div>

          </div>
        </div>
      )}

      <div className="category-progress-section">
        <h2><Activity size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />Daily Activity</h2>        <p className="dac-subtitle">Questions solved per day over the last 30 days</p>
        <DailyActivityChart data={progress.dailyActivity} />
      </div>

      {progress.linuxChapterStats?.chapters && Object.keys(progress.linuxChapterStats.chapters).length > 0 && (        <div className="category-progress-section">
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
