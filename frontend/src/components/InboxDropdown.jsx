import { useState, useEffect, useRef } from 'react';
import { Trash2, Mail, MailOpen } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { useInbox } from '../context/InboxContext';
import { API_URL } from '../config';
import '../styles/InboxDropdown.css';

export default function InboxDropdown({ isOpen, onClose, onMessageClick }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showConfirm } = useConfirm();
  const dropdownRef = useRef(null);
  
  // Try to use InboxContext, but provide fallback if not available
  let refreshUnreadCount = () => {};
  
  try {
    const inboxContext = useInbox();
    refreshUnreadCount = inboxContext.refreshUnreadCount;
  } catch (error) {
    // InboxProvider not available, use default function
  }

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/inbox`, {
        credentials: 'include'
      });
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = async (message) => {
    // Mark as read if not already read
    if (!message.isRead) {
      try {
        await fetch(`${API_URL}/inbox/${message._id}/read`, {
          method: 'PATCH',
          credentials: 'include'
        });
        
        // Update local state
        setMessages(prev => prev.map(msg => 
          msg._id === message._id ? { ...msg, isRead: true, readAt: new Date() } : msg
        ));
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
    
    onMessageClick(message);
    onClose();
  };

  const handleDeleteMessage = async (messageId, e) => {
    e.stopPropagation();
    
    const confirmed = await showConfirm({
      title: "Delete Message",
      message: "Are you sure you want to delete this message? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger"
    });
    
    if (!confirmed) {
      return;
    }
    
    try {
      await fetch(`${API_URL}/inbox/${messageId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      
      // Refresh unread count after deleting message
      refreshUnreadCount();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="inbox-dropdown" ref={dropdownRef}>
      <div className="inbox-header">
        <h3>Inbox</h3>
        <span className="message-count">{messages.length} messages</span>
      </div>
      
      <div className="inbox-messages">
        {loading ? (
          <div className="inbox-loading">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="inbox-empty">
            <Mail size={24} />
            <p>No messages yet</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`inbox-message-item ${!message.isRead ? 'unread' : ''}`}
              onClick={() => handleMessageClick(message)}
            >
              <div className="message-icon">
                {message.isRead ? <MailOpen size={16} /> : <Mail size={16} />}
              </div>
              
              <div className="message-content">
                <div className="message-header">
                  <span className="message-sender">{message.sender}</span>
                  <span className="message-date">{formatDate(message.createdAt)}</span>
                </div>
                <div className="message-title">{message.title}</div>
                <div className="message-preview">
                  {message.description.length > 60 
                    ? `${message.description.substring(0, 60)}...` 
                    : message.description
                  }
                </div>
              </div>
              
              <button
                className="delete-message-btn"
                onClick={(e) => handleDeleteMessage(message._id, e)}
                title="Delete message"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}