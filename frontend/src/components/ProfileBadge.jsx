import { useState } from 'react';
import { Monitor, Globe, Terminal, Zap, Crown, Medal, Trophy, BadgeQuestionMark, Cpu } from 'lucide-react';
import { getAchievement } from '../utils/achievements';
import '../styles/Profile.css';

const icons = { linux: Monitor, network: Globe, terminal: Terminal, level: Zap,
  top1: Crown, top2: Medal, top3: Trophy, questions: BadgeQuestionMark, arduino: Cpu };

export default function ProfileBadge({ type, unlocked, rank, count, level, tooltip = true }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const badge = getAchievement(type, count, level);
  const Icon = icons[type];
  if (!badge) return null;

  return (
    <div 
      className={`profile-badge ${unlocked ? 'unlocked' : 'locked'} ${badge.isLegendary ? 'legendary' : ''}`}
      style={{ '--badge-color': badge.color }}
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="badge-icon">
        <Icon size={20} />
      </div>
      {unlocked && rank && (
        <div className="badge-rank">#{rank}</div>
      )}
      
      {tooltip && showTooltip && (
        <div className="badge-tooltip">
          <div className="badge-tooltip-header">
            <div className="badge-tooltip-icon" style={{ color: badge.color }}>
              <Icon size={20} />
            </div>
            <div className="badge-tooltip-title">{badge.name}</div>
          </div>
          <div className="badge-tooltip-description">
            {unlocked ? badge.description : `🔒 ${badge.description}`}
          </div>
          {unlocked && (
            <div className="badge-tooltip-status unlocked-status">
              ✓ Unlocked
            </div>
          )}
          {!unlocked && (
            <div className="badge-tooltip-status locked-status">
              Locked
            </div>
          )}
        </div>
      )}
    </div>
  );
}

