import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../config';
import SeasonBox from './SeasonBox';

export default function SeasonBoxes({ onCountChange, ...props }) {
  const [boxes, setBoxes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [openingId, setOpeningId] = useState(null);
  const openingRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`${API_URL}/season-box/boxes`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success || !Array.isArray(data.boxes) || !data.boxes.length) throw new Error(data.message || 'Unable to load boxes.');
        if (!controller.signal.aborted) { setBoxes(data.boxes); onCountChange?.(data.boxes.length); }
      })
      .catch(failure => { if (failure.name !== 'AbortError') setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload, onCountChange]);
  if (loading) return <p className="season-boxes-status" role="status">Loading boxes...</p>;
  if (error) return <div className="season-boxes-status" role="alert"><p>{error}</p><button type="button" className="btn btn-primary" onClick={() => setReload(value => value + 1)}>Try again</button></div>;
  return <div className={`season-boxes${boxes.length > 1 ? ' season-boxes--multiple' : ''}`}>
    {boxes.map(box => <SeasonBox key={box.id} box={box} compact={boxes.length > 1} busy={openingId !== null} {...props}
      onOpeningChange={active => {
        if (active) {
          if (openingRef.current) return false;
          openingRef.current = box.id; setOpeningId(box.id);
        } else if (openingRef.current === box.id) { openingRef.current = null; setOpeningId(null); }
        return true;
      }} />)}
  </div>;
}
