import { useState, useEffect, useRef } from 'react';
import { Megaphone } from 'lucide-react';
import { API_URL } from '../config';
import '../styles/BuildNoteIndicator.css';

export default function BuildNoteIndicator() {
  const [note, setNote] = useState(null);
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/buildnote`)
      .then(r => r.json())
      .then(d => setNote(d.note || null))
      .catch(() => {});
  }, []);

  if (!note) return null;

  const time = new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="build-note-indicator"
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button className="build-note-btn" title="New Build">
        <Megaphone size={18} />
        <span className="build-note-dot" />
      </button>

      {hovered && (
        <div className="build-note-dropdown">
          <div className="build-note-header">
            <span className="build-note-header-dot" />
            New Build <span className="build-note-time">| {time}</span>
          </div>
          <ul className="build-note-list">
            {note.features.map((f, i) => (
              <li key={i} className="build-note-item">
                <span className="build-note-bullet">▸</span>
                {f.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
