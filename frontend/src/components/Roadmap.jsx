import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Roadmap.css';

export default function Roadmap({ roadmapData, title }) {
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState({});
  const [completedTopics, setCompletedTopics] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem(`roadmap-${title}`);
    if (saved) {
      setCompletedTopics(JSON.parse(saved));
    }
  }, [title]);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const toggleTopic = (sectionId, topicId) => {
    const key = `${sectionId}-${topicId}`;
    const newCompleted = {
      ...completedTopics,
      [key]: !completedTopics[key]
    };
    setCompletedTopics(newCompleted);
    localStorage.setItem(`roadmap-${title}`, JSON.stringify(newCompleted));
  };

  const calculateProgress = () => {
    let total = 0;
    let completed = 0;
    
    roadmapData.sections.forEach(section => {
      section.topics.forEach(topic => {
        total++;
        const key = `${section.id}-${topic.id}`;
        if (completedTopics[key]) completed++;
      });
    });
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const progress = calculateProgress();

  return (
    <div className="roadmap-container">
      <div className="roadmap-header">
        <button onClick={() => navigate('/resurse')} className="back-button">
          ← Back to Resources
        </button>
        <h1 className="roadmap-title">{title} Learning Roadmap</h1>
        
        <div className="progress-section">
          <div className="progress-info">
            <span className="progress-label">Progres total</span>
            <span className="progress-percentage">{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="roadmap-sections">
        {roadmapData.sections.map((section, sectionIndex) => {
          const isExpanded = expandedSections[section.id];
          const sectionCompleted = section.topics.filter(topic => 
            completedTopics[`${section.id}-${topic.id}`]
          ).length;
          const sectionTotal = section.topics.length;
          const sectionProgress = sectionTotal > 0 ? (sectionCompleted / sectionTotal) * 100 : 0;

          return (
            <div key={section.id} className="roadmap-section">
              <div 
                className="section-header"
                onClick={() => toggleSection(section.id)}
              >
                <div className="section-header-content">
                  <div className="section-number">{sectionIndex + 1}</div>
                  <div className="section-info">
                    <h2 className="section-title">{section.title}</h2>
                    <p className="section-description">{section.description}</p>
                  </div>
                </div>
                <div className="section-meta">
                  <span className="section-progress-text">
                    {sectionCompleted}/{sectionTotal}
                  </span>
                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="section-content">
                  <div className="section-progress-bar">
                    <div 
                      className="section-progress-fill" 
                      style={{ width: `${sectionProgress}%` }}
                    ></div>
                  </div>

                  <div className="topics-grid">
                    {section.topics.map(topic => {
                      const isCompleted = completedTopics[`${section.id}-${topic.id}`];
                      
                      return (
                        <div 
                          key={topic.id} 
                          className={`topic-card ${isCompleted ? 'completed' : ''}`}
                        >
                          <div className="topic-header">
                            <div className="topic-header-text">
                              <h3 className="topic-title">{topic.title}</h3>
                              {topic.description && (
                                <p className="topic-description">{topic.description}</p>
                              )}
                            </div>
                            <button
                              className={`checkbox ${isCompleted ? 'checked' : ''}`}
                              onClick={() => toggleTopic(section.id, topic.id)}
                              aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                            >
                              {isCompleted && '✓'}
                            </button>
                          </div>
                          
                          {topic.content && topic.content.map((contentBlock, blockIdx) => (
                            <div key={blockIdx} className="content-block">
                              <h4 className="content-subtitle">{contentBlock.subtitle}</h4>
                              <ul className="topic-items">
                                {contentBlock.points.map((point, idx) => (
                                  <li key={idx} className="topic-item">
                                    <span className="item-text">{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
