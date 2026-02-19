import { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { User, Trophy, Zap, Target, Calendar, Activity, Award, Monitor, Globe, Terminal, Wrench, Crown, Medal } from 'lucide-react';
import '../styles/Profile.css';


function Badge({ type, unlocked, rank }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const badges = {
    linux: {
      icon: <Monitor size={20} />,
      name: 'Linux Master',
      description: '500+ Linux questions solved',
      color: '#f97316' 
    },
    network: {
      icon: <Globe size={20} />,
      name: 'Network Expert',
      description: '50+ Network questions solved',
      color: '#3b82f6'
    },
    terminal: {
      icon: <Terminal size={20} />,
      name: 'Terminal Pro',
      description: '50+ Terminal commands solved',
      color: '#22c55e' 
    },
    top1: {
      icon: <Crown size={20} />,
      name: 'Champion',
      description: 'Rank #1 on Leaderboard',
      color: '#fbbf24'
    },
    top2: {
      icon: <Medal size={20} />,
      name: 'Runner-up',
      description: 'Rank #2 on Leaderboard',
      color: '#94a3b8'
    },
    top3: {
      icon: <Trophy size={20} />,
      name: 'Top 3',
      description: 'Rank #3 on Leaderboard',
      color: '#cd7f32'
    }
  };

  const badge = badges[type];
  if (!badge) return null;

  return (
    <div 
      className={`profile-badge ${unlocked ? 'unlocked' : 'locked'}`}
      style={{ '--badge-color': badge.color }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="badge-icon">
        {badge.icon}
      </div>
      {unlocked && rank && (
        <div className="badge-rank">#{rank}</div>
      )}
      
      {/* Custom Tooltip */}
      {showTooltip && (
        <div className="badge-tooltip">
          <div className="badge-tooltip-header">
            <div className="badge-tooltip-icon" style={{ color: badge.color }}>
              {badge.icon}
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

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/profile/${username}`);
      
      if (!response.ok) {
        throw new Error('User not found');
      }
      
      const data = await response.json();
      setProfileData(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'linux': return <Monitor size={20} />;
      case 'network': return <Globe size={20} />;
      case 'terminal': return <Terminal size={20} />;
      case 'is': return <Wrench size={20} />;
      default: return <Target size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="user-profile-page">
        <div className="container">
          <div className="user-profile-loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-profile-page">
        <div className="container">
          <div className="user-profile-error">
            <h2>User Not Found</h2>
            <p>The user "{username}" does not exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser && currentUser.username === username;


  const badges = {
    linux: profileData.categoryStats.linux >= 500,
    network: profileData.categoryStats.network >= 50,
    terminal: profileData.categoryStats.terminal >= 50,
    top1: profileData.leaderboardRank === 1,
    top2: profileData.leaderboardRank === 2,
    top3: profileData.leaderboardRank === 3
  };

  return (
    <div className="user-profile-page">
      <div className="container">
        <div className="user-profile-header">
          <div className="user-profile-left">
            <div className="user-profile-avatar">
              <User size={48} />
            </div>
            <div className="user-profile-info">
              <h1 className="user-profile-username">{profileData.username}</h1>
              <div className="user-profile-badges">
                <span className="user-profile-role" data-role={profileData.role}>
                  {profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1)}
                </span>
                <span className="user-profile-level">Level {profileData.level}</span>
                <span className="user-profile-xp">{profileData.xp} XP</span>
              </div>
            </div>
          </div>
          
          <div className="user-profile-achievements">
            <Badge type="linux" unlocked={badges.linux} />
            <Badge type="network" unlocked={badges.network} />
            <Badge type="terminal" unlocked={badges.terminal} />
            {profileData.leaderboardRank <= 3 && (
              <Badge 
                type={`top${profileData.leaderboardRank}`} 
                unlocked={true}
                rank={profileData.leaderboardRank}
              />
            )}
          </div>
        </div>

        <div className="user-profile-stats">
          <div className="user-profile-stats-grid">
            <div className="user-profile-stat-card">
              <div className="user-profile-stat-icon">
                <Trophy size={24} />
              </div>
              <div className="user-profile-stat-content">
                <div className="user-profile-stat-number">{profileData.totalQuestionsSolved}</div>
                <div className="user-profile-stat-label">Questions Solved</div>
              </div>
            </div>

            <div className="user-profile-stat-card">
              <div className="user-profile-stat-icon">
                <Zap size={24} />
              </div>
              <div className="user-profile-stat-content">
                <div className="user-profile-stat-number">{profileData.xp}</div>
                <div className="user-profile-stat-label">Total XP</div>
              </div>
            </div>

            <div className="user-profile-stat-card">
              <div className="user-profile-stat-icon">
                <Activity size={24} />
              </div>
              <div className="user-profile-stat-content">
                <div className="user-profile-stat-number">{profileData.streak.current}</div>
                <div className="user-profile-stat-label">Current Streak</div>
              </div>
            </div>

            <div className="user-profile-stat-card">
              <div className="user-profile-stat-icon">
                <Award size={24} />
              </div>
              <div className="user-profile-stat-content">
                <div className="user-profile-stat-number">{profileData.streak.max}</div>
                <div className="user-profile-stat-label">Max Streak</div>
              </div>
            </div>
          </div>
        </div>

        <div className="user-profile-details">
          <div className="user-profile-section">
            <h3>
              <Target size={20} />
              Preferred Category
            </h3>
            <div className="user-profile-preferred-category">
              <span className="user-profile-category-icon">{getCategoryIcon(profileData.preferredCategory)}</span>
              <span className="user-profile-category-name">{profileData.preferredCategory}</span>
            </div>
          </div>

          <div className="user-profile-section">
            <h3>
              <Trophy size={20} />
              Category Statistics
            </h3>
            <div className="user-profile-category-stats">
              <div className="user-profile-category-stat">
                <span className="user-profile-category-label">
                  <Monitor size={16} style={{ marginRight: '8px' }} />
                  Linux
                </span>
                <span className="user-profile-category-value">{profileData.categoryStats.linux}</span>
              </div>
              <div className="user-profile-category-stat">
                <span className="user-profile-category-label">
                  <Globe size={16} style={{ marginRight: '8px' }} />
                  Network
                </span>
                <span className="user-profile-category-value">{profileData.categoryStats.network}</span>
              </div>
              <div className="user-profile-category-stat">
                <span className="user-profile-category-label">
                  <Terminal size={16} style={{ marginRight: '8px' }} />
                  Terminal
                </span>
                <span className="user-profile-category-value">{profileData.categoryStats.terminal}</span>
              </div>
              <div className="user-profile-category-stat">
                <span className="user-profile-category-label">
                  <Wrench size={16} style={{ marginRight: '8px' }} />
                  IS/Debug
                </span>
                <span className="user-profile-category-value">{profileData.categoryStats.is}</span>
              </div>
            </div>
          </div>

          <div className="user-profile-section">
            <h3>
              <Calendar size={20} />
              Account Information
            </h3>
            <div className="user-profile-account-info">
              <div className="user-profile-info-item">
                <span className="user-profile-info-label">Joined:</span>
                <span className="user-profile-info-value">{formatDate(profileData.joinedAt)}</span>
              </div>
              {profileData.lastActivity && (
                <div className="user-profile-info-item">
                  <span className="user-profile-info-label">Last Activity:</span>
                  <span className="user-profile-info-value">{formatDate(profileData.lastActivity)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}