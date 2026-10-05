import { useState, useEffect, useContext, useRef } from 'react';
import {
  Zap, Lock, Crown, Coins, Gift, X,
  ChevronLeft, ChevronRight, CheckCircle, LogIn, Ticket, ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import '../styles/SeasonPassTrack.css';

function RewardIcon({ reward, size = 15 }) {
  if (!reward || reward.type === 'none') return <span className="spt-dash">—</span>;
  return (
    <div className="spt-reward-content">
      {reward.type === 'gold'       && <Coins  size={size} className="spt-icon-gold"   />}
      {reward.type === 'item'       && <Gift   size={size} className="spt-icon-item"   />}
      {reward.type === 'frame'      && <Crown  size={size} className="spt-icon-frame"  />}
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

  if (loading) return null;

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
              <div className="spt-xp-bar-fill" style={{ width: `${xpPct}%` }} />
              <span className="spt-xp-bar-label">{xpInLevel} / {xpPerLevel} XP</span>
            </div>
            <span className="spt-xp-next">→ Level {userLevel + 1}</span>
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
                <div className="spt-modal-xp-fill" style={{ width: `${xpPct}%` }} />
              </div>
              <div className="spt-modal-xp-labels">
                <span>{xpInLevel} / {xpPerLevel} XP</span>
                <span>Next: Level {userLevel + 1}</span>
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
                        <div key={lvl} className={`spt-cell premium ${unlocked ? 'unlocked' : ''} ${claimed ? 'claimed' : ''} ${lvl === userLevel + 1 ? 'next' : ''}`}>
                          {reward && reward.type !== 'none' ? (
                            <>
                              <div className={`spt-cell-reward ${!isPremium ? 'dimmed' : ''}`}>
                                <RewardIcon reward={reward} />
                              </div>
                              {!isPremium && <div className="spt-lock-overlay"><Lock size={11} /></div>}
                              {collectable && (
                                <button className="spt-collect-btn" onClick={() => handleCollect(lvl, 'premium')} disabled={collecting === key}>
                                  {collecting === key ? '...' : 'Collect'}
                                </button>
                              )}
                              {claimed && <div className="spt-claimed"><CheckCircle size={12} /></div>}
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

              {/* Level markers */}
              <div className="spt-row spt-row-levels">
                <div className="spt-row-label spt-lbl-lvl">Lvl</div>
                <div className="spt-cells">
                  {visibleLvls.map(lvl => {
                    const unlocked  = userLevel >= lvl;
                    const isCurrent = userLevel + 1 === lvl;
                    return (
                      <div key={lvl} className={`spt-lvl-marker ${unlocked ? 'unlocked' : ''} ${isCurrent ? 'current' : ''}`}>
                        {!unlocked && <div className="spt-lvl-bubble">{lvl}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Free row */}
              <div className="spt-row spt-row-free">
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
                      <div key={lvl} className={`spt-cell free ${unlocked ? 'unlocked' : ''} ${claimed ? 'claimed' : ''} ${lvl === userLevel + 1 ? 'next' : ''}`}>
                        {reward && reward.type !== 'none' ? (
                          <>
                            <div className="spt-cell-reward">
                              <RewardIcon reward={reward} />
                            </div>
                            {collectable && (
                              <button className="spt-collect-btn" onClick={() => handleCollect(lvl, 'free')} disabled={collecting === key}>
                                {collecting === key ? '...' : 'Collect'}
                              </button>
                            )}
                            {claimed && <div className="spt-claimed"><CheckCircle size={12} /></div>}
                          </>
                        ) : (
                          <span className="spt-dash">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
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
    </>
  );
}
