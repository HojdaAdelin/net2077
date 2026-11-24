import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Clock3, Copy, Cpu, ListChecks, Pencil, Wifi } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { espCodeTokens } from '../utils/espCodeTokens';
import EspCourseEditor from './EspCourseEditor';
import '../styles/Esp32.css';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}/esp32${path}`, {
    credentials: 'include',
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (response.status === 204) return;
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message || (response.status === 404 ? 'This course is unavailable.' : 'The request could not be completed.'));
  return result;
}

function useEspData(path, account) {
  const [state, setState] = useState({});
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    request(path, { signal: controller.signal }).then(
      data => setState({ path, account, data }),
      error => { if (!controller.signal.aborted) setState({ path, account, error: error.message }); },
    );
    return () => controller.abort();
  }, [path, account]);
  return path && state.path === path && state.account === account ? state : {};
}

const courseUrl = (course, lesson) => `/esp32/${course.slug}${lesson ? `/${lesson.id}` : ''}`;
const lessonsOf = course => course.modules.flatMap(module => module.lessons);
const completedFor = (course, progress) => new Set(progress.filter(item => item.course === course._id).map(item => item.lesson));
const countCompleted = (lessons, done) => lessons.filter(lesson => done.has(lesson.id)).length;

function CourseProgress({ total, completed }) {
  return <div className="esp-progress">
    <span>{completed} / {total} lessons completed</span>
    <progress max={total} value={completed} aria-label="Course progress" />
  </div>;
}

function SkeletonLine({ width }) {
  return <span className="esp-skeleton esp-skeleton-line" style={{ width }} />;
}

function EspLoading({ reader }) {
  return <>
    <span className="esp-visually-hidden" role="status">{reader ? 'Loading lesson…' : 'Loading ESP32 courses…'}</span>
    <div aria-hidden="true">
      {reader ? <>
        <div className="esp-crumb"><SkeletonLine width="104px" /></div>
        <div className="esp-layout">
          <div className="esp-sidebar esp-skeleton-sidebar">
            <SkeletonLine width="72%" />
            <SkeletonLine width="55%" />
            <span className="esp-skeleton esp-skeleton-track" />
            <div className="esp-skeleton-outline">
              {[0, 1].map(group => <div className="esp-module" key={group}>
                <SkeletonLine width="65%" />
                <SkeletonLine width="86%" />
                <SkeletonLine width="74%" />
              </div>)}
            </div>
            <span className="esp-skeleton esp-skeleton-mobile-toc" />
          </div>
          <div className="esp-lesson">
            <header><SkeletonLine width="138px" /><span className="esp-skeleton esp-skeleton-title" /></header>
            <section className="esp-block esp-skeleton-paragraph">
              <SkeletonLine width="35%" />
              <SkeletonLine width="100%" />
              <SkeletonLine width="89%" />
              <SkeletonLine width="62%" />
            </section>
            <div className="esp-code esp-skeleton-code">
              <div><SkeletonLine width="110px" /><SkeletonLine width="52px" /></div>
              <section><SkeletonLine width="50%" /><SkeletonLine width="72%" /><SkeletonLine width="38%" /></section>
            </div>
          </div>
        </div>
      </> : <>
        <div className="esp-catalog-bar"><SkeletonLine width="112px" /></div>
        <div className="esp-cards">
          {[0, 1].map(card => <div className="esp-card" key={card}>
            <span className="esp-skeleton esp-skeleton-cover" />
            <div className="esp-card-body">
              <SkeletonLine width="120px" />
              <div className="esp-skeleton-paragraph"><SkeletonLine width="100%" /><SkeletonLine width="76%" /></div>
              <div className="esp-progress"><SkeletonLine width="124px" /><span className="esp-skeleton esp-skeleton-track" /></div>
              <span className="esp-skeleton esp-skeleton-button" />
            </div>
          </div>)}
        </div>
      </>}
    </div>
  </>;
}

function Catalog({ courses, progress, root }) {
  return <>
    <div className="esp-catalog-bar">
      <div className="esp-catalog-label">
        <h1>ESP32</h1>
        <span>{courses.length} {courses.length === 1 ? 'course' : 'courses'}</span>
      </div>
      {root && <Link className="esp-catalog-manage" to="/esp32/admin"><Pencil size={14} /> Manage courses</Link>}
    </div>
    {courses.length === 0 && <p>No courses have been published yet.</p>}
    <section className="esp-cards" aria-label="ESP32 courses">
      {courses.map(course => {
        const lessons = lessonsOf(course);
        const done = completedFor(course, progress);
        const completed = countCompleted(lessons, done);
        const next = lessons.find(lesson => !done.has(lesson.id)) || lessons[0];
        return <article className="esp-card" key={course._id}>
          <div className="esp-cover">
            <img src={course.cover} alt="" />
            <div className="esp-card-heading"><Cpu size={22} /><h2>{course.title}</h2></div>
          </div>
          <div className="esp-card-body">
            <div className="esp-meta"><span><BookOpen size={15} /> {lessons.length} lessons</span><span><Clock3 size={15} /> {course.duration} min</span></div>
            <p>{course.summary}</p>
            <CourseProgress total={lessons.length} completed={completed} />
            <Link className="esp-button" to={courseUrl(course, next)}>{completed === lessons.length ? 'Review course' : completed ? 'Continue course' : 'Start course'} <ArrowRight size={16} /></Link>
          </div>
        </article>;
      })}
    </section>
  </>;
}

function CodeBlock({ block }) {
  const [status, setStatus] = useState('');
  const resetTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  async function copy() {
    let copied = false;
    try {
      await navigator.clipboard.writeText(block.content);
      copied = true;
    } catch {
      const active = document.activeElement;
      const field = document.createElement('textarea');
      field.value = block.content;
      field.readOnly = true;
      field.tabIndex = -1;
      Object.assign(field.style, { position: 'fixed', top: '0', left: '0', opacity: '0', fontSize: '16px', pointerEvents: 'none' });
      document.body.append(field);
      try {
        field.select();
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      } finally {
        field.remove();
        active?.focus({ preventScroll: true });
      }
    }
    setStatus(copied ? 'Copied' : 'Copy failed');
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus(''), 2500);
  }
  return <section className="esp-code">
    <div><h2>{block.title}</h2><button type="button" onClick={copy}>
      {status === 'Copied' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span aria-live="polite">{status || 'Copy'}</span>
    </button></div>
    <pre><code>{espCodeTokens(block.content).map(({ text, type }, index) =>
      type ? <span key={index} className={`esp-token-${type}`}>{text}</span> : text,
    )}</code></pre>
  </section>;
}

function LessonBlock({ block }) {
  if (block.type === 'code') return <CodeBlock block={block} />;
  if (block.type === 'image' || block.type === 'link') {
    if (!/^(?:\/(?!\/)|https:\/\/)[^\s\\]+$/.test(block.content)) return null;
    if (block.type === 'link') return <p className="esp-resource"><a href={block.content} target="_blank" rel="noreferrer">{block.title}</a></p>;
    return <figure className="esp-figure"><img src={block.content} alt={block.title} /><figcaption>{block.title}</figcaption></figure>;
  }
  return <section className={`esp-block esp-block-${block.type}`}>
    <h2>{block.type === 'check' && <ListChecks size={19} />} {block.title}</h2>
    {block.type === 'diagram' ? <pre>{block.content}</pre> : <p>{block.content}</p>}
  </section>;
}

function CourseReader({ course, lessonId, done, user, root, complete }) {
  const lessons = lessonsOf(course);
  const index = lessonId ? lessons.findIndex(lesson => lesson.id === lessonId) : 0;
  const lesson = lessons[index];
  const [tocOpen, setTocOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [lesson?.id]);

  if (!lesson) return <><Link to="/esp32">All courses</Link><p>This lesson is unavailable.</p></>;
  const activeModule = course.modules.find(module => module.lessons.includes(lesson));
  async function markComplete() {
    setSaving(true);
    setError('');
    try {
      await complete(lesson);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  return <>
    <div className="esp-crumb"><Link to="/esp32"><ArrowLeft size={16} /> All courses</Link>
      {root && <Link to={`/esp32/admin/${course.slug}`}><Pencil size={15} /> Edit course</Link>}
    </div>
    <div className="esp-layout">
      <aside className="esp-sidebar">
        <div className="esp-sidebar-head"><Wifi size={22} /><strong>{course.title}</strong></div>
        <CourseProgress total={lessons.length} completed={countCompleted(lessons, done)} />
        <button className="esp-toc-toggle" type="button" aria-expanded={tocOpen} aria-controls="esp-toc" onClick={() => setTocOpen(!tocOpen)}>Course outline <ChevronDown size={17} /></button>
        <nav id="esp-toc" aria-label="Course outline" className={tocOpen ? 'esp-toc-open' : ''}>
          {course.modules.map((module, i) => <div className="esp-module" key={module.lessons[0].id}>
            <h2><span>{String(i + 1).padStart(2, '0')}</span> {module.title}</h2>
            {module.lessons.map(item => <Link key={item.id} to={courseUrl(course, item)}
              aria-current={item.id === lesson.id ? 'page' : undefined} onClick={() => setTocOpen(false)}>
              {done.has(item.id) ? <Check size={15} aria-label="Completed" /> : <BookOpen size={14} aria-hidden="true" />}{item.title}
            </Link>)}
          </div>)}
        </nav>
      </aside>
      <article className="esp-lesson">
        <header><div className="esp-kicker">{activeModule.title} <span>·</span> Lesson {index + 1} of {lessons.length}</div><h1>{lesson.title}</h1></header>
        {lesson.blocks.map((block, i) => <LessonBlock key={`${lesson.id}-${i}`} block={block} />)}
        <footer className="esp-lesson-footer">
          {user ? <button className="esp-button" type="button" onClick={markComplete} disabled={saving || done.has(lesson.id)}>
            <Check size={17} /> {done.has(lesson.id) ? 'Lesson completed' : saving ? 'Saving…' : 'Mark as complete'}
          </button> : <Link className="esp-button" to="/login">Sign in to save your progress</Link>}
          {error && <p role="alert">{error}</p>}
          <div className="esp-lesson-nav">
            {index > 0 && <Link to={courseUrl(course, lessons[index - 1])}><ArrowLeft size={16} /> Previous lesson</Link>}
            {index + 1 < lessons.length && <Link to={courseUrl(course, lessons[index + 1])}>Next lesson <ArrowRight size={16} /></Link>}
          </div>
        </footer>
      </article>
    </div>
  </>;
}

export default function Esp32({ admin = false, creating = false }) {
  const { slug, lessonId } = useParams();
  const { user } = useContext(AuthContext);
  const root = user?.role === 'root';
  const account = user?.id || user?._id || user?.username;
  const courseState = useEspData(admin ? null : slug ? `/${slug}` : '/');
  const progressState = useEspData(user && !admin ? '/progress' : null, account);
  const [local, setLocal] = useState({});
  const progress = [...(progressState.data || []), ...(local.account === account ? local.items || [] : [])];
  const course = courseState.data;
  const loadingProgress = user && !progressState.data && !progressState.error;
  async function complete(lesson) {
    await request(`/${slug}/lessons/${lesson.id}/complete`, { method: 'PUT' });
    setLocal(previous => ({ account, items: [...(previous.account === account ? previous.items : []), { course: course._id, lesson: lesson.id }] }));
  }

  return <main className="esp-page">
    {admin ? root ? <EspCourseEditor key={creating ? '/new' : slug || '/catalog'} slug={slug} creating={creating} request={request} /> :
      <p role="alert">The root role is required to manage courses.</p> :
      courseState.error ? <p role="alert">{courseState.error}</p> :
      !course || loadingProgress ? <EspLoading reader={Boolean(slug)} /> : <>
        {progressState.error && <p role="alert">Could not load your progress. {progressState.error}</p>}
        {slug ? <CourseReader key={course._id} course={course} lessonId={lessonId} user={user} root={root}
          done={completedFor(course, progress)} complete={complete} /> :
          <Catalog courses={course} progress={progress} root={root} />}
      </>}
  </main>;
}
