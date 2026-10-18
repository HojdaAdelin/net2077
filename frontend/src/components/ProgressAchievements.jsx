import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { getProfileAchievements } from '../utils/achievements';
import ProfileBadge from './ProfileBadge';

export default function ProgressAchievements({ username, onSummaryChange }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    onSummaryChange(null);
    fetch(`${API_URL}/profile/${encodeURIComponent(username)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load achievements');
        return response.json();
      })
      .then(data => {
        if (controller.signal.aborted) return;
        const achievements = getProfileAchievements(data);
        setProfile(data);
        onSummaryChange({ unlocked: achievements.filter(item => item.unlocked).length, total: achievements.length });
      })
      .catch(error => { if (error.name !== 'AbortError') setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [username, retry, onSummaryChange]);

  return (
    <div className="frame-selector-card progress-achievements">
      <div className="progress-achievements-heading">
        <h3>Achievements</h3>
        <p>Your profile badges, unlock requirements, and next milestones.</p>
      </div>
      {loading ? <p role="status">Loading achievements...</p> : error ? (
        <div role="alert" className="progress-achievements-error">
          <span>Could not load achievements.</span>
          <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button>
        </div>
      ) : (
        <ul className="progress-achievements-list">
          {getProfileAchievements(profile).map(achievement => {
            const nextTarget = achievement.unlocked && !achievement.isLegendary ? achievement.legendary : null;
            return (
              <li key={achievement.type} className="progress-achievement">
                <ProfileBadge {...achievement} tooltip={false} />
                <div className="progress-achievement-details">
                  <div className="progress-achievement-heading">
                    <h4>{achievement.name}</h4>
                    <span className={`progress-achievement-status ${achievement.unlocked ? 'is-unlocked' : ''}`}>
                      {achievement.unlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                  <p>{achievement.description}</p>
                  <span className="progress-achievement-progress">
                    {achievement.rank ? `Current rank: ${achievement.leaderboardRank ? `#${achievement.leaderboardRank}` : 'Unranked'}` :
                      `${achievement.current.toLocaleString()} / ${(nextTarget || achievement.target).toLocaleString()}${achievement.type === 'level' ? ' levels' : ''}`}
                    {nextTarget && ` · Next: ${achievement.legendaryName}`}
                    {achievement.isLegendary && ' · Legendary'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
