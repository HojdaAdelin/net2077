import { activeVlan, interfaceEnabled, isSwitchDevice, isSwitchport, portCarriesVlan, switchPort } from './networkVlans.js';

export const stpPortKey = (deviceId, port, vlan) => `${deviceId}/${port}@${vlan}`;
const bridgeKey = (deviceId, vlan) => `${deviceId}@${vlan}`;
const compare = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
};
export function automaticBridgeMac(id) {
  let hash = 14695981039346656037n;
  for (const character of id) hash = BigInt.asUintN(64, (hash ^ BigInt(character.codePointAt(0))) * 1099511628211n);
  const bytes = Array.from({ length: 6 }, (_, index) => Number((hash >> BigInt((5 - index) * 8)) & 255n));
  bytes[0] = (bytes[0] | 2) & 254;
  return bytes.map(byte => byte.toString(16).padStart(2, '0')).join(':');
}
const portId = (device, port) => [device.config.stp?.ports?.[port]?.priority ?? 128, Number(port.replace(/^eth/, '')) + 1];
export const stpPortForwards = (state, deviceId, port, vlan) => !state?.ports[stpPortKey(deviceId, port, vlan)] || state.ports[stpPortKey(deviceId, port, vlan)].state === 'forwarding';

// Per-VLAN converged spanning trees. No wall-clock timers or BPDU packet exchange
// are simulated; STP uses Blocking and RSTP uses Discarding for standby ports.
// Nonparticipating switches transparently bridge BPDUs into shared segments.
export function getStpState(topology) {
  const state = { devices: Object.create(null), ports: Object.create(null), warnings: [] };
  const devices = new Map(topology.devices.map(device => [device.id, device]));
  const channels = new Map(), byWire = new Map(), transparent = new Map(), nodes = new Map(), parent = new Map();
  const find = key => { let root = key; while (parent.get(root) !== root) root = parent.get(root); while (key !== root) { const next = parent.get(key); parent.set(key, root); key = next; } return root; };
  const union = (a, b) => { const left = find(a), right = find(b); if (left !== right) parent.set(right, left); };
  const links = new Map();
  for (const cable of topology.cables) {
    links.set(`${cable.from.deviceId}/${cable.from.portId}`, cable);
    links.set(`${cable.to.deviceId}/${cable.to.portId}`, cable);
  }
  for (const device of topology.devices) {
    const switching = isSwitchDevice(device.type), config = device.config.stp;
    const enabled = switching && config?.enabled !== false;
    const mac = config?.bridgeMac || automaticBridgeMac(device.id);
    if (switching) state.devices[device.id] = { enabled, mode: config?.mode || 'rstp', bridgeMac: mac, vlans: Object.create(null), warnings: [] };
    for (const vlan of switching ? device.config.vlans || [{ id: 1 }] : []) {
      if (vlan.enabled === false || !enabled) continue;
      const priority = config?.vlanPriorities?.find(item => item.vlan === vlan.id)?.priority ?? config?.priority ?? 32768;
      const node = { id: bridgeKey(device.id, vlan.id), device, vlan: vlan.id, priority, bridgeTuple: [priority + vlan.id, mac], ports: [], cost: Infinity, rootPort: null, candidate: null };
      nodes.set(node.id, node);
      state.devices[device.id].vlans[vlan.id] = { vlan: vlan.id, priority, bridgeId: `${priority + vlan.id}.${mac}`, rootId: device.id, rootName: device.name, rootBridgeId: `${priority + vlan.id}.${mac}`, rootCost: 0, rootPort: null, isRoot: true, ports: [], errors: [] };
    }
    for (const port of Object.keys(device.config.interfaces)) {
      if (!isSwitchport(device, port) && device.type !== 'ap') continue;
      const settings = switchPort(device, port);
      const vlans = switching ? (device.config.vlans || [{ id: 1 }]).filter(v => portCarriesVlan(device, port, v.id)).map(v => v.id) : [1];
      for (const vlan of vlans) {
        const key = stpPortKey(device.id, port, vlan), cable = links.get(`${device.id}/${port}`);
        const remote = cable && (cable.from.deviceId === device.id && cable.from.portId === port ? cable.to : cable.from);
        const peer = remote && devices.get(remote.deviceId);
        const live = Boolean(interfaceEnabled(device, port) && peer && interfaceEnabled(peer, remote.portId));
        const record = { deviceId: device.id, port, vlan, role: enabled ? 'disabled' : 'unprotected', state: live ? 'forwarding' : 'disabled', cost: config?.ports?.[port]?.cost ?? 20000,
          priority: config?.ports?.[port]?.priority ?? 128, edge: false, effectiveMode: config?.mode || 'rstp', reason: live ? 'STP is disabled; this port forwards without loop protection.' : 'No active physical link.' };
        if (switching) state.ports[key] = record;
        const node = nodes.get(bridgeKey(device.id, vlan));
        if (node) { node.ports.push(record); state.devices[device.id].vlans[vlan].ports.push(record); }
        if (!live) continue;
        const channel = { key, device, port, vlan, tag: switching && settings.mode === 'trunk' && settings.nativeVlan !== vlan ? vlan : null, record, node };
        channels.set(key, channel); parent.set(key, key);
        const wire = `${device.id}/${port}`;
        if (!byWire.has(wire)) byWire.set(wire, []);
        byWire.get(wire).push(channel);
        if (!enabled) {
          const key = bridgeKey(device.id, vlan);
          if (!transparent.has(key)) transparent.set(key, []);
          transparent.get(key).push(channel);
        }
      }
    }
  }
  for (const group of transparent.values()) for (let i = 1; i < group.length; i++) union(group[0].key, group[i].key);
  for (const cable of topology.cables) {
    for (const a of byWire.get(`${cable.from.deviceId}/${cable.from.portId}`) || []) for (const b of byWire.get(`${cable.to.deviceId}/${cable.to.portId}`) || []) {
      if (a.tag !== b.tag) continue;
      if (a.vlan !== b.vlan) {
        const warning = `VLAN mismatch on ${a.device.name} ${a.port} and ${b.device.name} ${b.port}. Check access/native VLAN settings.`;
        if (!state.warnings.includes(warning)) state.warnings.push(warning);
        continue;
      }
      union(a.key, b.key);
    }
  }
  const segments = new Map();
  for (const channel of channels.values()) if (channel.node) {
    const id = find(channel.key);
    if (!segments.has(id)) segments.set(id, []);
    segments.get(id).push(channel);
    channel.node.segments ??= new Set(); channel.node.segments.add(id);
  }
  const visited = new Set();
  for (const seed of nodes.values()) {
    if (visited.has(seed.id)) continue;
    const component = [], queue = [seed]; visited.add(seed.id);
    for (let index = 0; index < queue.length; index++) {
      const node = queue[index]; component.push(node);
      for (const segment of node.segments || []) for (const peer of segments.get(segment)) if (!visited.has(peer.node.id)) { visited.add(peer.node.id); queue.push(peer.node); }
    }
    const root = [...component].sort((a, b) => compare(a.bridgeTuple, b.bridgeTuple) || a.id.localeCompare(b.id))[0];
    const duplicate = component.some((a, index) => component.slice(index + 1).some(b => compare(a.bridgeTuple, b.bridgeTuple) === 0));
    root.cost = 0;
    // Positive link costs guarantee a loop-free shortest path to the root.
    for (let iteration = 0; iteration < component.length; iteration++) {
      let changed = false;
      for (const node of component) {
        if (node === root) continue;
        let best;
        for (const segment of node.segments || []) for (const local of segments.get(segment).filter(c => c.node === node)) for (const peer of segments.get(segment)) {
          if (peer.node === node || !Number.isFinite(peer.node.cost)) continue;
          const tuple = [peer.node.cost + local.record.cost, ...peer.node.bridgeTuple, ...portId(peer.device, peer.port), ...portId(local.device, local.port)];
          if (!best || compare(tuple, best.tuple) < 0) best = { tuple, local, peer };
        }
        if (best && (!node.candidate || compare(best.tuple, node.candidate) < 0)) {
          node.cost = best.tuple[0]; node.rootPort = best.local.port; node.candidate = best.tuple; changed = true;
        }
      }
      if (!changed) break;
    }
    for (const node of component) {
      const instance = state.devices[node.device.id].vlans[node.vlan];
      Object.assign(instance, { rootId: root.device.id, rootName: root.device.name, rootBridgeId: `${root.priority + root.vlan}.${state.devices[root.device.id].bridgeMac}`,
        rootCost: node.cost, rootPort: node.rootPort, isRoot: node === root });
      if (duplicate) instance.errors.push('Duplicate bridge IDs detected. Set unique bridge MAC addresses or priorities.');
      for (const segment of node.segments || []) {
        const participants = segments.get(segment);
        const designated = [...participants].sort((a, b) => compare([a.node.cost, ...a.node.bridgeTuple, ...portId(a.device, a.port)], [b.node.cost, ...b.node.bridgeTuple, ...portId(b.device, b.port)]))[0];
        for (const channel of participants.filter(c => c.node === node)) {
          const record = channel.record;
          record.effectiveMode = state.devices[node.device.id].mode === 'stp' || participants.some(c => state.devices[c.device.id].mode === 'stp') ? 'stp' : 'rstp';
          record.edge = Boolean(node.device.config.stp?.ports?.[channel.port]?.edge && !participants.some(c => c.device.id !== node.device.id));
          record.role = channel === designated ? 'designated' : channel.port === node.rootPort ? 'root' : designated.node === node ? 'backup' : 'alternate';
          record.state = ['root', 'designated'].includes(record.role) ? 'forwarding' : record.effectiveMode === 'stp' ? 'blocking' : 'discarding';
          record.reason = record.role === 'root' ? `Best path to ${root.device.name}: root path cost ${node.cost}.` : record.role === 'designated' ? `Best BPDU on this segment: cost ${node.cost}, bridge ID ${instance.bridgeId}.` : record.role === 'backup' ? `Another port on this switch is designated on the same shared segment.` : `Redundant path. ${designated.device.name} advertises a superior cost/bridge/port ID on this segment.`;
          if (duplicate) { record.role = 'inconsistent'; record.state = 'discarding'; record.reason = instance.errors[0]; }
        }
      }
    }
  }
  return state;
}
