import { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { DEVICE_TYPES } from '../utils/networkTopology';
import { isBridgeDevice, isRoutingDevice, hasWireless, validateDeviceSettings } from '../utils/networkConfig';

function Field({ label, children, ...props }) {
  return <label className="nl-config-field"><span>{label}</span>{children || <input {...props} />}</label>;
}
function Toggle({ label, checked, onChange }) {
  return <label className="nl-config-toggle"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span>{label}</span></label>;
}

export default function NetworkDeviceSettings({ device, onApply, onClose }) {
  const dialogRef = useRef(null);
  const [name, setName] = useState(device.name);
  const [config, setConfig] = useState(() => structuredClone(device.config));
  const [tab, setTab] = useState('network');
  const [error, setError] = useState('');
  const bridge = isBridgeDevice(device.type);
  const routing = isRoutingDevice(device.type);
  const editInterface = (port, changes) => setConfig(previous => ({ ...previous, interfaces: { ...previous.interfaces, [port]: { ...previous.interfaces[port], ...changes } } }));
  const editService = (service, changes) => setConfig(previous => ({ ...previous, services: { ...previous.services, [service]: { ...previous.services[service], ...changes } } }));
  useEffect(() => {
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; };
  }, []);

  const submit = event => {
    event.preventDefault();
    try {
      const settings = validateDeviceSettings(device.type, DEVICE_TYPES[device.type].ports, { name, config });
      onApply(settings);
      onClose();
    } catch (failure) { setError(failure.message); }
  };

  return (
    <dialog ref={dialogRef} className="nl-settings-dialog" aria-labelledby="nl-settings-title" onCancel={event => { event.preventDefault(); onClose(); }}>
      <form onSubmit={submit}>
        <div className="nl-settings-header"><div><span>{DEVICE_TYPES[device.type].label} configuration</span><h2 id="nl-settings-title">{device.name}</h2></div><button type="button" className="nl-icon-button" onClick={onClose} aria-label="Close configuration"><X size={19} /></button></div>
        <div className="nl-settings-tabs" role="group" aria-label="Configuration sections">
          <button type="button" aria-pressed={tab === 'network'} onClick={() => setTab('network')}>Network</button>
          {routing && <button type="button" aria-pressed={tab === 'routes'} onClick={() => setTab('routes')}>Static routes</button>}
          {hasWireless(device.type) && <button type="button" aria-pressed={tab === 'wifi'} onClick={() => setTab('wifi')}>Wi-Fi</button>}
          {device.type === 'server' && <button type="button" aria-pressed={tab === 'services'} onClick={() => setTab('services')}>Services</button>}
          {device.type === 'firewall' && <button type="button" aria-pressed={tab === 'policy'} onClick={() => setTab('policy')}>Traffic policy</button>}
        </div>
        <div className="nl-settings-body">
          {error && <p className="nl-config-error" role="alert">{error}</p>}
          {tab === 'network' && <>
            <Field label="Device name" value={name} onChange={event => setName(event.target.value)} maxLength={40} />
            <p className="nl-config-help">{bridge ? 'This device bridges traffic between enabled ports. It does not need an IP address for switching.' : 'Configure an address on each interface you want to use. Connected devices need compatible subnets.'}</p>
            {device.type === 'l3switch' && <p className="nl-config-help">L3 switch ports operate as routed interfaces in this version. VLANs are not modeled yet.</p>}
            {device.type === 'cloud' && <p className="nl-config-help">The cloud represents an upstream router inside this lab. It does not connect to the real internet.</p>}
            <div className="nl-config-interfaces">{Object.entries(config.interfaces).map(([port, iface]) => <div className="nl-config-interface" key={port}>
              <div className="nl-config-interface-heading"><strong>{port === 'wlan0' ? 'wlan0 · Wi-Fi' : port}</strong><Toggle label="Enabled" checked={iface.enabled} onChange={value => editInterface(port, { enabled: value })} /></div>
              {!bridge && <div className="nl-config-grid"><Field label="IPv4 address" placeholder="192.168.1.10" value={iface.ip} onChange={event => editInterface(port, { ip: event.target.value })} /><Field label="Subnet mask / prefix" placeholder="255.255.255.0" value={iface.mask} onChange={event => editInterface(port, { mask: event.target.value })} /></div>}
            </div>)}</div>
            {!bridge && <div className="nl-config-grid"><Field label="Default gateway (optional)" placeholder="192.168.1.1" value={config.gateway} onChange={event => setConfig({ ...config, gateway: event.target.value })} /><Field label="DNS server (optional)" placeholder="192.168.1.10" value={config.dns} onChange={event => setConfig({ ...config, dns: event.target.value })} /></div>}
          </>}
          {tab === 'routes' && <>
            <p className="nl-config-help">Connected networks are learned from interface addresses. Add a route for each remote network, or use 0.0.0.0/0 for a default route. Remember the return route.</p>
            {config.routes.map((route, index) => <div className="nl-route-row" key={index}>
              <Field label="Destination network" placeholder="192.168.2.0/24" value={route.destination} onChange={event => setConfig({ ...config, routes: config.routes.map((item, i) => i === index ? { ...item, destination: event.target.value } : item) })} />
              <Field label="Next hop" placeholder="10.0.0.2" value={route.nextHop} onChange={event => setConfig({ ...config, routes: config.routes.map((item, i) => i === index ? { ...item, nextHop: event.target.value } : item) })} />
              <Field label="Interface"><select value={route.port} onChange={event => setConfig({ ...config, routes: config.routes.map((item, i) => i === index ? { ...item, port: event.target.value } : item) })}>{DEVICE_TYPES[device.type].ports.map(port => <option key={port}>{port}</option>)}</select></Field>
              <button type="button" className="nl-icon-button" aria-label={`Remove route ${index + 1}`} onClick={() => setConfig({ ...config, routes: config.routes.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>
            </div>)}
            <button type="button" className="nl-secondary-button" onClick={() => setConfig({ ...config, routes: [...config.routes, { destination: '', nextHop: '', port: DEVICE_TYPES[device.type].ports[0] }] })}><Plus size={14} />Add route</button>
          </>}
          {tab === 'wifi' && <>
            <Toggle label="Wi-Fi enabled" checked={config.wireless.enabled} onChange={value => setConfig({ ...config, wireless: { ...config.wireless, enabled: value } })} />
            <p className="nl-config-help">{device.type === 'ap' ? 'Laptops with the same SSID and password associate with this access point. Use eth0 to connect it to a switch.' : 'Enter an access point’s SSID and password. The nearest matching access point is chosen automatically. Configure wlan0 or request DHCP on it.'}</p>
            <Field label="SSID" maxLength={32} value={config.wireless.ssid} onChange={event => setConfig({ ...config, wireless: { ...config.wireless, ssid: event.target.value } })} />
            <Field label="Wi-Fi password (optional)" type="password" autoComplete="new-password" maxLength={63} value={config.wireless.password} onChange={event => setConfig({ ...config, wireless: { ...config.wireless, password: event.target.value } })} />
          </>}
          {tab === 'policy' && <>
            <p className="nl-config-help">This firewall uses a simple allow/block policy for both directions. Uncheck a protocol to block it through the firewall.</p>
            {['icmp', 'dns', 'http'].map(protocol => <Toggle key={protocol} label={`Allow ${protocol === 'icmp' ? 'ICMP (ping)' : protocol.toUpperCase()}`} checked={config.firewall[protocol]} onChange={value => setConfig({ ...config, firewall: { ...config.firewall, [protocol]: value } })} />)}
          </>}
          {tab === 'services' && <>
            <div className="nl-service-section"><Toggle label="DHCP server" checked={config.services.dhcp.enabled} onChange={enabled => editService('dhcp', { enabled })} />
              {config.services.dhcp.enabled && <><p className="nl-config-help">Configure a static server address in the pool subnet. Requests stay in the same LAN; DHCP relay is not supported.</p><div className="nl-config-grid">{[['start', 'Pool start'], ['end', 'Pool end'], ['mask', 'Subnet mask'], ['gateway', 'Default gateway'], ['dns', 'DNS server']].map(([key, label]) => <Field key={key} label={label} value={config.services.dhcp[key]} onChange={event => editService('dhcp', { [key]: event.target.value })} />)}</div></>}
            </div>
            <div className="nl-service-section"><Toggle label="DNS server" checked={config.services.dns.enabled} onChange={enabled => editService('dns', { enabled })} />
              {config.services.dns.enabled && <><p className="nl-config-help">Add local A records. Clients must use this server’s IP address as their DNS server.</p>{config.services.dns.records.map((record, index) => <div className="nl-dns-row" key={index}><Field label="Hostname" placeholder="site.local" value={record.name} onChange={event => editService('dns', { records: config.services.dns.records.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /><Field label="IPv4 address" placeholder="192.168.1.10" value={record.ip} onChange={event => editService('dns', { records: config.services.dns.records.map((item, i) => i === index ? { ...item, ip: event.target.value } : item) })} /><button type="button" className="nl-icon-button" aria-label={`Remove DNS record ${index + 1}`} onClick={() => editService('dns', { records: config.services.dns.records.filter((_, i) => i !== index) })}><Trash2 size={16} /></button></div>)}<button type="button" className="nl-secondary-button" onClick={() => editService('dns', { records: [...config.services.dns.records, { name: '', ip: '' }] })}><Plus size={14} />Add DNS record</button></>}
            </div>
            <div className="nl-service-section"><Toggle label="HTTP server" checked={config.services.http.enabled} onChange={enabled => editService('http', { enabled })} />
              {config.services.http.enabled && <><Field label="Page title" maxLength={120} value={config.services.http.title} onChange={event => editService('http', { title: event.target.value })} /><Field label="Page content"><textarea rows={4} maxLength={5000} value={config.services.http.body} onChange={event => editService('http', { body: event.target.value })} /></Field></>}
            </div>
          </>}
        </div>
        <div className="nl-settings-footer"><span>Changes apply to this session only.</span><button type="button" className="nl-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="nl-primary-button">Apply configuration</button></div>
      </form>
    </dialog>
  );
}
