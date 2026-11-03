import { ipv4, maskPrefix, sameSubnet, isRoutingDevice } from './networkConfig.js';
import { networkFor } from './networkAddressing.js';
import { interfaceAcl } from './networkAcl.js';

// A converged OSPFv2 single-area graph. Interface costs are directional.
export function buildOspfState(topology, domain, interfaces) {
  const devices = topology.devices.filter(d => isRoutingDevice(d.type) && d.config.ospf?.enabled && !(d.type === 'l3switch' && d.config.ipRouting === false));
  const states = {}, edges = {};
  const domains = new Map();
  const reachableFrom = (device, port) => {
    const key = `${device.id}/${port}`;
    if (!domains.has(key)) domains.set(key, domain(topology, { deviceId: device.id, portId: port }));
    return domains.get(key);
  };
  const operational = new Map(devices.map(d => [d.id, interfaces(d, topology).filter(([port]) =>
    [...reachableFrom(d, port).keys()].some(key => !key.startsWith(`${d.id}/`)))]));
  for (const d of devices) {
    const addresses = operational.get(d.id);
    const routerId = d.config.ospf.routerId || addresses.map(([, i]) => i.ip).sort((a, b) => ipv4(b) - ipv4(a))[0] || '';
    states[d.id] = { routerId, area: d.config.ospf.area, neighbors: [], routes: [], errors: [] };
    edges[d.id] = [];
  }
  for (const d of devices) {
    const state = states[d.id];
    if (!state.routerId) state.errors.push('No router ID or active IPv4 address.');
    if (devices.some(other => other.id !== d.id && states[other.id].routerId === state.routerId)) state.errors.push('Duplicate router ID.');
  }
  const active = d => operational.get(d.id).flatMap(([port, iface]) => {
    const entry = d.config.ospf.interfaces.find(i => i.port === port);
    return entry ? [{ ...entry, iface }] : [];
  });
  for (const d of devices) for (const local of active(d)) {
    const reachable = reachableFrom(d, local.port);
    for (const peer of devices.filter(p => p.id !== d.id)) for (const remote of active(peer)) {
      if (!reachable.has(`${peer.id}/${remote.port}`)) continue;
      let reason = '';
      if (states[d.id].errors.length || states[peer.id].errors.length) reason = 'Invalid or duplicate router ID';
      else if (local.passive || remote.passive) reason = 'Passive interface';
      else if (states[d.id].area !== states[peer.id].area) reason = 'Area mismatch';
      else if (maskPrefix(local.iface.mask) !== maskPrefix(remote.iface.mask) || !sameSubnet(local.iface.ip, remote.iface.ip, local.iface.mask)) reason = 'Subnet mismatch';
      else {
        const hello = (a, ai, b, bi) => {
          const packet = { family: 4, protocol: 'ospf', sourceIP: ai.iface.ip, destinationIP: '224.0.0.5' };
          return interfaceAcl(a, ai.port, 'out', packet).allowed && interfaceAcl(b, bi.port, 'in', packet).allowed;
        };
        if (!hello(d, local, peer, remote) || !hello(peer, remote, d, local)) reason = 'OSPF Hello blocked by ACL';
      }
      states[d.id].neighbors.push({ peerId: peer.id, routerId: states[peer.id].routerId, port: local.port, peerPort: remote.port, state: reason ? 'Down' : 'Full', reason });
      if (!reason) edges[d.id].push({ peer: peer.id, cost: local.cost, port: local.port, nextHop: remote.iface.ip });
    }
  }
  for (const root of devices) {
    const connected = new Set(operational.get(root.id).map(([, iface]) => networkFor(iface.ip, maskPrefix(iface.mask))));
    const distance = { [root.id]: 0 }, first = {}, pending = new Set(devices.map(d => d.id));
    while (pending.size) {
      const id = [...pending].sort((a, b) => (distance[a] ?? Infinity) - (distance[b] ?? Infinity) || a.localeCompare(b))[0];
      pending.delete(id);
      if (distance[id] === undefined) break;
      for (const edge of edges[id]) {
        const cost = distance[id] + edge.cost;
        if (cost >= (distance[edge.peer] ?? Infinity)) continue;
        distance[edge.peer] = cost; first[edge.peer] = id === root.id ? edge : first[id];
      }
    }
    const routes = new Map();
    for (const remote of devices) {
      if (remote.id === root.id || !first[remote.id]) continue;
      for (const entry of active(remote)) {
        const destination = networkFor(entry.iface.ip, maskPrefix(entry.iface.mask));
        if (connected.has(destination)) continue;
        const route = { destination, nextHop: first[remote.id].nextHop, port: first[remote.id].port, cost: distance[remote.id] + entry.cost, learnedFrom: remote.id };
        if (!routes.has(destination) || routes.get(destination).cost > route.cost) routes.set(destination, route);
      }
    }
    states[root.id].routes = [...routes.values()];
  }
  return { devices: states };
}
