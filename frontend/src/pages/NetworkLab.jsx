import { useContext, useEffect, useId, useReducer, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { MousePointer2, Cable, Plus, Minus, Scan, ArrowUpRight, Settings2, FlaskConical, CircleHelp } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import NetworkDeviceArtwork from '../components/NetworkDeviceArtwork';
import NetworkDeviceSettings from '../components/NetworkDeviceSettings';
import NetworkTools from '../components/NetworkTools';
import NetworkInspector from '../components/NetworkInspector';
import { usePacketPlayback, PacketControls, PacketMarker } from '../components/PacketPlayback';
import { hasWireless, isBridgeDevice } from '../utils/networkConfig';
import { wirelessConnections } from '../utils/networkSimulation';
import { canAccessNetworkLab } from '../utils/networkLabAccess';
import { DEVICE_TYPES, emptyTopology, topologyReducer, portPosition, cablePath, connectionError, portInUse, samePort, fitTopology } from '../utils/networkTopology';
import '../styles/NetworkLab.css';

const DEVICE_GROUPS = [
  { label: 'End devices', types: ['pc', 'laptop'] },
  { label: 'Network devices', types: ['switch', 'router', 'l3switch', 'ap', 'firewall', 'cloud'] },
  { label: 'Services', types: ['server'] },
];

function NetworkWorkspace() {
  const [topology, updateTopology] = useReducer(topologyReducer, undefined, emptyTopology);
  const playback = usePacketPlayback();
  const dispatch = action => { playback.clear(); updateTopology(action); };
  const [tool, setTool] = useState('select');
  const [selected, setSelected] = useState(null);
  const [source, setSource] = useState(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [message, setMessage] = useState('Add a device to begin.');
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [size, setSize] = useState({ width: 1000, height: 650 });
  const [isDragging, setIsDragging] = useState(false);
  const [settingsDeviceId, setSettingsDeviceId] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('device');
  const [simulationSourceId, setSimulationSourceId] = useState('');
  const [highlightedLinks, setHighlightedLinks] = useState([]);
  const svgRef = useRef(null);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const gridId = useId().replace(/:/g, '');
  const selectedDevice = selected?.kind === 'device' ? topology.devices.find(device => device.id === selected.id) : null;
  const selectedCable = selected?.kind === 'cable' ? topology.cables.find(cable => cable.id === selected.id) : null;
  const sourceDevice = topology.devices.find(device => device.id === source?.deviceId);
  const settingsDevice = topology.devices.find(device => device.id === settingsDeviceId);
  const wifiLinks = wirelessConnections(topology);
  const activePacketDevice = playback.event?.deviceId;
  const tracedLinks = playback.session ? playback.session.trace.slice(0, playback.index + 1).map(event => event.linkId).filter(Boolean) : highlightedLinks;

  useEffect(() => { setHighlightedLinks([]); }, [topology]);

  useEffect(() => {
    if (selectedDevice && !isBridgeDevice(selectedDevice.type)) setSimulationSourceId(selectedDevice.id);
  }, [selectedDevice?.id]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: Math.max(1, entry.contentRect.width), height: Math.max(1, entry.contentRect.height) }));
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  const worldPoint = event => {
    const matrix = svgRef.current.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const point = svgRef.current.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  };

  const chooseTool = value => {
    setTool(value);
    setSource(null);
    setMessage(value === 'cable' ? 'Choose a free port on the first device, then a port on another device.' : 'Drag devices to arrange them. Drag the background to move around.');
  };

  const addDevice = type => {
    let x = view.x + size.width / view.zoom / 2 - 80;
    let y = view.y + size.height / view.zoom / 2 - 65;
    const center = { x, y };
    let attempt = 0;
    while (topology.devices.some(device => Math.abs(device.x - x) < 190 && Math.abs(device.y - y) < 180)) {
      attempt++;
      const angle = attempt * 2.4;
      const distance = 190 * Math.sqrt(attempt);
      x = center.x + Math.cos(angle) * distance;
      y = center.y + Math.sin(angle) * distance;
    }
    const number = topology.counts[type] + 1;
    dispatch({ type: 'add', deviceType: type, x, y });
    setSelected({ kind: 'device', id: `${type}-${number}` });
    setInspectorTab('device');
    setSource(null);
    setTool('select');
    if (x < view.x || x + 160 > view.x + size.width / view.zoom || y < view.y || y + 155 > view.y + size.height / view.zoom) {
      setView(previous => ({ ...previous, x: x + 80 - size.width / previous.zoom / 2, y: y + 65 - size.height / previous.zoom / 2 }));
    }
    setMessage(`${DEVICE_TYPES[type].label} added. Drag it to place it on the canvas.`);
  };

  const choosePort = endpoint => {
    const device = topology.devices.find(item => item.id === endpoint.deviceId);
    if (source && samePort(source, endpoint)) { setSource(null); setMessage('Cable cancelled.'); return; }
    if (portInUse(topology, endpoint)) { setMessage('This port already has a cable. Select the cable to remove it.'); return; }
    setTool('cable');
    if (!source) {
      setSource(endpoint);
      setCursor(portPosition(device, endpoint.portId));
      setMessage(`${device.name} / ${endpoint.portId} selected. Choose a port on another device.`);
      return;
    }
    const error = connectionError(topology, source, endpoint);
    if (error) { setMessage(error); return; }
    dispatch({ type: 'connect', from: source, to: endpoint });
    setSelected({ kind: 'cable', id: `cable-${topology.nextCable}` });
    setSource(null);
    setMessage('Cable connected. Choose two more ports to add another connection.');
  };

  const removeSelected = () => {
    if (!selected) return;
    dispatch({ type: selected.kind === 'device' ? 'delete-device' : 'delete-cable', id: selected.id });
    if (source?.deviceId === selected.id) setSource(null);
    setSelected(null);
    if (settingsDeviceId === selected.id) setSettingsDeviceId(null);
    setMessage(selected.kind === 'device' ? 'Device and its attached cables removed.' : 'Cable removed. Both ports are available again.');
  };

  const zoomTo = nextZoom => setView(previous => {
    const zoom = Math.max(0.2, Math.min(2, nextZoom));
    return { x: previous.x + size.width / previous.zoom / 2 - size.width / zoom / 2,
      y: previous.y + size.height / previous.zoom / 2 - size.height / zoom / 2, zoom };
  });

  const pointerDown = event => {
    if (event.button !== 0 || event.target.closest('[data-port]')) return;
    const deviceElement = event.target.closest('[data-device]');
    const cableElement = event.target.closest('[data-cable]');
    svgRef.current.focus({ preventScroll: true });
    if (cableElement) { setSelected({ kind: 'cable', id: cableElement.dataset.cable }); setInspectorTab('device'); return; }
    if (deviceElement) {
      const device = topology.devices.find(item => item.id === deviceElement.dataset.device);
      setSelected({ kind: 'device', id: device.id });
      if (!playback.playing) setInspectorTab('device');
      if (tool === 'cable') { setMessage('Click one of the small ports below the device to connect a cable.'); return; }
      dragRef.current = { kind: 'device', id: device.id, start: worldPoint(event), x: device.x, y: device.y, pointerId: event.pointerId };
    } else {
      setSelected(null);
      dragRef.current = { kind: 'pan', clientX: event.clientX, clientY: event.clientY, x: view.x, y: view.y, pointerId: event.pointerId };
    }
    svgRef.current.setPointerCapture(event.pointerId);
    setIsDragging(true);
    event.preventDefault();
  };

  const pointerMove = event => {
    const point = worldPoint(event);
    if (source) setCursor(point);
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.kind === 'device') dispatch({ type: 'move', id: drag.id, x: drag.x + point.x - drag.start.x, y: drag.y + point.y - drag.start.y });
    else setView(previous => ({ ...previous, x: drag.x - (event.clientX - drag.clientX) / previous.zoom, y: drag.y - (event.clientY - drag.clientY) / previous.zoom }));
  };
  const finishPointer = event => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (svgRef.current.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };

  const keyDown = event => {
    if (settingsDeviceId) return;
    if (event.target.closest('input, textarea, select, button, [contenteditable="true"]')) return;
    if (event.key === 'Escape') { setSource(null); setTool('select'); setMessage('Selection mode.'); }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeSelected(); }
    if (selectedDevice && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const step = event.shiftKey ? 50 : 10;
      dispatch({ type: 'move', id: selectedDevice.id, x: selectedDevice.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
        y: selectedDevice.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) });
    }
  };

  const endpointLabel = endpoint => `${topology.devices.find(device => device.id === endpoint.deviceId)?.name || 'Device'} · ${endpoint.portId}`;

  return (
    <div className="nl-page" onKeyDown={keyDown}>
      <div className="nl-page-header">
        <div className="nl-title-lockup">
          <svg className="nl-title-circuit" viewBox="0 0 480 96" fill="none" aria-hidden="true">
            <path className="nl-title-trace" d="M12 48H58L78 24H130M350 24H402L422 48H468M58 48L82 72H130M350 72H398L422 48" />
            <path className="nl-title-signal nl-title-signal-left" pathLength="100" d="M12 48H58L78 24H130" />
            <path className="nl-title-signal nl-title-signal-right" pathLength="100" d="M350 72H398L422 48H468" />
            <g className="nl-title-nodes"><circle cx="12" cy="48" r="3" /><circle cx="58" cy="48" r="3" /><circle cx="130" cy="24" r="2" /><circle cx="130" cy="72" r="2" /><circle cx="350" cy="24" r="2" /><circle cx="350" cy="72" r="2" /><circle cx="422" cy="48" r="3" /><circle cx="468" cy="48" r="3" /></g>
          </svg>
          <h1>Network Lab</h1>
        </div>
      </div>
      <div className="nl-workspace">
        <aside className="nl-sidebar">
          <div className="nl-sidebar-heading"><h2>Device library</h2><span>{topology.devices.length} added</span></div>
          <p className="nl-library-hint">Choose a device to add it to your network.</p>
          <div className="nl-device-palette">{DEVICE_GROUPS.map(group => <div className="nl-device-group" key={group.label}><h3>{group.label}</h3><div>{group.types.map(type => {
            const config = DEVICE_TYPES[type];
            return (
            <button key={type} type="button" className="nl-palette-device" onClick={() => addDevice(type)}>
              <NetworkDeviceArtwork type={type} className="nl-palette-art" />
              <span className="nl-palette-label"><strong>{config.label}</strong><small>{config.ports.length} {config.ports.length === 1 ? 'port' : 'ports'}{hasWireless(type) ? ' + Wi-Fi' : ''}</small></span><Plus size={15} aria-hidden="true" />
            </button>
          ); })}</div></div>)}</div>
          <details className="nl-library-help"><summary><CircleHelp size={13} />Quick guide</summary><p>Click two free Ethernet ports to connect devices. Double-click a device to configure it.</p><div className="nl-shortcuts"><span><kbd>Del</kbd> Remove selection</span><span><kbd>Esc</kbd> Cancel cable</span><span><kbd>↑ ↓ ← →</kbd> Move device</span></div></details>
        </aside>
        <section className="nl-editor" aria-label="Topology editor">
          <div className="nl-toolbar"><div className="nl-tools" role="group" aria-label="Canvas tools"><button type="button" aria-pressed={tool === 'select'} onClick={() => chooseTool('select')}><MousePointer2 size={15} />Select</button><button type="button" aria-pressed={tool === 'cable'} onClick={() => chooseTool('cable')}><Cable size={16} />Cable</button><button type="button" aria-pressed={inspectorTab === 'simulation'} onClick={() => setInspectorTab('simulation')}><FlaskConical size={15} />Simulate</button></div><div className="nl-view-tools"><button type="button" className="nl-icon-button" aria-label="Zoom out" onClick={() => zoomTo(view.zoom / 1.2)}><Minus size={15} /></button><span>{Math.round(view.zoom * 100)}%</span><button type="button" className="nl-icon-button" aria-label="Zoom in" onClick={() => zoomTo(view.zoom * 1.2)}><Plus size={15} /></button><span className="nl-toolbar-separator" /><button type="button" className="nl-fit-button" onClick={() => setView(fitTopology(topology.devices, size.width, size.height))}><Scan size={15} />Fit view</button></div></div>
          <div className={`nl-stage${isDragging ? ' is-dragging' : ''}${tool === 'cable' ? ' is-cabling' : ''}`} ref={stageRef}>
            <svg className="nl-canvas" ref={svgRef} tabIndex={0} role="application" aria-label="Network topology. Drag devices to move them. Click two ports to connect them. Use arrow keys to move a selected device." viewBox={`${view.x} ${view.y} ${size.width / view.zoom} ${size.height / view.zoom}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={finishPointer} onPointerCancel={finishPointer} onLostPointerCapture={() => { dragRef.current = null; setIsDragging(false); }}>
              <defs><pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" className="nl-grid-dot" /></pattern></defs>
              <rect x={view.x} y={view.y} width={size.width / view.zoom} height={size.height / view.zoom} fill={`url(#${gridId})`} />
              {topology.cables.map(cable => {
                const from = topology.devices.find(device => device.id === cable.from.deviceId);
                const to = topology.devices.find(device => device.id === cable.to.deviceId);
                const d = cablePath(portPosition(from, cable.from.portId), portPosition(to, cable.to.portId));
                return <g key={cable.id} data-cable={cable.id} className={`nl-cable${selectedCable?.id === cable.id ? ' selected' : ''}${tracedLinks.includes(cable.id) ? ' traced' : ''}`} role="button" tabIndex={0} aria-label={`Cable: ${endpointLabel(cable.from)} to ${endpointLabel(cable.to)}`} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected({ kind: 'cable', id: cable.id }); } }}><path d={d} className="nl-cable-hit" /><path d={d} className="nl-cable-line" /><title>{endpointLabel(cable.from)} → {endpointLabel(cable.to)}</title></g>;
              })}
              {sourceDevice && <path d={cablePath(portPosition(sourceDevice, source.portId), cursor)} className="nl-cable-preview" />}
              {wifiLinks.map(link => {
                const from = topology.devices.find(device => device.id === link.from.deviceId);
                const to = topology.devices.find(device => device.id === link.to.deviceId);
                return <path key={link.id} d={`M ${from.x + 80} ${from.y + 40} L ${to.x + 80} ${to.y + 40}`} className={`nl-wifi-link${tracedLinks.includes(link.id) ? ' traced' : ''}`}><title>{from.name} ↔ {to.name}: Wi-Fi</title></path>;
              })}
              {topology.devices.map(device => {
                const config = DEVICE_TYPES[device.type];
                return <g key={device.id} data-device={device.id} transform={`translate(${device.x} ${device.y})`} className={`nl-device${selectedDevice?.id === device.id ? ' selected' : ''}${activePacketDevice === device.id ? playback.event.status === 'blocked' ? ' packet-blocked' : ' packet-active' : ''}`} style={{ '--device-color': config.color }} role="button" tabIndex={0} aria-label={`${device.name}, ${config.label}. Double-click to configure. Select and use arrow keys to move.`} onDoubleClick={event => { if (!event.target.closest('[data-port]')) setSettingsDeviceId(device.id); }} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setSelected({ kind: 'device', id: device.id }); if (event.key === 'Enter') setSettingsDeviceId(device.id); } }}>
                  <rect x="-10" y="-26" width="180" height="177" rx="12" className="nl-device-outline" />
                  <text x="80" y="-9" textAnchor="middle" className="nl-device-name">{device.name}</text>
                  <NetworkDeviceArtwork type={device.type} width="160" height="112" />
                  {config.ports.map(portId => {
                    const point = portPosition(device, portId);
                    const endpoint = { deviceId: device.id, portId };
                    const occupied = portInUse(topology, endpoint);
                    return <g key={portId} data-port={portId} className={`nl-port${occupied ? ' occupied' : ''}${source && samePort(source, endpoint) ? ' pending' : ''}`} role="button" tabIndex={0} aria-label={`${device.name} ${portId}: ${occupied ? 'connected' : 'available'}`} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); choosePort(endpoint); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); choosePort(endpoint); } }}>
                      <path d={`M ${point.x - device.x} 110 V 123`} className="nl-port-stem" /><circle cx={point.x - device.x} cy="128" r="11" className="nl-port-hit" /><rect x={point.x - device.x - 4} y="124" width="8" height="8" rx="2" className="nl-port-mark" /><title>{device.name} · {portId} · {occupied ? 'Connected' : 'Click to connect'}</title>
                    </g>;
                  })}
                </g>;
              })}
              <PacketMarker playback={playback} topology={topology} />
            </svg>
            {!topology.devices.length && <div className="nl-empty-canvas"><div className="nl-empty-art"><NetworkDeviceArtwork type="pc" /><NetworkDeviceArtwork type="switch" /><NetworkDeviceArtwork type="router" /></div><h2>Your network starts here.</h2><p>Add a device from the panel, then connect its ports.</p><span><ArrowUpRight size={14} />Drag to arrange. Connect to build.</span></div>}
            <div className="nl-canvas-caption"><span />TOPOLOGY WORKSPACE</div>
          </div>
          <div className="nl-statusbar"><span role="status" aria-live="polite">{message}</span><span className="nl-topology-count">{topology.devices.length} devices<span>·</span>{topology.cables.length} cables</span></div>
        </section>
        <aside className="nl-right-panel" aria-label="Network inspector">
          <div className="nl-inspector-tabs" role="tablist" aria-label="Inspector views">{[['device', 'Device', Settings2], ['simulation', 'Simulation', FlaskConical]].map(([id, label, Icon]) => <button key={id} type="button" role="tab" id={`${gridId}-${id}-tab`} aria-selected={inspectorTab === id} aria-controls={`${gridId}-${id}-panel`} tabIndex={inspectorTab === id ? 0 : -1} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'device' : event.key === 'End' ? 'simulation' : id === 'device' ? 'simulation' : 'device'; setInspectorTab(next); document.getElementById(`${gridId}-${next}-tab`)?.focus(); } }} onClick={() => setInspectorTab(id)}><Icon size={14} />{label}{id === 'simulation' && playback.playing && <span className="nl-tab-running" />}</button>)}</div>
          <div className="nl-inspector-content">
            <div role="tabpanel" id={`${gridId}-device-panel`} aria-labelledby={`${gridId}-device-tab`} hidden={inspectorTab !== 'device'}>
              <NetworkInspector topology={topology} wifiLinks={wifiLinks} device={selectedDevice} cable={selectedCable} onConfigure={() => setSettingsDeviceId(selectedDevice.id)} onSimulate={() => { setSimulationSourceId(selectedDevice.id); setInspectorTab('simulation'); }} onDelete={removeSelected} onDeselect={() => setSelected(null)} />
            </div>
            <div role="tabpanel" id={`${gridId}-simulation-panel`} aria-labelledby={`${gridId}-simulation-tab`} hidden={inspectorTab !== 'simulation'}>
              <NetworkTools topology={topology} sourceId={simulationSourceId} onSourceChange={setSimulationSourceId} activeResult={playback.session} onReset={() => { playback.clear(); setHighlightedLinks([]); }} onResult={result => { setHighlightedLinks(result.links); setMessage(result.message); playback.start(result); }} onDHCP={(id, config) => { const device = topology.devices.find(item => item.id === id); dispatch({ type: 'configure', id, settings: { name: device.name, config } }); }} />
              <PacketControls playback={playback} topology={topology} />
              <div className="nl-simulation-legend"><span><i className="nl-legend-route" />Packet / route</span><span><i className="nl-legend-blocked" />Blocked</span></div>
            </div>
          </div>
        </aside>
      </div>
      {settingsDevice && <NetworkDeviceSettings key={settingsDevice.id} device={settingsDevice} onClose={() => setSettingsDeviceId(null)} onApply={settings => { dispatch({ type: 'configure', id: settingsDevice.id, settings }); setMessage(`${settings.name} configured for this session.`); }} />}
    </div>
  );
}

export default function NetworkLab() {
  const { user } = useContext(AuthContext);
  if (!canAccessNetworkLab(user)) return <Navigate to="/" replace />;
  return <NetworkWorkspace key={user.id} />;
}
