import { useContext, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Plus, CalendarDays, Search } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { EventCard, EventNotice, useEventFeed } from '../components/EventUI';
import '../styles/Events.css';

export default function Events() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [past, setPast] = useState(() => searchParams.get('past') === '1'), [page, setPage] = useState(1);
  const [search, setSearch] = useState(''), [difficulty, setDifficulty] = useState('');
  const { data, loading, error, reload } = useEventFeed(`?past=${past ? 1 : 0}&page=${page}&q=${encodeURIComponent(search)}&difficulty=${difficulty}`, 15000, user?.username);
  const next = !past && !search && !difficulty ? data?.nextEvent : null;
  return <main className="ev-page ev-events">
    <header className="ev-page-header"><div><h1>Events<span className="ev-heading-dot">.</span></h1><p>Acadnet simulations and community competitions.<br />Find your next event and explore the final standings.</p></div>{user?.role === 'root' ? <Link to="/events/new" className="ev-button ev-button--primary"><Plus size={17} />Organize an event</Link> : <Link to="/exam-selection" className="ev-text-link">Practice before you compete<ArrowUpRight size={16} /></Link>}</header>
    {next && <section className="ev-next" aria-label="Next event"><EventCard event={next} featured /></section>}
    <section aria-labelledby="ev-calendar-title">
      <div className="ev-calendar-toolbar"><div className="ev-tabs" aria-label="Event schedule"><button type="button" aria-pressed={!past} onClick={() => { setPast(false); setPage(1); }}>Live & upcoming</button><button type="button" aria-pressed={past} onClick={() => { setPast(true); setPage(1); }}>Past events</button></div><span className="ev-timezone">Times in {Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div>
      <div className="ev-filterbar"><label className="ev-search"><Search size={17} /><input aria-label="Search events" placeholder="Find a competition…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label><select aria-label="Filter event level" value={difficulty} onChange={event => { setDifficulty(event.target.value); setPage(1); }}><option value="">Every level</option>{['easy', 'normal', 'hard', 'unrated'].map(level => <option value={level} key={level}>{level[0].toUpperCase() + level.slice(1)}</option>)}</select></div>
      <div className="ev-section-heading ev-calendar-heading"><h2 id="ev-calendar-title">{past ? 'The archive' : 'Competition calendar'}</h2><span>{data?.total || 0} events</span></div>
      {error && <EventNotice error={error} retry={reload} />}
      {loading ? <div className="ev-loading" role="status">Loading the calendar…</div> : data?.events.length ? <div className="ev-event-grid">{data.events.map(event => <EventCard key={event._id} event={event} />)}</div> : !error && <div className="ev-empty"><CalendarDays size={32} strokeWidth={1.3} /><h3>{search || difficulty ? 'No matching competitions' : past ? 'History starts with the first event.' : 'The next challenge is on its way.'}</h3><p>{search || difficulty ? 'Try another title or level.' : past ? 'Completed competitions and their final standings will appear here.' : 'Scheduled competitions will appear here. Until then, keep practicing.'}</p>{user?.role === 'root' && <Link to="/events/new" className="ev-text-link">Create the first event<Plus size={15} /></Link>}</div>}
      {data?.totalPages > 1 && <div className="ev-pagination"><span>Page {page} of {data.totalPages}</span><div><button className="ev-button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><button className="ev-button" disabled={page >= data.totalPages} onClick={() => setPage(value => value + 1)}>Next</button></div></div>}
    </section>
  </main>;
}
