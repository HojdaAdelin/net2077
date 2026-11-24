import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarClock, CheckCircle2, Trophy, X, Zap } from 'lucide-react';
import { networkRequest } from '../services/networkProblems';

function Countdown({ deadline }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  const minutes = Math.ceil(remaining / 60000);
  return <span title="Resets at 20:00 Romania time">
    {minutes ? `Resets in ${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m` : 'Resetting…'}
  </span>;
}

function DailyHeading({ daily }) {
  return <h2><CalendarClock size={17} aria-hidden="true" /> Daily Challenge
    {daily && <span className="npc-daily-points">{daily.points} {daily.points === 1 ? 'point' : 'points'}</span>}
  </h2>;
}

function DailyChallenge({ daily, deadline }) {
  const done = daily.tasks.filter(task => task.progress === task.target).length;
  return <>
    <div className="npc-daily-meter">
      <progress value={done} max={daily.tasks.length} aria-label="Daily tasks completed" />
      <span>{daily.completed ? 'Completed' : `${done}/${daily.tasks.length} tasks`}</span>
    </div>
    <div className="npc-daily-details">
      <Countdown deadline={deadline} />
      <span className="npc-daily-reward"><Zap size={13} aria-hidden="true" /> +{daily.rewardXp} XP · +1 point</span>
    </div>
  </>;
}

function Leaderboard({ leaderboard }) {
  return <>
    {leaderboard.top.length ? <ol className="npc-leaders">
      {leaderboard.top.map(player => <li key={player.username} className={player.you ? 'is-you' : undefined}>
        <span className="npc-leader-rank">#{player.rank}</span>
        <Link to={`/profile/${encodeURIComponent(player.username)}`}>{player.username}</Link>
        <span className="npc-leader-score" aria-label={`${player.solved} labs completed`}>{player.solved}</span>
      </li>)}
    </ol> : <p className="npc-dashboard-message">No labs completed yet.</p>}
    <div className="npc-dashboard-footer npc-your-rank">
      <strong>Your rank</strong><span>{leaderboard.rank === null ? 'Unranked' : `#${leaderboard.rank} · ${leaderboard.solved} ${leaderboard.solved === 1 ? 'lab' : 'labs'}`}</span>
    </div>
  </>;
}

function DashboardDialog({ data, deadline, close }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal();
  }, []);
  return <dialog ref={dialog} className="npc-dashboard-dialog" aria-labelledby="npc-dashboard-title" onClose={close}
    onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
    <div className="npc-dialog-content">
      <header>
        <h2 id="npc-dashboard-title">Leaderboard and daily tasks</h2>
        <button type="button" aria-label="Close leaderboard and tasks" onClick={() => dialog.current.close()}><X size={21} /></button>
      </header>
      <div className="npc-dialog-layout">
        <section className="npc-dashboard-card npc-leaderboard-card">
          <h2><Trophy size={18} aria-hidden="true" /> Lab leaderboard <span>Top 5</span></h2>
          <Leaderboard leaderboard={data.leaderboard} />
        </section>
        <section className="npc-dashboard-card npc-daily-card">
          <DailyHeading daily={data.daily} />
          <DailyChallenge daily={data.daily} deadline={deadline} />
          <ul className="npc-task-list">
            {data.daily.tasks.map(task => <li key={task.metric}>
              <div><strong>{task.label}</strong>{task.progress === task.target && <CheckCircle2 size={17} aria-label="Completed" />}</div>
              <div className="npc-daily-meter">
                <progress value={task.progress} max={task.target} aria-label={task.label} />
                <span>{task.progress}/{task.target}</span>
              </div>
            </li>)}
          </ul>
          <p className="npc-dashboard-message">Complete both tasks to earn the daily reward.</p>
        </section>
      </div>
    </div>
  </dialog>;
}

export default function NetworkLabDashboard() {
  const [state, setState] = useState({});
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let request;
    let timer;
    async function load() {
      request?.abort();
      window.clearTimeout(timer);
      const controller = new AbortController();
      request = controller;
      try {
        const data = await networkRequest('/dashboard', { signal: controller.signal });
        if (controller.signal.aborted) return;
        const duration = Date.parse(data.daily.resetAt) - Date.parse(data.daily.serverTime);
        const deadline = Date.now() + duration;
        setState({ data, deadline });
        timer = window.setTimeout(load, Math.max(500, duration + 300));
      } catch {
        if (!controller.signal.aborted) setState({ error: true });
      }
    }
    function refreshOnFocus() {
      if (document.visibilityState === 'visible') load();
    }
    load();
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      request?.abort();
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [retry]);

  const { data, deadline, error } = state;
  return <>
    <section className="npc-daily-summary" aria-label="Daily challenge" aria-busy={!data && !error}>
      <DailyHeading daily={data?.daily} />
      {data ? <DailyChallenge daily={data.daily} deadline={deadline} /> : <p className="npc-dashboard-message" role="status">
        {error ? 'Could not load the challenge. ' : 'Loading challenge…'}
        {error && <button type="button" className="npc-progress-next" onClick={() => { setState({}); setRetry(value => value + 1); }}>Try again</button>}
      </p>}
      <button type="button" className="npc-dashboard-open" disabled={!data} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        View leaderboard and tasks <ArrowUpRight size={15} aria-hidden="true" />
      </button>
    </section>
    {open && data && <DashboardDialog data={data} deadline={deadline} close={() => setOpen(false)} />}
  </>;
}
