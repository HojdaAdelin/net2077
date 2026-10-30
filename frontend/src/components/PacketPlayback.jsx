import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import { portPosition } from '../utils/networkTopology';

export function usePacketPlayback() {
  const [session, setSession] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState({ index: 0, progress: 0 });
  const clock = useRef(null);
  useEffect(() => {
    if (!playing || !session) return;
    let frame;
    clock.current = null;
    const tick = time => {
      const elapsed = clock.current === null ? 0 : Math.min(time - clock.current, 100);
      clock.current = time;
      setPosition(previous => ({ ...previous, progress: Math.min(1, previous.progress + elapsed / 1100) }));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, session]);
  useEffect(() => {
    if (!playing || !session || position.progress < 1) return;
    if (position.index === session.trace.length - 1) setPlaying(false);
    else setPosition({ index: position.index + 1, progress: 0 });
  }, [playing, session, position]);
  const clear = () => { setSession(null); setPlaying(false); setPosition({ index: 0, progress: 0 }); };
  const start = outcome => {
    setSession(outcome);
    setPosition({ index: 0, progress: 0 });
    setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
  const replay = () => { setPosition({ index: 0, progress: 0 }); setPlaying(false); };
  const finished = Boolean(session && position.index === session.trace.length - 1 && position.progress === 1);
  return { session, playing, ...position, finished, event: session?.trace[position.index], start, clear, replay,
    toggle: () => { if (finished) setPosition({ index: 0, progress: 0 }); setPlaying(value => !value); },
    next: () => {
      setPlaying(false);
      setPosition(previous => previous.progress < 1 ? { ...previous, progress: 1 } :
        { index: Math.min(previous.index + 1, session.trace.length - 1), progress: 1 });
    } };
}

export function PacketControls({ playback, topology }) {
  const { session, event, index, playing, finished } = playback;
  if (!session || !event) return null;
  const device = topology.devices.find(item => item.id === event.deviceId);
  return <div className={`nl-playback ${event.status === 'blocked' ? 'is-blocked' : ''}`}>
    <div className="nl-playback-heading"><strong>Packet simulation</strong><span>Step {index + 1} / {session.trace.length}</span></div>
    <div className="nl-playback-controls">
      <button type="button" className="nl-secondary-button" onClick={playback.toggle}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'Pause' : finished ? 'Play again' : 'Play'}</button>
      <button type="button" className="nl-secondary-button" onClick={playback.next} disabled={finished}><SkipForward size={14} />Next step</button>
      <button type="button" className="nl-secondary-button" onClick={playback.replay}><RotateCcw size={14} />Restart</button>
      <span className="nl-packet-phase">{event.protocol?.toUpperCase()} · {event.phase}</span>
    </div>
    <progress className="nl-packet-progress" value={index + playback.progress} max={session.trace.length} aria-label="Packet simulation progress" />
    <p role="status">{event.message}</p>
    <details className="nl-packet-detail-disclosure"><summary>Packet details</summary><div className="nl-packet-details"><span>Device <b>{device?.name || 'Source'}</b></span><span>Source IP <b>{event.sourceIP || 'Not assigned'}</b></span><span>Destination IP <b>{event.destinationIP || '—'}</b></span></div></details>
    {finished && <p className={session.ok ? 'nl-packet-success' : 'nl-packet-failure'}>{session.ok ? 'Simulation complete. ' : 'Simulation stopped. '}{session.message}</p>}
  </div>;
}

export function PacketMarker({ playback, topology }) {
  const { event, progress } = playback;
  if (!event) return null;
  const device = topology.devices.find(item => item.id === event.deviceId);
  if (!device) return null;
  let point = { x: device.x + 80, y: device.y + 55 };
  if (event.from && event.to) {
    const fromDevice = topology.devices.find(item => item.id === event.from.deviceId);
    const toDevice = topology.devices.find(item => item.id === event.to.deviceId);
    if (!fromDevice || !toDevice) return null;
    if (event.linkId?.startsWith('wifi-')) {
      point = { x: fromDevice.x + 80 + (toDevice.x - fromDevice.x) * progress,
        y: fromDevice.y + 40 + (toDevice.y - fromDevice.y) * progress };
    } else if (event.linkId) {
      const cable = topology.cables.find(item => item.id === event.linkId);
      if (!cable) return null;
      const start = portPosition(topology.devices.find(item => item.id === cable.from.deviceId), cable.from.portId);
      const end = portPosition(topology.devices.find(item => item.id === cable.to.deviceId), cable.to.portId);
      const t = cable.from.deviceId === event.from.deviceId ? progress : 1 - progress;
      const u = 1 - t, bend = Math.max(55, Math.abs(start.x - end.x) * 0.3, Math.abs(start.y - end.y) * 0.4);
      point = { x: u ** 3 * start.x + 3 * u ** 2 * t * start.x + 3 * u * t ** 2 * end.x + t ** 3 * end.x,
        y: u ** 3 * start.y + 3 * u ** 2 * t * (start.y + bend) + 3 * u * t ** 2 * (end.y + bend) + t ** 3 * end.y };
    } else {
      const start = portPosition(fromDevice, event.from.portId), end = portPosition(toDevice, event.to.portId);
      point = { x: start.x + (end.x - start.x) * progress, y: start.y - Math.sin(progress * Math.PI) * 65 };
    }
  }
  return <g className={`nl-packet-marker ${event.status === 'blocked' ? 'is-blocked' : ''}`} transform={`translate(${point.x} ${point.y})`} aria-hidden="true">
    <circle r="18" className="nl-packet-halo" /><rect x="-9" y="-6" width="18" height="12" rx="3" /><path d={event.status === 'blocked' ? 'M -3 -3 L 3 3 M 3 -3 L -3 3' : 'M -7 -4 L 0 1 L 7 -4'} />
  </g>;
}
