import { useState, useContext, useEffect, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { CircleAlert, Lock, X, Trash2, RefreshCw, Plus, Megaphone } from 'lucide-react';
import './SupportButton.css';

const STATUS_LABELS = { open: 'Open', 'in-progress': 'In Progress', closed: 'Closed' };
const STATUS_COLORS = { open: '#f59e0b', 'in-progress': '#3b82f6', closed: '#10b981' };
const TYPE_LABELS = { bug: '🐛 Bug', enhancement: '✨ Feature' };

const UpdateNotePanel = () => {
  const [note, setNote] = useState(null);
  const [features, setFeatures] = useState([{ title: '' }]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/buildnote`)
      .then(r => r.json())
      .then(d => { setNote(d.note || null); });
  }, []);

  const addFeature = () => setFeatures(prev => [...prev, { title: '' }]);
  const removeFeature = (i) => setFeatures(prev => prev.filter((_, idx) => idx !== i));
  const updateFeature = (i, val) => setFeatures(prev => prev.map((f, idx) => idx === i ? { title: val } : f));

  const handleSet = async () => {
    const valid = features.filter(f => f.title.trim());
    if (!valid.length) { setMsg('Add at least one feature.'); return; }
    setSaving(true); setMsg('');
    try {
      const res = await fetch(`${API_URL}/buildnote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ features: valid })
      });
      const data = await res.json();
      if (res.ok) { setNote(data.note); setFeatures([{ title: '' }]); setMsg('Build note set!'); }
      else setMsg(data.message || 'Error');
    } finally { setSaving(false); }
  };

  const handleStop = async () => {
    setSaving(true); setMsg('');
    try {
      await fetch(`${API_URL}/buildnote`, { method: 'DELETE', credentials: 'include' });
      setNote(null); setMsg('Build note removed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="update-note-panel">
      {note && (
        <div className="update-note-active">
          <div className="update-note-active-header">
            <span className="update-note-live-dot" />
            <span>Active Build Note</span>
          </div>
          <div className="update-note-active-time">
            {new Date(note.createdAt).toLocaleString()}
          </div>
          <ul className="update-note-active-list">
            {note.features.map((f, i) => (
              <li key={i}>{f.title}</li>
            ))}
          </ul>
          <button className="update-note-stop-btn" onClick={handleStop} disabled={saving}>
            Stop Note
          </button>
        </div>
      )}

      <div className="update-note-form">
        <div className="update-note-form-label">New Build Note</div>
        {features.map((f, i) => (
          <div key={i} className="update-note-feature-row">
            <input
              className="update-note-input"
              placeholder={`Feature ${i + 1}`}
              value={f.title}
              onChange={e => updateFeature(i, e.target.value)}
              maxLength={80}
            />
            {features.length > 1 && (
              <button className="update-note-remove-btn" onClick={() => removeFeature(i)}>
                <X size={13} />
              </button>
            )}
          </div>
        ))}
        <button className="update-note-add-btn" onClick={addFeature}>
          <Plus size={13} /> Add feature
        </button>
        <button className="update-note-set-btn" onClick={handleSet} disabled={saving}>
          {saving ? 'Saving...' : 'Set Note'}
        </button>
        {msg && <div className={`support-message ${msg.includes('set') || msg.includes('removed') ? 'success' : 'error'}`}>{msg}</div>}
      </div>
    </div>
  );
};

const AdminPanel = ({ onClose }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState('all');
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyMsg, setReplyMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/support/all`, { credentials: 'include' });
      const data = await res.json();
      setRequests(data.requests || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id, status) => {
    setUpdating(true);
    try {
      await fetch(`${API_URL}/support/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      setRequests(prev => prev.map(r => r._id === id ? { ...r, status } : r));
      if (selected?._id === id) setSelected(prev => ({ ...prev, status }));
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this request?')) return;
    await fetch(`${API_URL}/support/${id}`, { method: 'DELETE', credentials: 'include' });
    setRequests(prev => prev.filter(r => r._id !== id));
    if (selected?._id === id) setSelected(null);
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplySending(true);
    setReplyMsg('');
    try {
      const res = await fetch(`${API_URL}/support/${selected._id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ description: replyText })
      });
      if (res.ok) {
        setReplyMsg('Reply sent successfully!');
        setReplyText('');
      } else {
        setReplyMsg('Failed to send reply.');
      }
    } catch {
      setReplyMsg('Network error.');
    } finally {
      setReplySending(false);
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  if (selected) {
    return (
      <div className="support-admin-detail">
        <button className="support-admin-back" onClick={() => setSelected(null)}>← Back</button>
        <div className="support-admin-detail-header">
          <span className="support-type-badge">{TYPE_LABELS[selected.type]}</span>
          <span className="support-status-badge" style={{ background: STATUS_COLORS[selected.status] }}>
            {STATUS_LABELS[selected.status]}
          </span>
        </div>
        <h4 className="support-admin-detail-title">{selected.title}</h4>
        <div className="support-admin-meta">
          <span>👤 {selected.username}</span>
          <span>📅 {new Date(selected.createdAt).toLocaleString()}</span>
        </div>
        <p className="support-admin-desc">{selected.description}</p>
        <div className="support-admin-actions">
          <div className="support-status-group">
            {['open', 'in-progress', 'closed'].map(s => (
              <button
                key={s}
                className={`support-status-btn ${selected.status === s ? 'active' : ''}`}
                style={selected.status === s ? { background: STATUS_COLORS[s], color: '#fff', borderColor: STATUS_COLORS[s] } : {}}
                onClick={() => handleStatus(selected._id, s)}
                disabled={updating}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <button className="support-delete-btn" onClick={() => handleDelete(selected._id)}>
            <Trash2 size={14} /> Delete
          </button>
        </div>

        <div className="support-reply-section">
          <div className="support-reply-title-preview">
            📨 Reply title: <em>{selected.type === 'bug' ? 'NET2077 Team — Bug Report Response' : 'NET2077 Team — Feature Request Response'}</em>
          </div>
          <textarea
            className="support-reply-textarea"
            placeholder="Write your response to the user..."
            value={replyText}
            onChange={e => { setReplyText(e.target.value); setReplyMsg(''); }}
            rows={4}
            maxLength={2000}
          />
          <div className="support-reply-footer">
            <small>{replyText.length}/2000</small>
            <button
              className="support-reply-send"
              onClick={handleReply}
              disabled={replySending || !replyText.trim()}
            >
              {replySending ? 'Sending...' : 'Send to Inbox'}
            </button>
          </div>
          {replyMsg && (
            <div className={`support-message ${replyMsg.includes('successfully') ? 'success' : 'error'}`}>
              {replyMsg}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="support-admin-panel">
      <div className="support-admin-toolbar">
        <div className="support-filter-tabs">
          {['all', 'open', 'in-progress', 'closed'].map(f => (
            <button
              key={f}
              className={`support-filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : STATUS_LABELS[f]}
              <span className="support-filter-count">
                {f === 'all' ? requests.length : requests.filter(r => r.status === f).length}
              </span>
            </button>
          ))}
        </div>
        <button className="support-refresh-btn" onClick={load} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div className="support-admin-loading">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="support-admin-empty">No requests found</div>
      ) : (
        <div className="support-admin-list">
          {filtered.map(r => (
            <div key={r._id} className="support-admin-item" onClick={() => setSelected(r)}>
              <div className="support-admin-item-top">
                <span className="support-type-badge small">{TYPE_LABELS[r.type]}</span>
                <span className="support-status-dot" style={{ background: STATUS_COLORS[r.status] }} title={STATUS_LABELS[r.status]} />
              </div>
              <div className="support-admin-item-title">{r.title}</div>
              <div className="support-admin-item-meta">
                <span>{r.username}</span>
                <span>{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SupportButton = () => {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState('submit');
  const [formData, setFormData] = useState({ title: '', description: '', type: 'bug' });  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const isRoot = user?.role === 'root';

  useEffect(() => {
    const checkDevice = () => {
      setIsDesktop(window.innerWidth >= 1024);
      if (window.innerWidth >= 1024) {
        setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
      }
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useEffect(() => {
    if (!isDesktop || !user) return;
    const showPopupTimer = () => { setShowPopup(false); setTimeout(() => setShowPopup(false), 5000); };
    const initialTimer = setTimeout(showPopupTimer, 2000);
    const timer = setInterval(showPopupTimer, 10 * 60 * 1000);
    return () => { clearTimeout(initialTimer); clearInterval(timer); };
  }, [isDesktop, user]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      setPosition({
        x: Math.max(0, Math.min(e.clientX - dragStart.x, window.innerWidth - 56)),
        y: Math.max(0, Math.min(e.clientY - dragStart.y, window.innerHeight - 56))
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, dragStart]);

  if (!isDesktop) return null;

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleClick = () => { if (!isDragging) setIsOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) { setMessage('Please fill in all fields'); return; }
    setIsSubmitting(true);
    setMessage('');
    try {
      const response = await fetch(`${API_URL}/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Support request sent successfully!');
        setFormData({ title: '', description: '', type: 'bug' });
        setTimeout(() => { setIsOpen(false); setMessage(''); }, 2000);
      } else {
        setMessage(data.error || data.message || 'Failed to send request');
      }
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        className="support-button"
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        style={{ left: `${position.x}px`, top: `${position.y}px`, cursor: isDragging ? 'grabbing' : 'grab' }}
        title="Support (Drag to move)"
      >
        <CircleAlert size={32} />
      </button>

      {showPopup && (
        <div className="support-popup" style={{ left: `${position.x}px`, top: `${position.y - 80}px` }}>
          <div className="popup-content">
            <span className="popup-text">Want to request a feature?</span>
            <button className="popup-close" onClick={() => setShowPopup(false)}><X size={16} /></button>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="support-overlay" onClick={() => setIsOpen(false)}>
          <div className={`support-modal ${isRoot ? 'support-modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="support-header">
              <div className="support-tabs">
                <button className={`support-tab ${activeTab === 'submit' ? 'active' : ''}`} onClick={() => setActiveTab('submit')}>
                  Support
                </button>
                {isRoot && (
                  <button className={`support-tab support-tab-admin ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
                    ⚙ Admin
                  </button>
                )}
                {isRoot && (
                  <button className={`support-tab support-tab-admin ${activeTab === 'updatenote' ? 'active' : ''}`} onClick={() => setActiveTab('updatenote')}>
                    📢 Update Note
                  </button>
                )}
              </div>
              <button className="support-close" onClick={() => setIsOpen(false)}>×</button>
            </div>

            {activeTab === 'submit' && (
              <>
                {!user ? (
                  <div className="support-locked">
                    <div className="lock-icon"><Lock size={48} /></div>
                    <p>Only for users</p>
                    <p className="lock-subtitle">Please log in to submit a support request</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="support-form">
                    <div className="form-group">
                      <label htmlFor="type">Type</label>
                      <select id="type" name="type" value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} required>
                        <option value="bug">Report Bug</option>
                        <option value="enhancement">Feature Request</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="title">Title</label>
                      <input type="text" id="title" name="title" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Brief description of the issue/request" maxLength={100} required />
                      <small>{formData.title.length}/100</small>
                    </div>
                    <div className="form-group">
                      <label htmlFor="description">Description</label>
                      <textarea id="description" name="description" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Detailed description of the issue or feature request" rows={4} maxLength={1000} required />
                      <small>{formData.description.length}/1000</small>
                    </div>
                    {message && <div className={`support-message ${message.includes('successfully') ? 'success' : 'error'}`}>{message}</div>}
                    <button type="submit" className="support-submit" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send'}</button>
                    <p className="rate-limit-info">You can submit up to 2 requests per hour</p>
                  </form>
                )}
              </>
            )}

            {activeTab === 'admin' && isRoot && <AdminPanel onClose={() => setIsOpen(false)} />}
            {activeTab === 'updatenote' && isRoot && <UpdateNotePanel />}
          </div>
        </div>
      )}
    </>
  );
};

export default SupportButton;
