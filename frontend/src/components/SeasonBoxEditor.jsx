import { useEffect, useState } from 'react';
import { Gift, ChevronDown, Plus, ArrowUp, ArrowDown, Trash2, Save } from 'lucide-react';
import { API_URL } from '../config';
import AvatarFrame from './AvatarFrame';
import { seasonBoxDistribution } from '../utils/seasonBoxDistribution';
import '../styles/SeasonBoxEditor.css';
import '../styles/AvatarFrame.css';
import '../styles/NameEffects.css';

const TYPES = { gold: 'Gold', item: 'Inventory item', frame: 'Avatar frame', nameEffect: 'Name effect', profileEffect: 'Profile effect' };
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const newId = () => `box-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export default function SeasonBoxEditor() {
  const [config, setConfig] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setMessage(null);
    fetch(`${API_URL}/season-box/config`, { credentials: 'include', signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load Season Box.');
        if (!controller.signal.aborted) { setConfig(data.config); setCatalog(data.catalog); setDirty(false); }
      })
      .catch(error => { if (error.name !== 'AbortError') setMessage({ error: true, text: error.message }); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  const setDraft = updater => { setDirty(true); setMessage(null); setConfig(updater); };
  const prizes = config?.prizes || [];
  const distribution = seasonBoxDistribution(prizes);
  const update = (id, changes) => {
    setMessage(null);
    setDraft(previous => ({ ...previous, prizes: previous.prizes.map(prize => prize.id === id ? { ...prize, ...changes } : prize) }));
  };
  const changeType = (prize, type) => {
    const first = catalog.find(source => source.type === type);
    update(prize.id, { type, sourceKey: first?.sourceKey || '', quantity: 1, amount: 10,
      label: type === 'gold' ? '10 Gold' : first?.label || '' });
  };
  const move = (index, delta) => setDraft(previous => {
    const rows = [...previous.prizes];
    [rows[index], rows[index + delta]] = [rows[index + delta], rows[index]];
    return { ...previous, prizes: rows };
  });
  const save = async event => {
    event.preventDefault();
    if (saving || !distribution.valid) return;
    setSaving(true); setMessage(null);
    try {
      const response = await fetch(`${API_URL}/season-box/config`, { method: 'PUT',
        headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(config) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to save Season Box.');
      setConfig(data.config); setCatalog(data.catalog); setDirty(false);
      setMessage({ text: 'Season Box saved. New openings will use these rewards and chances.' });
    } catch (error) { setMessage({ error: true, text: error.message }); }
    finally { setSaving(false); }
  };

  return (
    <details className="rd-box-editor">
      <summary className="rd-box-summary">
        <Gift size={18} aria-hidden="true" />
        <span>Season Box<small>Rewards, rarity, chances and ticket ranges</small></span>
        <ChevronDown size={18} className="rd-box-chevron" aria-hidden="true" />
      </summary>
      <div className="rd-box-body">
        {loading ? <p className="rd-box-note" role="status">Loading Season Box...</p> : config ? (
          <form onSubmit={save}>
            <fieldset disabled={saving} className="rd-box-fields">
              <div className="rd-box-settings">
                <label>Opening cost (gold)<input className="rd-input" type="number" min="0" max="1000000000" step="1" required value={config.cost}
                  onChange={event => setDraft(previous => ({ ...previous, cost: event.target.value }))} /></label>
                <label>Duplicate cosmetic (gold)<input className="rd-input" type="number" min="0" max="1000000000" step="1" required value={config.duplicateGold}
                  onChange={event => setDraft(previous => ({ ...previous, duplicateGold: event.target.value }))} /></label>
                <div className="rd-box-image-note"><img src="/season.png" alt="Season Box" /><span>Image: season.png</span></div>
              </div>

              <div className={`rd-box-calculator${distribution.valid ? ' is-valid' : ''}`} aria-live="polite">
                <strong>{distribution.total.toFixed(2)}% / 100%</strong>
                <span>{!distribution.precisionValid ? 'Every chance must be positive, with up to 2 decimals.' :
                  distribution.remaining > 0 ? `${distribution.remaining.toFixed(2)}% left to assign` :
                  distribution.remaining < 0 ? `${(-distribution.remaining).toFixed(2)}% over the limit` : 'All 10,000 tickets assigned'}</span>
                <small>Tickets 1–10,000 · 0.01% = 1 ticket · Ranges follow the reward order.</small>
              </div>

              <div className="rd-box-rewards">
                {prizes.map((prize, index) => {
                  const source = catalog.find(item => item.sourceKey === prize.sourceKey);
                  const range = distribution.ranges[index];
                  return (
                    <div key={prize.id} className={`rd-box-reward rd-box-rarity-${prize.rarity}`}>
                      <div className="rd-box-reward-heading">
                        <span className="rd-box-reward-preview" aria-hidden="true">
                          {prize.type === 'frame' && source ? <AvatarFrame frame={source.frameKey} size={32} /> :
                            prize.type === 'nameEffect' && source ? <span className={`name-effect-${source.effectKey}`}>Aa</span> : <Gift size={20} />}
                        </span>
                        <strong>{index + 1}. {prize.label || 'New reward'}</strong>
                        <div className="rd-box-row-actions">
                          <button type="button" title="Move up" aria-label={`Move reward ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
                          <button type="button" title="Move down" aria-label={`Move reward ${index + 1} down`} disabled={index === prizes.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
                          <button type="button" title="Remove reward" aria-label={`Remove reward ${index + 1}`} onClick={() => setDraft(previous => ({ ...previous, prizes: previous.prizes.filter(row => row.id !== prize.id) }))}><Trash2 size={15} /></button>
                        </div>
                      </div>
                      <div className="rd-box-reward-fields">
                        <label>Type<select className="rd-input" value={prize.type} onChange={event => changeType(prize, event.target.value)}>
                          {Object.entries(TYPES).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
                        </select></label>
                        {prize.type === 'gold' ? <label>Gold amount<input className="rd-input" type="number" min="1" max="1000000000" step="1" required value={prize.amount ?? 10}
                          onChange={event => update(prize.id, { amount: event.target.value, label: `${event.target.value} Gold` })} /></label> :
                          <label>Reward<select className="rd-input" value={prize.sourceKey || ''} required onChange={event => {
                            const item = catalog.find(row => row.sourceKey === event.target.value);
                            update(prize.id, { sourceKey: event.target.value, label: item?.label || '' });
                          }}><option value="">Select a reward</option>
                            {catalog.filter(item => item.type === prize.type).map(item => <option key={item.sourceKey} value={item.sourceKey}>{item.label}</option>)}
                          </select></label>}
                        <label>Rarity<select className="rd-input" value={prize.rarity} onChange={event => update(prize.id, { rarity: event.target.value })}>
                          {RARITIES.map(rarity => <option key={rarity} value={rarity}>{rarity}</option>)}
                        </select></label>
                        <label>Chance (%)<input className="rd-input" type="number" min="0.01" max="100" step="0.01" required value={prize.chance}
                          onChange={event => update(prize.id, { chance: event.target.value })} /></label>
                        <div className="rd-box-ticket-field"><span>Ticket range</span><output>{range ? `${range.min.toLocaleString()}–${range.max.toLocaleString()}` : 'Set chance'}</output></div>
                      </div>
                      <div className="rd-box-reward-extra">
                        <label>Display name<input className="rd-input" value={prize.label || ''} maxLength={160} onChange={event => update(prize.id, { label: event.target.value })} /></label>
                        {prize.type === 'item' && <label>Quantity<input className="rd-input" type="number" min="1" max="1000000000" step="1" required value={prize.quantity ?? 1}
                          onChange={event => update(prize.id, { quantity: event.target.value })} /></label>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" className="rd-box-add" onClick={() => setDraft(previous => ({ ...previous, prizes: [...previous.prizes,
                { id: newId(), type: 'gold', amount: 10, label: '10 Gold', rarity: 'common', chance: '', quantity: 1 }] }))}><Plus size={15} /> Add reward</button>
              <p className="rd-box-note">Inventory rewards use usable shop items. Profile rewards include existing frames and effects from the database and current rewards.</p>
            </fieldset>
            <div className="rd-box-footer">
              <button type="submit" className="rd-primary-btn" disabled={saving || !distribution.valid}><Save size={15} /> {saving ? 'Saving...' : 'Save Season Box'}</button>
              <button type="button" className="rd-box-reload" disabled={saving} onClick={() => setReload(value => value + 1)}>Reload saved</button>
              <span className="rd-box-draft-status">{dirty ? 'Unsaved changes' : config.revision ? `Saved configuration v${config.revision}` : 'Default configuration'}</span>
            </div>
          </form>
        ) : null}
        {message && <div className={`rd-msg ${message.error ? 'error' : 'success'}`} role={message.error ? 'alert' : 'status'}>{message.text}</div>}
        {!loading && !config && <button type="button" className="rd-box-reload" onClick={() => setReload(value => value + 1)}>Try again</button>}
      </div>
    </details>
  );
}
