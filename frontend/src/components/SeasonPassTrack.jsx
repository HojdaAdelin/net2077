import { useState, useEffect, useContext, useRef } from 'react';
import {
  Zap, Lock, Crown, Coins, Gift, X,
  ChevronLeft, ChevronRight, LogIn, Ticket, ShieldCheck, Star,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import '../styles/SeasonPassTrack.css';

function RewardIcon({ reward, size = 15 }) {
  if (!reward || reward.type === 'none') return <span className="spt-dash">—</span>;
  
  if (reward.type === 'frame') {
    return (
      <div className="spt-reward-frame">
        <div className="spt-frame-preview">
          <img src={`/${reward.value}.png`} alt={reward.label} className="spt-frame-img" />
        </div>
        <span className="spt-frame-label">{reward.label}</span>
      </div>
    );
  }
  
  return (
    <div className="spt-reward-content">
      {reward.type === 'gold'       && <Coins  size={size} className="spt-icon-gold"   />}
      {reward.type === 'item'       && <Gift   size={size} className="spt-icon-item"   />}
      {reward.type === 'nameEffect' && <Zap    size={size} className="spt-icon-effect" />}
      <span>{reward.label || reward.value || '?'}</span>
    </div>
  );
}

export default function SeasonPassTrack() {
  const { user, updateUser } = useContext(AuthContext);
  const [pass, setPass]                 = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [open, setOpen]                 = useState(false);
  const [page, setPage]                 = useState(0);
  const [collecting, setCollecting]     = useState(null);
  const [buying, setBuying]             = useState(false);
  const [buyErr, setBuyErr]             = useState('');
  const [showBest, setShowBest]         = useState(false);
  const trackRef = useRef(null);

  const LEVELS_PER_PAGE = 5;

  useEffect(() => {
    fetch(`${API_URL}/season-pass/active`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success && d.pass) { setPass(d.pass); setUserProgress(d.userProgress); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (loading) return (
    <div className="spt-card spt-skeleton-card">
      <div className="spt-card-top">
        <div className="spt-skeleton spt-skeleton-icon" />
        <div className="spt-card-title-block">
          <div className="spt-skeleton spt-skeleton-title" />
          <div className="spt-skeleton spt-skeleton-pill" />
        </div>
        <div className="spt-skeleton spt-skeleton-btn" />
        <div className="spt-skeleton spt-skeleton-btn" />
      </div>
      <div className="spt-card-middle">
        <div className="spt-stats-row">
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div className="spt-stat">
                <div className="spt-skeleton spt-skeleton-stat-val" />
                <div className="spt-skeleton spt-skeleton-stat-lbl" />
              </div>
              {i < 3 && <div className="spt-stat-sep" />}
            </div>
          ))}
        </div>
        <div className="spt-xp-block">
          <div className="spt-xp-bar-wrap" style={{ flex: 1 }}>
            <div className="spt-skeleton" style={{ width: '100%', height: '100%', borderRadius: 4 }} />
          </div>
          <div className="spt-skeleton spt-skeleton-xp-label" />
        </div>
      </div>
    </div>
  );

  /* ── Guest ─────────────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="spt-teaser-card">
        <div className="spt-teaser-left">
          <div className="spt-teaser-icon"><Ticket size={20} /></div>
          <div>
            <p className="spt-teaser-title">Season Pass</p>
            <p className="spt-teaser-sub">Log in to track your progress and earn rewards</p>
          </div>
        </div>
        <Link to="/login" className="spt-btn-primary"><LogIn size={14} /> Login</Link>
      </div>
    );
  }

  if (!pass) return null;

  const xpPerLevel  = pass.xpPerLevel || 100;
  const userLevel   = userProgress?.level    ?? 0;
  const userXP      = userProgress?.xp       ?? 0;
  const isPremium   = userProgress?.isPremium ?? false;
  const claimedFree = userProgress?.claimedLevels?.free    ?? [];
  const claimedPrem = userProgress?.claimedLevels?.premium ?? [];
  const userGold    = user.gold ?? 0;

  const xpInLevel  = userXP - userLevel * xpPerLevel;
  const xpPct      = Math.min((xpInLevel / xpPerLevel) * 100, 100);
  const isMaxLevel = userLevel >= pass.totalLevels;
  const maxXP      = pass.totalLevels * xpPerLevel;

  const getReward  = (lvl, tier) => pass.levels?.find(l => l.level === lvl)?.[tier] ?? null;
  const isClaimed  = (lvl, tier) => (tier === 'free' ? claimedFree : claimedPrem).includes(lvl);
  const canCollect = (lvl, tier) => {
    if (userLevel < lvl) return false;
    if (tier === 'premium' && !isPremium) return false;
    return !isClaimed(lvl, tier);
  };

  const totalPages  = Math.ceil(pass.totalLevels / LEVELS_PER_PAGE);
  const startLevel  = page * LEVELS_PER_PAGE + 1;
  const endLevel    = Math.min(startLevel + LEVELS_PER_PAGE - 1, pass.totalLevels);
  const visibleLvls = Array.from({ length: endLevel - startLevel + 1 }, (_, i) => startLevel + i);
  const currentPage = Math.max(0, Math.floor(userLevel / LEVELS_PER_PAGE));

  const handleCollect = async (lvl, tier) => {
    const key = `${lvl}-${tier}`;
    setCollecting(key);
    try {
      const res  = await fetch(`${API_URL}/season-pass/collect`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ level: lvl, tier }),
      });
      const data = await res.json();
      if (data.success) {
        setUserProgress(prev => ({
          ...prev,
          claimedLevels: {
            free:    tier === 'free'    ? [...claimedFree, lvl] : claimedFree,
            premium: tier === 'premium' ? [...claimedPrem, lvl] : claimedPrem,
          },
        }));
        if (data.gold !== undefined) updateUser({ gold: data.gold });
      }
    } catch { /**/ }
    finally { setCollecting(null); }
  };

  const handleBuyPremium = async () => {
    setBuying(true); setBuyErr('');
    try {
      const res  = await fetch(`${API_URL}/season-pass/buy-premium`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setUserProgress(prev => ({ ...prev, isPremium: true }));
        updateUser({ gold: data.gold });
      } else {
        setBuyErr(data.message || 'Failed');
      }
    } catch { setBuyErr('Network error'); }
    finally { setBuying(false); }
  };

  const canAffordPremium = userGold >= (pass.premiumCost || 0);

  /* ── Summary card ──────────────────────────────────────────── */
  return (
    <>
      <div className="spt-card">

        {/* Top row: icon + name + tier */}
        <div className="spt-card-top">
          <div className="spt-card-icon"><Ticket size={18} /></div>
          <div className="spt-card-title-block">
            <span className="spt-card-name">{pass.name}</span>
            {pass.hasPremium && (
              <span className={`spt-tier-pill ${isPremium ? 'premium' : 'free'}`}>
                {isPremium
                  ? <><ShieldCheck size={10} /> Premium</>
                  : <><Lock size={10} /> Free Track</>}
              </span>
            )}
          </div>
          {pass.bestRewards?.length > 0 && (
            <button className="spt-btn-highlights" onClick={() => setShowBest(true)}>
              <Star size={13} />
              Top Rewards
            </button>
          )}
          <button
            className="spt-btn-secondary"
            onClick={() => { setOpen(true); setPage(currentPage); }}
          >
            View Pass
          </button>
        </div>

        {/* Middle: stats + XP bar */}
        <div className="spt-card-middle">
          {/* Stat group */}
          <div className="spt-stats-row">
            <div className="spt-stat">
              <span className="spt-stat-val">{userLevel}</span>
              <span className="spt-stat-lbl">Level</span>
            </div>
            <div className="spt-stat-sep" />
            <div className="spt-stat">
              <span className="spt-stat-val">{pass.totalLevels}</span>
              <span className="spt-stat-lbl">Total Levels</span>
            </div>
            <div className="spt-stat-sep" />
            <div className="spt-stat">
              <span className="spt-stat-val">{userXP.toLocaleString()}</span>
              <span className="spt-stat-lbl">Pass XP</span>
            </div>
            <div className="spt-stat-sep" />
            <div className="spt-stat">
              <span className="spt-stat-val">{xpPerLevel}</span>
              <span className="spt-stat-lbl">XP / Level</span>
            </div>
          </div>

          {/* XP bar */}
          <div className="spt-xp-block">
            <div className="spt-xp-bar-wrap">
              <div className="spt-xp-bar-fill" style={{ width: isMaxLevel ? '100%' : `${xpPct}%` }} />
            </div>
            {isMaxLevel
              ? <span className="spt-xp-next spt-xp-maxed">Max Level</span>
              : <span className="spt-xp-next">→ Level {userLevel + 1}</span>
            }
          </div>
        </div>

        {/* Bottom: buy premium (if applicable) */}
        {pass.hasPremium && !isPremium && (
          <div className="spt-card-bottom">
            <div className="spt-premium-info">
              <Crown size={14} className="spt-premium-crown" />
              <span className="spt-premium-desc">
                Unlock the Premium track and earn exclusive rewards
              </span>
            </div>
            <div className="spt-premium-buy">
              <span className={`spt-premium-cost ${!canAffordPremium ? 'insufficient' : ''}`}>
                <Coins size={13} /> {pass.premiumCost} Gold
              </span>
              <button
                className={`spt-btn-premium ${!canAffordPremium ? 'disabled' : ''}`}
                onClick={handleBuyPremium}
                disabled={buying || !canAffordPremium}
              >
                {buying ? 'Upgrading...' : 'Upgrade to Premium'}
              </button>
            </div>
            {buyErr && <p className="spt-buy-err">{buyErr}</p>}
          </div>
        )}

        {pass.hasPremium && isPremium && (
          <div className="spt-card-bottom spt-card-bottom--owned">
            <ShieldCheck size={14} className="spt-owned-icon" />
            <span className="spt-owned-txt">You own the Premium track for this season</span>
          </div>
        )}
      </div>

      {/* ── Modal ──────────────────────────────────────────────── */}
      {open && (
        <div className="spt-overlay" onClick={() => setOpen(false)}>
          <div className="spt-modal" onClick={e => e.stopPropagation()}>

            <div className="spt-modal-header">
              <div className="spt-modal-header-left">
                <div className="spt-modal-icon"><Ticket size={15} /></div>
                <span className="spt-modal-title">{pass.name}</span>
                {pass.hasPremium && (
                  <span className={`spt-tier-pill ${isPremium ? 'premium' : 'free'}`}>
                    {isPremium ? <><ShieldCheck size={10} /> Premium</> : <><Lock size={10} /> Free</>}
                  </span>
                )}
              </div>
              <div className="spt-modal-header-right">
                <span className="spt-modal-stat"><Zap size={12} />{userXP.toLocaleString()} XP</span>
                <span className="spt-modal-stat">Lv {userLevel} / {pass.totalLevels}</span>
                <button className="spt-close-btn" onClick={() => setOpen(false)}><X size={16} /></button>
              </div>
            </div>

            <div className="spt-modal-xp">
              <div className="spt-modal-xp-track">
                <div className="spt-modal-xp-fill" style={{ width: isMaxLevel ? '100%' : `${xpPct}%` }} />
              </div>
              <div className="spt-modal-xp-labels">
                {isMaxLevel
                  ? <><span>{maxXP.toLocaleString()} XP</span><span className="spt-maxed-label">Max Level Reached</span></>
                  : <><span>{xpInLevel} / {xpPerLevel} XP</span><span>Next: Level {userLevel + 1}</span></>
                }
              </div>
            </div>

            <div className="spt-track" ref={trackRef}>
              {/* Premium row */}
              {pass.hasPremium && (
                <div className="spt-row spt-row-premium">
                  <div className="spt-row-label">
                    <Crown size={11} className="spt-lbl-crown" />
                    <span>Premium</span>
                  </div>
                  <div className="spt-cells">
                    {visibleLvls.map(lvl => {
                      const reward      = getReward(lvl, 'premium');
                      const claimed     = isClaimed(lvl, 'premium');
                      const collectable = canCollect(lvl, 'premium');
                      const unlocked    = userLevel >= lvl;
                      const key         = `${lvl}-premium`;
                      return (
                        <div
                          key={lvl}
                          className={`spt-cell premium ${unlocked ? 'unlocked' : ''} ${claimed ? 'claimed' : ''} ${lvl === userLevel + 1 ? 'next' : ''} ${collectable ? 'collectable' : ''}`}
                          onClick={collectable ? () => handleCollect(lvl, 'premium') : undefined}
                        >
                          {reward && reward.type !== 'none' ? (
                            <>
                              <div className={`spt-cell-reward ${!isPremium ? 'dimmed' : ''}`}>
                                <RewardIcon reward={reward} />
                              </div>
                              {!isPremium && <div className="spt-lock-overlay"><Lock size={11} /></div>}
                              {collectable && (
                                <div className="spt-collect-overlay">
                                  {collecting === key ? <span className="spt-collecting-dots" /> : <span className="spt-collect-label">Collect</span>}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="spt-dash">—</span>
                              {!isPremium && <div className="spt-lock-overlay"><Lock size={11} /></div>}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Level markers — above free when premium exists, below free when no premium */}
              {pass.hasPremium && (
                <div className="spt-row spt-row-levels">
                  <div className="spt-row-label spt-lbl-lvl">Lvl</div>
                  <div className="spt-cells">
                    {visibleLvls.map(lvl => {
                      const unlocked  = userLevel >= lvl;
                      const isCurrent = userLevel + 1 === lvl;
                      return (
                        <div key={lvl} className={`spt-lvl-marker ${unlocked ? 'unlocked' : ''} ${isCurrent ? 'current' : ''}`}>
                          <div className="spt-lvl-bubble">{lvl}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Free row */}
              <div className={`spt-row spt-row-free ${!pass.hasPremium ? 'spt-row-free--solo' : ''}`}>
                <div className="spt-row-label">
                  <Gift size={11} className="spt-lbl-gift" />
                  <span>Free</span>
                </div>
                <div className="spt-cells">
                  {visibleLvls.map(lvl => {
                    const reward      = getReward(lvl, 'free');
                    const claimed     = isClaimed(lvl, 'free');
                    const collectable = canCollect(lvl, 'free');
                    const unlocked    = userLevel >= lvl;
                    const key         = `${lvl}-free`;
                    return (
                      <div
                        key={lvl}
                        className={`spt-cell free ${unlocked ? 'unlocked' : ''} ${claimed ? 'claimed' : ''} ${lvl === userLevel + 1 ? 'next' : ''} ${collectable ? 'collectable' : ''}`}
                        onClick={collectable ? () => handleCollect(lvl, 'free') : undefined}
                      >
                        {reward && reward.type !== 'none' ? (
                          <>
                            <div className="spt-cell-reward">
                              <RewardIcon reward={reward} />
                            </div>
                            {collectable && (
                              <div className="spt-collect-overlay">
                                {collecting === key ? <span className="spt-collecting-dots" /> : <span className="spt-collect-label">Collect</span>}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="spt-dash">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Level markers below free when no premium track */}
              {!pass.hasPremium && (
                <div className="spt-row spt-row-levels spt-row-levels--below">
                  <div className="spt-row-label spt-lbl-lvl">Lvl</div>
                  <div className="spt-cells">
                    {visibleLvls.map(lvl => {
                      const unlocked  = userLevel >= lvl;
                      const isCurrent = userLevel + 1 === lvl;
                      return (
                        <div key={lvl} className={`spt-lvl-marker ${unlocked ? 'unlocked' : ''} ${isCurrent ? 'current' : ''}`}>
                          <div className="spt-lvl-bubble">{lvl}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="spt-pagination">
                <button className="spt-page-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft size={14} />
                </button>
                <span className="spt-page-info">{startLevel}–{endLevel} / {pass.totalLevels}</span>
                <button className="spt-page-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
                  <ChevronRight size={14} />
                </button>
                {currentPage !== page && (
                  <button className="spt-jump-btn" onClick={() => setPage(currentPage)}>My Level</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── Best Rewards Modal ─────────────────────────────── */}
      {showBest && (() => {
        const BEST_PER_PAGE = 4;
        const premiumBest = (pass.bestRewards || [])
          .filter(r => r.tier === 'premium')
          .sort((a, b) => (a.atLevel || 0) - (b.atLevel || 0));
        const freeBest = (pass.bestRewards || [])
          .filter(r => r.tier !== 'premium')
          .sort((a, b) => (a.atLevel || 0) - (b.atLevel || 0));

        const RewardCard = ({ r, showLock }) => (
          <div className={`spt-best-item ${r.tier === 'premium' ? 'premium' : 'free'}`}>
            <div className="spt-best-reward">
              {r.type === 'gold'       && <Coins size={26} className="spt-icon-gold" />}
              {r.type === 'frame'      && <img src={`/${r.value}.png`} alt={r.label} className="spt-best-frame-img" />}
              {r.type === 'nameEffect' && <Zap  size={26} className="spt-icon-effect" />}
              {r.type === 'item'       && <Gift size={26} className="spt-icon-item" />}
              <span className="spt-best-label">{r.label || r.value || '?'}</span>
            </div>
            <div className="spt-best-lvl">Lv {r.atLevel}</div>
            {showLock && !isPremium && <Lock size={12} className="spt-best-lock" />}
          </div>
        );

        const BestSection = ({ items, sectionClass, labelIcon, labelText, showLock }) => {
          const [pg, setPg] = useState(0);
          const totalPg = Math.ceil(items.length / BEST_PER_PAGE);
          const visible = items.slice(pg * BEST_PER_PAGE, pg * BEST_PER_PAGE + BEST_PER_PAGE);
          return (
            <div className={`spt-best-section ${sectionClass}`}>
              <div className="spt-best-section-label">{labelIcon}{labelText}</div>
              <div className="spt-best-paged">
                <button className="spt-page-btn" onClick={() => setPg(p => Math.max(0, p - 1))} disabled={pg === 0}>
                  <ChevronLeft size={14} />
                </button>
                <div className="spt-best-list">
                  {visible.map((r, i) => <RewardCard key={i} r={r} showLock={showLock} />)}
                </div>
                <button className="spt-page-btn" onClick={() => setPg(p => Math.min(totalPg - 1, p + 1))} disabled={pg === totalPg - 1 || totalPg === 0}>
                  <ChevronRight size={14} />
                </button>
              </div>
              {totalPg > 1 && (
                <div className="spt-best-page-info">{pg * BEST_PER_PAGE + 1}–{Math.min(pg * BEST_PER_PAGE + BEST_PER_PAGE, items.length)} / {items.length}</div>
              )}
            </div>
          );
        };

        return (
          <div className="spt-overlay" onClick={() => setShowBest(false)}>
            <div className="spt-modal spt-modal--best" onClick={e => e.stopPropagation()}>
              <div className="spt-modal-header">
                <div className="spt-modal-header-left">
                  <div className="spt-modal-icon"><Star size={15} /></div>
                  <span className="spt-modal-title">Top Rewards — {pass.name}</span>
                </div>
                <div className="spt-modal-header-right">
                  <button className="spt-close-btn" onClick={() => setShowBest(false)}><X size={16} /></button>
                </div>
              </div>

              <div className="spt-best-body">
                {premiumBest.length > 0 && (
                  <BestSection
                    items={premiumBest}
                    sectionClass="premium"
                    labelIcon={<Crown size={13} className="spt-lbl-crown" />}
                    labelText="Premium Track"
                    showLock={true}
                  />
                )}
                {freeBest.length > 0 && (
                  <BestSection
                    items={freeBest}
                    sectionClass="free"
                    labelIcon={<Gift size={13} className="spt-lbl-gift" />}
                    labelText="Free Track"
                    showLock={false}
                  />
                )}
                {premiumBest.length === 0 && freeBest.length === 0 && (
                  <div className="spt-best-empty">No top rewards configured yet.</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
