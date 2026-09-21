import { useState, useEffect, useRef } from 'react';
import { Coins, RotateCcw, Zap, Sparkles, X, FastForward, Gauge } from 'lucide-react';
import { API_URL } from '../config';
import '../styles/SeasonBox.css';

const ICON_MAP = { Coins, RotateCcw, Zap, Sparkles };

const FRAME_SRCS = {
  'silver-season1':  '/silver-season1.png',
  'gold-season1':    '/gold-season1.png',
  'diamond-season1': '/diamond-season1.png',
};

// Preload all known assets at module import time (same pattern as AvatarFrame)
[...Object.values(FRAME_SRCS), '/season.png'].forEach((src) => {
  const img = new Image();
  img.src = src;
});

function PrizeIcon({ prize, size = 26 }) {
  if (prize.type === 'frame' && prize.frameKey) {
    const src = FRAME_SRCS[prize.frameKey] || `/${prize.frameKey}.png`;
    return <img src={src} alt={prize.label} className="sb-prize-img" draggable={false} style={{ width: size, height: size }} />;
  }
  if (prize.type === 'nameEffect') {
    return (
      <span className="sb-nameeffect-preview" style={{ fontSize: size * 0.55 }}>
        Aa
      </span>
    );
  }
  const Icon = ICON_MAP[prize.icon] || Coins;
  return <Icon size={size} />;
}

function rarityClass(id) {
  if (id === 'frame_diamond_s1')       return 'rarity-legendary';
  if (id === 'gold_500')               return 'rarity-legendary';
  if (id === 'frame_gold_s1')          return 'rarity-epic';
  if (id === 'frame_silver_s1')        return 'rarity-rare';
  if (id === 'nameeffect_autumn_wave') return 'rarity-epic';
  if (id === '3x_xp_10min')           return 'rarity-legendary';
  if (id === '2x_xp_20min')           return 'rarity-epic';
  if (id === '2x_xp_10min')           return 'rarity-rare';
  if (id === 'gold_20')               return 'rarity-uncommon';
  return 'rarity-common';
}

const STRIP_N = 40;
const WIN_IDX = 28;
const COUNTS  = [1, 2, 3, 5];

// Sorted from most common to rarest (by chance descending)
function chancePercent(prize) {
  return ((prize.max - prize.min + 1) / 10000 * 100).toFixed(1);
}

export default function SeasonBox({ userGold, onGoldChange, onInventoryChange }) {
  const [prizes, setPrizes]       = useState([]);
  const [cost, setCost]           = useState(20);
  const [openCount, setOpenCount] = useState(1);
  const [showContents, setShowContents] = useState(false);
  const [loadingPrizes, setLoadingPrizes] = useState(true);
  const [prizesError, setPrizesError] = useState(''); // separate from open errors


  const [spinning, setSpinning]       = useState(false);
  const [strip, setStrip]             = useState([]);
  const [showReel, setShowReel]       = useState(false);
  const [reelIdx, setReelIdx]         = useState(0);   
  const [reelLabel, setReelLabel]     = useState('');  

  const [allResults, setAllResults]   = useState([]);  
  const [showSummary, setShowSummary] = useState(false);

  const [error, setError] = useState('');
  const [isFast, setIsFast] = useState(false);

  const stripRef    = useRef(null);
  const pendingRef  = useRef([]);
  const skipRef     = useRef(null);   // stores the current reel's done() callback
  const fastRef     = useRef(false);  // fast spin mode toggle

  useEffect(() => {
    setLoadingPrizes(true);
    setPrizesError('');
    fetch(`${API_URL}/season-box/prizes`)
      .then(r => r.json())
      .then(d => {
        if (d.success) { setPrizes(d.prizes); setCost(d.cost); }
        else { setPrizesError('Failed to load prizes. Try refreshing.'); }
      })
      .catch(() => setPrizesError('Failed to load prizes. Try refreshing.'))
      .finally(() => setLoadingPrizes(false));
  }, []);

  const buildStrip = (winnerPrize) =>
    Array.from({ length: STRIP_N }, (_, i) => {
      if (i === WIN_IDX) return winnerPrize;
      const token = Math.floor(Math.random() * 10000) + 1;
      return prizes.find(p => token >= p.min && token <= p.max) || prizes[0];
    });

  // Animate a single reel, then call done()
  const animateReel = (prize, idx, total, done) => {
    const tiles = buildStrip(prize);
    setStrip(tiles);
    setReelIdx(idx);
    setReelLabel(total > 1 ? `Opening ${idx + 1} / ${total}` : 'Opening Season Box...');
    setShowReel(true);

    let called = false;
    const safeDone = () => {
      if (called) return;
      called = true;
      skipRef.current = null;
      done();
    };

    // Store safeDone so skip button can call it immediately
    skipRef.current = safeDone;

    const duration = fastRef.current ? 800 : 4200;
    const settle   = fastRef.current ? 900 : 4400;

    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = stripRef.current;
          if (!el) return safeDone();

          el.style.transition = 'none';
          el.style.transform  = 'translateX(0)';
          el.getBoundingClientRect();

          const winner = el.children[WIN_IDX];
          if (!winner) return safeDone();

          const cRect = el.parentElement.getBoundingClientRect();
          const tRect = winner.getBoundingClientRect();
          const finalX = -((tRect.left + tRect.width / 2) - (cRect.left + cRect.width / 2));

          const easing = fastRef.current
            ? 'cubic-bezier(0.25, 0.8, 0.4, 1)'
            : 'cubic-bezier(0.12, 0.8, 0.24, 1)';

          el.style.transition = `transform ${duration}ms ${easing}`;
          el.style.transform  = `translateX(${finalX}px)`;

          setTimeout(safeDone, settle);
        });
      });
    }, 80);
  };

  // Skip current reel animation — jump strip to final position immediately
  const handleSkip = () => {
    const el = stripRef.current;
    if (el) {
      el.style.transition = 'none';
    }
    const cb = skipRef.current;
    if (cb) cb();
  };

  const toggleFast = () => {
    const next = !fastRef.current;
    fastRef.current = next;
    setIsFast(next);
  };


  const runQueue = (queue, onFinish) => {
    const go = (i) => {
      if (i >= queue.length) {
        setShowReel(false);
        onFinish();
        return;
      }
      animateReel(queue[i], i, queue.length, () => {

        if (i < queue.length - 1) {
          setTimeout(() => go(i + 1), 400);
        } else {
          setShowReel(false);
          onFinish();
        }
      });
    };
    go(0);
  };

  const handleOpen = async () => {
    if (spinning || prizes.length === 0) return;
    setError('');
    setAllResults([]);
    setShowSummary(false);
    setSpinning(true);

    try {
      const resp = await fetch(`${API_URL}/season-box/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ count: openCount }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        const msg = resp.status === 401
          ? 'Session expired — please log in again.'
          : data.message || 'Failed to open box';
        setError(msg);
        setSpinning(false);
        return;
      }

      setAllResults(data.results);
      pendingRef.current = data.results;

      runQueue(data.results, () => {
        setShowSummary(true);
        setSpinning(false);
        onGoldChange?.(data.remainingGold);
        onInventoryChange?.(data.inventory);
      });
    } catch {
      setError('Network error');
      setSpinning(false);
    }
  };

  const totalCost = cost * openCount;
  const canOpen   = (userGold ?? 0) >= totalCost && !spinning && prizes.length > 0;

  return (
    <>

      <div className="season-box-card">
        <img
          src="/season.png"
          alt="Season Box"
          className="season-box-img season-box-img--clickable"
          onClick={() => setShowContents(true)}
          title="Click to see possible rewards"
        />

        <div className="season-box-footer">

          <div className="sb-count-selector">
            {COUNTS.map(n => (
              <button
                key={n}
                className={`sb-count-btn ${openCount === n ? 'active' : ''}`}
                onClick={() => setOpenCount(n)}
                disabled={spinning}
              >
                {n}×
              </button>
            ))}
          </div>

          {error && <p className="season-box-error">{error}</p>}

          <button
            className={`season-box-btn ${!canOpen ? 'disabled' : ''}`}
            onClick={handleOpen}
            disabled={!canOpen}
          >
            {spinning ? (
              <><span className="sb-spin-dot" /> Opening...</>
            ) : (
              <><Coins size={16} /> Open {openCount > 1 ? `${openCount}×` : ''} / {totalCost} Gold</>
            )}
          </button>

          {!canOpen && !spinning && prizes.length === 0 && !error && (
            <p className="season-box-insufficient">Loading prizes...</p>
          )}
          {!canOpen && !spinning && prizes.length > 0 && (userGold ?? 0) < totalCost && (
            <p className="season-box-insufficient">
              Need {totalCost} gold (have {userGold ?? 0})
            </p>
          )}
        </div>
      </div>

      {showReel && (
        <div className="sb-modal-overlay">
          <div className="sb-modal">
            <p className="sb-modal-title">{reelLabel}</p>
            {openCount > 1 && (
              <div className="sb-progress-dots">
                {Array.from({ length: openCount }, (_, i) => (
                  <span key={i} className={`sb-progress-dot ${i <= reelIdx ? 'done' : ''} ${i === reelIdx ? 'current' : ''}`} />
                ))}
              </div>
            )}
            <div className="sb-reel-mask">
              <div className="sb-strip" ref={stripRef}>
                {strip.map((prize, idx) => (
                  <div key={idx} className={`sb-tile ${rarityClass(prize.id)}`}>
                    <div className="sb-tile-inner">
                      <PrizeIcon prize={prize} size={24} />
                      <span className="sb-tile-label">{prize.label}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="sb-marker-left" />
              <div className="sb-marker-right" />
              <div className="sb-center-highlight" />
            </div>
            <div className="sb-reel-actions">
              <button
                className={`sb-action-btn sb-fast-btn ${isFast ? 'active' : ''}`}
                onClick={toggleFast}
                title="Fast spin mode"
              >
                <Gauge size={15} />
                {isFast ? 'Fast: On' : 'Fast: Off'}
              </button>
              <button
                className="sb-action-btn sb-skip-btn"
                onClick={handleSkip}
                title="Skip to result"
              >
                <FastForward size={15} />
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {showSummary && allResults.length > 0 && (
        <div className="sb-result-overlay" onClick={() => setShowSummary(false)}>
          <div className="sb-result-card sb-result-card--multi" onClick={e => e.stopPropagation()}>
            <button className="sb-result-close" onClick={() => setShowSummary(false)}>
              <X size={17} />
            </button>

            {allResults.length === 1 ? (

              <>
                <p className="sb-result-label">You got</p>
                <div className={`sb-result-icon-wrap ${rarityClass(allResults[0].id)}`}>
                  <PrizeIcon prize={allResults[0]} size={48} />
                </div>
                <h3 className="sb-result-name">{allResults[0].label}</h3>
              </>
            ) : (

              <>
                <p className="sb-result-label">You got {allResults.length} prizes</p>
                <div className="sb-multi-grid">
                  {allResults.map((r, i) => (
                    <div key={i} className={`sb-multi-item ${rarityClass(r.id)}`}>
                      <div className="sb-multi-icon">
                        <PrizeIcon prize={r} size={32} />
                      </div>
                      <span className="sb-multi-label">{r.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button className="sb-result-ok" onClick={() => setShowSummary(false)}>
              {allResults.length > 1 ? 'Collect All' : 'Nice!'}
            </button>
          </div>
        </div>
      )}
      {showContents && (
        <div className="sb-contents-overlay" onClick={() => setShowContents(false)}>
          <div className="sb-contents-modal" onClick={e => e.stopPropagation()}>
            <button className="sb-result-close" onClick={() => setShowContents(false)}>
              <X size={17} />
            </button>
            <p className="sb-modal-title">Possible Rewards</p>
            <div className="sb-contents-list">
              {[...prizes]
                .sort((a, b) => (b.max - b.min) - (a.max - a.min))
                .map(prize => (
                  <div key={prize.id} className={`sb-contents-row ${rarityClass(prize.id)}`}>
                    <div className="sb-contents-icon">
                      <PrizeIcon prize={prize} size={22} />
                    </div>
                    <span className="sb-contents-name">{prize.label}</span>
                    <span className="sb-contents-chance">{chancePercent(prize)}%</span>
                    <div className="sb-contents-bar-wrap">
                      <div
                        className="sb-contents-bar"
                        style={{ width: `${chancePercent(prize)}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
