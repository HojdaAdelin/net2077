import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import * as api from '../services/api';
import * as LucideIcons from 'lucide-react';
import {
  ChevronRight, Plus, Trash2, Pencil, BookOpen,
  ChevronDown, ChevronUp, GraduationCap, X, Check
} from 'lucide-react';
import '../styles/RoadmapDetail.css';

function RoadmapIcon({ name, size = 20 }) {
  const Icon = LucideIcons[name];
  if (!Icon) return <BookOpen size={size} />;
  return <Icon size={size} />;
}

function ProgressBar({ percent }) {
  return (
    <div className="rd-progress-bar">
      <div className="rd-progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function RoadmapDetail() {
  const { roadmapId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const isRoot = user?.role === 'root';

  useEffect(() => {
    if (!user) navigate('/learn', { replace: true });
  }, [user]);

  const [roadmap, setRoadmap] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState({}); // chapterId -> []
  const [expanded, setExpanded] = useState({});
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  // edit states
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [addingChapter, setAddingChapter] = useState(false);
  const [editChapter, setEditChapter] = useState(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [addingLessonFor, setAddingLessonFor] = useState(null);

  useEffect(() => {
    loadAll();
  }, [roadmapId]);

  const loadAll = async () => {
    try {
      const [roadmaps, chs, prog] = await Promise.all([
        api.getRoadmaps(),
        api.getChapters(roadmapId),
        api.getRoadmapProgress(roadmapId),
      ]);
      const rm = roadmaps.find(r => r._id === roadmapId);
      setRoadmap(rm);
      setChapters(chs);
      setProgress(prog);
      // expand first chapter by default
      if (chs.length > 0) {
        setExpanded({ [chs[0]._id]: true });
        const lMap = {};
        for (const ch of chs) {
          const ls = await api.getLessons(ch._id);
          lMap[ch._id] = ls;
        }
        setLessons(lMap);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleChapter = async (chId) => {
    const next = !expanded[chId];
    setExpanded(prev => ({ ...prev, [chId]: next }));
    if (next && !lessons[chId]) {
      const ls = await api.getLessons(chId);
      setLessons(prev => ({ ...prev, [chId]: ls }));
    }
  };

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim()) return;
    const ch = await api.createChapter(roadmapId, newChapterTitle.trim());
    setChapters(prev => [...prev, ch]);
    setLessons(prev => ({ ...prev, [ch._id]: [] }));
    setNewChapterTitle('');
    setAddingChapter(false);
  };

  const handleDeleteChapter = async (chId) => {
    if (!window.confirm('Delete this chapter and all its lessons?')) return;
    await api.deleteChapter(chId);
    setChapters(prev => prev.filter(c => c._id !== chId));
    setLessons(prev => { const n = { ...prev }; delete n[chId]; return n; });
  };

  const handleRenameChapter = async (ch) => {
    if (!editChapter?.title?.trim()) return;
    const updated = await api.updateChapter(ch._id, { title: editChapter.title });
    setChapters(prev => prev.map(c => c._id === ch._id ? updated : c));
    setEditChapter(null);
  };

  const handleAddLesson = async (chId) => {
    if (!newLessonTitle.trim()) return;
    const ls = await api.createLesson(chId, newLessonTitle.trim(), roadmapId);
    setLessons(prev => ({ ...prev, [chId]: [...(prev[chId] || []), ls] }));
    setNewLessonTitle('');
    setAddingLessonFor(null);
  };

  const handleDeleteLesson = async (chId, lsId) => {
    if (!window.confirm('Delete this lesson?')) return;
    await api.deleteLesson(lsId);
    setLessons(prev => ({ ...prev, [chId]: prev[chId].filter(l => l._id !== lsId) }));
  };

  const getChapterProgress = (chId) => {
    if (!progress) return null;
    return progress.chapters?.find(c => String(c.chapterId) === String(chId));
  };

  if (loading) return (
    <div className="container rd-page">
      <div className="learn-loading"><div className="learn-spinner" /><p>Loading...</p></div>
    </div>
  );

  if (!roadmap) return (
    <div className="container rd-page">
      <p className="rd-not-found">Roadmap not found.</p>
    </div>
  );

  return (
    <div className="container rd-page">
      {/* Breadcrumb */}
      <div className="rd-breadcrumb">
        <Link to="/learn" className="rd-breadcrumb-link">Learn</Link>
        <ChevronRight size={14} />
        <span>{roadmap.title}</span>
      </div>

      {/* Header */}
      <div className="rd-header">
        <div className="rd-header-icon">
          <RoadmapIcon name={roadmap.icon} size={28} />
        </div>
        <div className="rd-header-info">
          <h1 className="rd-title">{roadmap.title}</h1>
          <p className="rd-desc">{roadmap.description}</p>
          {progress && progress.totalQuestions > 0 && (
            <div className="rd-overall-progress">
              <div className="rd-progress-label">
                <span>Overall Progress</span>
                <span className="rd-progress-pct">{progress.percent}%</span>
              </div>
              <ProgressBar percent={progress.percent} />
              <span className="rd-progress-sub">{progress.totalSolved} / {progress.totalQuestions} questions</span>
            </div>
          )}
        </div>
      </div>

      {/* Chapters */}
      <div className="rd-chapters">
        {chapters.map((ch, idx) => {
          const chProg = getChapterProgress(ch._id);
          const isOpen = !!expanded[ch._id];
          const chLessons = lessons[ch._id] || [];

          return (
            <div key={ch._id} className="rd-chapter">
              <div className="rd-chapter-header" onClick={() => toggleChapter(ch._id)}>
                <div className="rd-chapter-left">
                  <span className="rd-chapter-num">{idx + 1}</span>
                  {editChapter?._id === ch._id ? (
                    <input
                      className="rd-inline-input"
                      value={editChapter.title}
                      onClick={e => e.stopPropagation()}
                      onChange={e => setEditChapter({ ...editChapter, title: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameChapter(ch); if (e.key === 'Escape') setEditChapter(null); }}
                      autoFocus
                    />
                  ) : (
                    <span className="rd-chapter-title">{ch.title}</span>
                  )}
                </div>
                <div className="rd-chapter-right">
                  {chProg && chProg.total > 0 && (
                    <div className="rd-chapter-progress">
                      <ProgressBar percent={chProg.percent} />
                      <span className="rd-chapter-pct">{chProg.percent}%</span>
                    </div>
                  )}
                  {isRoot && (
                    <div className="rd-chapter-actions" onClick={e => e.stopPropagation()}>
                      <button className="rd-icon-btn" title="Rename" onClick={() => setEditChapter({ _id: ch._id, title: ch.title })}>
                        <Pencil size={14} />
                      </button>
                      <button className="rd-icon-btn rd-icon-btn-danger" title="Delete" onClick={() => handleDeleteChapter(ch._id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                  {isOpen ? <ChevronUp size={18} className="rd-chevron" /> : <ChevronDown size={18} className="rd-chevron" />}
                </div>
              </div>

              {isOpen && (
                <div className="rd-lessons">
                  {chLessons.map((ls, lIdx) => {
                    return (
                      <div key={ls._id} className="rd-lesson-row">
                        <button
                          className="rd-lesson-btn"
                          onClick={() => navigate(`/learn/lesson/${ls._id}`)}
                        >
                          <span className="rd-lesson-num">{idx + 1}.{lIdx + 1}</span>
                          <span className="rd-lesson-title">{ls.title}</span>
                          <ChevronRight size={16} className="rd-lesson-arrow" />
                        </button>
                        {isRoot && (
                          <div className="rd-lesson-actions">
                            <button className="rd-icon-btn rd-icon-btn-danger" title="Delete lesson" onClick={() => handleDeleteLesson(ch._id, ls._id)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isRoot && (
                    addingLessonFor === ch._id ? (
                      <div className="rd-add-row">
                        <input
                          className="rd-inline-input"
                          placeholder="Lesson title..."
                          value={newLessonTitle}
                          onChange={e => setNewLessonTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddLesson(ch._id); if (e.key === 'Escape') setAddingLessonFor(null); }}
                          autoFocus
                        />
                        <button className="rd-icon-btn rd-icon-btn-confirm" onClick={() => handleAddLesson(ch._id)}><Check size={14} /></button>
                        <button className="rd-icon-btn" onClick={() => setAddingLessonFor(null)}><X size={14} /></button>
                      </div>
                    ) : (
                      <button className="rd-add-lesson-btn" onClick={() => { setAddingLessonFor(ch._id); setNewLessonTitle(''); }}>
                        <Plus size={14} /> Add Lesson
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isRoot && (
          addingChapter ? (
            <div className="rd-add-chapter-row">
              <input
                className="rd-inline-input"
                placeholder="Chapter title..."
                value={newChapterTitle}
                onChange={e => setNewChapterTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddChapter(); if (e.key === 'Escape') setAddingChapter(false); }}
                autoFocus
              />
              <button className="rd-icon-btn rd-icon-btn-confirm" onClick={handleAddChapter}><Check size={14} /></button>
              <button className="rd-icon-btn" onClick={() => setAddingChapter(false)}><X size={14} /></button>
            </div>
          ) : (
            <button className="rd-add-chapter-btn" onClick={() => setAddingChapter(true)}>
              <Plus size={16} /> Add Chapter
            </button>
          )
        )}
      </div>
    </div>
  );
}
