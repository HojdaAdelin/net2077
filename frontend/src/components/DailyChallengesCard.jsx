import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Cpu, LockKeyhole, Monitor, Trophy, Wifi, X } from 'lucide-react';
import '../styles/DailyChallengesCard.css';

export default function DailyChallengesCard({ status, loading, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState('LINUX');
  const [includeAcadnet, setIncludeAcadnet] = useState(false);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const navigate = useNavigate();
  const [remaining, setRemaining] = useState(0);
  const panelId = useId();
  const locked = Boolean(status?.completed);

  useEffect(() => {
    if (!status?.nextAvailableAt) return;
    const deadline = Date.now() + Math.max(0, Date.parse(status.nextAvailableAt) - Date.parse(status.serverTime));
    const tick = () => {
      const next = Math.max(0, deadline - Date.now());
      setRemaining(next);
      if (!next) { clearInterval(timer); onRefresh(); }
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [status, onRefresh]);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') onRefresh(); };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [onRefresh]);

  useEffect(() => {
    if (!open || locked) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    dialog?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, locked]);

  const seconds = Math.ceil(remaining / 1000);
  const countdown = [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':');

  const start = () => {
    if (!selected || locked || loading) return;
    const mode = category === 'NETWORK' ? 'network' : category === 'ARDUINO' ? 'arduino' : 'challenge';
    navigate(`/grile/daily/${mode}${category === 'LINUX' && includeAcadnet ? '?acadnet=1' : ''}`);
  };

  return (
    <>
      <article className={`daily-hub ${locked ? 'daily-hub-locked' : ''}`}>
        <button ref={triggerRef} className="daily-hub-toggle" type="button" disabled={loading || !status || locked}
          aria-haspopup="dialog" onClick={() => { setSelected(null); setOpen(true); }}>
          <span className="daily-hub-top">
            <span className="daily-hub-heading"><strong>Daily Challenges</strong>
              <span>{loading ? 'Checking availability...' : locked ? 'Challenge completed' : 'Pick your next challenge.'}</span>
            </span>
            <span className="daily-hub-deck" aria-hidden="true">
              <span className="daily-hub-deck-back" /><span className="daily-hub-deck-middle" />
              <span className="daily-hub-deck-front">{locked ? <Check size={23} strokeWidth={1.5} /> : <Trophy size={23} strokeWidth={1.5} />}</span>
            </span>
          </span>
          {locked ? <span className="daily-hub-bottom daily-hub-lock"><span><LockKeyhole size={13} /> Next challenge</span>
            <time className="daily-hub-countdown">{countdown}</time></span>
            : <span className="daily-hub-bottom"><span>{loading ? 'Loading' : 'Explore challenges'}</span><span className="daily-hub-arrow"><ArrowRight size={17} /></span></span>}
        </button>
        {!loading && !status && <button className="daily-hub-retry" type="button" onClick={onRefresh}>Retry availability</button>}
      </article>

      {open && !locked && createPortal(
        <div className="daily-picker-backdrop" onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="daily-picker" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={panelId} tabIndex={-1}>
            <header className="daily-picker-header">
              <div><span className="daily-picker-label">PRACTICE / DAILY</span><h2 id={panelId}>Choose your challenge</h2></div>
              <button className="daily-picker-close" type="button" aria-label="Close daily challenges" onClick={() => setOpen(false)}><X size={21} /></button>
            </header>

            <div className="daily-picker-content">
              <div className="daily-picker-grid">
                <button className={`daily-picker-challenge ${selected === 'twenty' ? 'is-selected' : ''}`}
                  type="button" aria-pressed={selected === 'twenty'} onClick={() => setSelected('twenty')}>
                  <span className="daily-picker-challenge-heading"><span>Daily quiz</span><span className="daily-picker-radio">{selected === 'twenty' && <Check size={12} />}</span></span>
                  <span className="daily-picker-number">20<span>questions</span></span>
                  <span className="daily-picker-challenge-meta"><span>Linux / Network / Arduino</span><strong>2&times; XP</strong></span>
                </button>
              </div>

              {selected && <div className="daily-picker-options">
                <fieldset><legend>Question category</legend>
                  <div className="daily-picker-categories">
                    {[{ id: 'LINUX', label: 'Linux', Icon: Monitor }, { id: 'NETWORK', label: 'Network', Icon: Wifi }, { id: 'ARDUINO', label: 'Arduino', Icon: Cpu }].map(({ id, label, Icon }) => (
                      <label key={id} className={`daily-picker-category ${category === id ? 'is-selected' : ''}`}>
                        <input type="radio" name={`${panelId}-category`} value={id} checked={category === id}
                          onChange={() => { setCategory(id); setIncludeAcadnet(false); }} />
                        <Icon size={18} /><span>{label}</span>{category === id && <Check size={14} />}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {category === 'LINUX' && <label className="daily-picker-acadnet">
                  <input type="checkbox" checked={includeAcadnet} onChange={event => setIncludeAcadnet(event.target.checked)} />
                  <span>Include AcadNet questions<small>AcadNet questions are in Romanian.</small></span>
                </label>}
              </div>}
            </div>

            <footer className="daily-picker-footer">
              <p>{selected ? 'Next challenge unlocks 24h after completion.' : 'Select a challenge to configure it.'}</p>
              <button className="daily-picker-start" type="button" disabled={!selected || loading || !status} onClick={start}>Start challenge <ArrowRight size={17} /></button>
            </footer>
          </section>
        </div>, document.body)}
    </>
  );
}
