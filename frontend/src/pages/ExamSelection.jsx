import { useState, useEffect, useLayoutEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import '../styles/ExamSelection.css';
import { Clock3, Tally5, ListChecks, Plus, X, ChevronDown, ChevronRight, ChevronLeft, SlidersHorizontal, Trash2, Users, Pencil } from 'lucide-react';

const EMPTY_META = {
  id: '', title: '', description: '',
  duration: '', totalPoints: '', tag: '', year: '', phase: '',
  new_test_badge: false
};

export default function ExamSelection() {
  const { user } = useContext(AuthContext);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [anyYear, setAnyYear] = useState(true);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [unfinishedExam, setUnfinishedExam] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isRoot = user?.role === 'root';

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.key]);

  // modal state
  const [editingExam, setEditingExam] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);
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

  useEffect(() => {
    const refreshUnfinishedExam = () => {
      const pending = [];
      for (const exam of exams) {
        try {
          const saved = JSON.parse(localStorage.getItem(`exam_state_${exam.id}`) || 'null');
          if (!saved || typeof saved.attemptId !== 'string' || !saved.attemptId ||
              saved.examStarted !== true || saved.showResults !== false || saved.finishReason ||
              !Number.isFinite(saved.timeLeft) || !Number.isFinite(saved.lastSavedAt)) continue;
          const elapsed = Math.max(0, (Date.now() - saved.lastSavedAt) / 1000);
          if (saved.timeLeft - elapsed <= 0) continue;
          const answers = saved.selectedAnswers;
          const answered = answers && typeof answers === 'object' && !Array.isArray(answers)
            ? Object.values(answers).filter(value => Array.isArray(value) && value.length > 0).length : 0;
          pending.push({ exam, answered, lastSavedAt: saved.lastSavedAt });
        } catch { /* Invalid or unavailable browser storage must not block exam selection. */ }
      }
      pending.sort((a, b) => b.lastSavedAt - a.lastSavedAt);
      setUnfinishedExam(pending[0] || null);
    };
    refreshUnfinishedExam();
    window.addEventListener('storage', refreshUnfinishedExam);
    window.addEventListener('focus', refreshUnfinishedExam);
    const timer = window.setInterval(refreshUnfinishedExam, 30000);
    return () => {
      window.removeEventListener('storage', refreshUnfinishedExam);
      window.removeEventListener('focus', refreshUnfinishedExam);
      window.clearInterval(timer);
    };
  }, [exams, location.key]);

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
        body: JSON.stringify({ id, title, description, duration: Number(duration), totalPoints: Number(totalPoints), tag, year: Number(year), phase, new_test_badge: meta.new_test_badge }),
      });
      const data = await res.json();
      if (!data.success) { setMetaError(data.message || 'Failed to create exam.'); return; }
      await loadExams();
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
      if (res.ok) await loadExams();
    } catch {
      clearInterval(iv);
      setImportResult({ parseError: 'Server error during import.' });
    } finally {
      setImporting(false);
    }
  };

  const handleEditExam = (exam) => {
    setEditingExam(exam);
    setMeta(Object.fromEntries(Object.keys(EMPTY_META).map(key => [key, exam[key] ?? EMPTY_META[key]])));
    setMetaError('');
    setStep(1);
    setShowModal(true);
  };

  const handleSaveDetails = async () => {
    if (!isRoot || !editingExam || savingDetails) return;
    setMetaError('');
    if (Object.entries(meta).some(([key, value]) => key !== 'new_test_badge' && !String(value).trim())) {
      setMetaError('All fields are required.');
      return;
    }
    setSavingDetails(true);
    try {
      const response = await fetch(`${API_URL}/exams/${encodeURIComponent(editingExam.id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...meta, duration: Number(meta.duration), totalPoints: Number(meta.totalPoints), year: Number(meta.year) })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setMetaError(data.message || 'Failed to update exam.');
        return;
      }
      await loadExams();
      // Reset persisted state when the edited exam is next opened.
      try { localStorage.removeItem(`exam_state_${editingExam.id}`); } catch { /* Storage can be unavailable. */ }
      setShowModal(false);
      setEditingExam(null);
      setMeta(EMPTY_META);
    } catch { setMetaError('Unable to save changes. Please try again.'); }
    finally { setSavingDetails(false); }
  };

  const handleCloseModal = () => {
    if (savingDetails) return;
    setEditingExam(null);
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
  };

  const resetFilters = () => {
    setActiveFilter(null);
    setAnyYear(true);
    setSearchQuery('');
  };
  const activeFilterCount = Number(Boolean(activeFilter)) + Number(!anyYear);

  const filteredExams = exams
    .filter(exam => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || exam.title.toLowerCase().includes(q) || exam.description.toLowerCase().includes(q) || exam.tag?.toLowerCase().includes(q);
      const matchFilter = !activeFilter || exam.title.toLowerCase().includes(activeFilter.toLowerCase()) || exam.description.toLowerCase().includes(activeFilter.toLowerCase()) || exam.tag?.toLowerCase().includes(activeFilter.toLowerCase());
      return matchSearch && matchFilter && (anyYear || Number(exam.year) === selectedYear);
    })
    .sort((a, b) => (b.new_test_badge ? 1 : 0) - (a.new_test_badge ? 1 : 0));

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
          <button className="btn btn-primary exam-create-btn" onClick={() => { setEditingExam(null); setMeta(EMPTY_META); setMetaError(''); setShowModal(true); setStep(1); }}>
            <Plus size={16} /> Create New Test
          </button>
        )}
      </div>

      <div className="exam-filters">
        <input
          type="text"
          placeholder="Search exams..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="exam-search-input"
          aria-label="Search exams"
        />
        <button
          type="button"
          className={`exam-filters-toggle ${filtersOpen ? 'open' : ''}`}
          aria-expanded={filtersOpen}
          aria-controls="exam-filter-panel"
          onClick={() => setFiltersOpen(open => !open)}
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          Filters{activeFilterCount > 0 && <span className="exam-filter-count">{activeFilterCount}</span>}
          <ChevronDown size={17} className="exam-filters-chevron" aria-hidden="true" />
        </button>
      </div>

      {filtersOpen && (
        <div id="exam-filter-panel" className="exam-filter-panel">
          <fieldset className="exam-filter-group">
            <legend>Category</legend>
            <div className="exam-filter-options">
              <button type="button" className="exam-filter-option" aria-pressed={!activeFilter} onClick={() => setActiveFilter(null)}>All categories</button>
              {['AcadNet', 'Linux', 'Network', 'Arduino'].map(category => (
                <button type="button" key={category} className="exam-filter-option" aria-pressed={activeFilter === category} onClick={() => handleFilterClick(category)}>{category}</button>
              ))}
            </div>
          </fieldset>
          <fieldset className="exam-filter-group exam-year-filter">
            <legend>Year</legend>
            <div className="exam-year-heading">
              <button type="button" className="exam-filter-option" aria-pressed={anyYear} onClick={() => setAnyYear(true)}>Any year</button>
              <output htmlFor="exam-year-slider" className="exam-year-value" aria-live="polite">{anyYear ? 'All years' : selectedYear}</output>
            </div>
            <input
              id="exam-year-slider"
              type="range"
              min="2010"
              max="2030"
              step="1"
              value={selectedYear}
              aria-label="Filter exams by year"
              onChange={event => { setSelectedYear(Number(event.target.value)); setAnyYear(false); }}
            />
            <div className="exam-year-range" aria-hidden="true"><span>2010</span><span>2030</span></div>
          </fieldset>
        </div>
      )}

      {unfinishedExam && (
        <section className="unfinished-exam-card" aria-labelledby="unfinished-exam-heading">
          <div className="unfinished-exam-content">
            <span className="unfinished-exam-label"><Clock3 size={15} aria-hidden="true" /> In progress</span>
            <h2 id="unfinished-exam-heading">{unfinishedExam.exam.title}</h2>
            <div className="unfinished-exam-details">
              <span>{unfinishedExam.answered} questions answered</span>
              <span>{unfinishedExam.exam.duration} minutes total</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary unfinished-exam-continue"
            onClick={() => navigate(`/exam/${unfinishedExam.exam.id}`)}
          >
            Continue Exam <ChevronRight size={17} aria-hidden="true" />
          </button>
        </section>
      )}

      {filteredExams.length === 0 ? (
        <div className="no-exams" role="status">
          <p>No exams match your search and filters.</p>
          <button type="button" className="btn btn-secondary" onClick={resetFilters}>Clear filters</button>
        </div>
      ) : (
        <div className="exams-grid">
          {filteredExams.map(exam => (
            <div key={exam.id} className={`exam-card${exam.new_test_badge ? ' exam-card--new' : ''}`}>
              {exam.new_test_badge && <div className="exam-new-ribbon" />}
              <div className="exam-badge">{exam.year}</div>
              {isRoot && (
                <button className="exam-delete-btn" title="Delete exam" onClick={() => { setDeleteConfirm(exam); setDeleteInput(''); }}>
                  <Trash2 size={14} />
                </button>
              )}
              <h2>{exam.title}</h2>
              <p>{exam.description}</p>
              <div className="exam-usage">
                <Users size={13} />
                <span>{exam.usage_ctn ?? 0} attempts</span>
              </div>
              <div className="exam-details">
                <div className="exam-detail">
                  <span className="detail-icon"><Clock3 size={18} /></span>
                  <span className="detail-text"><strong>{exam.duration}</strong><span>minutes</span></span>
                </div>
                <div className="exam-detail">
                  <span className="detail-icon"><Tally5 size={18} /></span>
                  <span className="detail-text"><strong>{exam.totalPoints}</strong><span>points</span></span>
                </div>
                <div className="exam-detail">
                  <span className="detail-icon"><ListChecks size={18} /></span>
                  <span className="detail-text"><strong>{exam.questionCount ?? '—'}</strong><span>questions</span></span>
                </div>
              </div>
              {isRoot && (
                <button className="btn btn-secondary btn-full exam-edit-btn" onClick={() => handleEditExam(exam)}>
                  <Pencil size={15} /> Edit Exam Details
                </button>
              )}
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
      {showModal && isRoot && (
        <div className="exam-modal-overlay" onClick={handleCloseModal}>
          <div className="exam-modal" onClick={e => e.stopPropagation()}>

            <div className="exam-modal-header">
              {editingExam ? <span className="exam-edit-title">Edit Exam Details</span> : <div className="exam-modal-steps">
                <span className={`exam-modal-step ${step === 1 ? 'active' : 'done'}`}>1. Exam Details</span>
                <ChevronRight size={14} className="exam-modal-step-sep" />
                <span className={`exam-modal-step ${step === 2 ? 'active' : ''}`}>2. Import Questions</span>
              </div>}
              <button className="exam-modal-close" onClick={handleCloseModal} disabled={savingDetails}><X size={18} /></button>
            </div>

            {step === 1 && (
              <div className="exam-modal-body">
                <fieldset className="exam-details-fields" disabled={savingDetails}>
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
                      <label htmlFor={`exam-detail-${key}`}>{label}</label>
                      {key === 'description' ? (
                        <textarea
                          id={`exam-detail-${key}`}
                          rows={2}
                          placeholder={placeholder}
                          value={meta[key]}
                          onChange={e => setMeta(p => ({ ...p, [key]: e.target.value }))}
                        />
                      ) : (
                        <input
                          id={`exam-detail-${key}`}
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

                <div className="exam-form-row exam-form-row--checkbox">
                  <label className="exam-checkbox-label">
                    <input
                      type="checkbox"
                      checked={meta.new_test_badge}
                      onChange={e => setMeta(p => ({ ...p, new_test_badge: e.target.checked }))}
                    />
                    <span>Mark as new test <span className="exam-new-badge-preview">NEW</span></span>
                  </label>
                </div>

                </fieldset>
                {editingExam && meta.tag !== editingExam.tag && (
                  <p className="exam-form-note">Changing the tag changes which questions are included in this test.</p>
                )}
                {editingExam && meta.id !== editingExam.id && (
                  <p className="exam-form-note">Changing the ID also changes the examination link.</p>
                )}
                {metaError && <p className="exam-form-error" role="alert">{metaError}</p>}

                <div className="exam-modal-footer">
                  <button className="btn btn-secondary" onClick={handleCloseModal} disabled={savingDetails}>Cancel</button>
                  {editingExam ? (
                    <button className="btn btn-primary" onClick={handleSaveDetails} disabled={savingDetails}>
                      {savingDetails ? 'Saving...' : 'Save Changes'}
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={handleNext}>
                      Next <ChevronRight size={15} />
                    </button>
                  )}
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
