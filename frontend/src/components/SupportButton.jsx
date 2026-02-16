import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { CircleAlert, Lock, X } from 'lucide-react';
import './SupportButton.css';

const SupportButton = () => {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'bug'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

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

  // Popup timer effect
  useEffect(() => {
    if (!isDesktop || !user) return;

    const showPopupTimer = () => {
      setShowPopup(false);
      setTimeout(() => {
        setShowPopup(false);
      }, 5000);
    };

    const initialTimer = setTimeout(showPopupTimer, 2000);
    const timer = setInterval(showPopupTimer, 10 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, [isDesktop, user]);

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e) => {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        const maxX = window.innerWidth - 56;
        const maxY = window.innerHeight - 56;

        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position]);

  if (!isDesktop) return null;

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleClick = (e) => {
    if (!isDragging) {
      setIsOpen(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      setMessage('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Support request sent successfully!');
        setFormData({ title: '', description: '', type: 'bug' });
        setTimeout(() => {
          setIsOpen(false);
          setMessage('');
        }, 2000);
      } else {
        setMessage(data.error || data.message || 'Failed to send request');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <>
      <button 
        className="support-button"
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        title="Support (Drag to move)"
      >
        <CircleAlert size={32} />
      </button>

      {showPopup && (
        <div 
          className="support-popup"
          style={{
            left: `${position.x}px`,
            top: `${position.y - 80}px`
          }}
        >
          <div className="popup-content">
            <span className="popup-text">Want to request a feature?</span>
            <button 
              className="popup-close"
              onClick={() => setShowPopup(false)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="support-overlay" onClick={() => setIsOpen(false)}>
          <div className="support-modal" onClick={(e) => e.stopPropagation()}>
            <div className="support-header">
              <h3>Support</h3>
              <button 
                className="support-close"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>

            {!user ? (
              <div className="support-locked">
                <div className="lock-icon">
                  <Lock size={48} />
                </div>
                <p>Only for users</p>
                <p className="lock-subtitle">Please log in to submit a support request</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="support-form">
                <div className="form-group">
                  <label htmlFor="type">Type</label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="bug">Report Bug</option>
                    <option value="enhancement">Feature Request</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="title">Title</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Brief description of the issue/request"
                    maxLength={100}
                    required
                  />
                  <small>{formData.title.length}/100</small>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Detailed description of the issue or feature request"
                    rows={4}
                    maxLength={1000}
                    required
                  />
                  <small>{formData.description.length}/1000</small>
                </div>

                {message && (
                  <div className={`support-message ${message.includes('successfully') ? 'success' : 'error'}`}>
                    {message}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="support-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send'}
                </button>

                <p className="rate-limit-info">
                  You can submit up to 2 requests per hour
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SupportButton;