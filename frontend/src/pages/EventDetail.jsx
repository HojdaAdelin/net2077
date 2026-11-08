import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Pencil, Clock3, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { eventRequest } from '../services/events';
import { EventStatus, EventNotice, EventLeaderboard, eventDate, eventTime, useEventFeed } from '../components/EventUI';
import '../styles/Events.css';

export default function EventDetail() {
  const { id } = useParams(), { user } = useContext(AuthContext);
  const navigate = useNavigate(), { showConfirm } = useConfirm();
  const { data, error, loading, reload } = useEventFeed(`/${id}`, 10000, user?.username);
  const [joining, setJoining] = useState(false), [joinError, setJoinError] = useState(''), [now, setNow] = useState(Date.now());
  const [deleting, setDeleting] = useState(false), [deleteError, setDeleteError] = useState('');
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  // Anchor the server offset on each successful response, not on each timer tick.
  const [clockOffset, setClockOffset] = useState(0);
  useEffect(() => { if (data) setClockOffset(+new Date(data.serverNow) - Date.now()); }, [data]);
  if (loading) return <main className="ev-page"><div className="ev-loading" role="status">Loading event…</div></main>;
  if (!data) return <main className="ev-page"><Link to="/events" className="ev-text-link"><ArrowLeft size={15} />All events</Link><EventNotice error={error} retry={reload} /></main>;
  const event = data.event;
  const serverNow = now + clockOffset;
  const status = serverNow < +new Date(event.startsAt) ? 'upcoming' : serverNow < +new Date(event.endsAt) ? 'live' : 'ended';
  const joined = Boolean(data.participation);
  const join = async () => {
    setJoining(true); setJoinError('');
    try { await eventRequest(`/${id}/join`, { method: 'POST' }); reload(); }
    catch (error) { setJoinError(error.message); }
    finally { setJoining(false); }
  };
  const remove = async () => {
    if (deleting) return;
    setDeleting(true); setDeleteError('');
    try {
      if (!await showConfirm({ title: 'Delete this past event?', message: `“${event.title}” and all associated participation records, answers and results will be permanently deleted. Questions in the question bank will be kept.`, confirmText: 'Delete event', type: 'danger' })) return;
      await eventRequest(`/${id}`, { method: 'DELETE' });
      navigate('/events?past=1');
    } catch (error) { setDeleteError(error.message); }
    finally { setDeleting(false); }
  };
  return <main className="ev-page">
    <div className="ev-breadcrumb"><Link to="/events" className="ev-text-link"><ArrowLeft size={15} />All events</Link>{user?.role === 'root' && status === 'upcoming' && <Link to={`/events/${id}/edit`} className="ev-text-link"><Pencil size={14} />Edit event</Link>}{user?.role === 'root' && status === 'ended' && <button type="button" className="ev-text-link ev-delete-event" disabled={deleting} onClick={remove}><Trash2 size={14} />{deleting ? 'Deleting…' : 'Delete event'}</button>}</div>
    {deleteError && <EventNotice error={deleteError} />}
    <div className="ev-detail-hero">
      <div className="ev-detail-copy">
        <div className="ev-detail-labels"><EventStatus status={status} /><span className="ev-detail-level">{event.difficulty}</span></div>
        <h1>{event.title}</h1>
        <p className="ev-description">{event.description}</p>
        <dl className="ev-detail-facts">
          <div className="ev-detail-date"><dt>Start date & time</dt><dd>{eventDate(event.startsAt)}</dd></div>
          <div><dt>Duration</dt><dd>{event.durationMinutes} <span>minutes</span></dd></div>
          <div><dt>Questions</dt><dd>{event.questionCount}</dd></div>
          <div><dt>Participants</dt><dd>{event.participants}</dd></div>
          <div><dt>Total points</dt><dd>{event.totalPoints}</dd></div>
        </dl>
        <div className="ev-detail-organizer"><span>Organized by</span><strong>{event.organizer}</strong></div>
      </div>
      <aside className="ev-entry-panel"><span className="ev-eyebrow">{status === 'ended' ? 'COMPETITION CLOSED' : status === 'live' ? 'TIME LEFT' : 'THE COUNTDOWN'}</span><strong className="ev-countdown">{status === 'ended' ? 'Finished' : eventTime(((status === 'live' ? +new Date(event.endsAt) : +new Date(event.startsAt)) - serverNow) / 1000)}</strong><p><Clock3 size={14} />{status === 'ended' ? 'Ended' : status === 'live' ? 'Closes' : 'Starts'} {eventDate(status === 'upcoming' ? event.startsAt : event.endsAt)}</p>
        {joined ? (
          <>
            {status === 'upcoming' ? (
              <div className="ev-entry-confirmation"><Check size={17} />You’re on the starting list</div>
            ) : (
              <Link to={`/events/${id}/compete`} className="ev-button ev-button--primary">
                {status === 'ended' ? 'View your results' : 'Enter competition'}<ArrowRight size={16} />
              </Link>
            )}
            <small>{status === 'upcoming' ? 'The questions unlock when the event starts.' : status === 'live' ? 'You can change your answers until the timer ends. Results are published afterwards.' : 'The competition is complete. Your saved answers are final.'}</small>
          </>
        ) : status === 'ended' ? (
          <small>Registration is closed. Explore the final standings below.</small>
        ) : user ? (
          <>
            <button className="ev-button ev-button--primary" type="button" disabled={joining} onClick={join}>
              {joining ? 'Registering…' : 'Join competition'}<ArrowRight size={16} />
            </button>
            <small>One account, one entry. Registration is free.</small>
          </>
        ) : (
          <>
            <Link to="/login" className="ev-button ev-button--primary">Log in to join<ArrowRight size={16} /></Link>
            <small>Final standings will be public after the competition ends.</small>
          </>
        )}
        {joinError && <p className="ev-error" role="alert">{joinError}</p>}
      </aside>
    </div>
    {error && <EventNotice error={error} retry={reload} />}
    <div className="ev-rules"><span className="ev-eyebrow">COMPETITION RULES</span><p>Everyone competes in the same time window. Your answers are saved automatically and can be changed until the timer ends. The competition then finishes automatically. Scores, final standings and correct answers are revealed only after the event ends.</p></div>
    <EventLeaderboard key={id} event={{ ...event, status }} userKey={user?.username} />
  </main>;
}
