import { useEffect, useId, useRef, useState } from 'react';
import { LockKeyhole, Search, TableProperties, X } from 'lucide-react';
import { DEVICE_TYPES } from '../utils/networkTopology';
import { isBridgeDevice, maskPrefix, allDeviceInterfaces, interfaceEnabled, isSwitchport, switchPort, vlanListText } from '../utils/networkConfig';
import '../styles/NetworkAddressTable.css';

export default function NetworkAddressTable({ topology, editable, onSelect, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const [family, setFamily] = useState(4);
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const rows = topology.devices.flatMap(device => Object.entries(allDeviceInterfaces(device)).map(([port, iface]) => ({
    device, port, iface, bridge: isBridgeDevice(device.type) || isSwitchport(device, port),
    enabled: interfaceEnabled(device, port),
  }))).filter(({ device, port, iface }) =>
    `${device.name} ${DEVICE_TYPES[device.type].label} ${port} ${iface.ip} ${iface.ipv6} ${iface.mask} ${device.config.gateway6} ${device.config.gateway} ${device.config.dns}`.toLowerCase().includes(query)
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  return <dialog ref={dialogRef} className="nl-address-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="nl-address-header">
      <div><span><TableProperties size={15} />WORKSPACE OVERVIEW</span><h2 id={titleId}>Address table</h2><p>Current interface settings. Select a device to find it on the canvas.</p></div>
      <button type="button" className="nl-icon-button" aria-label="Close address table" onClick={onClose}><X size={20} /></button>
    </header>
    <div className="nl-address-family" role="group" aria-label="Address family">{[4, 6].map(value => <button type="button" key={value} aria-pressed={family === value} onClick={() => setFamily(value)}>IPv{value}</button>)}</div>
    <div className="nl-address-toolbar"><label><Search size={16} /><input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Search device, interface or address…" aria-label="Search address table" /></label><span role="status">{rows.length} {rows.length === 1 ? 'interface' : 'interfaces'}</span></div>
    <div className="nl-address-scroll" tabIndex={0} role="region" aria-label="Interface addresses, scroll to view all columns">
      <table><caption className="nl-address-caption">Current device addresses, subnet prefixes, gateways, DNS servers and interface states.</caption>
        <thead><tr><th scope="col">Device</th><th scope="col">Interface</th><th scope="col">IPv{family} address</th><th scope="col">Subnet</th><th scope="col">Gateway</th><th scope="col">DNS server</th><th scope="col">State</th></tr></thead>
        <tbody>{rows.map(({ device, port, iface, bridge, enabled }) => <tr key={`${device.id}/${port}`} className={!enabled ? 'is-disabled' : ''} onClick={() => onSelect(device.id)}>
          <td><button type="button" className="nl-address-device" onClick={event => { event.stopPropagation(); onSelect(device.id); }}><strong>{device.name}{!editable(device.id) && <LockKeyhole size={11} aria-label="Preset configuration" />}</strong><small>{DEVICE_TYPES[device.type].label}</small></button></td>
          <td className="nl-address-mono">{port}{isSwitchport(device, port) ? <small className="nl-address-vlan">{switchPort(device, port).mode === 'access' ? `VLAN ${switchPort(device, port).accessVlan}` : `Trunk ${vlanListText(switchPort(device, port).allowedVlans)}`}</small> : iface.vlan && <small className="nl-address-vlan">VLAN {iface.vlan}{iface.native ? ' · native' : ''}</small>}</td>
          <td className={`nl-address-mono${!bridge && !(family === 6 ? iface.ipv6 : iface.ip) ? ' nl-address-missing' : ''}`}>{bridge ? '—' : (family === 6 ? iface.ipv6 : iface.ip) || 'Not configured'}</td>
          <td className="nl-address-mono" title={!bridge ? family === 6 ? iface.ipv6 ? `/${iface.prefix6}` : undefined : iface.ip ? iface.mask : undefined : undefined}>{!bridge && (family === 6 ? iface.ipv6 : iface.ip) ? `/${family === 6 ? iface.prefix6 : maskPrefix(iface.mask)}` : '—'}</td>
          <td className="nl-address-mono">{!bridge && (family === 6 ? device.config.gateway6 : device.config.gateway) || '—'}</td>
          <td className="nl-address-mono">{!bridge && device.config.dns || '—'}</td>
          <td><span className={`nl-address-state${enabled ? ' is-enabled' : ''}`}><i />{enabled ? 'Enabled' : 'Disabled'}</span></td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <div className="nl-address-empty"><TableProperties size={25} /><strong>{topology.devices.length ? 'No matching interfaces' : 'No devices yet'}</strong><p>{topology.devices.length ? 'Try another device name or address.' : 'Add devices to the workspace to see their configuration here.'}</p></div>}
    </div>
    <footer className="nl-address-footer"><span><LockKeyhole size={12} />Preset configurations remain read-only.</span><span>Changes and DHCP leases appear automatically.</span></footer>
  </dialog>;
}
