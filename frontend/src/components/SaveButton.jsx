import { useState, useEffect, useContext } from 'react';
import { Bookmark } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { toggleSave } from '../services/api';
import './SaveButton.css';

export default function SaveButton({ itemId, type, title, savedItems = [], onToggle }) {
  const { user } = useContext(AuthContext);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Recalculate whenever itemId or savedItems changes
  useEffect(() => {
    setIsSaved(
      savedItems.some(s => s.itemId?.toString() === itemId?.toString() && s.type === type)
    );
  }, [itemId, type, savedItems]);

  if (!user) return null;

  const handleClick = async (e) => {
    e.stopPropagation();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const data = await toggleSave(itemId, type, title);
      if (data.success) {
        setIsSaved(data.saved);
        // propagate updated list to parent so other buttons stay in sync
        if (onToggle) onToggle(data.savedItems || []);
      } else {
        setError(data.message || 'Could not save.');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('Something went wrong.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="save-btn-root">
      <button
        className={`save-btn-trigger${isSaved ? ' save-btn-active' : ''}`}
        onClick={handleClick}
        disabled={loading}
        title={isSaved ? 'Remove from saved' : 'Save'}
      >
        <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
      </button>
      {error && <span className="save-btn-error">{error}</span>}
    </div>
  );
}
