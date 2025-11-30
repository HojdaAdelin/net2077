import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getRoadmap } from '../services/api';
import Roadmap from '../components/Roadmap';

export default function RoadmapPage() {
  const { title } = useParams();
  const [roadmapData, setRoadmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        setLoading(true);
        const data = await getRoadmap(title);
        setRoadmapData(data);
        setError(null);
      } catch (err) {
        setError('Failed to load roadmap');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, [title]);

  if (loading) {
    return <div className="loading">Loading roadmap...</div>;
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--error)' }}>{error}</h2>
      </div>
    );
  }

  if (!roadmapData || !roadmapData.roadmap) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2>Roadmap not found</h2>
      </div>
    );
  }

  return <Roadmap roadmapData={roadmapData.roadmap} title={roadmapData.title} />;
}
