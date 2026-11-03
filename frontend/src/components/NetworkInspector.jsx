import { Cable, MousePointer2, Settings2, FlaskConical, Trash2, X } from 'lucide-react';
import NetworkDeviceArtwork from './NetworkDeviceArtwork';
import { DEVICE_TYPES, portInUse } from '../utils/networkTopology';
import { isBridgeDevice, allDeviceInterfaces, interfaceEnabled, isSwitchport, switchPort, vlanListText } from '../utils/networkConfig';
import { getOspfState, sviOperational } from '../utils/networkSimulation';

export default function NetworkInspector({ topology, wifiLinks, device, cable, readOnly = false, canDelete = true, onConfigure, onSimulate, onDelete, onDeselect, quickGuide }) {
  const endpoint = value => `${topology.devices.find(item => item.id === value.deviceId)?.name || 'Device'} · ${value.portId}`;
  if (!device && !cable) return <div className="nl-inspector-empty">
    <div className="nl-inspector-empty-icon"><MousePointer2 size={24} /></div>
    <h3>Explore your network</h3><p>Select a device to see its interfaces and configure it, or select a cable to inspect its connection.</p>
    <div className="nl-inspector-guide"><span><b>1</b>Add devices from the library</span><span><b>2</b>Connect their Ethernet ports</span><span><b>3</b>Configure addresses and simulate</span></div>
    {quickGuide}
  </div>;
  if (cable) return <div className="nl-device-inspector">
    <div className="nl-sidebar-heading"><h2>Connection</h2><button type="button" className="nl-icon-button" aria-label="Deselect cable" onClick={onDeselect}><X size={15} /></button></div>
    <div className="nl-connection-title"><Cable size={23} /><div><h3>Ethernet cable</h3><span>Wired connection</span></div></div>
    <div className="nl-cable-endpoints"><span>{endpoint(cable.from)}</span><span className="nl-endpoint-line" /><span>{endpoint(cable.to)}</span></div>
    <p className="nl-inspector-description">Removing this cable frees both ports and keeps the devices.</p>
    {canDelete ? <button type="button" className="nl-delete-button" onClick={onDelete}><Trash2 size={14} />Remove cable</button> : <p className="nl-library-hint">This connection is preset for the problem.</p>}
  </div>;
  const definition = DEVICE_TYPES[device.type];
  const ospf = device.config.ospf?.enabled ? getOspfState(topology).devices[device.id] : null;
  const connected = topology.cables.filter(item => item.from.deviceId === device.id || item.to.deviceId === device.id).length;
  return <div className="nl-device-inspector">
    <div className="nl-sidebar-heading"><h2>Selected device</h2><button type="button" className="nl-icon-button" aria-label="Deselect device" onClick={onDeselect}><X size={15} /></button></div>
    <div className="nl-device-identity"><NetworkDeviceArtwork type={device.type} /><div><span>{definition.label}</span><h3>{device.name}</h3><small>{connected} / {definition.ports.length} ports connected</small></div></div>
    {readOnly ? <p className="nl-library-hint">Preset configuration · inspect only</p> : <button type="button" className="nl-configure-button" onClick={onConfigure}><Settings2 size={14} />Configure device</button>}
    {!isBridgeDevice(device.type) && <button type="button" className="nl-inspector-test" onClick={onSimulate}><FlaskConical size={14} />Test from this device<span>→</span></button>}
    <div className="nl-inspector-section-heading"><h4>Interfaces</h4><span>{Object.keys(allDeviceInterfaces(device)).length}</span></div>
    <div className="nl-interface-cards">{Object.entries(allDeviceInterfaces(device)).map(([port, iface]) => {
      const wireless = port === 'wlan0';
      const linked = iface.kind === 'svi' ? sviOperational(topology, device, iface.vlan) : wireless ? wifiLinks.some(link => link.from.deviceId === device.id || link.to.deviceId === device.id) : portInUse(topology, { deviceId: device.id, portId: iface.parent || port });
      const enabled = interfaceEnabled(device, port);
      const switching = isSwitchport(device, port), settings = switching ? switchPort(device, port) : null;
      const status = !enabled ? 'Disabled' : linked ? 'Connected' : 'Not connected';
      return <div key={port} className="nl-interface-card"><div><strong>{port}</strong><span className={`nl-interface-state ${enabled && linked ? 'is-up' : ''}`}><i />{status}</span></div><p>{!enabled ? 'Interface is turned off' : switching || isBridgeDevice(device.type) ? 'Layer 2 · bridges traffic' : iface.ip ? `${iface.ip} · ${iface.mask}` : 'No IPv4 address configured'}</p>
        {iface.ipv6 && <p>{iface.ipv6}/{iface.prefix6}</p>}
        {['aclIn', 'aclOut', 'acl6In', 'acl6Out'].filter(key => iface[key]).map(key => <p key={key}>{key}: {iface[key]}</p>)}
        {settings && <p className="nl-port-vlan">{settings.mode === 'access' ? `Access · VLAN ${settings.accessVlan}` : `Trunk · native ${settings.nativeVlan} · allowed ${vlanListText(settings.allowedVlans)}`}</p>}
        {iface.kind && <p className="nl-port-vlan">VLAN {iface.vlan} · {iface.kind === 'svi' ? 'SVI' : iface.native ? '802.1Q native' : '802.1Q tagged'}</p>}
      </div>;
    })}</div>
    {!isBridgeDevice(device.type) && <dl className="nl-device-addresses"><div><dt>Gateway</dt><dd>{device.config.gateway || 'Not set'}</dd></div><div><dt>DNS server</dt><dd>{device.config.dns || 'Not set'}</dd></div></dl>}
    {device.type === 'l3switch' && <p className="nl-routing-status">IP routing: {device.config.ipRouting === false ? 'disabled' : 'enabled'}</p>}
    {device.config.gateway6 && <p className="nl-routing-status">IPv6 gateway: {device.config.gateway6}</p>}
    {ospf && <details className="nl-routing-status" open><summary>OSPF · area {ospf.area}</summary><p>Router ID: {ospf.routerId || 'Unavailable'}</p>{ospf.errors.map(error => <p key={error}>{error}</p>)}<strong>Neighbors</strong>{!ospf.neighbors.length && <p>No neighbors. Check advertised interfaces, links and addressing.</p>}<ul>{ospf.neighbors.map((n, i) => <li key={i}>{topology.devices.find(d => d.id === n.peerId)?.name} · {n.port} · {n.state}{n.reason && ` — ${n.reason}`}</li>)}</ul><strong>Learned routes</strong>{!ospf.routes.length && <p>No learned routes.</p>}<ul>{ospf.routes.map(r => <li key={r.destination}>{r.destination} via {r.nextHop} · {r.port} · cost {r.cost}</li>)}</ul></details>}
    {canDelete && <button type="button" className="nl-delete-button" onClick={onDelete}><Trash2 size={14} />Remove device</button>}
  </div>;
}
