import { Plus, Trash2 } from 'lucide-react';
import { vlanListText } from '../utils/networkConfig';
import '../styles/NetworkVlans.css';

const Field = ({ label, children }) => <label className="nl-config-field" data-guide-field={label}><span>{label}</span>{children}</label>;
const Toggle = ({ label, checked, onChange }) => <label className="nl-config-toggle" data-guide-field={label}><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span>{label}</span></label>;
const NumberField = ({ label, value, onChange }) => <Field label={label}><input type="number" min="1" max="4094" step="1" value={value} onChange={event => onChange(Number(event.target.value))} /></Field>;

export default function NetworkVlanSettings({ device, config, setConfig, section }) {
  const ports = Object.keys(config.interfaces);
  const patch = (key, index, update) => setConfig(previous => ({ ...previous, [key]: previous[key].map((item, i) => i === index ? { ...item, ...update } : item) }));
  const remove = (key, index) => setConfig(previous => ({ ...previous, [key]: previous[key].filter((_, i) => i !== index) }));
  const freeVlan = used => { let vlan = 10; while (used.includes(vlan) && vlan < 4094) vlan++; return vlan; };

  if (section === 'switching') return <>
    <p className="nl-config-help">Access ports carry one VLAN. Trunks carry the allowed VLANs; the native VLAN is sent untagged. Define the VLAN on each switch that must carry it.</p>
    <div className="nl-vlan-section-title"><h3>VLAN database</h3><span>{config.vlans.length} / 128</span></div>
    {config.vlans.map((vlan, index) => <div className="nl-vlan-row" data-guide-vlan={vlan.id} key={index}>
      <NumberField label="VLAN ID" value={vlan.id} onChange={id => patch('vlans', index, { id })} />
      <Field label="Name"><input value={vlan.name} maxLength={32} onChange={event => patch('vlans', index, { name: event.target.value })} /></Field>
      <Toggle label="Active" checked={vlan.enabled} onChange={enabled => patch('vlans', index, { enabled })} />
      <button type="button" className="nl-icon-button" aria-label={`Remove VLAN ${vlan.id}`} onClick={() => remove('vlans', index)}><Trash2 size={15} /></button>
    </div>)}
    <button type="button" className="nl-secondary-button" disabled={config.vlans.length >= 128} onClick={() => {
      const id = freeVlan(config.vlans.map(vlan => vlan.id));
      setConfig(previous => ({ ...previous, vlans: [...previous.vlans, { id, name: `VLAN ${id}`, enabled: true }] }));
    }}><Plus size={14} />Add VLAN</button>
    <div className="nl-vlan-section-title"><h3>Physical ports</h3></div>
    {ports.map(port => {
      const settings = config.switchports[port];
      const change = update => setConfig(previous => ({ ...previous,
        switchports: { ...previous.switchports, [port]: { ...previous.switchports[port], ...update } },
        interfaces: update.mode && update.mode !== 'routed' ? { ...previous.interfaces, [port]: { ...previous.interfaces[port], ip: '', ipv6: '' } } : previous.interfaces,
      }));
      return <div className="nl-vlan-port" data-guide-port={port} key={port}><strong>{port}</strong><div className="nl-config-grid">
        <Field label="Port mode"><select value={settings.mode} onChange={event => change({ mode: event.target.value })}><option value="access">Access</option><option value="trunk">Trunk (802.1Q)</option>{device.type === 'l3switch' && <option value="routed">Routed port</option>}</select></Field>
        {settings.mode === 'access' && <NumberField label="Access VLAN" value={settings.accessVlan} onChange={accessVlan => change({ accessVlan })} />}
        {settings.mode === 'trunk' && <><NumberField label="Native VLAN" value={settings.nativeVlan} onChange={nativeVlan => change({ nativeVlan })} /><Field label="Allowed VLANs"><input value={typeof settings.allowedVlans === 'string' ? settings.allowedVlans : vlanListText(settings.allowedVlans)} placeholder="10,20,30-35 or all" onChange={event => change({ allowedVlans: event.target.value })} /></Field></>}
      </div>{settings.mode === 'routed' && <p className="nl-config-help">Configure this port address in the Network tab.</p>}</div>;
    })}
  </>;

  if (section === 'subinterfaces') return <>
    <p className="nl-config-help">Use one physical router link for multiple VLANs. Leave the parent port without an IP address, enable it, and connect it to a switch trunk. Match each 802.1Q VLAN ID with the switch configuration.</p>
    {(config.subinterfaces || []).map((iface, index) => {
      const update = change => {
        const parent = change.parent ?? iface.parent, vlan = change.vlan ?? iface.vlan;
        patch('subinterfaces', index, { ...change, ...(change.parent !== undefined || change.vlan !== undefined ? { name: `${parent}.${vlan}` } : {}) });
      };
      return <div className="nl-logical-interface" key={index}>
        <div className="nl-logical-title"><strong>{iface.name}</strong><button type="button" className="nl-icon-button" aria-label={`Remove subinterface ${iface.name}`} onClick={() => remove('subinterfaces', index)}><Trash2 size={15} /></button></div>
        <div className="nl-config-grid"><Field label="Physical parent"><select value={iface.parent} onChange={event => update({ parent: event.target.value })}>{ports.map(port => <option key={port}>{port}</option>)}</select></Field><NumberField label="802.1Q VLAN ID" value={iface.vlan} onChange={vlan => update({ vlan })} /><Field label="IPv4 address"><input value={iface.ip} placeholder="192.168.10.1" onChange={event => update({ ip: event.target.value })} /></Field><Field label="Subnet mask / prefix"><input value={iface.mask} onChange={event => update({ mask: event.target.value })} /></Field></div>
        <div className="nl-vlan-toggles"><Toggle label="Enabled" checked={iface.enabled} onChange={enabled => update({ enabled })} /><Toggle label="Native (untagged)" checked={iface.native} onChange={native => update({ native })} /></div>
      </div>;
    })}
    <button type="button" className="nl-secondary-button" disabled={config.subinterfaces.length >= 128} onClick={() => {
      const parent = ports.find(port => !config.interfaces[port].ip && !config.interfaces[port].ipv6) || ports[0];
      const vlan = freeVlan(config.subinterfaces.filter(iface => iface.parent === parent).map(iface => iface.vlan));
      setConfig(previous => ({ ...previous, subinterfaces: [...previous.subinterfaces, { name: `${parent}.${vlan}`, parent, vlan, native: false, enabled: true, ip: '', ipv6: '', mask: '/24' }] }));
    }}><Plus size={14} />Add subinterface</button>
  </>;

  return <>
    <Toggle label="Enable IP routing between VLANs and routed ports" checked={config.ipRouting} onChange={ipRouting => setConfig(previous => ({ ...previous, ipRouting }))} />
    <p className="nl-config-help">An SVI is the gateway for a VLAN. It becomes operational when its VLAN is active and has an enabled switchport with a live link. Configure access/trunk ports in the Switching tab.</p>
    {config.svis.map((iface, index) => <div className="nl-logical-interface" key={index}>
      <div className="nl-logical-title"><strong>vlan{iface.vlan}</strong><button type="button" className="nl-icon-button" aria-label={`Remove VLAN interface ${iface.vlan}`} onClick={() => remove('svis', index)}><Trash2 size={15} /></button></div>
      <div className="nl-config-grid"><NumberField label="VLAN ID" value={iface.vlan} onChange={vlan => patch('svis', index, { vlan })} /><Field label="Gateway IPv4 address"><input value={iface.ip} placeholder="192.168.10.1" onChange={event => patch('svis', index, { ip: event.target.value })} /></Field><Field label="Subnet mask / prefix"><input value={iface.mask} onChange={event => patch('svis', index, { mask: event.target.value })} /></Field></div>
      <Toggle label="Enabled" checked={iface.enabled} onChange={enabled => patch('svis', index, { enabled })} />
    </div>)}
    <button type="button" className="nl-secondary-button" disabled={config.svis.length >= 128} onClick={() => {
      const vlan = config.vlans.find(item => !config.svis.some(iface => iface.vlan === item.id))?.id || freeVlan(config.svis.map(iface => iface.vlan));
      setConfig(previous => ({ ...previous, svis: [...previous.svis, { vlan, enabled: true, ip: '', ipv6: '', mask: '/24' }] }));
    }}><Plus size={14} />Add VLAN interface</button>
  </>;
}
