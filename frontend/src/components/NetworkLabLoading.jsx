const Line = ({ className = '' }) => <span className={`nlp-skeleton ${className}`} />;

export default function NetworkLabLoading({ view = 'list' }) {
  if (view === 'catalog') return <div className="nlp-page npc-page" aria-busy="true">
    <span className="nlp-loading-status" role="status">Loading network problems…</span>
    <div aria-hidden="true">
      <div className="nlp-skeleton-hero"><div><Line className="nlp-skeleton-eyebrow" /><Line className="nlp-skeleton-heading" /><Line className="nlp-skeleton-subtitle" /></div><Line className="nlp-skeleton-action" /></div>
      <Line className="npc-loading-progress" />
      <div className="npc-loading-layout">
        <div className="npc-loading-sidebar">{[0, 1, 2, 3, 4, 5].map(item => <Line key={item} />)}</div>
        <div className="npc-loading-main">
          <Line />
          <div className="npc-grid">{[0, 1, 2, 3].map(card => <div className="npc-lab" key={card}><div className="nlp-card-top"><Line className="nlp-skeleton-label" /><Line className="nlp-skeleton-badge" /></div><Line className="nlp-skeleton-title" /><Line className="nlp-skeleton-line" /><Line className="nlp-skeleton-short" /><div className="nlp-skeleton-tags"><Line className="nlp-skeleton-tag" /><Line className="nlp-skeleton-tag" /></div></div>)}</div>
        </div>
      </div>
    </div>
  </div>;
  return <div className={`nlp-page${view === 'problem' ? ' nlp-problem-page' : ''}`} aria-busy="true">
    <span className="nlp-loading-status" role="status">{view === 'problem' ? 'Preparing your workspace…' : 'Loading network problems…'}</span>
    <div aria-hidden="true">
      <div className="nlp-skeleton-hero"><div><Line className="nlp-skeleton-eyebrow" /><Line className="nlp-skeleton-heading" /><Line className="nlp-skeleton-subtitle" /></div><Line className="nlp-skeleton-action" /></div>
      {view === 'problem' ? <>
        <div className="nlp-brief">{[0, 1].map(section => <div key={section} className="nlp-skeleton-stack"><Line className="nlp-skeleton-label" /><Line className="nlp-skeleton-line" /><Line className="nlp-skeleton-line" /><Line className="nlp-skeleton-short" /></div>)}</div>
        <div className="nlp-skeleton-workspace"><div className="nlp-skeleton-sidebar">{[0, 1, 2, 3].map(item => <Line className="nlp-skeleton-device" key={item} />)}</div><div className="nlp-skeleton-stage"><Line className="nlp-skeleton-stage-toolbar" /><div className="nlp-skeleton-stage-center"><Line className="nlp-skeleton-device" /><Line className="nlp-skeleton-device" /><Line className="nlp-skeleton-device" /></div></div><div className="nlp-skeleton-inspector"><Line className="nlp-skeleton-action" /><Line className="nlp-skeleton-line" /><Line className="nlp-skeleton-line" /><Line className="nlp-skeleton-short" /></div></div>
      </> : <>
        <div className="nlp-overview nlp-skeleton-overview">{[0, 1, 2].map(stat => <div key={stat}><Line className="nlp-skeleton-number" /><Line className="nlp-skeleton-label" /></div>)}<div className="nlp-overview-progress"><Line className="nlp-skeleton-label" /><Line className="nlp-skeleton-progress" /></div></div>
        <div className="nlp-list-toolbar"><Line className="nlp-skeleton-search" /><div className="nlp-list-options"><Line className="nlp-skeleton-filters" /><Line className="nlp-skeleton-action" /></div></div>
        <div className="nlp-grid">{[0, 1, 2, 3, 4, 5].map(card => <div key={card} className="nlp-card nlp-skeleton-card"><div className="nlp-card-top"><Line className="nlp-skeleton-icon" /><Line className="nlp-skeleton-badge" /></div><Line className="nlp-skeleton-title" /><Line className="nlp-skeleton-line" /><Line className="nlp-skeleton-short" /><div className="nlp-skeleton-tags"><Line className="nlp-skeleton-tag" /><Line className="nlp-skeleton-tag" /></div><div className="nlp-card-footer"><Line className="nlp-skeleton-label" /><Line className="nlp-skeleton-label" /></div></div>)}</div>
      </>}
    </div>
  </div>;
}
