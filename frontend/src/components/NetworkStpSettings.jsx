import { Plus, Trash2 } from 'lucide-react';
import { isSwitchport } from '../utils/networkConfig';
import { automaticBridgeMac } from '../../../backend/network/networkStp';
import '../styles/NetworkStp.css';

const Field = ({ label, children }) => <label className="nl-config-field"><span>{label}</span>{children}</label>;
const priorities = Array.from({ length: 16 }, (_, i) => i * 4096);
export default function NetworkStpSettings({ device, config, setConfig }) {
  const stp = config.stp;
  const update = change => setConfig(previous => ({ ...previous, stp: { ...previous.stp, ...change } }));
  const port = (id, change) => update({ ports: { ...stp.ports, [id]: { ...stp.ports[id], ...change } } });
  const priorityInput = (value, onChange) => <select value={value} onChange={e => onChange(Number(e.target.value))}>{priorities.map(priority => <option key={priority} value={priority}>{priority}{priority === 32768 ? ' (default)' : priority === 0 ? ' (highest preference)' : ''}</option>)}</select>;
  return <div className="nl-stp-settings">
    <p className="nl-config-help">Prevent Layer 2 loops while keeping redundant links available. Each active VLAN elects its own root bridge. Lower bridge priority wins; a tie is decided by the bridge MAC.</p>
    <label className="nl-config-toggle"><input type="checkbox" checked={stp.enabled} onChange={e => update({ enabled: e.target.checked })} />Enable spanning tree</label>
    <div className="nl-config-grid"><Field label="Protocol"><select value={stp.mode} onChange={e => update({ mode: e.target.value })}><option value="rstp">RSTP · 802.1w</option><option value="stp">STP · 802.1D</option></select></Field><Field label="Bridge priority">{priorityInput(stp.priority, priority => update({ priority }))}</Field></div>
    <Field label="Bridge MAC (empty = automatic)"><input value={stp.bridgeMac} placeholder={automaticBridgeMac(device.id)} onChange={e => update({ bridgeMac: e.target.value })} maxLength={17} /></Field>
    <p className="nl-config-help">Automatic MAC addresses stay stable when devices move or are renamed. Give each bridge a unique MAC.</p>
    <section className="nl-stp-section"><h3>Per-VLAN priorities</h3><p>Override the bridge priority for selected VLANs. Other VLANs use the priority above.</p>
      {stp.vlanPriorities.map((item, index) => <div className="nl-stp-priority-row" key={index}><Field label="VLAN"><select value={item.vlan} onChange={e => update({ vlanPriorities: stp.vlanPriorities.map((row, i) => i === index ? { ...row, vlan: Number(e.target.value) } : row) })}>{config.vlans.map(v => <option key={v.id} value={v.id}>{v.id} · {v.name}</option>)}</select></Field><Field label="Priority">{priorityInput(item.priority, priority => update({ vlanPriorities: stp.vlanPriorities.map((row, i) => i === index ? { ...row, priority } : row) }))}</Field><button type="button" className="nl-icon-button" aria-label={`Remove VLAN ${item.vlan} priority override`} onClick={() => update({ vlanPriorities: stp.vlanPriorities.filter((_, i) => i !== index) })}><Trash2 size={15} /></button></div>)}
      <button type="button" className="nl-secondary-button" disabled={config.vlans.every(v => stp.vlanPriorities.some(row => row.vlan === v.id))} onClick={() => { const vlan = config.vlans.find(v => !stp.vlanPriorities.some(row => row.vlan === v.id)); if (vlan) update({ vlanPriorities: [...stp.vlanPriorities, { vlan: vlan.id, priority: stp.priority }] }); }}><Plus size={14} />Add VLAN priority</button>
    </section>
    <section className="nl-stp-section"><h3>Port path selection</h3><p>Lower total path cost wins the root port. Equal paths compare the sender bridge ID, sender port ID and finally the local port ID. Port priority changes in steps of 16.</p>
      {Object.entries(stp.ports).map(([id, settings]) => <div className="nl-stp-port-settings" key={id}><strong>{id}</strong>{!isSwitchport({ ...device, config }, id) ? <p className="nl-config-help">Routed port — not participating in spanning tree.</p> : <><div className="nl-config-grid"><Field label="Path cost"><input type="number" min="1" max="200000000" value={settings.cost} onChange={e => port(id, { cost: Number(e.target.value) })} /></Field><Field label="Port priority"><select value={settings.priority} onChange={e => port(id, { priority: Number(e.target.value) })}>{Array.from({ length: 16 }, (_, i) => i * 16).map(value => <option key={value} value={value}>{value}</option>)}</select></Field></div><label className="nl-config-toggle"><input type="checkbox" checked={settings.edge} onChange={e => port(id, { edge: e.target.checked })} />Administrative edge port</label></>}</div>)}
    </section>
    <p className="nl-config-help">The sandbox shows converged per-VLAN trees and recalculates immediately after changes. STP standby ports are Blocking; RSTP standby ports are Discarding. Mixed links use STP compatibility. Protocol timers and BPDU packet exchange are not simulated. Edge settings never override a received bridge path or loop protection.</p>
  </div>;
}
