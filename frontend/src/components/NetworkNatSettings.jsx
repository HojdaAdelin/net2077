import { Plus, Trash2 } from 'lucide-react';
import { allDeviceInterfaces, isSwitchport } from '../utils/networkConfig';
import '../styles/NetworkNat.css';

const Field = ({ label, children }) => <label className="nl-config-field"><span>{label}</span>{children}</label>;
export default function NetworkNatSettings({ device, config, setConfig }) {
  const nat = config.nat;
  const interfaces = Object.entries(allDeviceInterfaces({ ...device, config })).filter(([port]) => !isSwitchport({ ...device, config }, port));
  const update = change => setConfig(previous => ({ ...previous, nat: { ...previous.nat, ...change } }));
  const patchRow = (key, index, change) => update({ [key]: nat[key].map((row, i) => i === index ? { ...row, ...change } : row) });
  const remove = (key, index) => update({ [key]: nat[key].filter((_, i) => i !== index) });
  const role = port => nat.inside.includes(port) ? 'inside' : nat.outside.includes(port) ? 'outside' : 'none';
  const setRole = (port, value) => update({ inside: [...nat.inside.filter(p => p !== port), ...(value === 'inside' ? [port] : [])], outside: [...nat.outside.filter(p => p !== port), ...(value === 'outside' ? [port] : [])] });
  return <div className="nl-nat-settings">
    <p className="nl-config-help">IPv4 translation between inside and outside networks. Static NAT publishes an internal host; PAT overload shares an outside interface address. Routes and gateways are still required.</p>
    <label className="nl-config-toggle"><input type="checkbox" checked={nat.enabled} onChange={event => update({ enabled: event.target.checked })} />Enable NAT / PAT</label>
    <section className="nl-nat-section"><h3>Interface roles</h3><p>Mark the LAN-facing interface as inside and the upstream interface as outside. Logical interfaces (eth0.10 or vlan10) are supported.</p>
      <div className="nl-nat-role-list">{interfaces.map(([port, iface]) => <div key={port}><span><strong>{port}</strong><small>{iface.ip || 'No IPv4 address'}</small></span><select aria-label={`NAT role for ${port}`} value={role(port)} onChange={event => setRole(port, event.target.value)}><option value="none">Not used</option><option value="inside">Inside</option><option value="outside">Outside</option></select></div>)}</div>
    </section>
    <section className="nl-nat-section"><h3>Static NAT · one-to-one</h3><p>Map an inside-local host address to an inside-global address. The public mapping accepts inbound traffic; interface ACLs can restrict it.</p>
      {nat.staticMappings.map((row, index) => <div className="nl-nat-rule" key={index}><div className="nl-config-grid"><Field label="Inside local (private IPv4)"><input value={row.local} placeholder="192.168.10.20" onChange={e => patchRow('staticMappings', index, { local: e.target.value })} /></Field><Field label="Inside global (published IPv4)"><input value={row.global} placeholder="203.0.113.50" onChange={e => patchRow('staticMappings', index, { global: e.target.value })} /></Field></div><button type="button" className="nl-secondary-button" onClick={() => remove('staticMappings', index)} aria-label={`Remove static NAT mapping ${index + 1}`}><Trash2 size={13} />Remove mapping</button></div>)}
      <button type="button" className="nl-secondary-button" disabled={nat.staticMappings.length >= 100} onClick={() => update({ staticMappings: [...nat.staticMappings, { local: '', global: '' }] })}><Plus size={14} />Add static mapping</button>
    </section>
    <section className="nl-nat-section"><h3>PAT · interface overload</h3><p>Matching inside hosts use the selected outside IPv4 address with translated TCP/UDP ports or ICMP identifiers. Static host mappings take priority.</p>
      {nat.overload.map((row, index) => <div className="nl-nat-rule" key={index}><div className="nl-config-grid"><Field label="Inside source network"><input value={row.source} placeholder="192.168.10.0/24" onChange={e => patchRow('overload', index, { source: e.target.value })} /></Field><Field label="Outside interface"><select value={row.outside} onChange={e => patchRow('overload', index, { outside: e.target.value })}><option value="">Choose outside interface</option>{nat.outside.map(port => <option value={port} key={port}>{port} · {allDeviceInterfaces({ ...device, config })[port]?.ip || 'No IPv4'}</option>)}</select></Field></div><Field label="Classification ACL (optional)"><select value={row.acl || ''} onChange={e => patchRow('overload', index, { acl: e.target.value })}><option value="">All traffic in the source network</option>{config.acls.filter(acl => acl.family === 4).map(acl => <option key={acl.name} value={acl.name}>{acl.name}</option>)}</select></Field><p className="nl-config-help">Only ACL-permitted traffic is translated. A deny here skips translation; it does not block forwarding.</p><button type="button" className="nl-secondary-button" onClick={() => remove('overload', index)} aria-label={`Remove PAT rule ${index + 1}`}><Trash2 size={13} />Remove rule</button></div>)}
      <button type="button" className="nl-secondary-button" disabled={nat.overload.length >= 32} onClick={() => update({ overload: [...nat.overload, { source: '', outside: nat.outside[0] || '', acl: '' }] })}><Plus size={14} />Add overload rule</button>
    </section>
    <p className="nl-config-help">Translation entries are shown in Simulation after each test. Dynamic entries are isolated to that request/reply exchange. IPv6 and DHCP broadcasts are not translated. Hairpin NAT, NAT pools and port forwarding are not simulated.</p>
  </div>;
}
