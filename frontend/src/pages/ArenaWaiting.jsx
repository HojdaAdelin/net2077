import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Swords, Clock, Trophy, Target, Flame } from 'lucide-react';
import { API_URL } from '../config';
import '../styles/Arena.css';

export default function ArenaWaiting() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [waitingTimeLeft, setWaitingTimeLeft] = useState(120);

  useEffect(() => {
    loadMatch();
  }, [matchId]);

  useEffect(() => {
    if (!match) return;

    const startTime = new Date(match.createdAt).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, 120 - elapsed);
      setWaitingTimeLeft(remaining);

      if (remaining === 0) {
        navigate('/arena');
        alert('Match expired - no opponent joined in time');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [match, navigate]);

  useEffect(() => {
    if (!match) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/arena/${matchId}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          clearInterval(interval);
          navigate('/arena');
          alert('Match expired or cancelled');
          return;
        }

        const data = await response.json();
        
        if (data.match.status === 'active') {
          clearInterval(interval);
          navigate(`/arena/match/${matchId}`);
        } else if (data.match.status === 'cancelled') {
          clearInterval(interval);
          navigate('/arena');
          alert('Match expired - no opponent joined in time');
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [match, matchId, navigate]);

  const loadMatch = async () => {
    try {
      const response = await fetch(`${API_URL}/arena/${matchId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        navigate('/arena');
        return;
      }

      const data = await response.json();
      
      if (data.match.status !== 'waiting') {
        navigate('/arena');
        return;
      }

      if (data.match.creator._id !== user.id) {
        navigate('/arena');
        alert('This is not your match');
        return;
      }

      setMatch(data.match);
    } catch (error) {
      console.error('Error loading match:', error);
      navigate('/arena');
    } finally {
      setLoading(false);
    }
  };

  const cancelMatch = async () => {
    try {
      await fetch(`${API_URL}/arena/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ matchId })
      });
    } catch (error) {
      console.error('Error canceling match:', error);
    }
    
    navigate('/arena');
  };

  const formatWaitingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDurationText = (count) => {
    const durations = { 10: '2 min', 20: '4 min', 30: '6 min' };
    return durations[count];
  };

  if (loading) {
    return (
      <div className="container arena-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!match) {
    return null;
  }

  return (
    <div className="container arena-page">
      <div className="arena-waiting">
        <div className="waiting-animation">
          <Swords size={64} className="swords-icon" />
        </div>
        <h2>Waiting for Opponent</h2>
        <p>{match.visibility === 'private' ? 'Share this match ID with your friend:' : 'Waiting for someone to join...'}</p>
        {match.visibility === 'private' && (
          <div className="match-id-display">
            <span className="match-id">{match.matchId}</span>
          </div>
        )}
        
        <div className="waiting-timer">
          <Clock size={24} />
          <span className={`timer-text ${waitingTimeLeft <= 30 ? 'danger' : ''}`}>
            {formatWaitingTime(waitingTimeLeft)}
          </span>
        </div>

        <div className="match-details">
          <div className="detail-item">
            <Target size={18} />
            <span>{match.category}</span>
          </div>
          <div className="detail-item">
            <Trophy size={18} />
            <span>{match.questionCount} Questions</span>
          </div>
          <div className="detail-item">
            <Clock size={18} />
            <span>{getDurationText(match.questionCount)}</span>
          </div>
          <div className="detail-item">
            <Flame size={18} />
            <span>{match.mode === 'bloody' ? 'Bloody Mode' : 'Normal Game'}</span>
          </div>
        </div>
        <button onClick={cancelMatch} className="btn btn-secondary arena-back-btn">
          Cancel
        </button>
      </div>
    </div>
  );
}
