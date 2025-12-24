import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDictionary, getResources } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Resurse.css';

export default function Resurse() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [dictionary, setDictionary] = useState([]);
  const [resources, setResources] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('dictionary');

  useEffect(() => {
    getDictionary().then(setDictionary).catch(() => {});
    getResources().then(setResources).catch(() => {});
  }, []);

  const filtered = dictionary.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.content.toLowerCase().includes(search.toLowerCase())
  );

  const roadmaps = resources.filter(r => r.type === 'roadmap');
  const otherResources = resources.filter(r => r.type !== 'roadmap');

  const handleRoadmapClick = (title) => {
    navigate(`/roadmap/${title}`);
  };

  return (
    <div className="container resurse-page">
      <div className="resurse-header">
        <h1>{t('resources.title')}</h1>
        <p>{t('resources.subtitle')}</p>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'dictionary' ? 'active' : ''}`}
          onClick={() => setActiveTab('dictionary')}
        >
          {t('resources.dictionary')}
        </button>
        <button 
          className={`tab ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          {t('resources.roadmaps')}
        </button>
      </div>

      {activeTab === 'dictionary' && (
        <section className="section-content">
          <div className="search-box">
            <input 
              type="text" 
              placeholder={t('resources.searchPlaceholder')} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="dictionary-grid">
            {filtered.length > 0 ? (
              filtered.map(item => (
                <div key={item._id} className="dictionary-card">
                  <h3 className="term-title">{item.title}</h3>
                  <p className="term-content">{item.content}</p>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>{t('resources.noResults')}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'resources' && (
        <section className="section-content">
          {roadmaps.length > 0 && (
            <div className="roadmaps-grid">
              {roadmaps.map(roadmap => (
                <div 
                  key={roadmap._id} 
                  className="roadmap-card"
                  onClick={() => handleRoadmapClick(roadmap.title)}
                >
                  <div className="roadmap-content">
                    <h3>{roadmap.title}</h3>
                    <p>{roadmap.content}</p>
                    <div className="roadmap-stats">
                      <span className="stat-item">
                        {roadmap.roadmap?.sections?.length || 0} sections
                      </span>
                      <span className="stat-item">
                        Progress tracking
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {otherResources.length > 0 && (
            <>
              <h2 className="section-subtitle" style={{ marginTop: '48px' }}>Other Resources</h2>
              <div className="resources-grid">
                {otherResources.map(res => (
                  <div key={res._id} className="resource-card">
                    <h3>{res.title}</h3>
                    <p>{res.content}</p>
                    <div className="resource-footer">
                      <span className="resource-badge">{res.type}</span>
                      <button className="btn btn-secondary btn-sm">View Resource</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
