import { useEffect, useState } from 'react';
import { Play, CheckCircle2, CircleAlert, Radio, Globe, Search, Network } from 'lucide-react';
import { isBridgeDevice, isRoutingDevice } from '../utils/networkConfig';
import { simulatePing, resolveHostname, simulateHTTP, requestDHCP } from '../utils/networkSimulation';

const TOOLS = [
  { id: 'ping', label: 'Ping', icon: Radio, help: 'Check whether a device can reach an IP address or hostname.' },
  { id: 'dns', label: 'DNS', icon: Search, help: 'Resolve a hostname using the source device’s DNS server.' },
  { id: 'http', label: 'HTTP', icon: Globe, help: 'Request a page from a simulated web server.' },
  { id: 'dhcp', label: 'DHCP', icon: Network, help: 'Request an IP address, gateway and DNS server on an interface.' },
];

export default function NetworkTools({ topology, sourceId, sourceEditable = true, onSourceChange, activeResult, onDHCP, onResult, onReset }) {
  const [mode, setMode] = useState('ping');
  const [target, setTarget] = useState('');
  const [port, setPort] = useState('eth0');
  const [result, setResult] = useState(null);
  const sources = topology.devices.filter(device => !isBridgeDevice(device.type));
  const source = sources.find(device => device.id === sourceId);
  useEffect(() => {
    setPort('eth0');
  }, [sourceId]);
  const reset = () => { setResult(null); onReset(); };
  const run = event => {
    event.preventDefault();
    const outcome = mode === 'dhcp' ? requestDHCP(topology, sourceId, port) : mode === 'dns' ? resolveHostname(topology, sourceId, target) : mode === 'http' ? simulateHTTP(topology, sourceId, target) : simulatePing(topology, sourceId, target);
    if (!outcome.trace?.length) outcome.trace = [{ deviceId: sourceId, protocol: mode === 'ping' ? 'icmp' : mode,
      phase: 'Validation', sourceIP: source?.config.interfaces[port]?.ip || '', destinationIP: target,
      message: outcome.message, status: outcome.ok ? 'delivered' : 'blocked' }];
    if (mode === 'dhcp' && outcome.ok) onDHCP(sourceId, outcome.config);
    setResult(outcome);
    onResult(outcome);
  };
  return (
    <div className="nl-network-tools">
      <div className="nl-tools-heading"><div><h2>Test your network</h2><p>Choose a source and a tool, then follow the packet on the map.</p></div></div>
      <form className="nl-test-form" onSubmit={run}>
        <div className="nl-tool-picker" role="group" aria-label="Network tool">{TOOLS.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => { setMode(id); reset(); }}><Icon size={16} />{label}</button>)}</div>
        <p className="nl-tool-help">{TOOLS.find(item => item.id === mode).help}</p>
        <label className="nl-config-field"><span>Source device</span><select value={source?.id || ''} onChange={event => { onSourceChange(event.target.value); reset(); setPort('eth0'); }} required><option value="">Choose a device</option>{sources.map(device => <option value={device.id} key={device.id}>{device.name}</option>)}</select></label>
        {mode === 'dhcp' ? <label className="nl-config-field"><span>Client interface</span><select value={port} onChange={event => { setPort(event.target.value); reset(); }}>{Object.keys(source?.config.interfaces || { eth0: {} }).map(name => <option key={name}>{name}</option>)}</select></label> : <label className="nl-config-field"><span>{mode === 'dns' ? 'Hostname' : mode === 'http' ? 'Address / URL' : 'Destination IP / hostname'}</span><input required value={target} onChange={event => { setTarget(event.target.value); reset(); }} placeholder={mode === 'dns' ? 'site.local' : mode === 'http' ? 'http://site.local' : '192.168.1.10'} /></label>}
        <button type="submit" className="nl-primary-button" disabled={!source || mode === 'dhcp' && (isRoutingDevice(source.type) || !sourceEditable)}><Play size={13} />Run {TOOLS.find(item => item.id === mode).label} simulation</button>
      </form>
      {mode === 'dhcp' && source && isRoutingDevice(source.type) && <p className="nl-config-help">Use a PC, laptop, or server as a DHCP client.</p>}
      {mode === 'dhcp' && source && !sourceEditable && <p className="nl-config-help">This device has a preset configuration. Choose an editable client.</p>}
      {!sources.length && <p className="nl-tool-empty">Add a PC, laptop, server or router to start a simulation.</p>}
      {result && result === activeResult && <details className={`nl-test-result ${result.ok ? 'success' : 'failure'}`}><summary>{result.ok ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}Result &amp; full trace</summary><strong>{result.message}</strong>{result.steps.length > 0 && <ol>{result.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>}{result.page && <div className="nl-http-page"><span>HTTP response · text preview</span><h3>{result.page.title}</h3><p>{result.page.body}</p></div>}</details>}
    </div>
  );
}
