import { useState, useEffect, useRef } from 'react';
import { Coins, RotateCcw, Zap, Sparkles, X } from 'lucide-react';
import { API_URL } from '../config';
import '../styles/SeasonBox.css';

const ICON_MAP = { Coins, RotateCcw, Zap, Sparkles };

function PrizeIcon({ name, size = 26 }) {
  const Icon = ICON_MAP[name] || Coins;
  return <Icon size={size} />;
}

function rarityClass(id) {
  if (id === '3x_xp_10min') return 'rarity-legendary';
  if (id === '2x_xp_20min') return 'rarity-epic';
  if (id === '2x_xp_10min') return 'rarity-rare';
  if (id === 'gold_15')     return 'rarity-uncommon';
  return 'rarity-common';
}

const TILE_W  = 120;
const STRIP_N = 40;
const WIN_IDX = 28;

export default function SeasonBox({ userGold, onGoldChange, onInventoryChange }) {
  const [prizes, setPrizes]         = useState([]);
  const [cost, setCost]             = useState(20);
  const [spinning, setSpinning]     = useState(false);
  const [strip, setStrip]           = useState([]);
  const [showReel, setShowReel]     = useState(false);  // modal visibility
  const [result, setResult]         = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError]           = useState('');

  const stripRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/season-box/prizes`)
      .then(r => r.json())
      .then(d => { if (d.success) { setPrizes(d.prizes); setCost(d.cost); } })
      .catch(() => {});
  }, []);

  const buildStrip = (winnerPrize, allPrizes) => {
    return Array.from({ length: STRIP_N }, (_, i) => {
      if (i === WIN_IDX) return winnerPrize;
      const token = Math.floor(Math.random() * 10000) + 1;
      return allPrizes.find(p => token >= p.min && token <= p.max) || allPrizes[0];
    });
  };

  const runSpin = (winnerPrize, allPrizes, callback) => {
    const tiles = buildStrip(winnerPrize, allPrizes);
    setStrip(tiles);

    setShowReel(true);

    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = stripRef.current;
          if (!el) return;

          // Reset without transition
          el.style.transition = 'none';
          el.style.transform  = 'translateX(0)';
          el.getBoundingClientRect(); // force reflow

          // Measure the actual winner tile position after render
          const winnerTile = el.children[WIN_IDX];
          if (!winnerTile) return;

          const containerRect = el.parentElement.getBoundingClientRect();
          const tileRect      = winnerTile.getBoundingClientRect();

          // Center of container vs center of tile (both relative to viewport)
          const containerCenter = containerRect.left + containerRect.width / 2;
          const tileCenter      = tileRect.left + tileRect.width / 2;

          // How much we need to shift left so tile center == container center
          const finalX = -(tileCenter - containerCenter);

          el.style.transition = `transform 4200ms cubic-bezier(0.12, 0.8, 0.24, 1)`;
          el.style.transform  = `translateX(${finalX}px)`;

          setTimeout(callback, 4400);
        });
      });
    }, 80);
  };

  const handleOpen = async () => {
    if (spinning || prizes.length === 0) return;
    setError('');
    setResult(null);
    setShowResult(false);
    setSpinning(true);

    try {
      const resp = await fetch(`${API_URL}/season-box/open`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await resp.json();

      if (!resp.ok) {
        setError(data.message || 'Failed to open box');
        setSpinning(false);
        return;
      }

      runSpin(data.prize, prizes, () => {
        setShowReel(false);
        setResult(data.prize);
        setShowResult(true);
        setSpinning(false);
        onGoldChange?.(data.remainingGold);
        onInventoryChange?.(data.inventory);
      });
    } catch {
      setError('Network error');
      setSpinning(false);
    }
  };

  const canOpen = (userGold ?? 0) >= cost && !spinning;

  return (
    <>
      {/* ── Static card ── */}
      <div className="season-box-card">
        <img src="/season.png" alt="Season Box" className="season-box-img" />

        <div className="season-box-footer">
          {error && <p className="season-box-error">{error}</p>}

          <button
            className={`season-box-btn ${!canOpen ? 'disabled' : ''}`}
            onClick={handleOpen}
            disabled={!canOpen}
          >
            {spinning ? (
              <><span className="sb-spin-dot" /> Opening...</>
            ) : (
              <><Coins size={16} /> Open {cost} Gold</>
            )}
          </button>

          {!canOpen && !spinning && (
            <p className="season-box-insufficient">
              Need {cost} gold (have {userGold ?? 0})
            </p>
          )}
        </div>
      </div>

      {/* ── Spin modal ── */}
      {showReel && (
        <div className="sb-modal-overlay">
          <div className="sb-modal">
            <p className="sb-modal-title">Opening Season Box...</p>
            <div className="sb-reel-mask">
              <div className="sb-strip" ref={stripRef}>
                {strip.map((prize, idx) => (
                  <div key={idx} className={`sb-tile ${rarityClass(prize.id)}`}>
                    <div className="sb-tile-inner">
                      <PrizeIcon name={prize.icon} size={24} />
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

      {/* ── Result popup ── */}
      {showResult && result && (
        <div className="sb-result-overlay" onClick={() => setShowResult(false)}>
          <div className="sb-result-card" onClick={e => e.stopPropagation()}>
            <button className="sb-result-close" onClick={() => setShowResult(false)}>
              <X size={17} />
            </button>
            <p className="sb-result-label">You got</p>
            <div className={`sb-result-icon-wrap ${rarityClass(result.id)}`}>
              <PrizeIcon name={result.icon} size={48} />
            </div>
            <h3 className="sb-result-name">{result.label}</h3>
            <button className="sb-result-ok" onClick={() => setShowResult(false)}>
              Nice!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
