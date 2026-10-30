import { ipv4, formatIPv4, sameSubnet, maskPrefix, prefixMask, parseCIDR, isBridgeDevice, isRoutingDevice } from './networkConfig.js';

const endpointKey = endpoint => `${endpoint.deviceId}/${endpoint.portId}`;
const splitKey = key => { const [deviceId, portId] = key.split('/'); return { deviceId, portId }; };
const enabled = (device, port) => device.config?.interfaces[port]?.enabled !== false &&
  (port !== 'wlan0' || device.config?.wireless.enabled);
const interfaces = device => Object.entries(device.config?.interfaces || {}).filter(([port]) => enabled(device, port));
const addressInterfaces = device => interfaces(device).filter(([, iface]) => ipv4(iface.ip) !== null && maskPrefix(iface.mask) !== null);

export function wirelessConnections(topology) {
  const links = [];
  for (const laptop of topology.devices.filter(device => device.type === 'laptop' && enabled(device, 'wlan0') && device.config.wireless.ssid)) {
    const accessPoints = topology.devices.filter(device => device.type === 'ap' && enabled(device, 'wlan0') &&
      device.config.wireless.ssid === laptop.config.wireless.ssid && device.config.wireless.password === laptop.config.wireless.password)
      .sort((a, b) => Math.hypot(a.x - laptop.x, a.y - laptop.y) - Math.hypot(b.x - laptop.x, b.y - laptop.y));
    if (accessPoints[0]) links.push({ id: `wifi-${laptop.id}`, from: { deviceId: laptop.id, portId: 'wlan0' }, to: { deviceId: accessPoints[0].id, portId: 'wlan0' } });
  }
  return links;
}

// Traverse cables and transparent bridges only. Routers terminate a broadcast domain.
export function layer2Domain(topology, origin) {
  const graph = new Map();
  const add = (from, to, linkId = null) => {
    const key = endpointKey(from);
    if (!graph.has(key)) graph.set(key, []);
    graph.get(key).push({ to: endpointKey(to), linkId });
  };
  for (const link of [...topology.cables, ...wirelessConnections(topology)]) {
    const from = topology.devices.find(device => device.id === link.from.deviceId);
    const to = topology.devices.find(device => device.id === link.to.deviceId);
    if (!from || !to || !enabled(from, link.from.portId) || !enabled(to, link.to.portId)) continue;
    add(link.from, link.to, link.id); add(link.to, link.from, link.id);
  }
  for (const device of topology.devices.filter(item => isBridgeDevice(item.type))) {
    for (const [from] of interfaces(device)) for (const [to] of interfaces(device)) {
      if (from !== to) add({ deviceId: device.id, portId: from }, { deviceId: device.id, portId: to });
    }
  }
  const found = new Map([[endpointKey(origin), []]]);
  const queue = [endpointKey(origin)];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const edge of graph.get(queue[cursor]) || []) {
      if (found.has(edge.to)) continue;
      found.set(edge.to, [...found.get(queue[cursor]), { from: queue[cursor], to: edge.to, linkId: edge.linkId }]);
      queue.push(edge.to);
    }
  }
  return found;
}

function routeFor(device, destination) {
  const candidates = addressInterfaces(device).filter(([, iface]) => sameSubnet(iface.ip, destination, iface.mask))
    .map(([port, iface]) => ({ port, iface, nextHop: destination, prefix: maskPrefix(iface.mask), connected: true }));
  for (const route of device.config.routes || []) {
    const network = parseCIDR(route.destination);
    const iface = device.config.interfaces[route.port];
    if (!network || !iface?.ip || !enabled(device, route.port) || !sameSubnet(destination, network.ip, `/${network.prefix}`)) continue;
    if (!sameSubnet(iface.ip, route.nextHop, iface.mask)) continue;
    candidates.push({ port: route.port, iface, nextHop: route.nextHop, prefix: network.prefix });
  }
  if (device.config.gateway) {
    for (const [port, iface] of addressInterfaces(device)) if (sameSubnet(iface.ip, device.config.gateway, iface.mask)) {
      candidates.push({ port, iface, nextHop: device.config.gateway, prefix: 0 });
    }
  }
  return candidates.sort((a, b) => b.prefix - a.prefix || Number(Boolean(b.connected)) - Number(Boolean(a.connected)))[0];
}

function deliver(topology, sourceId, destination, protocol) {
  const steps = [], links = [], trace = [];
  let current = topology.devices.find(device => device.id === sourceId);
  let sourceIP = '';
  const record = (message, extra = {}) => trace.push({ deviceId: current?.id, protocol,
    sourceIP: sourceIP || (current ? addressInterfaces(current)[0]?.[1].ip || '' : ''), destinationIP: destination, message, status: 'active', ...extra });
  const fail = message => {
    record(message, { status: 'blocked' });
    return { ok: false, message, steps, links, trace };
  };
  if (!current || isBridgeDevice(current.type)) return fail('Select a PC, laptop, server, or routing device as the source.');
  if (ipv4(destination) === null) return fail('Enter a valid destination IPv4 address.');
  record('Packet created. Select an outgoing route.');
  const visited = new Set();
  for (let ttl = 32; ttl > 0; ttl--) {
    if (current.type === 'firewall' && !current.config.firewall[protocol]) return fail(`${current.name}: ${protocol.toUpperCase()} traffic is blocked by the firewall.`);
    const local = addressInterfaces(current).find(([, iface]) => iface.ip === destination);
    if (local) {
      record('Packet reached its destination.', { status: 'delivered', sourceIP: sourceIP || destination });
      return { ok: true, message: 'Packet delivered.', steps, links, trace, sourceIP: sourceIP || destination, targetId: current.id, targetPort: local[0] };
    }
    if (visited.has(current.id)) return fail(`Routing loop detected at ${current.name}.`);
    visited.add(current.id);
    const route = routeFor(current, destination);
    if (!route) return fail(`${current.name}: no route to ${destination}. Check its IP address, subnet mask, gateway, and static routes.`);
    if (!sourceIP) sourceIP = route.iface.ip;
    steps.push(`${current.name} → ${route.port}: ${route.connected ? 'directly connected network' : `next hop ${route.nextHop}`}`);
    record(`${current.name}: ${route.connected ? 'destination is on a connected network' : `forward via ${route.nextHop}`}. Outgoing interface: ${route.port}.`);
    const domain = layer2Domain(topology, { deviceId: current.id, portId: route.port });
    const responders = [];
    const ownAddress = [];
    for (const [key, path] of domain) {
      const endpoint = splitKey(key);
      const device = topology.devices.find(item => item.id === endpoint.deviceId);
      const iface = device?.config.interfaces[endpoint.portId];
      if (!device || isBridgeDevice(device.type) || !iface || !enabled(device, endpoint.portId)) continue;
      if (iface.ip === route.iface.ip) ownAddress.push(key);
      if (device.id !== current.id && iface.ip === route.nextHop) responders.push({ device, endpoint, path });
    }
    if (ownAddress.length > 1) return fail(`Duplicate IP address ${route.iface.ip} on the local network.`);
    if (responders.length > 1) return fail(`Duplicate IP address ${route.nextHop} on the local network.`);
    if (!responders.length) return fail(`${current.name}: cannot resolve ${route.nextHop} on ${route.port}. Check cables, interface state, Wi-Fi association, and addressing.`);
    const responder = responders[0];
    for (const edge of responder.path) {
      if (edge.linkId) links.push(edge.linkId);
      const from = splitKey(edge.from), to = splitKey(edge.to);
      const device = topology.devices.find(item => item.id === to.deviceId);
      record(edge.linkId ? `${device.name}: packet arrives on ${to.portId}.` : `${device.name}: bridge forwards from ${from.portId} to ${to.portId}.`,
        { from, to, linkId: edge.linkId, deviceId: to.deviceId });
    }
    const hopDevices = [...new Set(responder.path.map(edge => splitKey(edge.to).deviceId))];
    steps.push(`Local delivery: ${[current.id, ...hopDevices].map(id => topology.devices.find(device => device.id === id)?.name).join(' → ')}`);
    current = responder.device;
    if (addressInterfaces(current).some(([, iface]) => iface.ip === destination)) continue;
    if (!isRoutingDevice(current.type)) return fail(`${current.name} is an end device and cannot forward packets to another network.`);
  }
  return fail('Packet TTL expired. Check for a routing loop.');
}

export function testConnectivity(topology, sourceId, destination, protocol = 'icmp') {
  const outward = deliver(topology, sourceId, destination, protocol);
  outward.trace = outward.trace.map(event => ({ ...event, phase: 'Request' }));
  if (!outward.ok) return outward;
  const reply = deliver(topology, outward.targetId, outward.sourceIP, protocol);
  const trace = [...outward.trace, ...reply.trace.map(event => ({ ...event, phase: 'Reply' }))];
  if (!reply.ok) return { ...reply, message: `Request reached the destination, but the reply failed: ${reply.message}`,
    steps: [...outward.steps, 'Reply path:', ...reply.steps], links: [...outward.links, ...reply.links], trace };
  return { ...outward, message: protocol === 'icmp' ? `Reply from ${destination}. Both request and reply paths are reachable.` : `Connection to ${destination} established.`,
    steps: [...outward.steps, 'Reply path:', ...reply.steps], links: [...new Set([...outward.links, ...reply.links])], trace };
}

const serviceEvent = (connection, message, status) => ({ deviceId: connection.targetId,
  protocol: connection.trace?.[0]?.protocol, phase: 'Service', sourceIP: connection.sourceIP,
  destinationIP: connection.trace?.[0]?.destinationIP, message, status });

export function resolveHostname(topology, sourceId, hostname) {
  const source = topology.devices.find(device => device.id === sourceId);
  const dnsIP = source?.config.dns;
  if (!dnsIP) return { ok: false, message: 'Configure a DNS server address on the source device first.', steps: [], links: [] };
  const connection = testConnectivity(topology, sourceId, dnsIP, 'dns');
  if (!connection.ok) return connection;
  const server = topology.devices.find(device => device.id === connection.targetId);
  if (server.type !== 'server' || !server.config.services.dns.enabled) {
    const message = `${dnsIP}: DNS service is not enabled.`;
    return { ...connection, ok: false, message, trace: [...connection.trace, serviceEvent(connection, message, 'blocked')] };
  }
  const name = hostname.trim().toLowerCase().replace(/\.$/, '');
  const record = server.config.services.dns.records.find(item => item.name.toLowerCase().replace(/\.$/, '') === name);
  const message = record ? `${name} → ${record.ip}` : `${server.name}: no DNS A record for ${name}.`;
  return { ...connection, ok: Boolean(record), ...(record ? { ip: record.ip } : {}), message,
    trace: [...connection.trace, serviceEvent(connection, message, record ? 'delivered' : 'blocked')] };
}

export function simulatePing(topology, sourceId, target) {
  if (ipv4(target.trim()) !== null) return testConnectivity(topology, sourceId, target.trim());
  const dns = resolveHostname(topology, sourceId, target);
  if (!dns.ok) return dns;
  const result = testConnectivity(topology, sourceId, dns.ip);
  return { ...result, steps: [dns.message, ...dns.steps, ...result.steps], links: [...new Set([...dns.links, ...result.links])], trace: [...(dns.trace || []), ...(result.trace || [])] };
}

export function simulateHTTP(topology, sourceId, target) {
  let url;
  try { url = new URL(target.includes('://') ? target : `http://${target}`); }
  catch { return { ok: false, message: 'Enter an IPv4 address or an HTTP URL.', steps: [], links: [] }; }
  if (url.protocol !== 'http:' || (url.port && url.port !== '80') || url.username || url.password) return { ok: false, message: 'This lab supports HTTP on port 80. Use http:// with no credentials.', steps: [], links: [] };
  const dns = ipv4(url.hostname) === null ? resolveHostname(topology, sourceId, url.hostname) : null;
  if (dns && !dns.ok) return dns;
  const result = testConnectivity(topology, sourceId, dns ? dns.ip : url.hostname, 'http');
  if (!result.ok) return { ...result, trace: [...(dns?.trace || []), ...(result.trace || [])] };
  const server = topology.devices.find(device => device.id === result.targetId);
  if (server.type !== 'server' || !server.config.services.http.enabled) {
    const message = 'The destination is reachable, but HTTP service is not enabled.';
    return { ...result, ok: false, message, trace: [...(dns?.trace || []), ...result.trace, serviceEvent(result, message, 'blocked')] };
  }
  return { ...result, message: 'HTTP 200 OK', page: { title: server.config.services.http.title, body: server.config.services.http.body },
    steps: [...(dns ? [dns.message, ...dns.steps] : []), ...result.steps], links: [...new Set([...(dns?.links || []), ...result.links])],
    trace: [...(dns?.trace || []), ...result.trace, serviceEvent(result, 'HTTP 200 OK: the server returned its configured page.', 'delivered')] };
}

export function requestDHCP(topology, sourceId, port = 'eth0') {
  const source = topology.devices.find(device => device.id === sourceId);
  const fail = message => ({ ok: false, message, steps: [], links: [] });
  if (!source || isBridgeDevice(source.type) || isRoutingDevice(source.type) || !source.config.interfaces[port] || !enabled(source, port)) return fail('Choose an enabled interface on an end device.');
  const domain = layer2Domain(topology, { deviceId: sourceId, portId: port });
  const servers = [];
  const occupied = new Set();
  for (const [key, path] of domain) {
    const endpoint = splitKey(key);
    const device = topology.devices.find(item => item.id === endpoint.deviceId);
    const iface = device.config.interfaces[endpoint.portId];
    if (iface?.ip && !(device.id === sourceId && endpoint.portId === port)) occupied.add(ipv4(iface.ip));
    if (device.id !== sourceId && device.type === 'server' && device.config.services.dhcp.enabled && iface?.ip) servers.push({ device, iface, path });
  }
  if (!servers.length) return fail('No DHCP server in this broadcast domain. Connect an enabled DHCP server to the same LAN. Routers do not relay DHCP in this lab.');
  const { device: server, iface, path } = servers[0];
  const pool = server.config.services.dhcp;
  const start = ipv4(pool.start), end = ipv4(pool.end), prefix = maskPrefix(pool.mask);
  if (start === null || end === null || prefix === null || end < start || end - start > 4095 || !sameSubnet(pool.start, pool.end, pool.mask) || !sameSubnet(iface.ip, pool.start, pool.mask)) return fail(`${server.name}: the DHCP pool and server address must be in the same subnet.`);
  if (pool.gateway) occupied.add(ipv4(pool.gateway));
  if (pool.dns) occupied.add(ipv4(pool.dns));
  const usable = value => !occupied.has(value) && (prefix > 30 || ((value & ~prefixMask(prefix)) >>> 0) !== 0 && ((value & ~prefixMask(prefix)) >>> 0) !== (~prefixMask(prefix) >>> 0));
  const current = ipv4(source.config.interfaces[port].ip);
  let lease = current !== null && current >= start && current <= end && usable(current) ? current : null;
  if (lease === null) for (let candidate = start; candidate <= end; candidate++) if (usable(candidate)) { lease = candidate; break; }
  if (lease === null) return fail(`${server.name}: no available addresses in the DHCP pool.`);
  const config = structuredClone(source.config);
  config.interfaces[port] = { ...config.interfaces[port], ip: formatIPv4(lease), mask: pool.mask };
  config.gateway = pool.gateway; config.dns = pool.dns;
  // Show the selected server's exchange, rather than inventing paths to other hosts.
  const trace = [];
  for (const [phase, reverse] of [['DHCP Discover', false], ['DHCP Offer', true], ['DHCP Request', false], ['DHCP ACK', true]]) {
    const sourceIP = reverse ? iface.ip : '0.0.0.0';
    const destinationIP = '255.255.255.255';
    const origin = reverse ? server.id : source.id;
    trace.push({ deviceId: origin, protocol: 'dhcp', phase, sourceIP, destinationIP,
      message: `${phase}: ${reverse ? server.name : source.name} sends a ${reverse ? 'server response' : 'client broadcast'}.`, status: 'active' });
    const edges = reverse ? [...path].reverse().map(edge => ({ from: edge.to, to: edge.from, linkId: edge.linkId })) : path;
    for (const edge of edges) {
      const from = splitKey(edge.from), to = splitKey(edge.to);
      const device = topology.devices.find(item => item.id === to.deviceId);
      trace.push({ from, to, linkId: edge.linkId, deviceId: to.deviceId, protocol: 'dhcp', phase, sourceIP, destinationIP,
        message: `${phase}: ${device.name} ${edge.linkId ? `receives on ${to.portId}` : `bridges to ${to.portId}`}.`, status: 'active' });
    }
  }
  trace.push({ deviceId: source.id, protocol: 'dhcp', phase: 'DHCP lease', sourceIP: formatIPv4(lease), destinationIP: iface.ip,
    message: `${source.name} applies ${formatIPv4(lease)} with gateway ${pool.gateway || 'none'} and DNS ${pool.dns || 'none'}.`, status: 'delivered' });
  return { ok: true, config, message: `${source.name} received ${formatIPv4(lease)} from ${server.name}.`,
    steps: [`DHCP Discover → ${server.name}`, `DHCP Offer: ${formatIPv4(lease)}`, 'DHCP Request → DHCP ACK', `Gateway: ${pool.gateway || 'none'} · DNS: ${pool.dns || 'none'}`], links: path.map(edge => edge.linkId).filter(Boolean), trace };
}
