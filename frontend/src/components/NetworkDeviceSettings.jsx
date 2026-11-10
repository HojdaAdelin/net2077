import { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import NetworkWorkspaceGuide from './NetworkWorkspaceGuide';
import { Settings2 } from 'lucide-react';
import { lockModalScroll } from '../utils/modalScrollLock';
import NetworkAdvancedSettings from './NetworkAdvancedSettings';
import NetworkVlanSettings from './NetworkVlanSettings';
import { DEVICE_TYPES } from '../utils/networkTopology';
import { isBridgeDevice, isRoutingDevice, hasWireless, validateDeviceSettings, normalizeAdvancedConfig, normalizeVlanSettings, isSwitchDevice, isSwitchport, allDeviceInterfaces, switchPort } from '../utils/networkConfig';

function Field({ label, children, ...props }) {
  return <label className="nl-config-field" data-guide-field={label}><span>{label}</span>{children || <input {...props} />}</label>;
}
function Toggle({ label, checked, onChange }) {
  return <label className="nl-config-toggle" data-guide-field={label}><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span>{label}</span></label>;
}

export default function NetworkDeviceSettings({ device, onApply, onClose, lessonGuide }) {
  const dialogRef = useRef(null);
  const [name, setName] = useState(device.name);
  const [config, setConfig] = useState(() => normalizeAdvancedConfig(device.type, normalizeVlanSettings(device.type, DEVICE_TYPES[device.type].ports, structuredClone(device.config))));
  const [tab, setTab] = useState(lessonGuide?.steps[0].tab || 'network');
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const bodyRef = useRef(null), tabsRef = useRef(null), footerRef = useRef(null);
  const [error, setError] = useState('');
  const bridge = isBridgeDevice(device.type);
  const routing = isRoutingDevice(device.type);
  const editInterface = (port, changes) => setConfig(previous => ({ ...previous, interfaces: { ...previous.interfaces, [port]: { ...previous.interfaces[port], ...changes } } }));
  const editService = (service, changes) => setConfig(previous => ({ ...previous, services: { ...previous.services, [service]: { ...previous.services[service], ...changes } } }));
  useEffect(() => {
    const dialog = dialogRef.current;
    const releaseScroll = lockModalScroll();
    dialog.showModal();
    if (lessonGuide) setWalkthroughOpen(true);
    return () => { dialog.close(); releaseScroll(); };
  }, []);

  const submit = event => {
    event.preventDefault();
    if (lessonGuide) { onClose(); return; }
    try {
      const settings = validateDeviceSettings(device.type, DEVICE_TYPES[device.type].ports, { name, config });
      onApply(settings);
      onClose();
    } catch (failure) { setError(failure.message); }
  };

  return (
    <dialog ref={dialogRef} className="nl-settings-dialog" aria-labelledby="nl-settings-title" onCancel={event => { event.preventDefault(); onClose(); }}>
      <form onSubmit={submit}>
        <div className="nl-settings-header"><div><span>{lessonGuide ? `LESSON ${lessonGuide.lesson.number} / CONFIGURATION EXAMPLE` : `${DEVICE_TYPES[device.type].label} configuration`}</span><h2 id="nl-settings-title">{device.name}</h2></div><button type="button" className="nl-icon-button" onClick={onClose} aria-label="Close configuration"><X size={19} /></button></div>
        <div ref={tabsRef} className="nl-settings-tabs" role="group" aria-label="Configuration sections">
          <button type="button" aria-pressed={tab === 'network'} onClick={() => setTab('network')}>Network</button>
          {isSwitchDevice(device.type) && <button type="button" aria-pressed={tab === 'switching'} onClick={() => setTab('switching')}>Switching</button>}
          {device.type === 'router' && <button type="button" aria-pressed={tab === 'subinterfaces'} onClick={() => setTab('subinterfaces')}>802.1Q subinterfaces</button>}
          {device.type === 'l3switch' && <button type="button" aria-pressed={tab === 'svis'} onClick={() => setTab('svis')}>VLAN interfaces</button>}
          {routing && <button type="button" aria-pressed={tab === 'routes'} onClick={() => setTab('routes')}>Static routes</button>}
          {(!bridge) && ['ipv6', ...(routing ? ['acl', 'ospf'] : [])].map(section => <button key={section} type="button" aria-pressed={tab === section} onClick={() => setTab(section)}>{section === 'ipv6' ? 'IPv6' : section.toUpperCase()}</button>)}
          {hasWireless(device.type) && <button type="button" aria-pressed={tab === 'wifi'} onClick={() => setTab('wifi')}>Wi-Fi</button>}
          {device.type === 'server' && <button type="button" aria-pressed={tab === 'services'} onClick={() => setTab('services')}>Services</button>}
          {device.type === 'firewall' && <button type="button" aria-pressed={tab === 'policy'} onClick={() => setTab('policy')}>Traffic policy</button>}
        </div>
        <div ref={bodyRef} className="nl-settings-body">
          {lessonGuide && <div className="nc-config-example"><strong>A closer look at the real controls</strong><p>This is an interactive example. Changes here are not saved to your network. Follow the arrows, then try the same controls on your own device.</p><button type="button" onClick={() => { setConfig(normalizeAdvancedConfig(device.type, normalizeVlanSettings(device.type, DEVICE_TYPES[device.type].ports, structuredClone(device.config)))); setTab(lessonGuide.steps[0].tab); setWalkthroughOpen(true); }}>Replay explanation</button></div>}
          {error && <p className="nl-config-error" role="alert">{error}</p>}
          {tab === 'network' && <>
            <Field label="Device name" value={name} onChange={event => setName(event.target.value)} maxLength={40} />
            <p className="nl-config-help">{bridge ? 'This device bridges traffic between enabled ports. It does not need an IP address for switching.' : 'Configure an address on each interface you want to use. Connected devices need compatible subnets.'}</p>
            {device.type === 'l3switch' && <p className="nl-config-help">Use Switching to choose access, trunk or routed ports. Use VLAN interfaces to configure inter-VLAN gateways.</p>}
            {device.type === 'cloud' && <p className="nl-config-help">The cloud represents an upstream router inside this lab. It does not connect to the real internet.</p>}
            <div className="nl-config-interfaces">{Object.entries(config.interfaces).map(([port, iface]) => <div className="nl-config-interface" key={port}>
              <div className="nl-config-interface-heading"><strong>{port === 'wlan0' ? 'wlan0 · Wi-Fi' : port}</strong><Toggle label="Enabled" checked={iface.enabled} onChange={value => editInterface(port, { enabled: value })} /></div>
              {!bridge && !isSwitchport({ ...device, config }, port) && <div className="nl-config-grid"><Field label="IPv4 address" placeholder="192.168.1.10" value={iface.ip} onChange={event => editInterface(port, { ip: event.target.value })} /><Field label="Subnet mask / prefix" placeholder="255.255.255.0" value={iface.mask} onChange={event => editInterface(port, { mask: event.target.value })} /></div>}
              {isSwitchport({ ...device, config }, port) && <p className="nl-config-help">{switchPort({ ...device, config }, port).mode === 'access' ? `Access VLAN ${config.switchports[port].accessVlan}` : '802.1Q trunk'} ? configure VLAN membership in Switching.</p>}
            </div>)}</div>
            {!bridge && <div className="nl-config-grid"><Field label="Default gateway (optional)" placeholder="192.168.1.1" value={config.gateway} onChange={event => setConfig({ ...config, gateway: event.target.value })} /><Field label="DNS server (optional)" placeholder="192.168.1.10" value={config.dns} onChange={event => setConfig({ ...config, dns: event.target.value })} /></div>}
          </>}
          {['switching', 'subinterfaces', 'svis'].includes(tab) && <NetworkVlanSettings device={device} config={config} setConfig={setConfig} section={tab} />}
          {['ipv6', 'acl', 'ospf'].includes(tab) && <NetworkAdvancedSettings device={device} config={config} setConfig={setConfig} section={tab} />}
          {tab === 'routes' && <>
            <p className="nl-config-help">Connected networks are learned from interface addresses. Add a route for each remote network, or use 0.0.0.0/0 for a default route. Remember the return route.</p>
            {config.routes.map((route, index) => <div className="nl-route-row" key={index}>
              <Field label="Destination network" placeholder="192.168.2.0/24" value={route.destination} onChange={event => setConfig({ ...config, routes: config.routes.map((item, i) => i === index ? { ...item, destination: event.target.value } : item) })} />
              <Field label="Next hop" placeholder="10.0.0.2" value={route.nextHop} onChange={event => setConfig({ ...config, routes: config.routes.map((item, i) => i === index ? { ...item, nextHop: event.target.value } : item) })} />
              <Field label="Interface"><select value={route.port} onChange={event => setConfig({ ...config, routes: config.routes.map((item, i) => i === index ? { ...item, port: event.target.value } : item) })}>{Object.keys(allDeviceInterfaces({ ...device, config })).filter(port => !isSwitchport({ ...device, config }, port)).map(port => <option key={port}>{port}</option>)}</select></Field>
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
            {['icmp', 'icmpv6', 'dns', 'http'].map(protocol => <Toggle key={protocol} label={`Allow ${protocol === 'icmp' ? 'ICMP (ping)' : protocol.toUpperCase()}`} checked={config.firewall[protocol]} onChange={value => setConfig({ ...config, firewall: { ...config.firewall, [protocol]: value } })} />)}
          </>}
          {tab === 'services' && <>
            <div className="nl-service-section" data-guide-service="dhcp"><Toggle label="DHCP server" checked={config.services.dhcp.enabled} onChange={enabled => editService('dhcp', { enabled })} />
              {config.services.dhcp.enabled && <><p className="nl-config-help">Configure a static server address in the pool subnet. Requests stay in the same LAN; DHCP relay is not supported.</p><div className="nl-config-grid">{[['start', 'Pool start'], ['end', 'Pool end'], ['mask', 'Subnet mask'], ['gateway', 'Default gateway'], ['dns', 'DNS server']].map(([key, label]) => <Field key={key} label={label} value={config.services.dhcp[key]} onChange={event => editService('dhcp', { [key]: event.target.value })} />)}</div></>}
            </div>
            <div className="nl-service-section" data-guide-service="dns"><Toggle label="DNS server" checked={config.services.dns.enabled} onChange={enabled => editService('dns', { enabled })} />
              {config.services.dns.enabled && <><p className="nl-config-help">Add local A records. Clients must use this server’s IP address as their DNS server.</p>{config.services.dns.records.map((record, index) => <div className="nl-dns-row" key={index}><Field label="Hostname" placeholder="site.local" value={record.name} onChange={event => editService('dns', { records: config.services.dns.records.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /><Field label="IPv4 address" placeholder="192.168.1.10" value={record.ip} onChange={event => editService('dns', { records: config.services.dns.records.map((item, i) => i === index ? { ...item, ip: event.target.value } : item) })} /><button type="button" className="nl-icon-button" aria-label={`Remove DNS record ${index + 1}`} onClick={() => editService('dns', { records: config.services.dns.records.filter((_, i) => i !== index) })}><Trash2 size={16} /></button></div>)}<button type="button" className="nl-secondary-button" onClick={() => editService('dns', { records: [...config.services.dns.records, { name: '', ip: '' }] })}><Plus size={14} />Add DNS record</button></>}
            </div>
            <div className="nl-service-section" data-guide-service="http"><Toggle label="HTTP server" checked={config.services.http.enabled} onChange={enabled => editService('http', { enabled })} />
              {config.services.http.enabled && <><Field label="Page title" maxLength={120} value={config.services.http.title} onChange={event => editService('http', { title: event.target.value })} /><Field label="Page content"><textarea rows={4} maxLength={5000} value={config.services.http.body} onChange={event => editService('http', { body: event.target.value })} /></Field></>}
            </div>
          </>}
        </div>
        <div ref={footerRef} className="nl-settings-footer"><span>{lessonGuide ? "Example only ? your sandbox stays unchanged." : "Changes apply to this session only."}</span>{!lessonGuide && <button type="button" className="nl-secondary-button" onClick={onClose}>Cancel</button>}<button type="submit" className="nl-primary-button">{lessonGuide ? "Back to sandbox" : "Apply configuration"}</button></div>
      </form>
      {lessonGuide && walkthroughOpen && <NetworkWorkspaceGuide lesson={lessonGuide.lesson} customSteps={[
        ...lessonGuide.steps.map((step, index) => ({ ...step, ref: bodyRef, icon: Settings2, label: `CONFIGURATION ${index + 1}` })),
        { ref: footerRef, icon: Settings2, label: 'YOUR TURN', title: 'Now configure your own network', text: 'In the sandbox, double-click your device or select it and choose Configure device. Use the same tabs and fields you have just explored.', tip: 'Apply configuration saves changes to that device. This example does not change your topology.' },
      ]} libraryRef={bodyRef} toolbarRef={tabsRef} canvasRef={bodyRef} inspectorRef={bodyRef} onTabChange={setTab} onClose={() => setWalkthroughOpen(false)} />}
    </dialog>
  );
}
