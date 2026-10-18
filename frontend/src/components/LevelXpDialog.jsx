import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap } from 'lucide-react';
import { xpPerLevel } from '../utils/xpUtils.js';

const TIERS = [[1, 10], [11, 25], [26, 50], [51, 75], [76, 100],
  [101, 150], [151, 200], [201, Infinity]];

export default function LevelXpDialog({ level, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleBackdropClick = (event) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  };

  return createPortal(
    <dialog ref={dialogRef} id="level-xp-dialog" className="xp-info-dialog"
      aria-labelledby="level-xp-title" aria-describedby="level-xp-description"
      onClick={handleBackdropClick}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="xp-info-content">
        <div className="xp-info-header">
          <div className="xp-info-heading">
            <Zap size={20} aria-hidden="true" />
            <h2 id="level-xp-title">Level XP Requirements</h2>
          </div>
          <button type="button" className="xp-info-close" aria-label="Close level requirements" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <p id="level-xp-description" className="xp-info-description">
          XP needed to advance from your current level to the next.
        </p>
        <table className="xp-info-table">
          <thead><tr><th scope="col">Current level</th><th scope="col">XP to next level</th></tr></thead>
          <tbody>
            {TIERS.map(([start, end]) => (
              <tr key={start} className={level >= start && level <= end ? 'xp-info-active' : undefined}>
                <td>{Number.isFinite(end) ? `${start} – ${end}` : `${start}+`}</td>
                <td>{xpPerLevel(start).toLocaleString('en-US')} XP</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="xp-info-current">
          Your level: <strong>{level}</strong>
          <span><strong>{xpPerLevel(level).toLocaleString('en-US')} XP</strong> per level in your tier</span>
        </p>
      </div>
    </dialog>, document.body
  );
}
