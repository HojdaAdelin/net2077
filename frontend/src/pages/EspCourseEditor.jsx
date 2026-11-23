import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';

const blockTypes = { text: 'Explanation', diagram: 'Diagram', code: 'Cod', check: 'Checkpoint', image: 'Image', link: 'Link' };
const newBlock = () => ({ type: 'text', title: '', content: '' });
const newLesson = () => ({ id: '', title: '', blocks: [newBlock()] });
const newModule = () => ({ title: '', lessons: [newLesson()] });
const newCourse = () => ({ slug: '', title: '', summary: '', cover: '', duration: 60, published: false, modules: [newModule()] });
const idPattern = '[a-z0-9]+(-[a-z0-9]+)*';

function ItemActions({ index, count, change, label }) {
  function move(offset) {
    change(items => {
      const [item] = items.splice(index, 1);
      items.splice(index + offset, 0, item);
    });
  }
  return <div className="esp-editor-actions">
    <button type="button" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => move(-1)}><ArrowUp size={16} /></button>
    <button type="button" aria-label={`Move ${label} down`} disabled={index + 1 === count} onClick={() => move(1)}><ArrowDown size={16} /></button>
    <button type="button" aria-label={`Remove ${label}`} disabled={count === 1} onClick={() => change(items => items.splice(index, 1))}><Trash2 size={16} /></button>
  </div>;
}

export default function EspCourseEditor({ slug, creating, request }) {
  const navigate = useNavigate();
  const { showConfirm } = useConfirm();
  const [list, setList] = useState(null);
  const [course, setCourse] = useState(creating ? newCourse : null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (creating) return;
    const controller = new AbortController();
    request(slug ? `/admin/${slug}` : '/admin', { signal: controller.signal }).then(
      slug ? setCourse : setList,
      err => { if (!controller.signal.aborted) setError(err.message); },
    );
    return () => controller.abort();
  }, [creating, request, slug]);

  function change(path, edit) {
    setCourse(previous => {
      const next = structuredClone(previous);
      edit(path.reduce((value, key) => value[key], next));
      return next;
    });
    setNotice('');
  }
  function field(path, key, value) {
    change(path, target => { target[key] = value; });
  }
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await request(creating ? '/admin' : `/admin/${slug}`, {
        method: creating ? 'POST' : 'PUT', body: JSON.stringify(course),
      });
      if (creating) navigate(`/esp32/admin/${saved.slug}`, { replace: true });
      else {
        setCourse(saved);
        setNotice('Course saved.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourse() {
    const confirmed = await showConfirm({
      title: 'Delete course?',
      message: `“${course.title}” and all saved lesson progress will be permanently deleted.`,
      confirmText: 'Delete course',
    });
    if (!confirmed) return;
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await request(`/admin/${slug}`, {
        method: 'DELETE', body: JSON.stringify({ courseId: course._id }),
      });
      navigate('/esp32/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return <section className="esp-editor">
    <div className="esp-crumb">
      <Link to={slug || creating ? '/esp32/admin' : '/esp32'}><ArrowLeft size={16} /> {slug || creating ? 'Manage courses' : 'ESP32 catalog'}</Link>
      {course && !creating && <button type="button" className="esp-button esp-danger" onClick={deleteCourse} disabled={saving || deleting}>
        <Trash2 size={16} /> {deleting ? 'Deleting…' : 'Delete course'}
      </button>}
    </div>
    <h1>{creating ? 'New course' : slug ? 'Edit course' : 'Manage courses'}</h1>
    {error && !course && <p role="alert">{error}</p>}
    {!slug && !creating && <>
      <Link className="esp-button" to="/esp32/admin/courses/new"><Plus size={16} /> Add course</Link>
      {list && <ul className="esp-editor-list">{list.map(item => <li key={item.slug}>
        <Link to={`/esp32/admin/${item.slug}`}>{item.title}</Link><span>{item.published ? 'Published' : 'Draft'}</span>
      </li>)}</ul>}
    </>}
    {!course && !list && !error && <p role="status">Loading…</p>}
    {course && <form onSubmit={save}>
      <fieldset disabled={saving || deleting} className="esp-editor-form">
        <div className="esp-editor-grid">
          <label>Title<input required maxLength={150} value={course.title} onChange={e => field([], 'title', e.target.value)} /></label>
          <label>URL slug<input required maxLength={80} pattern={idPattern} readOnly={!creating} value={course.slug} onChange={e => field([], 'slug', e.target.value)} /></label>
          <label>Cover image<input required placeholder="/esp32/cover.webp or https://…" value={course.cover} onChange={e => field([], 'cover', e.target.value)} /></label>
          <label>Estimated duration (minutes)<input required type="number" min="1" max="9999" value={course.duration} onChange={e => field([], 'duration', e.target.value)} /></label>
        </div>
        <label>Description<textarea required maxLength={500} value={course.summary} onChange={e => field([], 'summary', e.target.value)} /></label>
        <label className="esp-publish"><input type="checkbox" checked={course.published} onChange={e => field([], 'published', e.target.checked)} /> Publish in catalog</label>
        {course.modules.map((module, m) => {
          const modulePath = ['modules', m];
          return <details className="esp-editor-module" key={m} open>
            <summary>Module {m + 1} · {module.title || 'Untitled'}</summary>
            <ItemActions index={m} count={course.modules.length} change={edit => change(['modules'], edit)} label="module" />
            <label>Module title<input required maxLength={150} value={module.title} onChange={e => field(modulePath, 'title', e.target.value)} /></label>
            {module.lessons.map((lesson, l) => {
              const lessonsPath = [...modulePath, 'lessons'];
              const lessonPath = [...lessonsPath, l];
              const blocksPath = [...lessonPath, 'blocks'];
              return <section className="esp-editor-lesson" key={l}>
                <h2>Lesson {l + 1}</h2>
                <ItemActions index={l} count={module.lessons.length} change={edit => change(lessonsPath, edit)} label="lesson" />
                <div className="esp-editor-grid">
                  <label>Lesson title<input required maxLength={150} value={lesson.title} onChange={e => field(lessonPath, 'title', e.target.value)} /></label>
                  <label>Lesson ID (keep stable to preserve progress)<input required maxLength={80} pattern={idPattern} value={lesson.id} onChange={e => field(lessonPath, 'id', e.target.value)} /></label>
                </div>
                {lesson.blocks.map((block, b) => {
                  const path = [...blocksPath, b];
                  return <div className="esp-editor-block" key={b}>
                    <ItemActions index={b} count={lesson.blocks.length} change={edit => change(blocksPath, edit)} label="block" />
                    <div className="esp-editor-grid">
                      <label>Type<select value={block.type} onChange={e => field(path, 'type', e.target.value)}>
                        {Object.entries(blockTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select></label>
                      <label>Block title<input required maxLength={150} value={block.title} onChange={e => field(path, 'title', e.target.value)} /></label>
                    </div>
                    <label>{block.type === 'image' ? 'Image URL' : block.type === 'link' ? 'Link URL' : 'Content'}<textarea className={block.type === 'code' || block.type === 'diagram' ? 'esp-monospace' : undefined}
                      required rows={block.type === 'code' ? 8 : 3} maxLength={16000} value={block.content} onChange={e => field(path, 'content', e.target.value)} /></label>
                  </div>;
                })}
                <button type="button" className="esp-button esp-secondary" onClick={() => change(blocksPath, items => items.push(newBlock()))}><Plus size={16} /> Block</button>
              </section>;
            })}
            <button type="button" className="esp-button esp-secondary" onClick={() => change([...modulePath, 'lessons'], items => items.push(newLesson()))}><Plus size={16} /> Lesson</button>
          </details>;
        })}
        <div className="esp-editor-actions">
          <button type="button" className="esp-button esp-secondary" onClick={() => change(['modules'], items => items.push(newModule()))}><Plus size={16} /> Module</button>
          <button type="submit" className="esp-button"><Save size={16} /> {saving ? 'Saving…' : 'Save course'}</button>
        </div>
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{error}</p>}
      </fieldset>
    </form>}
  </section>;
}
