import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSaved, toggleSave } from '../services/api';
import { BookOpen, HelpCircle, X, Trash2 } from 'lucide-react';
import '../styles/SavedContent.css';

export default function SavedContent({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const overlayRef = useRef(null);

  useEffect(() => {
    getSaved()
      .then(data => setItems(data.saved || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleRemove = async (e, item) => {
    e.stopPropagation();
    const data = await toggleSave(item.itemId, item.type, item.title);
    if (data.success) setItems(data.savedItems || []);
  };

  const handleNavigate = (item) => {
    onClose();
    if (item.type === 'question') {
      navigate(`/question/${item.itemId}`);
    } else {
      navigate(`/learn/lesson/${item.itemId}`);
    }
  };

  return (
    <div className="saved-overlay" ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="saved-modal">
        <div className="saved-modal-header">
          <span>Saved Content</span>
          <button className="saved-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="saved-modal-body">
          {loading ? (
            <div className="saved-empty">Loading...</div>
          ) : items.length === 0 ? (
            <div className="saved-empty">Nothing saved yet.</div>
          ) : (
            <div className="saved-list">
              {items.map((item) => (
                <div key={`${item.type}-${item.itemId}`} className="saved-item" onClick={() => handleNavigate(item)}>
                  <div className="saved-item-icon">
                    {item.type === 'question' ? <HelpCircle size={18} /> : <BookOpen size={18} />}
                  </div>
                  <div className="saved-item-info">
                    <span className="saved-item-title">{item.title || 'Untitled'}</span>
                    <span className={`saved-item-tag ${item.type}`}>{item.type}</span>
                  </div>
                  <button
                    className="saved-item-remove"
                    onClick={(e) => handleRemove(e, item)}
                    title="Remove"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
