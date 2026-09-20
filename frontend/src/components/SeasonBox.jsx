import { useState, useEffect, useRef } from 'react';
import { Coins, RotateCcw, Zap, Sparkles, X, ChevronRight } from 'lucide-react';
import { API_URL } from '../config';
import '../styles/SeasonBox.css';

const ICON_MAP = { Coins, RotateCcw, Zap, Sparkles };

const FRAME_SRCS = {
  'silver-season1':  '/silver-season1.png',
  'gold-season1':    '/gold-season1.png',
  'diamond-season1': '/diamond-season1.png',
};

function PrizeIcon({ prize, size = 26 }) {
  if (prize.type === 'frame' && prize.frameKey) {
    const src = FRAME_SRCS[prize.frameKey] || `/${prize.frameKey}.png`;
    return <img src={src} alt={prize.label} style={{ width: size, height: size, objectFit: 'contain' }} draggable={false} />;
  }
  const Icon = ICON_MAP[prize.icon] || Coins;
  return <Icon size={size} />;
}

function rarityClass(id) {
  if (id === 'frame_diamond_s1') return 'rarity-legendary';
  if (id === 'frame_gold_s1')    return 'rarity-epic';
  if (id === 'frame_silver_s1')  return 'rarity-rare';
  if (id === '3x_xp_10min')      return 'rarity-legendary';
  if (id === '2x_xp_20min')      return 'rarity-epic';
  if (id === '2x_xp_10min')      return 'rarity-rare';
  if (id === 'gold_15')          return 'rarity-uncommon';
  return 'rarity-common';
}

const STRIP_N = 40;
const WIN_IDX = 28;
const COUNTS  = [1, 2, 3, 5];

export default function SeasonBox({ userGold, onGoldChange, onInventoryChange }) {
  const [prizes, setPrizes]       = useState([]);
  const [cost, setCost]           = useState(20);
  const [openCount, setOpenCount] = useState(1);


  const [spinning, setSpinning]       = useState(false);
  const [strip, setStrip]             = useState([]);
  const [showReel, setShowReel]       = useState(false);
  const [reelIdx, setReelIdx]         = useState(0);   
  const [reelLabel, setReelLabel]     = useState('');  

  const [allResults, setAllResults]   = useState([]);  
  const [showSummary, setShowSummary] = useState(false);

  const [error, setError] = useState('');

  const stripRef   = useRef(null);
  const pendingRef = useRef([]); 

  useEffect(() => {
    fetch(`${API_URL}/season-box/prizes`)
      .then(r => r.json())
      .then(d => { if (d.success) { setPrizes(d.prizes); setCost(d.cost); } })
      .catch(() => {});
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

    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = stripRef.current;
          if (!el) return done();

          el.style.transition = 'none';
          el.style.transform  = 'translateX(0)';
          el.getBoundingClientRect();

          const winner = el.children[WIN_IDX];
          if (!winner) return done();

          const cRect = el.parentElement.getBoundingClientRect();
          const tRect = winner.getBoundingClientRect();
          const finalX = -((tRect.left + tRect.width / 2) - (cRect.left + cRect.width / 2));

          el.style.transition = 'transform 4200ms cubic-bezier(0.12, 0.8, 0.24, 1)';
          el.style.transform  = `translateX(${finalX}px)`;

          setTimeout(done, 4400);
        });
      });
    }, 80);
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
        setError(data.message || 'Failed to open box');
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
  const canOpen   = (userGold ?? 0) >= totalCost && !spinning;

  return (
    <>

      <div className="season-box-card">
        <img src="/season.png" alt="Season Box" className="season-box-img" />

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

          {!canOpen && !spinning && (
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
    </>
  );
}
