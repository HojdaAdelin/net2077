import { useState, useRef, useEffect } from 'react';
import { Flame, Trophy } from 'lucide-react';
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const motivationByTier = {
    inactive: [
      'Nobody is coming to save you. Start.',
      'The pain of discipline is nothing. Start now.',
      'You are not tired. You are weak. Fix it.',
      'Zero days means zero growth. Change that.',
      'Comfort is the enemy. Get moving.',
      'Waiting for motivation is a waste of time. Go.',
      'The version of you that wins does not wait.',
      'You know what to do. You are just not doing it.',
      'Every day you delay, someone else gets ahead.',
      'Discipline starts before you feel ready.',
    ],
    low: [
      'Day {n}. Most people quit here. Not you.',
      'Stay hard.',
      'You started. Now do not stop.',
      'The first days are the hardest. Push.',
      'Everyone wants to be a champion. Few do the work.',
      'Day {n} is not a small thing. Keep stacking.',
      'The grind does not care how you feel today.',
      'You either get better or you get left behind.',
      'Prove to yourself you are serious this time.',
      'Do not be the person who stops at day {n}.',
    ],
    building: [
      '{n} days. The callus is forming.',
      'Outwork everyone. No exceptions.',
      'You are building something real.',
      'Do not let a soft moment undo your hard ones.',
      'Champions do it when they do not feel like it.',
      'Every rep, every day, every streak day counts.',
      'Soft is a choice. You are not choosing it.',
      'The work you do now is the result you see later.',
      '{n} days of refusing to be average.',
      'Most people stop here. That is exactly why you will not.',
    ],
    week: [
      'One week. Most people dream about this.',
      '{n} days of showing up. That is rare.',
      'You do not stop when it hurts. You stop when it is done.',
      'Weak minds rest. You keep going.',
      'This is where character is built.',
      'A week in and you are still here. That says everything.',
      'Talent is common. Showing up daily is not.',
      '{n} days of choosing hard over easy.',
      'The body keeps the score. Make it count.',
      'Week one belongs to you. Take the next one too.',
    ],
    twoWeeks: [
      '{n} days. You are not the same person you were.',
      'You are proof that it is possible.',
      'No days off. No excuses. Just results.',
      'Your mind wanted to quit. Your body did not let it.',
      'Two weeks of war with yourself. You are winning.',
      '{n} days. The weak version of you is gone.',
      'People will ask how you did it. Tell them you just did not stop.',
      'This streak is not luck. It is a decision made daily.',
      'You are past the point where most give up.',
      'Iron sharpens iron. You are the iron.',
    ],
    legendary: [
      '{n} days. You are built different.',
      'This is what it looks like to be uncommon.',
      'Suffer now and live the rest of your life as a champion.',
      '{n} days of not quitting. That is who you are now.',
      'Most people will never see this number. You live it.',
      '{n} days. No one can take that from you.',
      'You did not get here by accident. You bled for this.',
      'This is what legacy looks like.',
      'The weak gave up long ago. You are still here.',
      'You are the standard now. Protect it.',
    ],
  };

  const getMotivation = () => {
    let pool;
    if (!isActive || current === 0) pool = motivationByTier.inactive;
    else if (current >= 30) pool = motivationByTier.legendary;
    else if (current >= 14) pool = motivationByTier.twoWeeks;
    else if (current >= 7) pool = motivationByTier.week;
    else if (current >= 3) pool = motivationByTier.building;
    else pool = motivationByTier.low;

    const msg = pool[Math.floor(Math.random() * pool.length)];
    return msg.replace('{n}', current);
  };

  return (
    <div className="streak-indicator" ref={dropdownRef}>
      <button
        className={`streak-button ${isActive ? 'active' : 'inactive'}`}
        onClick={() => setDropdownOpen(v => !v)}
        title={`Current streak: ${current} days`}
      >
        <Flame className={`streak-icon ${isActive ? 'active' : 'inactive'}`} size={16} />
        <span className="streak-count">{current}</span>
      </button>

      {dropdownOpen && (
        <div className="streak-dropdown">
          <div className="streak-card-header">
            <Flame size={16} className={`streak-card-flame ${isActive ? 'active' : 'inactive'}`} />
            <span className="streak-card-number">{current}</span>
            <span className="streak-card-label">day streak</span>
          </div>

          <div className="streak-card-divider" />

          <div className="streak-card-stats">
            <div className="streak-card-stat">
              <Trophy size={13} className="streak-stat-icon" />
              <span className="streak-stat-label">Best:</span>
              <span className="streak-stat-value">{max}</span>
            </div>
          </div>

          <p className="streak-card-motivation">{getMotivation()}</p>
        </div>
      )}
    </div>
  );
}
