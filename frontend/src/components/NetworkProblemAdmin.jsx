import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, ArrowLeft, ArrowUp, ArrowDown, Copy, Trash2, Pencil, Network, Eye, Save, Code2, Settings2, Search } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { networkRequest } from '../services/networkProblems';
import { normalizeProblem } from '../../../backend/network/problemDefinition.js';
import example from '../../../backend/data/network-problem.example.json';
import { NetworkWorkspace } from '../pages/NetworkLab';
import NetworkProblemPreview from './NetworkProblemPreview';
import '../styles/NetworkProblems.css';

const FIELDS = ['schemaVersion', 'slug', 'title', 'summary', 'description', 'difficulty', 'xp', 'published', 'tags', 'hints', 'permissions', 'topology', 'objectives'];
const portable = problem => Object.fromEntries(FIELDS.map(field => [field, problem[field]]));
const blank = () => normalizeProblem(structuredClone(example));
const Field = ({ label, children }) => <label className="npa-field"><span>{label}</span>{children}</label>;

function TopologyDesigner({ topology, onChange, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; element.showModal();
    return () => { element.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={dialog} className="npa-designer-dialog" onCancel={event => { event.preventDefault(); onClose(); }}><div className="npa-designer-heading"><div><h2>Design the starting topology</h2><p>Place devices, connect ports and configure preset addresses. Changes stay in this draft until you save the problem.</p></div><button type="button" className="nlp-button primary" onClick={onClose}><CheckIcon />Done</button></div><NetworkWorkspace initialTopology={topology} onTopologyChange={onChange} embedded /></dialog>;
}
const CheckIcon = () => <Save size={14} />;

function ObjectiveEditor({ goals, devices, onChange }) {
  const patch = (index, change) => onChange(goals.map((goal, i) => i === index ? { ...goal, ...change } : goal));
  const optional = (index, key, value) => onChange(goals.map((goal, i) => { if (i !== index) return goal; const next = { ...goal }; if (value === '') delete next[key]; else next[key] = value; return next; }));
  const add = () => onChange([...goals, { id: `goal-${Date.now()}`, type: 'ping', label: 'Verify connectivity', source: devices[0]?.id || '', target: '192.168.1.20', expected: true }]);
  return <section className="npa-section"><div className="npa-section-heading"><div><h3>Objectives</h3><p>These conditions are checked by the server.</p></div><button type="button" className="nlp-button" onClick={add} disabled={goals.length >= 30}><Plus size={14} />Add objective</button></div>{goals.map((goal, index) => <div className="npa-objective-editor" key={goal.id}>
    <div className="npa-objective-title"><span>Objective {index + 1}</span><button className="nl-icon-button" type="button" aria-label={`Remove objective ${index + 1}`} onClick={() => onChange(goals.filter((_, i) => i !== index))}><Trash2 size={14} /></button></div>
    <Field label="Label shown to learners"><input value={goal.label} onChange={event => patch(index, { label: event.target.value })} maxLength={300} /></Field>
    <div className="npa-form-grid"><Field label="Check type"><select value={goal.type} onChange={event => { const type = event.target.value; onChange(goals.map((item, i) => i !== index ? item : { id: goal.id, label: goal.label, type, ...(['ping', 'http', 'dns'].includes(type) ? { source: devices[0]?.id || '', target: type === 'http' ? 'http://site.local' : type === 'dns' ? 'site.local' : '192.168.1.20', expected: true } : { device: devices[0]?.id || '', ...(type === 'gateway' ? { value: '192.168.1.1' } : { port: 'eth0', ...(type === 'interface' ? { enabled: true } : {}) }) }) })); }}><option value="ping">Ping connectivity</option><option value="interface">Interface configuration</option><option value="gateway">Default gateway</option><option value="dhcp">DHCP configuration</option><option value="dns">DNS lookup</option><option value="http">HTTP service</option></select></Field><Field label="Device"><select value={goal.source ?? goal.device ?? ''} onChange={event => patch(index, { [Object.hasOwn(goal, 'source') ? 'source' : 'device']: event.target.value })}><option value="">Choose a device</option>{devices.map(device => <option value={device.id} key={device.id}>{device.name}</option>)}</select></Field></div>
    {['ping', 'http', 'dns'].includes(goal.type) && <><Field label="Target IP, hostname or URL"><input value={goal.target} onChange={event => patch(index, { target: event.target.value })} /></Field><label className="npa-checkbox"><input type="checkbox" checked={goal.expected !== false} onChange={event => patch(index, { expected: event.target.checked })} />Connection / lookup must succeed</label>{goal.type === 'dns' && <Field label="Expected IPv4 address (optional)"><input value={goal.expectedIP || ''} onChange={event => optional(index, 'expectedIP', event.target.value)} /></Field>}</>}
    {['ping', 'http', 'dns'].includes(goal.type) && <Field label="Expected destination device (optional)"><select value={goal.targetDevice || ''} onChange={event => optional(index, 'targetDevice', event.target.value)}><option value="">Any device at the target address</option>{devices.map(device => <option value={device.id} key={device.id}>{device.name}</option>)}</select></Field>}
    {['interface', 'dhcp'].includes(goal.type) && <Field label="Interface"><select value={goal.port} onChange={event => patch(index, { port: event.target.value })}>{Object.keys(devices.find(device => device.id === goal.device)?.config.interfaces || { eth0: {} }).map(port => <option key={port}>{port}</option>)}</select></Field>}
    {goal.type === 'interface' && <><div className="npa-form-grid"><Field label="IPv4 address (optional)"><input value={goal.ip || ''} onChange={event => optional(index, 'ip', event.target.value)} /></Field><Field label="Subnet mask / prefix (optional)"><input value={goal.mask || ''} onChange={event => optional(index, 'mask', event.target.value)} /></Field></div><Field label="Interface state"><select value={goal.enabled === undefined ? 'any' : String(goal.enabled)} onChange={event => optional(index, 'enabled', event.target.value === 'any' ? '' : event.target.value === 'true')}><option value="any">Any state</option><option value="true">Enabled</option><option value="false">Disabled</option></select></Field></>}
    {goal.type === 'gateway' && <Field label="Expected gateway IPv4"><input value={goal.value} onChange={event => patch(index, { value: event.target.value })} /></Field>}
  </div>)}</section>;
}

function ProblemEditor({ original, onDone, onCancel }) {
  const [draft, setDraft] = useState(() => original ? portable(original) : blank());
  const [mode, setMode] = useState('form'), [raw, setRaw] = useState(''), [prepared, setPrepared] = useState(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [designer, setDesigner] = useState(false);
  const update = change => { setDraft(previous => ({ ...previous, ...change })); setPrepared(null); setError(''); };
  const changeTopology = useCallback(topology => {
    setDraft(previous => {
      if (JSON.stringify(previous.topology) === JSON.stringify(topology)) return previous;
      const existing = new Set(previous.topology.devices.map(item => item.id));
      return { ...previous, topology, permissions: { ...previous.permissions, configure: [...previous.permissions.configure.filter(id => topology.devices.some(item => item.id === id)), ...topology.devices.filter(item => !existing.has(item.id)).map(item => item.id)] } };
    });
    setPrepared(null);
  }, []);
  const switchMode = value => {
    if (value === mode) return;
    setError(''); setPrepared(null);
    if (value === 'json') { setRaw(JSON.stringify(portable(draft), null, 2)); setMode('json'); }
    else {
      try { const input = JSON.parse(raw); if (Array.isArray(input) && input.length !== 1) throw new Error('Use JSON mode to preview and import multiple problems.'); setDraft(normalizeProblem(Array.isArray(input) ? input[0] : input)); setMode('form'); }
      catch (error) { setError(error.message); }
    }
  };
  const preview = async () => {
    setBusy(true); setError(''); setPrepared(null);
    try {
      const input = mode === 'json' ? JSON.parse(raw) : portable(draft);
      if (original && Array.isArray(input) && input.length !== 1) throw new Error('Edit one problem at a time. Use New problem for batch imports.');
      const response = await networkRequest('/admin/preview', { method: 'POST', body: { problems: input } });
      setPrepared(response.problems);
      if (response.problems.length === 1) setDraft(response.problems[0]);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!prepared) return;
    setBusy(true); setError('');
    try {
      await networkRequest(original ? `/admin/${original._id}` : '/admin', { method: original ? 'PUT' : 'POST', body: original ? { problem: prepared[0], revision: original.revision } : { problems: prepared } });
      onDone();
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  return <div className="npa-editor"><button type="button" className="nlp-back" onClick={onCancel} disabled={busy}><ArrowLeft size={14} />Back to problems</button><div className="npa-section-heading"><div><h2>{original ? 'Edit network problem' : 'Create network problems'}</h2><p>Design a lab, or paste a ready-made JSON definition. Preview it before saving.</p></div><div className="nlp-filters" role="group" aria-label="Editor mode"><button type="button" aria-pressed={mode === 'form'} onClick={() => switchMode('form')} disabled={busy}><Settings2 size={14} />Visual editor</button><button type="button" aria-pressed={mode === 'json'} onClick={() => switchMode('json')} disabled={busy}><Code2 size={14} />JSON</button></div></div>
    <fieldset className="npa-fieldset" disabled={busy}>
      {mode === 'json' ? <section className="npa-section"><div className="npa-section-heading"><div><h3>Paste problem JSON</h3><p>Accepts one problem object or an array of up to 20 problems. No changes are saved by previewing.</p></div><button type="button" className="nlp-button" onClick={() => { setRaw(JSON.stringify(example, null, 2)); setPrepared(null); }}>Load example · 50 XP</button></div><textarea className="npa-json" aria-label="Problem JSON" value={raw} onChange={event => { setRaw(event.target.value); setPrepared(null); setError(''); }} rows={24} spellCheck={false} /></section> : <>
        <section className="npa-section"><h3>Problem details</h3><div className="npa-form-grid"><Field label="Title"><input value={draft.title} maxLength={120} onChange={event => update({ title: event.target.value })} /></Field><Field label="Unique slug"><input value={draft.slug} maxLength={80} onChange={event => update({ slug: event.target.value })} placeholder="your-first-lan" /></Field></div><Field label="Short summary"><input value={draft.summary} maxLength={300} onChange={event => update({ summary: event.target.value })} /></Field><Field label="Description and instructions"><textarea rows={6} value={draft.description} onChange={event => update({ description: event.target.value })} /></Field><div className="npa-form-grid"><Field label="Base XP"><input type="number" min="0" max="10000" step="1" value={draft.xp} onChange={event => update({ xp: Number(event.target.value) })} /></Field><Field label="Difficulty"><select value={draft.difficulty} onChange={event => update({ difficulty: event.target.value })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></Field></div><Field label="Tags (comma separated)"><input value={draft.tags.join(', ')} onChange={event => update({ tags: event.target.value.split(',').map(item => item.trim()) })} onBlur={() => update({ tags: draft.tags.filter(Boolean) })} /></Field><Field label="Hints (one per line)"><textarea rows={3} value={draft.hints.join('\n')} onChange={event => update({ hints: event.target.value.split('\n') })} onBlur={() => update({ hints: draft.hints.filter(item => item.trim()) })} /></Field><label className="npa-checkbox"><input type="checkbox" checked={draft.published} onChange={event => update({ published: event.target.checked })} />Published — visible to signed-in learners</label></section>
        <section className="npa-section"><div className="npa-section-heading"><div><h3>Starting topology</h3><p>{draft.topology.devices.length} devices · {draft.topology.cables.length} cables. Configure what learners see when they start.</p></div><button type="button" className="nlp-button" onClick={() => setDesigner(true)}><Network size={14} />Design topology</button></div><h4>Editable devices</h4><div className="npa-editable-devices">{draft.topology.devices.map(device => <label className="npa-checkbox" key={device.id}><input type="checkbox" checked={draft.permissions.configure.includes(device.id)} onChange={event => update({ permissions: { ...draft.permissions, configure: event.target.checked ? [...draft.permissions.configure, device.id] : draft.permissions.configure.filter(id => id !== device.id) } })} />{device.name}</label>)}</div><label className="npa-checkbox"><input type="checkbox" checked={draft.permissions.cables} onChange={event => update({ permissions: { ...draft.permissions, cables: event.target.checked } })} />Allow adding and removing cables</label><label className="npa-checkbox"><input type="checkbox" checked={draft.permissions.devices} onChange={event => update({ permissions: { ...draft.permissions, devices: event.target.checked } })} />Allow extra devices (starting devices are kept)</label></section>
        <ObjectiveEditor goals={draft.objectives} devices={draft.topology.devices} onChange={objectives => update({ objectives })} />
      </>}
    </fieldset>
    {error && <p className="nlp-error" role="alert">{error}</p>}
    <div className="npa-editor-actions"><button className="nlp-button" type="button" onClick={preview} disabled={busy}><Eye size={15} />{busy ? 'Please wait…' : 'Validate & preview'}</button><button className="nlp-button primary" type="button" onClick={save} disabled={busy || !prepared}><Save size={15} />{original ? 'Save changes' : `Create ${prepared?.length > 1 ? `${prepared.length} problems` : 'problem'}`}</button></div>
    {prepared && <section className="npa-previews"><div className="npa-section-heading"><div><h3>Ready to save</h3><p>Review the details and starting topology below, then save when ready.</p></div><span className="nlp-badge">{prepared.length} validated</span></div>{prepared.map(problem => <NetworkProblemPreview key={problem.slug} problem={problem} />)}</section>}
    {designer && <TopologyDesigner topology={draft.topology} onChange={changeTopology} onClose={() => setDesigner(false)} />}
  </div>;
}

export default function NetworkProblemAdmin() {
  const { showConfirm } = useConfirm();
  const [problems, setProblems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [editing, setEditing] = useState(undefined), [busy, setBusy] = useState(false), [search, setSearch] = useState(''), [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setProblems((await networkRequest('/admin')).problems); } catch (error) { setError(error.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const remove = async problem => {
    if (!await showConfirm({ title: 'Delete network problem?', message: `Delete “${problem.title}” and its saved workspaces? Earned XP will be kept.`, confirmText: 'Delete problem' })) return;
    setBusy(true); setError('');
    try { await networkRequest(`/admin/${problem._id}`, { method: 'DELETE' }); setProblems(previous => previous.filter(item => item._id !== problem._id)); } catch (error) { setError(error.message); } finally { setBusy(false); }
  };
  const reorder = async (problem, position) => {
    const next = [...problems], index = next.findIndex(item => item._id === problem._id);
    next.splice(index, 1); next.splice(position, 0, problem);
    setBusy(true); setError('');
    try { await networkRequest('/admin/order', { method: 'PUT', body: { ids: next.map(item => item._id) } }); setProblems(next); } catch (error) { setError(error.message); } finally { setBusy(false); }
  };
  if (editing !== undefined) return <ProblemEditor key={editing?._id || 'new'} original={editing} onDone={() => { setEditing(undefined); setNotice('Network problems saved.'); void load(); }} onCancel={() => setEditing(undefined)} />;
  return <div className="npa-panel"><div className="npa-section-heading"><div><span className="nlp-eyebrow">NETWORK LAB</span><h2>Network problems</h2><p>Create practical labs, import JSON definitions, and choose the order learners see.</p></div><button type="button" className="nlp-button primary" onClick={() => { setEditing(null); setNotice(''); }} disabled={busy}><Plus size={15} />New problem</button></div>
    <label className="nlp-search"><Search size={15} /><input aria-label="Search network problems" value={search} placeholder="Search titles or slugs…" onChange={event => setSearch(event.target.value)} /></label>
    {notice && <p className="npa-notice" role="status">{notice}</p>}{error && <p className="nlp-error" role="alert">{error}</p>}
    {loading ? <p className="nlp-empty">Loading problems…</p> : !problems.length ? <div className="nlp-empty"><Network size={30} /><h3>Create your first network problem</h3><p>Start with the visual editor or paste a ready-made JSON problem. New problems start with 50 XP and remain drafts until published.</p></div> : <div className="npa-problem-list">{problems.filter(item => `${item.title} ${item.slug}`.toLowerCase().includes(search.toLowerCase())).map(problem => {
      const index = problems.findIndex(item => item._id === problem._id);
      return <article className="npa-problem-row" key={problem._id}><div className="npa-order-controls"><button className="nl-icon-button" type="button" disabled={busy || index === 0} aria-label={`Move ${problem.title} up`} onClick={() => reorder(problem, index - 1)}><ArrowUp size={13} /></button><span>{index + 1}</span><button className="nl-icon-button" type="button" disabled={busy || index === problems.length - 1} aria-label={`Move ${problem.title} down`} onClick={() => reorder(problem, index + 1)}><ArrowDown size={13} /></button></div><div className="npa-problem-row-body"><div><h3>{problem.title}</h3><span className="nlp-badge">{problem.published ? 'Published' : 'Draft'}</span></div><p>{problem.summary}</p><small>{problem.slug} · {problem.xp} XP · {problem.objectives.length} objectives</small></div><div className="npa-row-actions"><button type="button" className="nl-icon-button" aria-label={`Edit ${problem.title}`} onClick={() => setEditing(problem)} disabled={busy}><Pencil size={15} /></button><button type="button" className="nl-icon-button" aria-label={`Copy ${problem.title} as JSON`} disabled={busy} onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(portable(problem), null, 2)); setNotice('Problem JSON copied.'); } catch { setError('Clipboard unavailable. Open the editor and use the JSON tab to copy the definition.'); } }}><Copy size={15} /></button><button type="button" className="nl-icon-button" aria-label={`Delete ${problem.title}`} onClick={() => remove(problem)} disabled={busy}><Trash2 size={15} /></button></div></article>;
    })}</div>}
  </div>;
}
