import { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gift, Sparkles, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useSeasonPass } from '../context/SeasonPassContext';
import { stackRewards, unclaimedRewards } from '../utils/seasonPassRewards';
import { API_URL } from '../config';
import GoldIcon from './GoldIcon';
import '../styles/SeasonCollectModal.css';

export default function SeasonCollectModal() {
  const { user, updateUser } = useContext(AuthContext);
  const { pass, userProgress, setUserProgress, loading, refreshSeasonPass } = useSeasonPass();
  const [checking, setChecking] = useState(true);
  const [dismissed, setDismissed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const busyRef = useRef(false);
  const key = `${user?.username}:${pass?._id}`;
  const rewards = unclaimedRewards(pass, userProgress);
  const visible = Boolean(user && !loading && !checking && rewards.length && dismissed !== key);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    Promise.resolve(refreshSeasonPass()).finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [refreshSeasonPass, user?.username]);

  useEffect(() => {
    if (!visible) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current.focus();
    const onKey = event => {
      if (event.key === 'Escape' && !busyRef.current) setDismissed(key);
      if (event.key !== 'Tab') return;
      const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [visible, key]);

  const collect = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/season-pass/collect-all`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passId: pass._id }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to collect rewards.');
      setUserProgress(data.userProgress);
      updateUser({ gold: data.gold, frames: data.frames, nameEffects: data.nameEffects, inventory: data.inventory });
      setDismissed(key);
    } catch (error) {
      setError(error.message || 'Network error. Please try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (!visible) return null;
  return createPortal(
    <div className="season-collect-overlay" onClick={event => {
      if (event.target === event.currentTarget && !busy) setDismissed(key);
    }}>
      <section ref={dialogRef} className="season-collect-dialog" role="dialog" aria-modal="true"
        aria-labelledby="season-collect-title" aria-describedby="season-collect-description" tabIndex={-1} aria-busy={busy}>
        <button className="season-collect-close" onClick={() => setDismissed(key)} disabled={busy} aria-label="Dismiss rewards">
          <X size={20} />
        </button>
        <div className="season-collect-emblem"><Gift size={30} /></div>
        <span className="season-collect-eyebrow">{pass.name}</span>
        <h2 id="season-collect-title">Your rewards are ready</h2>
        <p id="season-collect-description">You have {rewards.length} unclaimed {rewards.length === 1 ? 'reward' : 'rewards'}. Collect them all in one go.</p>
        <ul className="season-collect-rewards">
          {stackRewards(rewards).map(reward => (
            <li key={reward.key}>
              <span className={`season-collect-reward-icon season-collect-reward-icon--${reward.type}`}>
                {reward.type === 'gold' ? <GoldIcon size={27} /> : reward.type === 'frame' ?
                  <img src={`/${reward.value}.png`} alt="" /> : reward.type === 'nameEffect' ?
                    <Sparkles size={25} /> : <Gift size={25} />}
              </span>
              <span className="season-collect-reward-name">{reward.type === 'gold' ? 'Gold' : reward.label || reward.value}</span>
              <strong>{reward.type === 'gold' ? `+${reward.quantity.toLocaleString()}` : `×${reward.quantity}`}</strong>
            </li>
          ))}
        </ul>
        {error && <p className="season-collect-error" role="alert">{error}</p>}
        <div className="season-collect-actions">
          <button className="season-collect-dismiss" onClick={() => setDismissed(key)} disabled={busy}>Dismiss</button>
          <button className="season-collect-submit" onClick={collect} disabled={busy}>
            <Gift size={16} /> {busy ? 'Collecting…' : 'Collect All'}
          </button>
        </div>
      </section>
    </div>, document.body,
  );
}
