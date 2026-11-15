import { parseAddress, parseNetwork, addressInNetwork, sameAddress } from './networkAddressing.js';
import { allDeviceInterfaces, isSwitchport } from './networkVlans.js';
import { evaluateAcl } from './networkAcl.js';

const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const unicast4 = value => {
  const address = parseAddress(value);
  return address?.family === 4 && address.number > 0n && address.number >> 24n < 224n && address.number >> 24n !== 127n;
};
export function normalizeNat(type, config) {
  const input = config.nat ?? {};
  if (!object(input)) fail('NAT configuration must be an object.');
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') fail('NAT enabled must be a boolean.');
  const interfaces = allDeviceInterfaces({ type, config });
  const ports = key => {
    const list = input[key] ?? [];
    if (!Array.isArray(list) || list.length > 128 || new Set(list).size !== list.length) fail(`NAT ${key}: use unique interface names.`);
    if (list.some(port => typeof port !== 'string' || !Object.hasOwn(interfaces, port) || isSwitchport({ type, config }, port))) fail('NAT roles require routed interfaces, subinterfaces or SVIs.');
    return [...list];
  };
  const inside = ports('inside'), outside = ports('outside');
  if (inside.some(port => outside.includes(port))) fail('A NAT interface cannot be both inside and outside.');
  // Reject overlapping parent/logical roles rather than guessing precedence.
  for (const port of Object.keys(interfaces)) if (interfaces[port].parent) {
    const parent = interfaces[port].parent;
    if (inside.includes(port) && outside.includes(parent) || outside.includes(port) && inside.includes(parent)) fail('NAT roles on a subinterface and its parent must agree.');
  }
  if (!Array.isArray(input.staticMappings ?? []) || (input.staticMappings?.length || 0) > 100) fail('Use at most 100 static NAT mappings.');
  const locals = new Set(), globals = new Set();
  const staticMappings = (input.staticMappings || []).map(item => {
    if (!object(item) || !unicast4(item.local) || !unicast4(item.global)) fail('Static NAT needs valid unicast IPv4 inside-local and inside-global addresses.');
    if (item.local === item.global || locals.has(item.local) || globals.has(item.global)) fail('Static NAT mappings must have distinct, unique local and global addresses.');
    if (Object.values(interfaces).some(iface => iface.ip === item.local)) fail('A static NAT inside-local address must belong to an internal host, not this router.');
    locals.add(item.local); globals.add(item.global);
    return { local: item.local, global: item.global };
  });
  if (!Array.isArray(input.overload ?? []) || (input.overload?.length || 0) > 32) fail('Use at most 32 PAT overload rules.');
  const overload = (input.overload || []).map(item => {
    if (!object(item) || parseNetwork(item.source)?.family !== 4) fail('PAT source must be an aligned IPv4 prefix, such as 192.168.10.0/24.');
    if (!outside.includes(item.outside) || !unicast4(interfaces[item.outside]?.ip)) fail('PAT requires an outside interface with an IPv4 address.');
    const acl = item.acl ?? '';
    if (typeof acl !== 'string' || acl && !config.acls?.some(a => a.name === acl && a.family === 4)) fail('PAT classification ACL must reference a defined IPv4 ACL.');
    return { source: item.source, outside: item.outside, acl };
  });
  if (staticMappings.some(mapping => overload.some(rule => interfaces[rule.outside].ip === mapping.global))) fail('A static one-to-one mapping cannot share the same global address as PAT overload. Use another published address.');
  if (!['router', 'firewall', 'cloud', 'l3switch'].includes(type) && (input.enabled || inside.length || outside.length || staticMappings.length || overload.length)) fail('NAT/PAT is available on routing devices only.');
  if (input.enabled && (!inside.length || !outside.length)) fail('Enabled NAT requires at least one inside and one outside interface.');
  config.nat = { enabled: input.enabled ?? false, inside, outside, staticMappings, overload };
  return config;
}

export function natRole(device, port) {
  if (!device.config.nat?.enabled) return null;
  const parent = allDeviceInterfaces(device)[port]?.parent;
  for (const role of ['inside', 'outside']) if (device.config.nat[role].includes(port) || parent && device.config.nat[role].includes(parent)) return role;
  return null;
}

// Dynamic translations live for one simulated exchange, shared by its request
// and reply. They are never written to the topology or reused after edits.
export const createNatSession = () => ({ entries: [], nextPort: 40000 });
const transport = packet => ['tcp', 'udp'].includes(packet.protocol);
const localPort = packet => transport(packet) ? packet.sourcePort : packet.icmpId;
const remotePort = packet => transport(packet) ? packet.destinationPort : null;
const snapshot = packet => ({ sourceIP: packet.sourceIP, destinationIP: packet.destinationIP, sourcePort: packet.sourcePort, destinationPort: packet.destinationPort, icmpId: packet.icmpId });
const entryFor = (session, device, packet, local, global, kind, port) => {
  let entry = session.entries.find(e => e.deviceId === device.id && e.protocol === packet.protocol && e.insideLocal === local && e.insideGlobal === global && e.localPort === localPort(packet) && e.outsideGlobal === packet.destinationIP && e.remotePort === remotePort(packet));
  if (!entry) {
    entry = { deviceId: device.id, deviceName: device.name, kind, protocol: packet.protocol, insideLocal: local, insideGlobal: global,
      localPort: localPort(packet) ?? null, globalPort: port ?? null, outsideGlobal: packet.destinationIP, remotePort: remotePort(packet) };
    session.entries.push(entry);
  }
  return entry;
};

export function natOutbound(device, incomingPort, outgoingPort, packet, session) {
  if (packet.family !== 4 || !incomingPort || natRole(device, incomingPort) !== 'inside' || natRole(device, outgoingPort) !== 'outside') return null;
  const config = device.config.nat;
  const mapping = config.staticMappings.find(item => item.local === packet.sourceIP);
  let global, kind;
  if (mapping) { global = mapping.global; kind = 'Static NAT'; }
  else {
    const rule = config.overload.find(item => item.outside === outgoingPort && addressInNetwork(packet.sourceIP, item.source) && (!item.acl || evaluateAcl(device.config.acls.find(a => a.name === item.acl), packet).allowed));
    if (!rule || !['tcp', 'udp', 'icmp'].includes(packet.protocol)) return null;
    global = allDeviceInterfaces(device)[outgoingPort].ip; kind = 'PAT';
  }
  const before = snapshot(packet);
  const existing = session.entries.find(e => e.deviceId === device.id && e.protocol === packet.protocol && e.insideLocal === packet.sourceIP && e.localPort === localPort(packet) && e.outsideGlobal === packet.destinationIP && e.remotePort === remotePort(packet));
  const translatedPort = existing?.globalPort ?? (kind === 'PAT' ? session.nextPort++ : localPort(packet));
  if (kind === 'PAT' && translatedPort > 65535) throw new Error('PAT translation identifiers exhausted.');
  const entry = entryFor(session, device, packet, packet.sourceIP, global, kind, translatedPort);
  packet.sourceIP = global;
  if (kind === 'PAT') {
    if (transport(packet)) packet.sourcePort = entry.globalPort;
    else packet.icmpId = entry.globalPort;
  }
  return { kind, direction: 'inside → outside', before, after: snapshot(packet), entry: { ...entry } };
}

export function natInbound(device, incomingPort, packet, session) {
  if (packet.family !== 4 || natRole(device, incomingPort) !== 'outside') return null;
  const entry = session.entries.find(e => e.deviceId === device.id && e.protocol === packet.protocol && e.insideGlobal === packet.destinationIP && e.outsideGlobal === packet.sourceIP &&
    (transport(packet) ? e.globalPort === packet.destinationPort && e.remotePort === packet.sourcePort : e.globalPort === packet.icmpId));
  const mapping = device.config.nat.staticMappings.find(item => item.global === packet.destinationIP);
  if (!entry && !mapping) return null;
  const before = snapshot(packet);
  packet.destinationIP = entry?.insideLocal ?? mapping.local;
  if (entry?.kind === 'PAT') {
    if (transport(packet)) packet.destinationPort = entry.localPort;
    else packet.icmpId = entry.localPort;
  }
  if (!entry) {
    // Store the reverse tuple so the local server's reply uses the same mapping.
    entryFor(session, device, { ...packet, sourceIP: packet.destinationIP, destinationIP: packet.sourceIP,
      sourcePort: packet.destinationPort, destinationPort: packet.sourcePort }, mapping.local, mapping.global, 'Static NAT', transport(packet) ? packet.destinationPort : packet.icmpId);
  }
  return { kind: entry?.kind || 'Static NAT', direction: 'outside → inside', before, after: snapshot(packet) };
}

export function natProxyAddress(device, port, address, iface) {
  const mask = typeof iface.mask === 'string' ? iface.mask.replace(/^\//, '') : '';
  const prefix = /^\d+$/.test(mask) ? Number(mask) : parseAddress(mask)?.number.toString(2).padStart(32, '0').match(/^1*/)[0].length;
  return natRole(device, port) === 'outside' && device.config.nat.staticMappings.some(m => sameAddress(m.global, address)) &&
    addressInNetwork(address, `${iface.ip}/${prefix}`);
}

export function mergeNatTranslations(...results) {
  return [...new Map(results.flatMap(r => r?.natTranslations || []).map(row => [JSON.stringify(row), row])).values()];
}
