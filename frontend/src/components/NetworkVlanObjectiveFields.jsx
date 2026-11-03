import { DEVICE_TYPES } from '../utils/networkTopology';
import { vlanListText } from '../utils/networkConfig';

const Field = ({ label, children }) => <label className="npa-field"><span>{label}</span>{children}</label>;

export default function NetworkVlanObjectiveFields({ goal, devices, patch, optional }) {
  const device = devices.find(item => item.id === goal.device);
  const number = (label, key) => <Field label={label}><input type="number" min="1" max="4094" step="1" value={goal[key] ?? ''} onChange={event => event.target.value === '' ? optional(key, '') : patch({ [key]: Number(event.target.value) })} /></Field>;
  if (!['vlan', 'switchport', 'subinterface', 'ipRouting'].includes(goal.type)) return null;
  return <>
    {['vlan', 'subinterface'].includes(goal.type) && number('VLAN ID', 'vlan')}
    {goal.type === 'switchport' && <>
      <div className="npa-form-grid"><Field label="Physical port"><select value={goal.port} onChange={event => patch({ port: event.target.value })}>{(DEVICE_TYPES[device?.type]?.ports || ['eth0']).map(port => <option key={port}>{port}</option>)}</select></Field><Field label="Expected port mode"><select value={goal.mode} onChange={event => patch({ mode: event.target.value })}><option value="access">Access</option><option value="trunk">Trunk</option>{device?.type === 'l3switch' && <option value="routed">Routed</option>}</select></Field></div>
      {goal.mode === 'access' && number('Expected access VLAN', 'accessVlan')}
      {goal.mode === 'trunk' && <>{number('Expected native VLAN (optional)', 'nativeVlan')}<Field label="Exact allowed VLANs (optional)"><input value={goal.allowedVlans === undefined ? '' : typeof goal.allowedVlans === 'string' ? goal.allowedVlans : vlanListText(goal.allowedVlans)} placeholder="10,20 or all; none for an empty list" onChange={event => optional('allowedVlans', event.target.value)} /></Field></>}
    </>}
    {goal.type === 'subinterface' && <>
      <Field label="Logical interface"><input value={goal.port} placeholder="eth0.10" onChange={event => patch({ port: event.target.value })} /></Field>
      <div className="npa-form-grid"><Field label="Expected IPv4 (optional)"><input value={goal.ip || ''} onChange={event => optional('ip', event.target.value)} /></Field><Field label="Expected subnet mask (optional)"><input value={goal.mask || ''} onChange={event => optional('mask', event.target.value)} /></Field></div>
      <label className="npa-checkbox"><input type="checkbox" checked={goal.native === true} onChange={event => patch({ native: event.target.checked })} />Native / untagged subinterface</label>
    </>}
    {['vlan', 'subinterface', 'ipRouting'].includes(goal.type) && <label className="npa-checkbox"><input type="checkbox" checked={goal.enabled !== false} onChange={event => patch({ enabled: event.target.checked })} />{goal.type === 'ipRouting' ? 'IP routing must be enabled' : 'Must be enabled / active'}</label>}
  </>;
}
