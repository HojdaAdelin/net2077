import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import '../styles/ExamSelection.css';
import { Clock3, Tally5, Plus, X, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';

const EMPTY_META = {
  id: '', title: '', description: '',
  duration: '', totalPoints: '', tag: '', year: '', phase: ''
};

export default function ExamSelection() {
  const { user } = useContext(AuthContext);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const navigate = useNavigate();
  const isRoot = user?.role === 'root';

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);           // 1 = meta, 2 = questions
  const [meta, setMeta] = useState(EMPTY_META);
  const [metaError, setMetaError] = useState('');
  const [metaPreview, setMetaPreview] = useState('');
  const [questionsRaw, setQuestionsRaw] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { inserted, skipped, errors }
  const [progress, setProgress] = useState(0);

  // delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null); // exam object
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadExams(); }, []);

  const loadExams = async () => {
    try {
      const response = await fetch(`${API_URL}/exams`);
      const data = await response.json();
      setExams(data);
    } catch { /* silent */ }
    setLoading(false);
  };

  // ── Meta preview ─────────────────────────────────────────────────────────
  useEffect(() => {
    const obj = {
      id: meta.id,
      title: meta.title,
      description: meta.description,
      duration: meta.duration ? Number(meta.duration) : '',
      totalPoints: meta.totalPoints ? Number(meta.totalPoints) : '',
      tag: meta.tag,
      year: meta.year ? Number(meta.year) : '',
      phase: meta.phase,
    };
    setMetaPreview(JSON.stringify(obj, null, 2));
  }, [meta]);

  // ── Step 1 → 2 ───────────────────────────────────────────────────────────
  const handleNext = async () => {
    setMetaError('');
    const { id, title, description, duration, totalPoints, tag, year, phase } = meta;
    if (!id || !title || !description || !duration || !totalPoints || !tag || !year || !phase) {
      setMetaError('All fields are required.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, title, description, duration: Number(duration), totalPoints: Number(totalPoints), tag, year: Number(year), phase }),
      });
      const data = await res.json();
      if (!data.success) { setMetaError(data.message || 'Failed to create exam.'); return; }
      setExams(prev => [data.exam, ...prev]);
      setStep(2);
    } catch { setMetaError('Server error.'); }
  };

  // ── Step 2 → finish ──────────────────────────────────────────────────────
  const handleImport = async () => {
    setImportResult(null);
    let questions;
    try {
      questions = JSON.parse(questionsRaw.trim());
      if (!Array.isArray(questions)) throw new Error('Must be a JSON array');
    } catch (e) {
      setImportResult({ parseError: e.message });
      return;
    }

    setImporting(true);
    setProgress(0);

    // Simulate progress while waiting
    const iv = setInterval(() => setProgress(p => Math.min(p + 3, 90)), 200);

    try {
      const res = await fetch(`${API_URL}/exams/bulk-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questions }),
      });
      const data = await res.json();
      clearInterval(iv);
      setProgress(100);
      setImportResult(data);
    } catch {
      clearInterval(iv);
      setImportResult({ parseError: 'Server error during import.' });
    } finally {
      setImporting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setStep(1);
    setMeta(EMPTY_META);
    setMetaError('');
    setQuestionsRaw('');
    setImportResult(null);
    setProgress(0);
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (deleteInput !== deleteConfirm?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/exams/${deleteConfirm.id}`, {
        method: 'DELETE', credentials: 'include'
      });
      const data = await res.json();
      if (data.success) setExams(prev => prev.filter(e => e.id !== deleteConfirm.id));
    } catch { /* silent */ }
    setDeleting(false);
    setDeleteConfirm(null);
    setDeleteInput('');
  };

  // ── Filter / search ──────────────────────────────────────────────────────
  const handleFilterClick = (filter) => {
    setActiveFilter(activeFilter === filter ? null : filter);
    setSearchQuery('');
  };

  const filteredExams = exams.filter(exam => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || exam.title.toLowerCase().includes(q) || exam.description.toLowerCase().includes(q) || exam.tag?.toLowerCase().includes(q);
    const matchFilter = !activeFilter || exam.title.toLowerCase().includes(activeFilter.toLowerCase()) || exam.description.toLowerCase().includes(activeFilter.toLowerCase()) || exam.tag?.toLowerCase().includes(activeFilter.toLowerCase());
    return matchSearch && matchFilter;
  });

  if (loading) return (
    <div className="container exam-selection-page">
      <div className="loading">Loading exams...</div>
    </div>
  );

  return (
    <div className="container exam-selection-page">
      <div className="exam-header">
        <h1>Examination Subjects</h1>
        {isRoot && (
          <button className="btn btn-primary exam-create-btn" onClick={() => { setShowModal(true); setStep(1); }}>
            <Plus size={16} /> Create New Test
          </button>
        )}
      </div>

      <div className="exam-filters">
        <input
          type="text"
          placeholder="Search exams..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setActiveFilter(null); }}
          className="exam-search-input"
        />
        <div className="exam-filter-buttons">
          {['Acadnet', 'Linux', 'Network'].map(f => (
            <button
              key={f}
              className={`filter-btn filter-${f.toLowerCase()} ${activeFilter === f ? 'active' : ''}`}
              onClick={() => handleFilterClick(f)}
            >{f}</button>
          ))}
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <div className="no-exams"><p>No exams found matching your search.</p></div>
      ) : (
        <div className="exams-grid">
          {filteredExams.map(exam => (
            <div key={exam.id} className="exam-card">
              <div className="exam-badge">{exam.year}</div>
              {isRoot && (
                <button className="exam-delete-btn" title="Delete exam" onClick={() => { setDeleteConfirm(exam); setDeleteInput(''); }}>
                  <Trash2 size={14} />
                </button>
              )}
              <h2>{exam.title}</h2>
              <p>{exam.description}</p>
              <div className="exam-details">
                <div className="exam-detail">
                  <span className="detail-icon"><Clock3 size={18} /></span>
                  <span className="detail-text">{exam.duration} minutes</span>
                </div>
                <div className="exam-detail">
                  <span className="detail-icon"><Tally5 size={18} /></span>
                  <span className="detail-text">{exam.totalPoints} points</span>
                </div>
              </div>
              <button onClick={() => navigate(`/exam/${exam.id}`)} className="btn btn-primary btn-full">
                Start Examination
              </button>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => navigate('/grile')} className="btn btn-secondary" style={{ marginTop: '32px' }}>
        Back to Questions
      </button>

      {/* ── Create Exam Modal ── */}
      {showModal && (
        <div className="exam-modal-overlay" onClick={handleCloseModal}>
          <div className="exam-modal" onClick={e => e.stopPropagation()}>

            <div className="exam-modal-header">
              <div className="exam-modal-steps">
                <span className={`exam-modal-step ${step === 1 ? 'active' : 'done'}`}>1. Exam Details</span>
                <ChevronRight size={14} className="exam-modal-step-sep" />
                <span className={`exam-modal-step ${step === 2 ? 'active' : ''}`}>2. Import Questions</span>
              </div>
              <button className="exam-modal-close" onClick={handleCloseModal}><X size={18} /></button>
            </div>

            {step === 1 && (
              <div className="exam-modal-body">
                <div className="exam-form-grid">
                  {[
                    { key: 'id',          label: 'ID',           placeholder: 'acadnet2026local_11_12' },
                    { key: 'title',       label: 'Title',        placeholder: 'AcadNet 2026 - Local Phase' },
                    { key: 'description', label: 'Description',  placeholder: 'Official local phase...' },
                    { key: 'tag',         label: 'Tag',          placeholder: 'ACADNET_2026_LOCAL_XI_XII' },
                    { key: 'phase',       label: 'Phase',        placeholder: 'local / county / national' },
                    { key: 'year',        label: 'Year',         placeholder: '2026', type: 'number' },
                    { key: 'duration',    label: 'Duration (min)', placeholder: '60', type: 'number' },
                    { key: 'totalPoints', label: 'Total Points', placeholder: '100', type: 'number' },
                  ].map(({ key, label, placeholder, type }) => (
                    <div key={key} className="exam-form-row">
                      <label>{label}</label>
                      {key === 'description' ? (
                        <textarea
                          rows={2}
                          placeholder={placeholder}
                          value={meta[key]}
                          onChange={e => setMeta(p => ({ ...p, [key]: e.target.value }))}
                        />
                      ) : (
                        <input
                          type={type || 'text'}
                          placeholder={placeholder}
                          value={meta[key]}
                          onChange={e => setMeta(p => ({ ...p, [key]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="exam-form-row">
                  <label>Preview JSON</label>
                  <pre className="exam-json-preview">{metaPreview}</pre>
                </div>

                {metaError && <p className="exam-form-error">{metaError}</p>}

                <div className="exam-modal-footer">
                  <button className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleNext}>
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="exam-modal-body">
                <div className="exam-form-row">
                  <label>Paste questions JSON array</label>
                  <textarea
                    className="exam-questions-textarea"
                    rows={14}
                    placeholder={'[\n  { "title": "...", "type": "acadnet", "answers": [...], "correctAnswers": [0], ... },\n  ...\n]'}
                    value={questionsRaw}
                    onChange={e => { setQuestionsRaw(e.target.value); setImportResult(null); setProgress(0); }}
                    disabled={importing || importResult?.inserted !== undefined}
                  />
                </div>

                {importing && (
                  <div className="exam-progress-wrap">
                    <div className="exam-progress-bar">
                      <div className="exam-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="exam-progress-label">Importing... {progress}%</span>
                  </div>
                )}

                {importResult && (
                  <div className={`exam-import-result ${importResult.parseError ? 'error' : 'success'}`}>
                    {importResult.parseError ? (
                      <span>❌ Parse error: {importResult.parseError}</span>
                    ) : (
                      <>
                        <span>✅ Inserted: <strong>{importResult.inserted}</strong></span>
                        {importResult.skipped > 0 && <span> · Skipped (duplicate): <strong>{importResult.skipped}</strong></span>}
                        {importResult.errors?.length > 0 && <span> · Errors: <strong>{importResult.errors.length}</strong></span>}
                      </>
                    )}
                  </div>
                )}

                {metaError && <p className="exam-form-error">{metaError}</p>}

                <div className="exam-modal-footer">
                  <button className="btn btn-secondary" onClick={handleCloseModal}>
                    {importResult?.inserted !== undefined ? 'Close' : 'Cancel'}
                  </button>
                  {importResult?.inserted === undefined && (
                    <button
                      className="btn btn-primary"
                      onClick={handleImport}
                      disabled={importing || !questionsRaw.trim()}
                    >
                      {importing ? 'Importing...' : 'Import Questions'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="exam-modal-overlay" onClick={() => { setDeleteConfirm(null); setDeleteInput(''); }}>
          <div className="exam-modal exam-modal--narrow" onClick={e => e.stopPropagation()}>
            <div className="exam-modal-header">
              <span style={{ fontWeight: 600 }}>Delete Exam</span>
              <button className="exam-modal-close" onClick={() => { setDeleteConfirm(null); setDeleteInput(''); }}><X size={18} /></button>
            </div>
            <div className="exam-modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                This will permanently delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm.title}</strong>.
                Type the exam ID to confirm:
              </p>
              <code style={{ display: 'block', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '6px', marginBottom: '1rem', fontSize: '13px' }}>
                {deleteConfirm.id}
              </code>
              <input
                className="exam-delete-input"
                placeholder="Type exam ID..."
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
              />
              <div className="exam-modal-footer" style={{ marginTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => { setDeleteConfirm(null); setDeleteInput(''); }}>Cancel</button>
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteConfirm}
                  disabled={deleteInput !== deleteConfirm.id || deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
