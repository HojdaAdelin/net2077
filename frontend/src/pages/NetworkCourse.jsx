import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowDown, BookOpen, Check, CheckCircle2, Circle, Compass, Minus, Plus, Target, Trophy, Zap } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import LoginRequired from '../components/LoginRequired';
import NetworkCourseScreenNotice from '../components/NetworkCourseScreenNotice';
import { NetworkWorkspace } from './NetworkLab';
import { networkRequest } from '../services/networkProblems';
import { courseChapters, courseLessons, courseStarter, COURSE_COMPLETION_XP } from '../../../backend/network/networkCourse';
import '../styles/NetworkCourse.css';

export function NetworkCourseCard() {
  const { user, updateUser } = useContext(AuthContext);
  const [progress, setProgress] = useState(null);
  useEffect(() => { let active = true; setProgress(null); networkRequest('/course/progress').then(data => { if (active) { setProgress(data); if (data.reward?.xpGained > 0) updateUser({ xp: data.reward.xp, level: data.reward.level }); } }).catch(() => {}); return () => { active = false; }; }, [user?.id, user?._id, user?.username]);
  const done = courseLessons.filter(l => progress?.completed.includes(l.id)).length;
  const next = courseLessons.find(l => !progress?.completed.includes(l.id)) || courseLessons[0];
  return <Link to={`/network-lab/course?lesson=${next.id}`} className="nc-course-card">
    <span className="nc-card-kicker"><BookOpen size={15} />GUIDED COURSE</span>
    <h3>Understand it.<br />Then build it.</h3><p>Networking, one working connection at a time.</p>
    <span className="nc-course-reward"><Zap size={13} />{COURSE_COMPLETION_XP} XP {progress?.reward?.rewardClaimed ? 'earned' : 'on completion'}</span>
    <div className="nc-card-progress"><span>{progress ? `${done} / ${courseLessons.length} lessons` : `${courseLessons.length} practical lessons`}</span><span>{progress ? `${Math.round(done / courseLessons.length * 100)}%` : 'Start here'}</span></div>
    <progress aria-label="Course completion" value={done} max={courseLessons.length} />
    <span className="nc-card-action">{done ? 'Continue course' : 'Start learning'}<ArrowRight size={15} /></span>
  </Link>;
}

function Lesson({ lesson, initialTopology, completed, onCompleted, onSnapshot, onChooseLesson, next }) {
  const checkpointRef = useRef(null);
  const topology = useRef(initialTopology || courseStarter());
  const [version, setVersion] = useState(0), [guide, setGuide] = useState(0), [guideDone, setGuideDone] = useState(false);
  const [answer, setAnswer] = useState(null), [result, setResult] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const dirty = useRef(false);
  useEffect(() => () => { if (dirty.current) networkRequest(`/course/${lesson.id}`, { method: 'PUT', body: { topology: topology.current } }).catch(() => {}); }, [lesson.id]);
  const position = courseLessons.findIndex(l => l.id === lesson.id);
  const correctPosition = position % 3;
  const options = lesson.options.map((_, i) => lesson.options[(i - correctPosition + 3) % 3]);
  useEffect(() => {
    if (!version) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      networkRequest(`/course/${lesson.id}`, { method: 'PUT', body: { topology: topology.current }, signal: controller.signal }).catch(e => { if (!controller.signal.aborted) setError(`Workspace not saved: ${e.message}`); });
    }, 1100);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [version, lesson.id]);
  const check = async () => {
    setBusy(true); setError('');
    try {
      const data = await networkRequest(`/course/${lesson.id}`, { method: 'PUT', body: { topology: topology.current, answer, finish: true } });
      setResult(data); onCompleted(data.completed, data.reward);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const objectiveComplete = completed || result?.passed === true;
  const goToCheckpoint = () => { checkpointRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); checkpointRef.current?.querySelector('input')?.focus({ preventScroll: true }); };
  return <>
    <header className="nc-lesson-header"><div><span className="nc-kicker">CHAPTER {lesson.chapter + 1} / LESSON {lesson.number}</span><h1>{lesson.title}<span>.</span></h1></div><span className="nc-lesson-state">{completed ? <><CheckCircle2 size={16} />Completed</> : <><Circle size={14} />In progress</>}</span></header>
    <div className="nc-brief"><section><span className="nc-kicker">THE IDEA</span><p>{lesson.theory}</p></section><section><span className="nc-kicker">IN YOUR SANDBOX</span><p>{lesson.task}</p><div className="nc-lesson-tools"><button type="button" className="nc-guide-button" onClick={() => setGuide(v => v + 1)}><Compass size={15} />Show me where<ArrowRight size={14} /></button><button type="button" className={`nc-object-button${objectiveComplete ? ' is-complete' : ''}`} onClick={goToCheckpoint} aria-controls="lesson-checkpoint" aria-label={`Objective: ${objectiveComplete ? 'completed, review checkpoint' : 'to do, go to checkpoint'}`}><span className="nc-object-icon" aria-hidden="true">{objectiveComplete ? <Check size={13} /> : <Target size={15} />}</span><span>Objective</span><span className="nc-object-state" role="status">{objectiveComplete ? 'Completed' : 'To do'}</span><ArrowDown size={13} aria-hidden="true" /></button></div></section></div>
    {lesson.id === 'workspace' && <div className="nc-first-guide"><Compass size={19} /><div><strong>Start with Quick Guide</strong><p>Find it in the sandbox’s Device panel, on the right. Click an empty part of the canvas if a device is selected. Finish the five-step tour, then add your first PC.</p></div><span>{guideDone ? <CheckCircle2 size={20} /> : <ArrowRight size={20} />}</span></div>}

    <div className="nc-workspace"><NetworkWorkspace initialTopology={topology.current} embedded courseLesson={lesson} guideRequest={guide} onGuideComplete={() => setGuideDone(true)} onTopologyChange={value => { if (value !== topology.current) { topology.current = value; dirty.current = true; onSnapshot(value); setVersion(v => v + 1); setResult(null); } }} /></div>
    <section ref={checkpointRef} id="lesson-checkpoint" className="nc-checkpoint" aria-labelledby="nc-checkpoint-heading"><div className="nc-checkpoint-title"><span className="nc-kicker">COMPLETE THIS TO FINISH THE LESSON</span><h2 id="nc-checkpoint-heading">Your required checkpoint</h2><p>Answer this question and check your sandbox configuration to complete the lesson.</p></div><fieldset disabled={busy}><legend>{lesson.question}</legend>{options.map((option, i) => <label key={option} className={answer === i ? 'is-selected' : ''}><input type="radio" name={`checkpoint-${lesson.id}`} checked={answer === i} onChange={() => { setAnswer(i); setResult(null); }} /><span>{option}</span></label>)}</fieldset>
      {result && <div className="nc-check-results" role="status">{[{ label: 'Knowledge checkpoint', passed: result.correct }, ...result.checks].map(item => <p key={item.label} className={item.passed ? 'is-passed' : ''}>{item.passed ? <CheckCircle2 size={16} /> : <Circle size={16} />}{item.label}</p>)}{!result.passed && <p>Review the unfinished checks above, adjust your workspace and try again.</p>}</div>}
      {error && <p role="alert">{error}</p>}
      <div className="nc-checkpoint-actions"><button className="nc-primary" disabled={busy || answer === null || (lesson.id === 'workspace' && !guideDone && !completed)} onClick={check}>{busy ? 'Checking…' : 'Check & complete lesson'}<Check size={16} /></button>{(completed || result?.passed) && (next ? <Link className="nc-next" onClick={onChooseLesson} to={`?lesson=${next.id}`}>Next lesson<ArrowRight size={16} /></Link> : <Link className="nc-next" to="/network-lab/problems">Put it into practice<ArrowRight size={16} /></Link>)}</div>
      {lesson.id === 'workspace' && !guideDone && !completed && <small className="nc-guide-reminder">Finish Quick Guide in the sandbox to unlock this checkpoint.</small>}
    </section>

  </>;
}

export default function NetworkCourse() {
  const { user, updateUser } = useContext(AuthContext);
  const userKey = user?.id || user?._id || user?.username;
  const [params] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const lessonHeadingRef = useRef(null);
  const chooseLesson = () => { setSidebarOpen(false); requestAnimationFrame(() => { lessonHeadingRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); lessonHeadingRef.current?.focus({ preventScroll: true }); }); };
  const [data, setData] = useState(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => { if (!userKey) return; const controller = new AbortController(); setData(null); setError(''); networkRequest('/course/progress', { signal: controller.signal }).then(value => { setData({ ...value, owner: userKey }); if (value.reward?.xpGained > 0) updateUser({ xp: value.reward.xp, level: value.reward.level }); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, [userKey, retry]);
  if (!user) return <LoginRequired icon={BookOpen} title="Networking course" description="Sign in to learn in the sandbox and save your course progress." />;
  if (error) return <div className="nc-page"><p role="alert">{error}</p><button onClick={() => setRetry(v => v + 1)}>Try again</button></div>;
  if (!data || data.owner !== userKey) return <div className="nc-page" role="status">Loading your course…</div>;
  const done = courseLessons.filter(l => data.completed.includes(l.id)).length;
  const lesson = courseLessons.find(l => l.id === params.get('lesson')) || courseLessons.find(l => !data.completed.includes(l.id)) || courseLessons[0];
  const next = courseLessons[courseLessons.indexOf(lesson) + 1];
  return <div className="nc-page"><NetworkCourseScreenNotice /><div className="nc-topbar"><Link to="/network-lab/problems"><ArrowLeft size={15} />Practice networking</Link><span>NETWORKING FOUNDATIONS</span><span>{done} / {courseLessons.length} lessons complete</span></div><button type="button" className={`nc-sidebar-toggle${sidebarOpen ? ' is-open' : ''}`} aria-label={sidebarOpen ? 'Hide course chapters' : 'Show course chapters'} title={sidebarOpen ? 'Hide chapters' : 'Show chapters'} aria-expanded={sidebarOpen} aria-controls="nc-course-sidebar" onClick={() => setSidebarOpen(open => !open)}>{sidebarOpen ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}</button><div className={`nc-layout${sidebarOpen ? '' : ' is-collapsed'}`}><aside id="nc-course-sidebar" className="nc-sidebar" inert={sidebarOpen ? undefined : ''}><div className="nc-course-title"><h2>From first link<br />to full network.</h2><p>A hands-on field guide</p><span className="nc-course-reward"><Zap size={13} />{COURSE_COMPLETION_XP} XP completion reward</span><progress value={done} max={courseLessons.length} aria-label="Overall course progress" /></div>{courseChapters.map((chapter, index) => {
    const lessons = courseLessons.filter(l => l.chapter === index), count = lessons.filter(l => data.completed.includes(l.id)).length;
    return <details key={chapter.title} open={lesson.chapter === index || undefined}><summary><span className="nc-chapter-expand" aria-hidden="true"><Plus size={14} className="nc-chapter-plus" /><Minus size={14} className="nc-chapter-minus" /></span><span className="nc-chapter-index">{String(index + 1).padStart(2, '0')}</span><span className="nc-chapter-label">{chapter.title}<progress value={count} max={lessons.length} aria-label={`${chapter.title} progress`} /><small>{count} / {lessons.length} complete</small></span></summary><nav aria-label={chapter.title}>{lessons.map(l => <Link key={l.id} onClick={chooseLesson} to={`?lesson=${l.id}`} aria-current={l.id === lesson.id ? 'page' : undefined}><span>{l.number}</span>{l.title}{data.completed.includes(l.id) && <Check size={13} />}</Link>)}</nav></details>;
  })}</aside><main ref={lessonHeadingRef} tabIndex={-1} className="nc-main">{data.reward?.rewardClaimed && <div className="nc-reward-earned" role="status"><Trophy size={22} /><div><strong>Course completed</strong><p>All {courseLessons.length} lessons finished. Your {COURSE_COMPLETION_XP} XP reward has been added to your account.</p></div><span>+{COURSE_COMPLETION_XP} XP</span></div>}<Lesson key={`${userKey}-${lesson.id}`} lesson={lesson} initialTopology={data.workspaces[lesson.id]} completed={data.completed.includes(lesson.id)} next={next} onChooseLesson={chooseLesson} onSnapshot={value => setData(old => ({ ...old, workspaces: { ...old.workspaces, [lesson.id]: value } }))} onCompleted={(completed, reward) => { setData(old => ({ ...old, completed, reward })); if (reward?.xpGained > 0) updateUser({ xp: reward.xp, level: reward.level }); }} /></main></div></div>;
}
