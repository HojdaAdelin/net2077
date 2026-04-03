import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import * as api from '../services/api';
import {
  ChevronRight, Plus, Trash2, GripVertical, Save,
  Lightbulb, AlertCircle, Info, Link as LinkIcon,
  CheckCircle, XCircle, Send, ChevronLeft, ChevronRight as ChevronRightIcon,
  Copy, Check as CheckIcon
} from 'lucide-react';
import '../styles/LessonView.css';

// ── Item type config ──────────────────────────────────────────────────────────
const ITEM_TYPES = [
  { type: 'header1', label: 'Header 1' },
  { type: 'header2', label: 'Header 2' },
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'note', label: 'Note' },
  { type: 'obs', label: 'Observation' },
  { type: 'tip', label: 'Tip' },
  { type: 'question', label: 'Question' },
  { type: 'link', label: 'Link' },
];

function newItem(type, order) {
  const base = { type, order, content: '', question: '', answer: '', label: '', url: '' };
  return base;
}

// ── Viewer components ─────────────────────────────────────────────────────────
function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    // fallback for non-HTTPS environments
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => fallbackCopy(code));
    } else {
      fallbackCopy(code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const fallbackCopy = (text) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  };
  return (
    <div className="lv-code-block-wrap">
      <button className="lv-copy-btn" onClick={handleCopy} title="Copy code">
        {copied ? <CheckIcon size={14} /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="lv-code-block"><code>{code}</code></pre>
    </div>
  );
}

function renderParagraph(content) {
  // Split by ```code blocks``` first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="lv-paragraph-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3);
          return <CodeBlock key={i} code={code} />;
        }
        // inline formatting: **bold**, *italic*, __underline__, `code`
        const html = part
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/__(.+?)__/g, '<u>$1</u>')
          .replace(/`(.+?)`/g, '<code class="lv-inline-code">$1</code>');
        return <p key={i} className="lv-paragraph" dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

function QuestionItem({ item, lessonId, solvedQuestions, onSolve, onXP }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [loading, setLoading] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const solved = solvedQuestions.includes(String(item._id));

  const handleSubmit = async () => {
    if (!answer.trim() || loading) return;
    setLoading(true);
    try {
      const res = await api.checkAnswer(lessonId, item._id, answer);
      setFeedback(res.correct ? 'correct' : 'wrong');
      if (res.correct) {
        onSolve(item._id);
        if (res.xpGained > 0) {
          setXpEarned(res.xpGained);
          onXP({ xp: res.newXP, level: res.newLevel });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`lv-question ${solved ? 'lv-question-solved' : ''}`}>
      <div className="lv-question-header">
        <p className="lv-question-text">{item.question}</p>
        {item.xp > 0 && (
          <span className="lv-question-xp-badge">{item.xp} XP</span>
        )}
      </div>
      {solved ? (
        <div className="lv-feedback lv-feedback-correct">
          <CheckCircle size={16} /> Already solved
          {xpEarned > 0 && <span className="lv-xp-earned">+{xpEarned} XP</span>}
        </div>
      ) : (
        <>
          <div className="lv-question-input-row">
            <input
              className="lv-question-input"
              placeholder="Your answer..."
              value={answer}
              onChange={e => { setAnswer(e.target.value); setFeedback(null); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              disabled={loading}
            />
            <button className="lv-send-btn" onClick={handleSubmit} disabled={loading || !answer.trim()}>
              <Send size={15} />
            </button>
          </div>
          {feedback && (
            <div className={`lv-feedback lv-feedback-${feedback}`}>
              {feedback === 'correct'
                ? <><CheckCircle size={15} /> Correct!{xpEarned > 0 && <span className="lv-xp-earned">+{xpEarned} XP</span>}</>
                : <><XCircle size={15} /> Not quite, try again.</>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ViewItem({ item, lessonId, solvedQuestions, onSolve, onXP }) {
  switch (item.type) {
    case 'header1': return <h2 className="lv-h1">{item.content}</h2>;
    case 'header2': return <h3 className="lv-h2">{item.content}</h3>;
    case 'paragraph': return renderParagraph(item.content);
    case 'note':
      return (
        <div className="lv-card lv-card-note">
          <Info size={16} className="lv-card-icon" />
          <div className="lv-card-body">{item.content}</div>
        </div>
      );
    case 'obs':
      return (
        <div className="lv-card lv-card-obs">
          <AlertCircle size={16} className="lv-card-icon" />
          <div className="lv-card-body">{item.content}</div>
        </div>
      );
    case 'tip':
      return (
        <div className="lv-card lv-card-tip">
          <Lightbulb size={16} className="lv-card-icon" />
          <div className="lv-card-body">{item.content}</div>
        </div>
      );
    case 'question':
      return <QuestionItem item={item} lessonId={lessonId} solvedQuestions={solvedQuestions} onSolve={onSolve} onXP={onXP} />;
    case 'link':
      return (
        <a className="lv-link" href={item.url} target="_blank" rel="noopener noreferrer">
          <LinkIcon size={15} />
          {item.label || item.url}
          <ChevronRightIcon size={14} />
        </a>
      );
    default: return null;
  }
}

// ── Editor item ───────────────────────────────────────────────────────────────
function EditorItem({ item, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className="le-item">
      <div className="le-item-drag">
        <button className="le-move-btn" onClick={onMoveUp} disabled={isFirst} title="Move up">▲</button>
        <GripVertical size={14} className="le-grip" />
        <button className="le-move-btn" onClick={onMoveDown} disabled={isLast} title="Move down">▼</button>
      </div>
      <div className="le-item-body">
        <div className="le-item-type-label">{ITEM_TYPES.find(t => t.type === item.type)?.label}</div>
        {['header1', 'header2', 'paragraph', 'note', 'obs', 'tip'].includes(item.type) && (
          item.type === 'paragraph' ? (
            <>
              <textarea
                className="le-input"
                rows={3}
                placeholder="Content... (**bold**, *italic*, __underline__)"
                value={item.content}
                onChange={e => onChange({ ...item, content: e.target.value })}
              />
            </>
          ) : (
            <input
              className="le-input"
              placeholder="Content..."
              value={item.content}
              onChange={e => onChange({ ...item, content: e.target.value })}
            />
          )
        )}
        {item.type === 'question' && (
          <>
            <input className="le-input" placeholder="Question (visible to user)" value={item.question} onChange={e => onChange({ ...item, question: e.target.value })} />
            <input className="le-input le-input-answer" placeholder="Correct answer (hidden from users)" value={item.answer} onChange={e => onChange({ ...item, answer: e.target.value })} />
            <input
              className="le-input le-input-xp"
              type="number"
              min="0"
              placeholder="XP reward (e.g. 10)"
              value={item.xp || ''}
              onChange={e => onChange({ ...item, xp: Number(e.target.value) || 0 })}
            />
          </>
        )}
        {item.type === 'link' && (
          <>
            <input className="le-input" placeholder="Label (e.g. Official Docs)" value={item.label} onChange={e => onChange({ ...item, label: e.target.value })} />
            <input className="le-input" placeholder="URL (https://...)" value={item.url} onChange={e => onChange({ ...item, url: e.target.value })} />
          </>
        )}
      </div>
      <button className="le-delete-btn" onClick={onDelete} title="Remove item">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LessonView() {
  const { lessonId } = useParams();
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const isRoot = user?.role === 'root';

  useEffect(() => {
    if (!user) navigate('/learn', { replace: true });
  }, [user]);

  const [lesson, setLesson] = useState(null);
  const [items, setItems] = useState([]);
  const [solvedQuestions, setSolvedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef(null);

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  useEffect(() => {
    const handler = (e) => { if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setShowAddMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadLesson = async () => {
    setLoading(true);
    try {
      const [ls, prog] = await Promise.all([
        api.getLesson(lessonId),
        api.getLessonProgress(lessonId),
      ]);
      setLesson(ls);
      setItems(ls.items || []);
      setSolvedQuestions(prog.solvedQuestions || []);
    } finally {
      setLoading(false);
    }
  };

  const enterEditMode = async () => {
    const ls = await api.getLessonForEdit(lessonId);
    setItems(ls.items || []);
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Strip temporary _id from new items before sending to backend
      const cleanItems = items.map(({ _id, ...rest }) => {
        if (typeof _id === 'string' && _id.startsWith('new_')) return rest;
        return { _id, ...rest };
      });
      const updated = await api.updateLesson(lessonId, { items: cleanItems });
      setLesson(updated);
      setItems(updated.items || []);
      setEditMode(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const addItem = (type) => {
    const order = items.length;
    setItems(prev => [...prev, { ...newItem(type, order), _id: `new_${Date.now()}` }]);
    setShowAddMenu(false);
  };

  const updateItem = (idx, updated) => {
    setItems(prev => prev.map((it, i) => i === idx ? updated : it));
  };

  const deleteItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const moveItem = (idx, dir) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next.map((it, i) => ({ ...it, order: i })));
  };

  const handleSolve = (itemId) => {
    setSolvedQuestions(prev => [...prev, String(itemId)]);
  };

  const handleXP = ({ xp, level }) => {
    if (xp !== undefined) updateUser({ xp, level });
  };

  const totalQ = items.filter(i => i.type === 'question').length;
  const solvedQ = items.filter(i => i.type === 'question' && solvedQuestions.includes(String(i._id))).length;
  const lessonPct = totalQ > 0 ? Math.round((solvedQ / totalQ) * 100) : null;

  if (loading) return (
    <div className="container lv-page">
      <div className="learn-loading"><div className="learn-spinner" /><p>Loading lesson...</p></div>
    </div>
  );

  if (!lesson) return (
    <div className="container lv-page"><p className="rd-not-found">Lesson not found.</p></div>
  );

  return (
    <div className="lv-layout">
      <div className="container lv-page">
        {/* Breadcrumb */}
        <div className="rd-breadcrumb">
          <Link to="/learn" className="rd-breadcrumb-link">Learn</Link>
          <ChevronRight size={14} />
          <Link to={`/learn/roadmap/${lesson.roadmapId}`} className="rd-breadcrumb-link">Roadmap</Link>
          <ChevronRight size={14} />
          <span>{lesson.title}</span>
        </div>

        {/* Lesson header */}
        <div className="lv-header">
          <div className="lv-header-left">
            <h1 className="lv-title">{lesson.title}</h1>
            {lessonPct !== null && (
              <div className="lv-lesson-progress">
                <div className="rd-progress-bar" style={{ width: 200 }}>
                  <div className="rd-progress-fill" style={{ width: `${lessonPct}%` }} />
                </div>
                <span className="rd-chapter-pct">{lessonPct}%</span>
                <span className="lv-progress-sub">{solvedQ}/{totalQ} questions</span>
              </div>
            )}
          </div>
          {isRoot && (
            <div className="lv-header-actions">
              {editMode ? (
                <>
                  <button className="btn btn-secondary" onClick={() => { setEditMode(false); setItems(lesson.items || []); }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    <Save size={15} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button className="btn btn-secondary lv-edit-btn" onClick={enterEditMode}>
                  <Pencil size={15} /> Edit Content
                </button>
              )}
              {saved && <span className="lv-saved-badge"><CheckCircle size={14} /> Saved</span>}
            </div>
          )}
        </div>

        {/* Content */}
        {editMode ? (
          <div className="le-editor">
            {items.map((item, idx) => (
              <EditorItem
                key={item._id || idx}
                item={item}
                onChange={(updated) => updateItem(idx, updated)}
                onDelete={() => deleteItem(idx)}
                onMoveUp={() => moveItem(idx, -1)}
                onMoveDown={() => moveItem(idx, 1)}
                isFirst={idx === 0}
                isLast={idx === items.length - 1}
              />
            ))}

            <div className="le-add-wrap" ref={addMenuRef}>
              <button className="le-add-btn" onClick={() => setShowAddMenu(v => !v)}>
                <Plus size={16} /> Add Item
              </button>
              {showAddMenu && (
                <div className="le-add-menu">
                  {ITEM_TYPES.map(t => (
                    <button key={t.type} className="le-add-menu-item" onClick={() => addItem(t.type)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lv-content">
            {items.length === 0 && (
              <div className="lv-empty">
                {isRoot ? 'No content yet. Click "Edit Content" to add items.' : 'No content available yet.'}
              </div>
            )}
            {items.map((item, idx) => (
              <ViewItem
                key={item._id || idx}
                item={item}
                lessonId={lessonId}
                solvedQuestions={solvedQuestions}
                onSolve={handleSolve}
                onXP={handleXP}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Pencil import fix
function Pencil({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
