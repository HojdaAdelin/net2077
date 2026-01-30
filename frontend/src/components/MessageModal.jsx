import { X } from 'lucide-react';
import '../styles/MessageModal.css';

export default function MessageModal({ message, isOpen, onClose }) {
  if (!isOpen || !message) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="message-modal-overlay" onClick={onClose}>
      <div className="message-modal" onClick={(e) => e.stopPropagation()}>
        <div className="message-modal-header">
          <div className="message-modal-info">
            <h2>{message.title}</h2>
            <div className="message-modal-meta">
              <span className="message-sender">From: {message.sender}</span>
              <span className="message-date">{formatDate(message.createdAt)}</span>
            </div>
          </div>
          <button className="message-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="message-modal-body">
          <div className="message-description">
            {message.description.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}