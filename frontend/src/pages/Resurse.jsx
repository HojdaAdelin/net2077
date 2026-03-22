import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoadmaps, createRoadmap, updateRoadmap, deleteRoadmap } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import * as LucideIcons from 'lucide-react';
import LoginRequired from '../components/LoginRequired';  
import { Plus, X, Layers, BookOpen, Trash2, BookOpenText, EyeOff, Pencil, PencilLine } from 'lucide-react';
import '../styles/Resurse.css';

function RoadmapIcon({ name, size = 32 }) {
  const Icon = LucideIcons[name];
  if (!Icon) return <LucideIcons.BookOpen size={size} />;
  return <Icon size={size} />;
}

const EMPTY_FORM = {
  id: '',
  title: '',
  description: '',
  icon: 'BookOpen',
  chapters: '',
  lessons: '',
  type: 'free',
  visible: true,
};

export default function Resurse() {
  const { user } = useContext(AuthContext);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoadmap, setEditingRoadmap] = useState(null); // null = create, object = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isRoot = user?.role === 'root';
  const navigate = useNavigate();

  useEffect(() => {
    getRoadmaps(isRoot)
      .then(setRoadmaps)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isRoot]);

  if (!user) {
    return (
      <LoginRequired 
        icon={BookOpenText}
        title="Learn Required"
        description="Please login to learn quality informations and to develop yourself."
      />
    );
  }

  const handleOpen = () => {
    setEditingRoadmap(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const handleEdit = (roadmap) => {
    setEditingRoadmap(roadmap);
    setForm({
      id: roadmap.id,
      title: roadmap.title,
      description: roadmap.description,
      icon: roadmap.icon,
      chapters: roadmap.chapters,
      lessons: roadmap.lessons,
      type: roadmap.type,
      visible: roadmap.visible,
    });
    setError('');
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingRoadmap(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.description || !form.icon || form.chapters === '' || form.lessons === '') {
      setError('All fields are required.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingRoadmap) {
        const res = await updateRoadmap(editingRoadmap._id, form);
        if (res.roadmap) {
          setRoadmaps(prev => prev.map(r => r._id === editingRoadmap._id ? res.roadmap : r));
          handleClose();
        } else {
          setError(res.message || 'Failed to update roadmap.');
        }
      } else {
        if (!form.id) { setError('All fields are required.'); setSubmitting(false); return; }
        const res = await createRoadmap(form);
        if (res.roadmap) {
          setRoadmaps(prev => [res.roadmap, ...prev]);
          handleClose();
        } else {
          setError(res.message || 'Failed to create roadmap.');
        }
      }
    } catch {
      setError('Server error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (roadmap) => {
    if (!window.confirm(`Delete "${roadmap.title}"?`)) return;
    try {
      await deleteRoadmap(roadmap._id);
      setRoadmaps(prev => prev.filter(r => r._id !== roadmap._id));
    } catch {}
  };

  if (loading) {
    return (
      <div className="container resurse-page">
        <div className="learn-loading">
          <div className="learn-spinner"></div>
          <p>Loading learning paths...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container resurse-page">
      <div className="learn-hero">
        <div className="learn-hero-badge">
          <LucideIcons.Sparkles size={15} />
          <span>Start Your Journey</span>
        </div>
        <h1 className="learn-hero-title">Learning Paths</h1>
        <p className="learn-hero-subtitle">Structured roadmaps to take you from beginner to expert.</p>
        {isRoot && (
          <button className="btn btn-primary learn-add-btn" onClick={handleOpen}>
            <Plus size={18} />
            Add Roadmap
          </button>
        )}
      </div>

      {roadmaps.length > 0 ? (
        <div className="learn-grid">
          {roadmaps.map((roadmap) => (
            <div key={roadmap._id} className="learn-card">
              <div className="learn-card-icon-wrap">
                <RoadmapIcon name={roadmap.icon} size={28} />
              </div>
              <div className="learn-card-body">
                <div className="learn-card-top">
                  <h3 className="learn-card-title">{roadmap.title}</h3>
                  <div className="learn-card-badges">
                    {!roadmap.visible && isRoot && (
                      <span className="learn-badge learn-badge-hidden" title="Hidden from users">
                        <EyeOff size={11} /> Hidden
                      </span>
                    )}
                    <span className={`learn-badge ${roadmap.type === 'premium' ? 'learn-badge-premium' : 'learn-badge-free'}`}>
                      {roadmap.type === 'premium' ? 'Premium' : 'Free'}
                    </span>
                  </div>
                </div>
                <p className="learn-card-desc">{roadmap.description}</p>
                <div className="learn-card-meta">
                  <span className="learn-meta-item">
                    <Layers size={14} />
                    {roadmap.chapters} chapters
                  </span>
                  <span className="learn-meta-item">
                    <BookOpen size={14} />
                    {roadmap.lessons} lessons
                  </span>
                </div>
              </div>
              <div className="learn-card-actions">
                <button className="btn btn-primary learn-start-btn" onClick={() => navigate(`/learn/roadmap/${roadmap._id}`)}>Start Learning</button>
                {isRoot && (
                  <>
                    <button className="learn-edit-btn" title="Edit content (chapters & lessons)" onClick={() => navigate(`/learn/roadmap/${roadmap._id}`)}>
                      <PencilLine size={16} />
                    </button>
                    <button className="learn-edit-btn" onClick={() => handleEdit(roadmap)} title="Edit roadmap info">
                      <Pencil size={16} />
                    </button>
                    <button className="learn-delete-btn" onClick={() => handleDelete(roadmap)} title="Delete roadmap">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="learn-empty">
          <BookOpen size={40} />
          <p>No learning paths available yet.</p>
        </div>
      )}

      {showModal && (
        <div className="learn-modal-overlay" onClick={handleClose}>
          <div className="learn-modal" onClick={e => e.stopPropagation()}>
            <div className="learn-modal-header">
              <h2>{editingRoadmap ? 'Edit Roadmap' : 'Create Roadmap'}</h2>
              <button className="learn-modal-close" onClick={handleClose}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="learn-modal-form">
              <div className="learn-form-row">
                <label>ID <span className="learn-form-hint">(unique slug, e.g. linux-mastery)</span></label>
                <input name="id" value={form.id} onChange={handleChange} placeholder="linux-mastery" disabled={!!editingRoadmap} />
              </div>
              <div className="learn-form-row">
                <label>Title</label>
                <input name="title" value={form.title} onChange={handleChange} placeholder="Linux Mastery" />
              </div>
              <div className="learn-form-row">
                <label>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Short description..." rows={3} />
              </div>
              <div className="learn-form-row">
                <label>Icon <span className="learn-form-hint">(Lucide icon name, e.g. Terminal, Network, Shield)</span></label>
                <div className="learn-icon-preview-row">
                  <input name="icon" value={form.icon} onChange={handleChange} placeholder="BookOpen" />
                  <div className="learn-icon-preview">
                    <RoadmapIcon name={form.icon} size={22} />
                  </div>
                </div>
              </div>
              <div className="learn-form-cols">
                <div className="learn-form-row">
                  <label>Chapters</label>
                  <input name="chapters" type="number" min="0" value={form.chapters} onChange={handleChange} placeholder="6" />
                </div>
                <div className="learn-form-row">
                  <label>Lessons</label>
                  <input name="lessons" type="number" min="0" value={form.lessons} onChange={handleChange} placeholder="24" />
                </div>
              </div>
              <div className="learn-form-toggle-row">
                <label className="learn-toggle-label">
                  <span>Visibility</span>
                  <span className="learn-toggle-hint">{form.visible ? 'Visible to all users' : 'Hidden — only root can see'}</span>
                </label>
                <button
                  type="button"
                  className={`learn-toggle ${form.visible ? 'learn-toggle-on' : 'learn-toggle-off'}`}
                  onClick={() => setForm(prev => ({ ...prev, visible: !prev.visible }))}
                >
                  <span className="learn-toggle-knob" />
                </button>
              </div>
              {error && <p className="learn-form-error">{error}</p>}
              <div className="learn-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (editingRoadmap ? 'Saving...' : 'Creating...') : (editingRoadmap ? 'Save Changes' : 'Create Roadmap')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
