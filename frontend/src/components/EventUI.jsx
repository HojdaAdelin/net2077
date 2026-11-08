import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock3, Users, ListChecks, RefreshCw, LockKeyhole } from 'lucide-react';
import { eventRequest } from '../services/events';
import AvatarFrame from './AvatarFrame';
import NameEffectRenderer from './NameEffectRenderer';

export const eventDate = value => new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const eventTime = seconds => {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 3600)).padStart(2, '0')}:${String(Math.floor(value % 3600 / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
};

export function useEventFeed(path, interval = 10000, owner = '') {
  const [state, setState] = useState({ path: null, owner: null, data: null, error: '', loading: true });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    setState(previous => previous.path === path && previous.owner === owner ? previous : { path, owner, data: null, error: '', loading: true });
    const refresh = async () => {
      if (running) return;
      running = true;
      try {
        const data = await eventRequest(path, { signal: controller.signal });
        if (!controller.signal.aborted) setState({ path, owner, data, error: '', loading: false });
      } catch (error) {
        if (!controller.signal.aborted) setState(previous => ({ ...previous, path, owner, error: error.message, loading: false }));
      } finally { running = false; }
    };
    refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, interval);
    const focus = () => refresh();
    window.addEventListener('focus', focus);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [path, interval, owner, version]);
  return { ...(state.path === path && state.owner === owner ? state : { data: null, loading: true, error: '' }), reload };
}

export function EventStatus({ status }) {
  return <span className={`ev-status ev-status--${status}`}><i aria-hidden="true" />{status === 'live' ? 'Live now' : status === 'ended' ? 'Finished' : 'Upcoming'}</span>;
}

export function EventMeta({ event }) {
  return <div className="ev-meta">
    <span><CalendarDays size={15} />{eventDate(event.startsAt)}</span>
    <span><Clock3 size={15} />{event.durationMinutes} min</span>
    <span><ListChecks size={15} />{event.questionCount} questions</span>
    <span><Users size={15} />{event.participants || 0} registered</span>
  </div>;
}

export function EventCard({ event, featured = false }) {
  const date = new Date(event.startsAt);
  return <article className={`ev-card${featured ? ' ev-card--featured' : ''}`}>
    <div className="ev-card-date" aria-hidden="true"><span>{date.toLocaleString('en-GB', { month: 'short' })}</span><strong>{String(date.getDate()).padStart(2, '0')}</strong><small>{date.getFullYear()}</small></div>
    <div className="ev-card-content">
      <div className="ev-card-top"><EventStatus status={event.status} /><span className={`ev-level ev-level--${event.difficulty}`}>{event.difficulty}</span>{event.joined && <span className="ev-registered">Registered</span>}</div>
      {featured && <span className="ev-eyebrow">NEXT ON THE CALENDAR</span>}
      <h3><Link to={`/events/${event._id}`}>{event.title}</Link></h3>
      <p>{event.description}</p>
      <EventMeta event={event} />
      <div className="ev-card-bottom"><span>Hosted by <strong>{event.organizer}</strong></span><Link to={`/events/${event._id}`} className="ev-text-link">{event.status === 'ended' ? 'View results' : event.joined ? 'Open event' : 'View competition'}<ArrowRight size={16} /></Link></div>
    </div>
  </article>;
}

export function EventNotice({ error, retry }) {
  return <div className="ev-notice" role="alert"><p>{error}</p>{retry && <button className="ev-button" type="button" onClick={retry}><RefreshCw size={15} />Try again</button>}</div>;
}

export function EventLeaderboard({ event, userKey }) {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useEventFeed(`/${event._id}/leaderboard?page=${page}`, event.status === 'ended' ? 30000 : 5000, userKey);
  const published = event.status === 'ended' && data?.published === true;
  return <section className="ev-standings" aria-labelledby="ev-standings-title">
    <div className="ev-section-heading"><div><span className="ev-eyebrow">THE STANDINGS</span><h2 id="ev-standings-title">Leaderboard</h2></div><span className="ev-update">{published ? 'Final results' : 'Available after the event'}</span></div>
    {published && <p className="ev-table-note">Points decide the order. Ties go to the earlier saved score, measured from the event start.{data?.myRank ? ` Your position: #${data.myRank}.` : ''}</p>}
    {error && <EventNotice error={error} retry={reload} />}
    {loading ? <div className="ev-loading" role="status">Loading standings…</div> : !published ? <div className="ev-standings-locked"><LockKeyhole size={23} strokeWidth={1.7} /><div><h3>Results are kept private until the finish.</h3><p>The leaderboard and scores will appear automatically after {eventDate(event.endsAt)}.</p></div></div> : data && <>
      <div className="ev-table-scroll"><table className="ev-table"><thead><tr><th scope="col">Rank</th><th scope="col">Participant</th><th scope="col">Score</th><th scope="col">Correct</th><th scope="col">Answered</th><th scope="col">Time</th><th scope="col">Status</th></tr></thead><tbody>
        {data.entries.map(entry => <tr className={entry.isMe ? 'ev-table-me' : ''} key={entry.rank}>
          <td className="ev-table-rank">{String(entry.rank).padStart(2, '0')}</td><td><div className="ev-table-user"><AvatarFrame frame={entry.user?.frame} size={30} /><div>{entry.user ? <NameEffectRenderer effect={entry.user.nameEffect}><Link to={`/profile/${encodeURIComponent(entry.user.username)}`}>{entry.user.username}</Link></NameEffectRenderer> : <span>Deleted account</span>}<small>Lv. {entry.user?.level || '—'}{entry.isMe && ' · You'}</small></div></div></td>
          <td className="ev-table-score">{entry.score}<small> / {event.totalPoints}</small></td><td>{entry.correctCount} / {event.questionCount}</td><td>{entry.answeredCount} / {event.questionCount}</td><td className="ev-mono">{entry.answeredCount || entry.status === 'submitted' ? eventTime(entry.elapsedSeconds) : '—'}</td><td><span className={`ev-entry-status ev-entry-status--${entry.status}`}>{entry.status}</span></td>
        </tr>)}
        {!data.entries.length && <tr><td colSpan={7} className="ev-table-empty">No participants entered this competition.</td></tr>}
      </tbody></table></div>
      <div className="ev-pagination"><span>{data.total} participants</span>{data.totalPages > 1 && <div><button className="ev-button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>{page} / {data.totalPages}</span><button className="ev-button" disabled={page >= data.totalPages} onClick={() => setPage(value => value + 1)}>Next</button></div>}</div>
    </>}
  </section>;
}
