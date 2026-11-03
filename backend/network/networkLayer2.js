import { activeVlan, interfaceEnabled, isSwitchport, portCarriesVlan, switchPort } from './networkVlans.js';

const endpointKey = endpoint => `${endpoint.deviceId}/${endpoint.portId}`;

export function sviOperational(topology, device, vlan) {
  if (!activeVlan(device, vlan)) return false;
  return topology.cables.some(cable => {
    const local = cable.from.deviceId === device.id ? cable.from : cable.to.deviceId === device.id ? cable.to : null;
    if (!local || !interfaceEnabled(device, local.portId) || !portCarriesVlan(device, local.portId, vlan)) return false;
    const remote = local === cable.from ? cable.to : cable.from;
    const peer = topology.devices.find(item => item.id === remote.deviceId);
    return peer && interfaceEnabled(peer, remote.portId);
  });
}

// Each switch port has one channel per local VLAN. Cables connect only matching wire tags.
// An untagged frame enters an access VLAN or the receiving trunk's native VLAN.
export function vlanLayer2Domain(topology, origin, wireless = []) {
  const channels = [], byWire = new Map(), byVlan = new Map();
  const addChannel = (device, port, vlan, tag, physicalPort, bridge) => {
    const channel = { key: `${device.id}/${port}@${vlan}`, device, port, vlan, tag, physicalPort };
    channels.push(channel);
    if (physicalPort) {
      const key = `${device.id}/${physicalPort}`;
      if (!byWire.has(key)) byWire.set(key, []);
      byWire.get(key).push(channel);
    }
    if (bridge) {
      const key = `${device.id}/${vlan}`;
      if (!byVlan.has(key)) byVlan.set(key, []);
      byVlan.get(key).push(channel);
    }
  };
  for (const device of topology.devices) {
    for (const port of Object.keys(device.config.interfaces)) {
      if (!interfaceEnabled(device, port)) continue;
      if (isSwitchport(device, port)) {
        const settings = switchPort(device, port);
        for (const vlan of device.config.vlans || [{ id: 1 }]) {
          if (portCarriesVlan(device, port, vlan.id)) addChannel(device, port, vlan.id,
            settings.mode === 'trunk' && settings.nativeVlan !== vlan.id ? vlan.id : null, port, true);
        }
      } else {
        addChannel(device, port, 1, null, port, device.type === 'ap');
      }
    }
    for (const iface of device.config.subinterfaces || []) {
      if (interfaceEnabled(device, iface.name)) addChannel(device, iface.name, iface.vlan, iface.native ? null : iface.vlan, iface.parent, false);
    }
    for (const iface of device.config.svis || []) {
      if (interfaceEnabled(device, `vlan${iface.vlan}`) && sviOperational(topology, device, iface.vlan)) {
        addChannel(device, `vlan${iface.vlan}`, iface.vlan, null, null, true);
      }
    }
  }
  const graph = new Map();
  const addEdge = (from, to, linkId = null) => {
    if (!graph.has(from.key)) graph.set(from.key, []);
    graph.get(from.key).push({ key: to.key, from: `${from.device.id}/${linkId ? from.physicalPort : from.port}`,
      to: `${to.device.id}/${linkId ? to.physicalPort : to.port}`, linkId, vlan: from.vlan,
      ...(linkId ? { tag: from.tag, receivedVlan: to.vlan } : {}) });
  };
  for (const cable of [...topology.cables, ...wireless]) {
    for (const from of byWire.get(endpointKey(cable.from)) || []) {
      for (const to of byWire.get(endpointKey(cable.to)) || []) {
        if (from.tag !== to.tag) continue;
        addEdge(from, to, cable.id); addEdge(to, from, cable.id);
      }
    }
  }
  for (const group of byVlan.values()) for (const from of group) for (const to of group) {
    if (from !== to) addEdge(from, to);
  }
  const start = channels.find(channel => channel.device.id === origin.deviceId && channel.port === origin.portId);
  if (!start) return new Map();
  const found = new Map([[start.key, []]]), queue = [start.key];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const edge of graph.get(queue[cursor]) || []) {
      if (found.has(edge.key)) continue;
      found.set(edge.key, [...found.get(queue[cursor]), edge]);
      queue.push(edge.key);
    }
  }
  const result = new Map();
  for (const channel of channels) {
    if (!found.has(channel.key)) continue;
    const key = `${channel.device.id}/${channel.port}`;
    // Numbered logical interfaces remain distinct even when they share one Ethernet cable.
    if (!result.has(key)) result.set(key, found.get(channel.key));
  }
  return result;
}
