import { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Circle, FlaskConical, Globe, Layers, ListFilter, Network, Radio, Router, Search, Server, Shield, Target, X, Zap } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import LoginRequired from './LoginRequired';
import NetworkLabLoading from './NetworkLabLoading';
import { networkRequest } from '../services/networkProblems';
import { filterNetworkProblems, recommendedNetworkProblem } from '../utils/networkProblemCatalog';
import '../styles/NetworkProblemCatalog.css';
import { NetworkCourseCard } from '../pages/NetworkCourse';

const PAGE_SIZE = 8;
const initialFilters = { search: '', status: 'all', difficulty: 'all', topic: 'all', sort: 'recommended' };
const difficulties = ['easy', 'medium', 'hard'];

function topicIcon(problem) {
  const text = `${problem.title} ${(problem.tags || []).join(' ')}`.toLowerCase();
  if (/dns|http|web/.test(text)) return Globe;
  if (/dhcp|server/.test(text)) return Server;
  if (/firewall|security|acl/.test(text)) return Shield;
  if (/wireless|wifi|wi-fi/.test(text)) return Radio;
  if (/rout|gateway/.test(text)) return Router;
  return Network;
}

function Difficulty({ value }) {
  return <span className={`nlp-difficulty ${value}`}><span className="npc-level" aria-hidden="true">{[0, 1, 2].map(index => <i key={index} className={index <= difficulties.indexOf(value) ? 'is-filled' : ''} />)}</span>{value}</span>;
}

function LabCard({ problem, number, featured = false }) {
  const Icon = topicIcon(problem);
  return <Link to={`/network-lab/problems/${problem._id}`} className={`npc-lab${featured ? ' npc-lab-featured' : ''}${problem.solved ? ' is-solved' : ''}`}>
    <div className="npc-lab-top">
      <span className="npc-lab-index"><Icon size={16} /> LAB {String(number).padStart(2, '0')}</span>
      <div className="npc-lab-badges">{!problem.published && <span className="nlp-badge">Draft</span>}<Difficulty value={problem.difficulty} /></div>
    </div>
    <div className="npc-lab-body">
      <div className="npc-lab-copy">
        {featured && <span className="npc-featured-label"><span />RECOMMENDED NEXT</span>}
        <h3>{problem.title}</h3>
        <p>{problem.summary}</p>
        <div className="npc-lab-topics">{(problem.tags || []).map(tag => <span key={tag}>{tag}</span>)}</div>
      </div>
      {featured && <div className="npc-network-art" aria-hidden="true">
        <svg viewBox="0 0 240 150" fill="none"><path d="M35 105V75H120V35M120 75H205V105" /><circle cx="120" cy="75" r="4" /><circle cx="35" cy="105" r="3" /><circle cx="205" cy="105" r="3" /></svg>
        <span className="npc-art-node npc-art-router"><Router size={25} /></span><span className="npc-art-node npc-art-left"><Server size={23} /></span><span className="npc-art-node npc-art-right"><Globe size={23} /></span>
      </div>}
    </div>
    <div className="npc-lab-bottom">
      <div className="npc-lab-meta"><span><Target size={14} />{problem.objectiveCount} objectives</span><span className="npc-xp"><Zap size={14} />{problem.xp} XP</span></div>
      <span className="npc-lab-action">{problem.solved ? <><CheckCircle2 size={14} />Review lab</> : <>Start lab<ArrowRight size={15} /></>}</span>
    </div>
  </Link>;
}

export default function NetworkProblemCatalog() {
  const { user } = useContext(AuthContext);
  const userKey = user?.id || user?._id || user?.username;
  const [data, setData] = useState({ owner: null, problems: [], loading: true, error: '' });
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const toolbar = useRef(null);

  useEffect(() => {
    if (!userKey) return;
    const controller = new AbortController();
    setData({ owner: userKey, problems: [], loading: true, error: '' });
    setPage(1);
    networkRequest('', { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setData({ owner: userKey, problems: result.problems, loading: false, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setData({ owner: userKey, problems: [], loading: false, error: error.message });
    });
    return () => controller.abort();
  }, [userKey, retry]);

  if (!user) return <LoginRequired icon={Network} title="Network Lab problems" description="Sign in to solve practical networking problems and save your progress." />;
  if (data.loading || data.owner !== userKey) return <NetworkLabLoading view="catalog" />;

  const problems = data.problems;
  const published = problems.filter(problem => problem.published);
  const completed = published.filter(problem => problem.solved).length;
  const percent = published.length ? Math.round(completed / published.length * 100) : 0;
  const xp = published.filter(problem => !problem.solved).reduce((sum, problem) => sum + problem.xp, 0);
  const topics = [...new Set(problems.flatMap(problem => problem.tags || []))].sort((a, b) => a.localeCompare(b));
  const activeCount = Number(filters.status !== 'all') + Number(filters.difficulty !== 'all') + Number(filters.topic !== 'all');
  const visible = filterNetworkProblems(problems, filters);
  const recommended = !filters.search.trim() && !activeCount && filters.sort === 'recommended' ? recommendedNetworkProblem(problems) : null;
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const pageNumbers = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount])].filter(value => value > 0 && value <= pageCount).sort((a, b) => a - b);
  const changeFilter = (key, value) => { setFilters(previous => ({ ...previous, [key]: value })); setPage(1); };
  const clearFilters = () => { setFilters(initialFilters); setPage(1); };
  const changePage = value => { setPage(value); toolbar.current?.scrollIntoView({ block: 'start', behavior: 'auto' }); };

  return <div className="nlp-page npc-page">
    <header className="npc-header">
      <div><h1>Practice networking<span>.</span></h1><p>Build a network. Find the fault. Make it work.</p></div>
      <Link className="npc-sandbox" to="/network-lab"><FlaskConical size={17} /><span>Open sandbox</span><ArrowUpRight size={15} /></Link>
    </header>

    {!data.error && <section className="npc-progress" aria-label="Your lab progress">
      <span className="npc-progress-icon"><CheckCircle2 size={19} /></span>
      <div className="npc-progress-label"><strong>{completed}<span> / {published.length}</span></strong><span>labs completed</span></div>
      <div className="npc-progress-bar"><progress value={completed} max={published.length || 1} aria-label="Completed labs" /><span>{percent}%</span></div>
      <span className="npc-progress-xp"><Zap size={15} /><strong>{xp.toLocaleString()}</strong> XP to earn</span>
    </section>}

    <div className="npc-layout">
      <aside className={`npc-sidebar${filtersOpen ? ' is-open' : ''}`} aria-label="Problem filters">
        <div className="npc-sidebar-top"><span><ListFilter size={15} />Filters{activeCount > 0 && <b>{activeCount}</b>}</span><button type="button" onClick={clearFilters} disabled={!activeCount && !filters.search && filters.sort === 'recommended'}>Reset</button></div>
        <div id="npc-filter-content" className="npc-filter-content">
          <fieldset><legend>YOUR LABS</legend>{[['all', 'All problems', Layers], ['unsolved', 'To do', Circle], ['solved', 'Completed', CheckCircle2]].map(([value, label, Icon]) => <button type="button" key={value} className="npc-status-option" aria-pressed={filters.status === value} onClick={() => changeFilter('status', value)}><Icon size={15} /><span>{label}</span><b>{problems.filter(problem => value === 'all' || (value === 'solved' ? problem.solved : !problem.solved)).length}</b></button>)}</fieldset>
          <fieldset><legend>DIFFICULTY</legend>{[['all', 'All difficulties'], ...difficulties.map(value => [value, value])].map(([value, label]) => <label className="npc-radio-option" key={value}><input type="radio" name="lab-difficulty" value={value} checked={filters.difficulty === value} onChange={() => changeFilter('difficulty', value)} /><span>{label}</span><small>{problems.filter(problem => value === 'all' || problem.difficulty === value).length}</small></label>)}</fieldset>
          {topics.length > 0 && <fieldset><legend>TOPICS</legend><div className="npc-topic-options">{['all', ...topics].map(topic => <button type="button" key={topic} aria-pressed={filters.topic === topic} onClick={() => changeFilter('topic', topic)}>{filters.topic === topic && <Check size={11} />}{topic === 'all' ? 'All topics' : topic}</button>)}</div></fieldset>}
          <div className="npc-sidebar-note"><FlaskConical size={17} /><p>Want to experiment?<Link to="/network-lab">Build your own network<ArrowUpRight size={12} /></Link></p></div>
        </div>
      </aside>

      <main className="npc-main" aria-label="Network practice catalog">
        <div ref={toolbar} className="npc-toolbar">
          <label className="npc-search"><Search size={17} /><input aria-label="Search problems" placeholder="Search labs or topics…" value={filters.search} onChange={event => changeFilter('search', event.target.value)} />{filters.search && <button type="button" aria-label="Clear search" onClick={() => changeFilter('search', '')}><X size={14} /></button>}</label>
          <label className="npc-sort"><span>Sort by</span><select aria-label="Sort problems" value={filters.sort} onChange={event => changeFilter('sort', event.target.value)}><option value="recommended">Recommended</option><option value="difficulty">Difficulty</option><option value="xp">Highest XP</option></select><ChevronDown size={13} /></label>
          <button type="button" className="npc-mobile-filters" aria-expanded={filtersOpen} aria-controls="npc-filter-content" onClick={() => setFiltersOpen(previous => !previous)}><ListFilter size={15} />Filters{activeCount > 0 && <b>{activeCount}</b>}<ChevronDown size={13} /></button>
        </div>

        {data.error ? <div className="npc-empty" role="alert"><Network size={28} /><h2>Unable to load labs</h2><p>{data.error}</p><button type="button" className="nlp-button" onClick={() => setRetry(previous => previous + 1)}>Try again</button></div> : <>
          {currentPage === 1 && <div className={`npc-learning-row${recommended ? '' : ' nc-course-only'}`}>{recommended && <section className="npc-recommended" aria-label="Recommended next lab"><LabCard problem={recommended} number={problems.indexOf(recommended) + 1} featured /></section>}<NetworkCourseCard /></div>}
          <div className="npc-results-heading"><div><h2>{activeCount || filters.search.trim() ? 'Matching labs' : 'Explore the labs'}</h2><span aria-live="polite">{visible.length} {visible.length === 1 ? 'lab' : 'labs'}</span></div>{activeCount > 0 && <button type="button" onClick={clearFilters}>Clear filters<X size={12} /></button>}</div>
          {!visible.length ? <div className="npc-empty"><Search size={28} /><h2>{problems.length ? 'No labs found' : 'New challenges are on the way'}</h2><p>{problems.length ? 'Try a different topic or broaden your search.' : 'Your networking practice starts here. Check back for new labs.'}</p>{problems.length > 0 && <button type="button" className="nlp-button" onClick={clearFilters}>Reset filters</button>}</div> : <div className="npc-grid">{visible.slice(offset, offset + PAGE_SIZE).map(problem => <LabCard key={problem._id} problem={problem} number={problems.indexOf(problem) + 1} />)}</div>}
          {visible.length > 0 && <div className="nlp-pagination npc-pagination"><span className="nlp-pagination-summary" role="status">Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, visible.length)} of {visible.length}</span>{pageCount > 1 && <nav aria-label="Network problems pages"><button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page"><ChevronLeft size={15} /></button>{pageNumbers.map((number, index) => <span className="nlp-page-number-group" key={number}>{index > 0 && number - pageNumbers[index - 1] > 1 && <span className="nlp-page-ellipsis">…</span>}<button type="button" aria-label={`Page ${number}`} aria-current={currentPage === number ? 'page' : undefined} onClick={() => changePage(number)}>{number}</button></span>)}<button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage === pageCount} aria-label="Next page"><ChevronRight size={15} /></button></nav>}</div>}
        </>}
      </main>
    </div>
  </div>;
}
