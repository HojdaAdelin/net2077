import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { API_URL } from '../config';
import '../styles/Terms.css';

export default function Terms() {
  const [terms, setTerms] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/terms`)
      .then(r => r.json())
      .then(d => { setTerms(d.terms); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="terms-page">
        <div className="container">
          <div className="terms-loading">Loading terms...</div>
        </div>
      </div>
    );
  }

  if (!terms) {
    return (
      <div className="terms-page">
        <div className="container">
          <div className="terms-empty">Terms & Conditions not available.</div>
        </div>
      </div>
    );
  }

  const doc = terms.content?.document;
  if (!doc) {
    return (
      <div className="terms-page">
        <div className="container">
          <div className="terms-empty">Invalid terms structure.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="terms-page">
      <div className="container">
        <div className="terms-header">
          <div className="terms-header-icon"><FileText size={28} /></div>
          <div className="terms-header-text">
            <h1>{doc.title}</h1>
            <div className="terms-meta">
              <span>Version {doc.version}</span>
              <span>•</span>
              <span>Last updated: {doc.last_updated}</span>
              <span>•</span>
              <span>{doc.language.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {doc.operator && (
          <div className="terms-operator">
            <h3>Operator Information</h3>
            <div className="terms-operator-grid">
              <div><strong>Name:</strong> {doc.operator.name}</div>
              <div><strong>Country:</strong> {doc.operator.country}</div>
              <div><strong>Contact:</strong> {doc.operator.contact_email}</div>
              <div><strong>Website:</strong> <a href={doc.operator.website} target="_blank" rel="noopener noreferrer">{doc.operator.website}</a></div>
            </div>
          </div>
        )}

        <div className="terms-sections">
          {doc.sections?.map((section) => (
            <div key={section.id} className="terms-section" id={section.id}>
              <h2 className="terms-section-title">{section.title}</h2>
              {section.blocks?.map((block, i) => {
                if (block.type === 'paragraph') {
                  return <p key={i} className="terms-paragraph">{block.text}</p>;
                }
                if (block.type === 'list' && Array.isArray(block.items)) {
                  // Check if items are definition pairs
                  if (block.items[0]?.term && block.items[0]?.definition) {
                    return (
                      <dl key={i} className="terms-dl">
                        {block.items.map((item, j) => (
                          <div key={j} className="terms-dl-item">
                            <dt>{item.term}</dt>
                            <dd>{item.definition}</dd>
                          </div>
                        ))}
                      </dl>
                    );
                  }
                  // Plain list
                  return (
                    <ul key={i} className="terms-ul">
                      {block.items.map((item, j) => <li key={j}>{item}</li>)}
                    </ul>
                  );
                }
                return null;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
