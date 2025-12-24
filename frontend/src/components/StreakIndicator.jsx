import { useState, useRef, useEffect } from 'react';
import { Flame } from 'lucide-react';
import '../styles/StreakIndicator.css';

export default function StreakIndicator({ streak }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { current = 0, max = 0, isActive = false } = streak || {};

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <div className="streak-indicator" ref={dropdownRef}>
      <button 
        className={`streak-button ${isActive ? 'active' : 'inactive'}`}
        onClick={toggleDropdown}
        title={`Current streak: ${current} days`}
      >
        {isActive && current > 0 ? (
          <Flame className="streak-icon active" size={16} />
        ) : (
          <Flame className="streak-icon inactive" size={16} />
        )}
        <span className="streak-count">{current}</span>
      </button>

      {dropdownOpen && (
        <div className="streak-dropdown">
          <div className="streak-option">
            <span>Current: {current}</span>
          </div>
          <div className="streak-option">
            <span>Best: {max}</span>
          </div>
        </div>
      )}
    </div>
  );
}