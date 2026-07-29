import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Users, FileText, Megaphone, Upload,
  Trash2, Plus, X, RefreshCw, Send, Sparkles, Zap, Bug,
  ChevronDown, CheckCircle, XCircle, Clock, Download,
  Search, Copy, Database, ListFilter
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import '../styles/RootDashboard.css';

const STATUS_LABELS = { open: 'Open', 'in-progress': 'In Progress', closed: 'Closed' };
const STATUS_COLORS = { open: '#f59e0b', 'in-progress': '#3b82f6', closed: '#10b981' };
const TYPE_LABELS = { bug: 'Bug', enhancement: 'Feature' };

/* ─── Support Panel ─── */
function SupportPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyMsg, setReplyMsg] = useState('');
  const [goldAmount, setGoldAmount] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/support/all`, { credentials: 'include' });
      const data = await res.json();
      setRequests(data.requests || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id, status) => {
    setUpdating(true);
    await fetch(`${API_URL}/support/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ status })
    });
    setRequests(prev => prev.map(r => r._id === id ? { ...r, status } : r));
    if (selected?._id === id) setSelected(prev => ({ ...prev, status }));
    setUpdating(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this request?')) return;
    await fetch(`${API_URL}/support/${id}`, { method: 'DELETE', credentials: 'include' });
    setRequests(prev => prev.filter(r => r._id !== id));
    if (selected?._id === id) setSelected(null);
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplySending(true); setReplyMsg('');
    try {
      const res = await fetch(`${API_URL}/support/${selected._id}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ description: replyText })
      });
      if (res.ok) { setReplyMsg('Reply sent!'); setReplyText(''); }
      else setReplyMsg('Failed to send.');
    } catch { setReplyMsg('Network error.'); }
    finally { setReplySending(false); }
  };

  const handleApplyGold = async () => {
    const amount = parseInt(goldAmount);
    if (!amount || amount <= 0) return;
    const res = await fetch(`${API_URL}/support/${selected._id}/gold`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ amount })
    });
    if (res.ok) {
      setReplyText(prev => prev ? `${prev}\n🪙 ${amount} gold recompensation` : `🪙 ${amount} gold recompensation`);
      setGoldAmount(''); setReplyMsg(`+${amount} gold awarded!`);
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  if (selected) return (
    <div className="rd-detail">
      <button className="rd-back" onClick={() => { setSelected(null); setReplyMsg(''); setReplyText(''); }}>
        ← Back to list
      </button>
      <div className="rd-detail-header">
        <span className="rd-type-badge" data-type={selected.type}>{TYPE_LABELS[selected.type]}</span>
        <span className="rd-status-badge" style={{ background: STATUS_COLORS[selected.status] }}>{STATUS_LABELS[selected.status]}</span>
      </div>
      <h3 className="rd-detail-title">{selected.title}</h3>
      <div className="rd-detail-meta">
        <span><Users size={13} /> {selected.username}</span>
        <span><Clock size={13} /> {new Date(selected.createdAt).toLocaleString()}</span>
      </div>
      <p className="rd-detail-desc">{selected.description}</p>
      <div className="rd-status-group">
        {['open', 'in-progress', 'closed'].map(s => (
          <button key={s} className={`rd-status-btn ${selected.status === s ? 'active' : ''}`}
            style={selected.status === s ? { background: STATUS_COLORS[s], borderColor: STATUS_COLORS[s], color: '#fff' } : {}}
            onClick={() => handleStatus(selected._id, s)} disabled={updating}>
            {STATUS_LABELS[s]}
          </button>
        ))}
        <button className="rd-delete-btn" onClick={() => handleDelete(selected._id)}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
      <div className="rd-reply-box">
        <div className="rd-reply-label">Reply to user</div>
        <div className="rd-gold-row">
          <input type="number" className="rd-gold-input" placeholder="Gold amount" value={goldAmount}
            min={1} max={10000} onChange={e => setGoldAmount(e.target.value)} />
          <button className="rd-gold-btn" onClick={handleApplyGold} disabled={!goldAmount || parseInt(goldAmount) <= 0}>
            🪙 Apply
          </button>
        </div>
        <textarea className="rd-reply-textarea" rows={4} maxLength={2000} placeholder="Write your response..."
          value={replyText} onChange={e => { setReplyText(e.target.value); setReplyMsg(''); }} />
        <div className="rd-reply-footer">
          <small>{replyText.length}/2000</small>
          <button className="rd-send-btn" onClick={handleReply} disabled={replySending || !replyText.trim()}>
            <Send size={14} /> {replySending ? 'Sending...' : 'Send to Inbox'}
          </button>
        </div>
        {replyMsg && <div className={`rd-msg ${replyMsg.includes('sent') || replyMsg.includes('gold') ? 'success' : 'error'}`}>{replyMsg}</div>}
      </div>
    </div>
  );

  return (
    <div className="rd-support">
      <div className="rd-toolbar">
        <div className="rd-filter-tabs">
          {['all', 'open', 'in-progress', 'closed'].map(f => (
            <button key={f} className={`rd-filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : STATUS_LABELS[f]}
              <span className="rd-filter-count">{f === 'all' ? requests.length : requests.filter(r => r.status === f).length}</span>
            </button>
          ))}
        </div>
        <button className="rd-refresh-btn" onClick={load}><RefreshCw size={15} /></button>
      </div>
      {loading ? <div className="rd-loading">Loading...</div>
        : filtered.length === 0 ? <div className="rd-empty">No requests found</div>
        : (
          <div className="rd-list">
            {filtered.map(r => (
              <div key={r._id} className="rd-item" onClick={() => setSelected(r)}>
                <div className="rd-item-top">
                  <span className="rd-type-badge small" data-type={r.type}>{TYPE_LABELS[r.type]}</span>
                  <span className="rd-status-dot" style={{ background: STATUS_COLORS[r.status] }} />
                </div>
                <div className="rd-item-title">{r.title}</div>
                <div className="rd-item-meta"><span>{r.username}</span><span>{new Date(r.createdAt).toLocaleDateString()}</span></div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/* ─── Build Note Panel ─── */
function BuildNotePanel() {
  const [note, setNote] = useState(null);
  const [features, setFeatures] = useState([{ title: '' }]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/buildnote`).then(r => r.json()).then(d => setNote(d.note || null));
  }, []);

  const handleSet = async () => {
    const valid = features.filter(f => f.title.trim());
    if (!valid.length) { setMsg('Add at least one feature.'); return; }
    setSaving(true); setMsg('');
    const res = await fetch(`${API_URL}/buildnote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ features: valid })
    });
    const data = await res.json();
    if (res.ok) { setNote(data.note); setFeatures([{ title: '' }]); setMsg('Build note set!'); }
    else setMsg(data.message || 'Error');
    setSaving(false);
  };

  const handleStop = async () => {
    setSaving(true);
    await fetch(`${API_URL}/buildnote`, { method: 'DELETE', credentials: 'include' });
    setNote(null); setMsg('Build note removed.'); setSaving(false);
  };

  return (
    <div className="rd-buildnote">
      {note && (
        <div className="rd-note-active">
          <div className="rd-note-active-header">
            <span className="rd-live-dot" />
            <span>Active Build Note</span>
            <span className="rd-note-time">{new Date(note.createdAt).toLocaleString()}</span>
          </div>
          <ul className="rd-note-list">{note.features.map((f, i) => <li key={i}>{f.title}</li>)}</ul>
          <button className="rd-stop-btn" onClick={handleStop} disabled={saving}>Stop Note</button>
        </div>
      )}
      <div className="rd-note-form">
        <div className="rd-section-label">New Build Note</div>
        {features.map((f, i) => (
          <div key={i} className="rd-feature-row">
            <input className="rd-input" placeholder={`Feature ${i + 1}`} value={f.title}
              onChange={e => setFeatures(prev => prev.map((x, idx) => idx === i ? { title: e.target.value } : x))}
              maxLength={80} />
            {features.length > 1 && (
              <button className="rd-icon-btn" onClick={() => setFeatures(prev => prev.filter((_, idx) => idx !== i))}><X size={13} /></button>
            )}
          </div>
        ))}
        <button className="rd-add-btn" onClick={() => setFeatures(prev => [...prev, { title: '' }])}><Plus size={13} /> Add feature</button>
        <button className="rd-primary-btn" onClick={handleSet} disabled={saving}>{saving ? 'Saving...' : 'Set Note'}</button>
        {msg && <div className={`rd-msg ${msg.includes('set') || msg.includes('removed') ? 'success' : 'error'}`}>{msg}</div>}
      </div>
    </div>
  );
}

/* ─── Updates Panel ─── */
function UpdatesPanel() {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const [version, setVersion] = useState('');
  const [features, setFeatures] = useState(['']);
  const [improvements, setImprovements] = useState(['']);
  const [bugFixes, setBugFixes] = useState(['']);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState('');
  const [existing, setExisting] = useState([]);

  const loadExisting = useCallback(async () => {
    const res = await fetch(`${API_URL}/updates`);
    const data = await res.json();
    setExisting(data.updates || []);
  }, []);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  const handlePublish = async () => {
    if (!version.trim()) { setMsg('Version name is required.'); return; }
    const hasContent = features.some(f => f.trim()) || improvements.some(i => i.trim()) || bugFixes.some(b => b.trim());
    if (!hasContent) { setMsg('Add at least one item.'); return; }
    setPublishing(true); setMsg('');
    const res = await fetch(`${API_URL}/updates`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ version: version.trim(), date: today, sections: { features, improvements, bugFixes } })
    });
    const data = await res.json();
    if (res.ok) { setMsg('Published!'); setVersion(''); setFeatures(['']); setImprovements(['']); setBugFixes(['']); loadExisting(); }
    else setMsg(data.message || 'Error');
    setPublishing(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this update?')) return;
    await fetch(`${API_URL}/updates/${id}`, { method: 'DELETE', credentials: 'include' });
    setExisting(prev => prev.filter(u => u._id !== id));
  };

  return (
    <div className="rd-updates">
      <div className="rd-meta-row">
        <div className="rd-field">
          <label>Version</label>
          <input className="rd-input" placeholder="e.g. 1.3.0" value={version} onChange={e => setVersion(e.target.value)} maxLength={20} />
        </div>
        <div className="rd-field">
          <label>Date</label>
          <div className="rd-date-display">{today}</div>
        </div>
      </div>

      {/* Features */}
      <div className="rd-update-section">
        <div className="rd-section-label"><Sparkles size={13} />Features</div>
        {features.map((val, i) => (
          <div key={i} className="rd-feature-row">
            <input className="rd-input" placeholder="Feature item..." value={val}
              onChange={e => { const v = e.target.value; setFeatures(prev => prev.map((x, idx) => idx === i ? v : x)); }}
              maxLength={200} />
            {features.length > 1 && <button className="rd-icon-btn" onClick={() => setFeatures(prev => prev.filter((_, idx) => idx !== i))}><X size={13} /></button>}
          </div>
        ))}
        <button className="rd-add-btn" onClick={() => setFeatures(prev => [...prev, ''])}><Plus size={12} /> Add</button>
      </div>

      {/* Improvements */}
      <div className="rd-update-section">
        <div className="rd-section-label"><Zap size={13} />Improvements</div>
        {improvements.map((val, i) => (
          <div key={i} className="rd-feature-row">
            <input className="rd-input" placeholder="Improvement item..." value={val}
              onChange={e => { const v = e.target.value; setImprovements(prev => prev.map((x, idx) => idx === i ? v : x)); }}
              maxLength={200} />
            {improvements.length > 1 && <button className="rd-icon-btn" onClick={() => setImprovements(prev => prev.filter((_, idx) => idx !== i))}><X size={13} /></button>}
          </div>
        ))}
        <button className="rd-add-btn" onClick={() => setImprovements(prev => [...prev, ''])}><Plus size={12} /> Add</button>
      </div>

      {/* Bug Fixes */}
      <div className="rd-update-section">
        <div className="rd-section-label"><Bug size={13} />Bug Fixes</div>
        {bugFixes.map((val, i) => (
          <div key={i} className="rd-feature-row">
            <input className="rd-input" placeholder="Bug fix item..." value={val}
              onChange={e => { const v = e.target.value; setBugFixes(prev => prev.map((x, idx) => idx === i ? v : x)); }}
              maxLength={200} />
            {bugFixes.length > 1 && <button className="rd-icon-btn" onClick={() => setBugFixes(prev => prev.filter((_, idx) => idx !== i))}><X size={13} /></button>}
          </div>
        ))}
        <button className="rd-add-btn" onClick={() => setBugFixes(prev => [...prev, ''])}><Plus size={12} /> Add</button>
      </div>

      {msg && <div className={`rd-msg ${msg.includes('Published') ? 'success' : 'error'}`}>{msg}</div>}
      <button className="rd-primary-btn" onClick={handlePublish} disabled={publishing}>
        <Send size={14} /> {publishing ? 'Publishing...' : 'Publish Update'}
      </button>

      {existing.length > 0 && (
        <div className="rd-existing">
          <div className="rd-section-label" style={{ marginTop: 8 }}>Published versions</div>
          {existing.map(u => (
            <div key={u._id} className="rd-existing-item">
              <div className="rd-existing-info">
                <span className="rd-existing-version">v{u.version}</span>
                <span className="rd-existing-date">{u.date}</span>
              </div>
              <button className="rd-icon-btn danger" onClick={() => handleDelete(u._id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Question Manager Panel ─── */
function QuestionManagerPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [deleted, setDeleted] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const search = async (all = false) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const url = all
        ? `${API_URL}/questions/search?all=1`
        : `${API_URL}/questions/search?q=${encodeURIComponent(query.trim())}`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim().length >= 2) search(false);
  };

  const handleCopy = (q) => {
    const { _id, __v, createdAt, updatedAt, ...clean } = q;
    const text = JSON.stringify(clean, null, 2);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
    setCopied(q._id);
    setTimeout(() => setCopied(null), 1800);
  };

  const fallbackCopy = (text) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  };

  const handleDelete = async (id) => {
    const res = await fetch(`${API_URL}/questions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      setResults(prev => prev.filter(q => q._id !== id));
      setDeleted(id);
      setTimeout(() => setDeleted(null), 2000);
    }
    setConfirmDelete(null);
  };

  return (
    <div className="rd-qmgr">
      <div className="rd-qmgr-header">
        <div className="rd-section-label" style={{ margin: 0 }}>
          <Database size={13} /> Question Manager
        </div>
      </div>

      <div className="rd-qmgr-search-row">
        <div className="rd-qmgr-input-wrap">
          <Search size={15} className="rd-qmgr-search-icon" />
          <input
            className="rd-input rd-qmgr-input"
            placeholder="Search by title... (min 2 chars)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={200}
          />
        </div>
        <button
          className="rd-primary-btn"
          style={{ marginTop: 0 }}
          onClick={() => search(false)}
          disabled={loading || query.trim().length < 2}
        >
          <Search size={14} /> Search
        </button>
        <button
          className="rd-export-btn"
          onClick={() => search(true)}
          disabled={loading}
        >
          <ListFilter size={14} /> All Questions
        </button>
      </div>

      {loading && <div className="rd-loading">Searching...</div>}

      {!loading && hasSearched && results.length === 0 && (
        <div className="rd-empty">No questions found.</div>
      )}

      {!loading && results.length > 0 && (
        <div className="rd-qmgr-results">
          <div className="rd-qmgr-count">
            {results.length} question{results.length !== 1 ? 's' : ''} found
          </div>
          {results.map(q => (
            <div key={q._id} className="rd-qmgr-item">
              <div className="rd-qmgr-item-top">
                <div className="rd-qmgr-badges">
                  <span className="rd-qmgr-badge type">{q.type}</span>
                  <span className="rd-qmgr-badge diff" data-diff={q.difficulty}>{q.difficulty}</span>
                  {q.tags?.map(tag => (
                    <span key={tag} className="rd-qmgr-badge tag">{tag}</span>
                  ))}
                </div>
                <div className="rd-qmgr-actions">
                  <button
                    className={`rd-icon-btn ${copied === q._id ? 'copied' : ''}`}
                    title="Copy JSON"
                    onClick={() => handleCopy(q)}
                  >
                    {copied === q._id ? <CheckCircle size={15} /> : <Copy size={15} />}
                  </button>
                  {confirmDelete === q._id ? (
                    <div className="rd-qmgr-confirm">
                      <span>Sure?</span>
                      <button className="rd-qmgr-confirm-yes" onClick={() => handleDelete(q._id)}>Yes</button>
                      <button className="rd-qmgr-confirm-no" onClick={() => setConfirmDelete(null)}>No</button>
                    </div>
                  ) : (
                    <button
                      className="rd-icon-btn danger"
                      title="Delete question"
                      onClick={() => setConfirmDelete(q._id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
              <div className="rd-qmgr-title">{q.title}</div>
              <div className="rd-qmgr-answers">
                {q.answers?.map((ans, i) => (
                  <span key={i} className={`rd-qmgr-ans ${q.correctAnswers?.includes(i) ? 'correct' : ''}`}>
                    {ans}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Questions Panel ─── */
function QuestionsPanel() {
  const [questionsRaw, setQuestionsRaw] = useState('');
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API_URL}/questions/export`, { credentials: 'include' });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'questions.json'; a.click();
      URL.revokeObjectURL(url);
    } finally { setDownloading(false); }
  };

  const handleImport = async () => {
    setResult(null);
    let questions;
    try {
      questions = JSON.parse(questionsRaw.trim());
      if (!Array.isArray(questions)) throw new Error('Must be a JSON array [ ]');
    } catch (e) { setResult({ parseError: e.message }); return; }
    setImporting(true); setProgress(0);
    const iv = setInterval(() => setProgress(p => Math.min(p + 3, 90)), 200);
    try {
      const res = await fetch(`${API_URL}/exams/bulk-questions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ questions })
      });
      const data = await res.json();
      clearInterval(iv); setProgress(100); setResult(data);
    } catch {
      clearInterval(iv); setResult({ parseError: 'Server error during import.' });
    } finally { setImporting(false); }
  };

  return (
    <div className="rd-questions">
      <div className="rd-questions-header">
        <span className="rd-section-label" style={{ margin: 0 }}>Import questions (JSON array)</span>
        <button className="rd-export-btn" onClick={handleExport} disabled={downloading}>
          <Download size={14} /> {downloading ? 'Downloading...' : 'Export all'}
        </button>
      </div>
      <textarea className="rd-textarea" rows={14}
        placeholder={'[\n  {\n    "title": "...",\n    "type": "basic",\n    "answers": [...],\n    "correctAnswers": [0],\n    "multipleCorrect": false,\n    "difficulty": "easy",\n    "points": 1,\n    "tags": ["LINUX"]\n  }\n]'}
        value={questionsRaw}
        onChange={e => { setQuestionsRaw(e.target.value); setResult(null); setProgress(0); }}
        disabled={importing || result?.inserted !== undefined}
      />
      {importing && (
        <div className="rd-progress-wrap">
          <div className="rd-progress-bar"><div className="rd-progress-fill" style={{ width: `${progress}%` }} /></div>
          <span>{progress}%</span>
        </div>
      )}
      {result && (
        <div className={`rd-msg ${result.parseError ? 'error' : 'success'}`}>
          {result.parseError ? `❌ ${result.parseError}` : `✅ Inserted: ${result.inserted}${result.skipped > 0 ? ` · Skipped: ${result.skipped}` : ''}`}
        </div>
      )}
      <div className="rd-questions-footer">
        {result?.inserted !== undefined
          ? <button className="rd-add-btn" onClick={() => { setQuestionsRaw(''); setResult(null); setProgress(0); }}>Import more</button>
          : <button className="rd-primary-btn" onClick={handleImport} disabled={importing || !questionsRaw.trim()}>
              <Upload size={14} /> {importing ? 'Importing...' : 'Import Questions'}
            </button>
        }
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─── */
const TABS = [
  { id: 'support',   label: 'Support',    icon: Users },
  { id: 'buildnote', label: 'Build Note', icon: Megaphone },
  { id: 'updates',   label: 'Updates',    icon: FileText },
  { id: 'questions', label: 'Questions',  icon: Settings },
  { id: 'qmanager',  label: 'Q Manager',  icon: Database },
];

export default function RootDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('support');

  useEffect(() => {
    if (!user || user.role !== 'root') navigate('/');
  }, [user, navigate]);

  if (!user || user.role !== 'root') return null;

  return (
    <div className="rd-page">
      <div className="rd-container">
        <div className="rd-header">
          <div className="rd-header-icon"><Settings size={22} /></div>
          <div>
            <h1 className="rd-title">System Dashboard</h1>
            <p className="rd-subtitle">Internal management panel</p>
          </div>
        </div>

        <div className="rd-layout">
          <nav className="rd-sidebar">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`rd-nav-btn ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <main className="rd-content">
            {activeTab === 'support'   && <SupportPanel />}
            {activeTab === 'buildnote' && <BuildNotePanel />}
            {activeTab === 'updates'   && <UpdatesPanel />}
            {activeTab === 'questions' && <QuestionsPanel />}
            {activeTab === 'qmanager'  && <QuestionManagerPanel />}
          </main>
        </div>
      </div>
    </div>
  );
}
