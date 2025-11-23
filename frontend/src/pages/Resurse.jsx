import { useState, useEffect } from 'react';
import { getDictionary, getResources } from '../services/api';
import '../styles/Resurse.css';

export default function Resurse() {
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

  return (
    <div className="container resurse-page">
      <div className="resurse-header">
        <h1>Learning Resources</h1>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'dictionary' ? 'active' : ''}`}
          onClick={() => setActiveTab('dictionary')}
        >
          Dictionary
        </button>
        <button 
          className={`tab ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          Resources
        </button>
      </div>

      {activeTab === 'dictionary' && (
        <section className="section-content">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search dictionary terms..." 
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
                <p>No terms found matching "{search}"</p>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'resources' && (
        <section className="section-content">
          <div className="resources-grid">
            {resources.map(res => (
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
        </section>
      )}
    </div>
  );
}
