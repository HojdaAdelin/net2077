import { parseAddress, sameAddress, validUnicast6, validPrefix6, parseNetwork, networkFor } from './networkAddressing.js';
import { DEVICE_TYPES, emptyTopology, connectionError } from './networkTopology.js';
import { defaultDeviceConfig, validateDeviceSettings, ipv4, maskPrefix, allDeviceInterfaces, validInterfaceName, validVlanId, parseVlanList, switchPort, isSwitchDevice, interfaceProtocolFields } from './networkConfig.js';
import { getOspfState, testConnectivity, simulatePing, simulateHTTP, resolveHostname, requestDHCP } from './networkSimulation.js';

const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const text = (value, label, max = 120) => typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : fail(`${label}: enter 1–${max} characters.`);
const identifier = (value, label) => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(value) ? value : fail(`Invalid ${label}. Use letters, digits, underscores or hyphens.`);
const boolean = (value, fallback) => value === undefined ? fallback : typeof value === 'boolean' ? value : fail('Expected a boolean value.');
const address = value => ipv4(value) !== null ? value : fail('Enter a valid IPv4 address.');

function deviceConfig(type, input = {}) {
  if (!object(input)) fail('Device config must be an object.');
  const result = defaultDeviceConfig(type, DEVICE_TYPES[type].ports);
  for (const port of Object.keys(result.interfaces)) {
    const data = input.interfaces?.[port] || {};
    result.interfaces[port] = { enabled: boolean(data.enabled, true), ip: data.ip ?? '', mask: data.mask ?? '255.255.255.0', ...interfaceProtocolFields(data) };
  }
  for (const key of ['gateway', 'dns']) result[key] = input[key] ?? result[key];
  for (const key of ['vlans', 'switchports', 'subinterfaces', 'svis', 'ipRouting', 'gateway6', 'routes6', 'ipv6Routing', 'acls', 'ospf']) {
    if (input[key] !== undefined) result[key] = structuredClone(input[key]);
  }
  result.routes = (input.routes ?? []).map(route => ({ destination: route.destination, nextHop: route.nextHop, port: route.port }));
  for (const section of ['wireless', 'firewall']) {
    for (const key of Object.keys(result[section])) result[section][key] = input[section]?.[key] ?? result[section][key];
  }
  for (const service of Object.keys(result.services)) {
    for (const key of Object.keys(result.services[service])) result.services[service][key] = input.services?.[service]?.[key] ?? result.services[service][key];
  }
  for (const iface of Object.values(result.interfaces)) if (typeof iface.ip !== 'string' || typeof iface.mask !== 'string') fail('Interface addresses must be strings.');
  for (const value of [result.wireless.enabled, ...Object.values(result.firewall), ...Object.values(result.services).map(service => service.enabled)]) if (typeof value !== 'boolean') fail('Enabled and policy settings must be booleans.');
  return result;
}

export function normalizeTopology(input) {
  try {
    if (!object(input) || !Array.isArray(input.devices) || !Array.isArray(input.cables)) fail('Topology requires devices and cables arrays.');
    if (input.devices.length > 40 || input.cables.length > 120) fail('Use at most 40 devices and 120 cables.');
    const result = emptyTopology(), ids = new Set();
    for (const item of input.devices) {
      if (!object(item) || !Object.hasOwn(DEVICE_TYPES, item.type)) fail('Unknown device type.');
      const id = identifier(item.id, 'device ID');
      if (ids.has(id)) fail('Device IDs must be unique.');
      ids.add(id);
      const x = item.x ?? 0, y = item.y ?? 0;
      if (![x, y].every(value => Number.isFinite(value) && Math.abs(value) <= 100000)) fail('Invalid device coordinates.');
      const settings = validateDeviceSettings(item.type, DEVICE_TYPES[item.type].ports, { name: item.name ?? id, config: deviceConfig(item.type, item.config) });
      result.devices.push({ id, type: item.type, x, y, ...settings });
      const suffix = id.startsWith(`${item.type}-`) ? Number(id.slice(item.type.length + 1)) : 0;
      result.counts[item.type] = Math.max(result.counts[item.type] + 1, Number.isSafeInteger(suffix) && suffix < 1000000 ? suffix : 0);
    }
    const cableIds = new Set();
    for (const item of input.cables) {
      const id = identifier(item.id ?? `cable-${result.nextCable}`, 'cable ID');
      if (cableIds.has(id)) fail('Cable IDs must be unique.');
      const error = connectionError(result, item.from, item.to);
      if (error) fail(error);
      cableIds.add(id);
      result.cables.push({ id, from: { deviceId: item.from.deviceId, portId: item.from.portId }, to: { deviceId: item.to.deviceId, portId: item.to.portId } });
      const suffix = id.startsWith('cable-') ? Number(id.slice(6)) : 0;
      result.nextCable = Math.max(result.nextCable + 1, Number.isSafeInteger(suffix) && suffix < 1000000 ? suffix + 1 : 0);
    }
    return result;
  } catch (error) { if (error.status) throw error; fail('Invalid topology configuration. Check interface, route and service settings.'); }
}

export function normalizeProblem(input) {
  if (!object(input) || (input.schemaVersion !== undefined && input.schemaVersion !== 1)) fail('Use a problem object with schemaVersion 1.');
  const slug = text(input.slug, 'Slug', 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail('Slug must use lowercase words separated by hyphens.');
  const topology = normalizeTopology(input.topology);
  if (!topology.devices.length) fail('Add at least one device.');
  const difficulty = input.difficulty ?? 'easy';
  if (!['easy', 'medium', 'hard'].includes(difficulty)) fail('Invalid difficulty.');
  const xp = input.xp ?? 50;
  if (!Number.isSafeInteger(xp) || xp < 0 || xp > 10000) fail('XP must be a whole number between 0 and 10,000.');
  const device = id => topology.devices.find(item => item.id === id) || fail(`Unknown device: ${id}.`);
  const getPort = (id, port) => validInterfaceName(device(id), port) ? port : fail(`Unknown interface ${id}/${port}.`);
  if (!Array.isArray(input.objectives) || !input.objectives.length || input.objectives.length > 30) fail('Add between 1 and 30 objectives.');
  const objectiveIds = new Set();
  const objectives = input.objectives.map((goal, index) => {
    if (!object(goal)) fail('Invalid objective.');
    const id = identifier(goal.id ?? `goal-${index + 1}`, 'objective ID');
    if (objectiveIds.has(id)) fail('Objective IDs must be unique.');
    objectiveIds.add(id);
    const result = { id, label: text(goal.label, 'Objective label', 300), type: goal.type };
    if (['ping', 'http', 'dns'].includes(goal.type)) {
      device(goal.source);
      result.source = goal.source; result.target = text(goal.target, 'Target', 255);
      result.expected = boolean(goal.expected, true);
      if (goal.targetDevice) { device(goal.targetDevice); result.targetDevice = goal.targetDevice; }
      if (goal.type === 'dns' && goal.expectedIP) result.expectedIP = address(goal.expectedIP);
    } else if (goal.type === 'interface') {
      device(goal.device); result.device = goal.device; result.port = getPort(goal.device, goal.port);
      if (goal.ip !== undefined) result.ip = address(goal.ip);
      if (goal.mask !== undefined) { if (maskPrefix(goal.mask) === null) fail('Invalid objective subnet mask.'); result.mask = goal.mask; }
      if (goal.ipv6 !== undefined) { if (!validUnicast6(goal.ipv6)) fail('Invalid IPv6 objective address.'); result.ipv6 = goal.ipv6; }
      if (goal.prefix6 !== undefined) { if (!validPrefix6(goal.prefix6)) fail('Invalid IPv6 objective prefix.'); result.prefix6 = goal.prefix6; }
      if (goal.enabled !== undefined) result.enabled = boolean(goal.enabled, true);
      if (!['ip', 'mask', 'enabled', 'ipv6', 'prefix6'].some(key => Object.hasOwn(result, key))) fail('Interface objectives need an IP, mask or enabled setting.');
    } else if (goal.type === 'vlan') {
      const target = device(goal.device);
      if (!isSwitchDevice(target.type) || !validVlanId(goal.vlan)) fail('VLAN objectives need a switch and VLAN ID from 1 to 4094.');
      result.device = goal.device; result.vlan = goal.vlan; result.enabled = boolean(goal.enabled, true);
    } else if (goal.type === 'switchport') {
      const target = device(goal.device);
      if (!isSwitchDevice(target.type) || !DEVICE_TYPES[target.type].ports.includes(goal.port)) fail('Switchport objectives need a physical switch port.');
      if (!(target.type === 'l3switch' ? ['access', 'trunk', 'routed'] : ['access', 'trunk']).includes(goal.mode)) fail('Choose a valid switchport mode.');
      result.device = goal.device; result.port = goal.port; result.mode = goal.mode;
      for (const key of goal.mode === 'access' ? ['accessVlan'] : goal.mode === 'trunk' ? ['nativeVlan'] : []) if (goal[key] !== undefined) {
        if (!validVlanId(goal[key])) fail(`Invalid ${key}.`);
        result[key] = goal[key];
      }
      if (goal.mode === 'trunk' && goal.allowedVlans !== undefined) result.allowedVlans = parseVlanList(goal.allowedVlans);
    } else if (goal.type === 'subinterface') {
      const target = device(goal.device);
      if (target.type !== 'router' || !validInterfaceName(target, goal.port) || !goal.port.includes('.') || !validVlanId(goal.vlan)) fail('Subinterface objectives need a router, logical interface and VLAN.');
      result.device = goal.device; result.port = goal.port; result.vlan = goal.vlan;
      result.native = boolean(goal.native, false); result.enabled = boolean(goal.enabled, true);
      if (goal.ip !== undefined) result.ip = address(goal.ip);
      if (goal.mask !== undefined) { if (maskPrefix(goal.mask) === null) fail('Invalid subinterface mask.'); result.mask = goal.mask; }
    } else if (goal.type === 'ipRouting') {
      if (device(goal.device).type !== 'l3switch') fail('IP routing objectives need an L3 switch.');
      result.device = goal.device; result.enabled = boolean(goal.enabled, true);
    } else if (goal.type === 'traffic') {
      device(goal.source); result.source = goal.source;
      if (!parseAddress(goal.target)) fail('Traffic objectives need an IPv4 or IPv6 destination.');
      result.target = goal.target; result.expected = boolean(goal.expected, true);
      if (!['tcp', 'udp', 'icmp', 'icmpv6'].includes(goal.protocol)) fail('Invalid traffic protocol.');
      if (goal.protocol === 'icmpv6' && parseAddress(goal.target).family !== 6) fail('ICMPv6 requires an IPv6 destination.');
      result.protocol = goal.protocol;
      for (const key of ['sourcePort', 'destinationPort']) if (goal[key] !== undefined) {
        if (!['tcp', 'udp'].includes(goal.protocol) || !Number.isInteger(goal[key]) || goal[key] < 0 || goal[key] > 65535) fail('Traffic ports require TCP/UDP and values from 0 to 65535.');
        result[key] = goal[key];
      }
      if (['tcp', 'udp'].includes(goal.protocol) && result.destinationPort === undefined) fail('Set the destination port.');
      if (goal.targetDevice) { device(goal.targetDevice); result.targetDevice = goal.targetDevice; }
    } else if (goal.type === 'gateway6') {
      device(goal.device); result.device = goal.device;
      if (!validUnicast6(goal.value)) fail('Invalid IPv6 gateway objective.'); result.value = goal.value;
    } else if (['ospfNeighbor', 'ospfRoute', 'staticRoute', 'aclBinding', 'ipv6Routing'].includes(goal.type)) {
      const target = device(goal.device); result.device = goal.device;
      if (!['router', 'l3switch', 'cloud', 'firewall'].includes(target.type) && goal.type !== 'staticRoute') fail('This objective requires a routing device.');
      if (goal.type === 'ipv6Routing') result.enabled = boolean(goal.enabled, true);
      if (goal.type === 'ospfNeighbor') {
        if (goal.peer === goal.device || !['router', 'l3switch', 'cloud', 'firewall'].includes(device(goal.peer).type)) fail('Choose another routing device as the OSPF neighbor.');
        result.peer = goal.peer; result.expected = boolean(goal.expected, true);
      }
      if (['ospfRoute', 'staticRoute'].includes(goal.type)) {
        const prefix = parseNetwork(goal.destination);
        if (!prefix || (goal.type === 'ospfRoute' && prefix.family !== 4)) fail('Enter an aligned destination network.');
        result.destination = networkFor(goal.destination.split('/')[0], prefix.prefix);
        if (goal.nextHop !== undefined) { if (parseAddress(goal.nextHop)?.family !== prefix.family) fail('Invalid next hop objective.'); result.nextHop = goal.nextHop; }
        if (goal.port !== undefined) result.port = getPort(goal.device, goal.port);
      }
      if (goal.type === 'aclBinding') {
        result.port = getPort(goal.device, goal.port);
        if (![4, 6].includes(goal.family) || !['in', 'out'].includes(goal.direction)) fail('ACL binding requires family 4/6 and direction in/out.');
        result.family = goal.family; result.direction = goal.direction; result.name = text(goal.name, 'ACL name', 40);
        if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(result.name)) fail('Invalid ACL objective name.');
      }
    } else if (goal.type === 'gateway') {
      device(goal.device); result.device = goal.device; result.value = address(goal.value);
    } else if (goal.type === 'dhcp') {
      device(goal.device); result.device = goal.device; result.port = getPort(goal.device, goal.port ?? 'eth0');
    } else fail('Unsupported objective type.');
    return result;
  });
  if (objectives.every(goal => goal.expected === false)) fail('Include at least one positive configuration or connectivity objective.');
  const configure = input.permissions?.configure ?? topology.devices.map(item => item.id);
  if (!Array.isArray(configure) || configure.length > 40) fail('Editable devices must be an array of device IDs.');
  configure.forEach(device);
  const tags = input.tags ?? [];
  const hints = input.hints ?? [];
  if (!Array.isArray(tags) || tags.length > 10 || !Array.isArray(hints) || hints.length > 10) fail('Use at most 10 tags and 10 hints.');
  return { schemaVersion: 1, slug, title: text(input.title, 'Title'), summary: text(input.summary || input.title, 'Summary', 300),
    description: text(input.description, 'Description', 12000), difficulty, xp, published: boolean(input.published, false),
    tags: [...new Set(tags.map(tag => text(tag, 'Tag', 30)))], hints: hints.map(hint => text(hint, 'Hint', 1000)),
    topology, objectives, permissions: { configure: [...new Set(configure)], cables: boolean(input.permissions?.cables, false), devices: boolean(input.permissions?.devices, false) } };
}

const cableSignature = cable => [cable.from, cable.to].map(end => `${end.deviceId}/${end.portId}`).sort().join('|');
export function validateSubmission(problem, input) {
  const topology = normalizeTopology(input);
  const originalIds = new Set(problem.topology.devices.map(item => item.id));
  // Canonical defaults keep older saved labs compatible with the VLAN configuration fields.
  for (const original of normalizeTopology(problem.topology).devices) {
    const current = topology.devices.find(item => item.id === original.id);
    if (!current || current.type !== original.type) fail('The starting devices must remain in the topology with their original types.');
    if (!problem.permissions.configure.includes(original.id) && (JSON.stringify(current.config) !== JSON.stringify(original.config) || current.name !== original.name)) fail(`${original.name} has a locked configuration.`);
  }
  if (!problem.permissions.devices && topology.devices.some(item => !originalIds.has(item.id))) fail('Adding devices is disabled for this problem.');
  if (!problem.permissions.cables && JSON.stringify(topology.cables.map(cableSignature).sort()) !== JSON.stringify(problem.topology.cables.map(cableSignature).sort())) fail('The starting connections are locked for this problem.');
  return topology;
}

export function evaluateObjectives(problem, topology) {
  return problem.objectives.map(goal => {
    let passed = false, detail;
    const device = topology.devices.find(item => item.id === goal.device);
    if (['ping', 'http', 'dns'].includes(goal.type)) {
      const result = goal.type === 'ping' ? simulatePing(topology, goal.source, goal.target) : goal.type === 'http' ? simulateHTTP(topology, goal.source, goal.target) : resolveHostname(topology, goal.source, goal.target);
      passed = result.ok === goal.expected && (!goal.expectedIP || result.ip === goal.expectedIP) && (!goal.targetDevice || !goal.expected || result.targetId === goal.targetDevice);
      detail = result.message;
      if (result.ok && !goal.expected) detail = 'The connection succeeds, but this objective requires it to be blocked.';
      else if (result.ok && goal.targetDevice && result.targetId !== goal.targetDevice) detail = 'Traffic reached a different device. Check the destination addressing.';
      else if (result.ok && goal.expectedIP && result.ip !== goal.expectedIP) detail = `DNS returned ${result.ip}, but this objective requires ${goal.expectedIP}.`;
    } else if (goal.type === 'interface') {
      const iface = device && allDeviceInterfaces(device)[goal.port];
      passed = Boolean(iface && (goal.ip === undefined || iface.ip === goal.ip) && (goal.mask === undefined || maskPrefix(iface.mask) === maskPrefix(goal.mask)) && (goal.enabled === undefined || iface.enabled === goal.enabled) && (goal.ipv6 === undefined || sameAddress(iface.ipv6, goal.ipv6)) && (goal.prefix6 === undefined || iface.prefix6 === goal.prefix6));
    } else if (goal.type === 'vlan') {
      const vlan = device?.config.vlans?.find(item => item.id === goal.vlan);
      passed = Boolean(vlan && vlan.enabled === goal.enabled);
    } else if (goal.type === 'switchport') {
      const settings = device && switchPort(device, goal.port);
      passed = Boolean(settings && settings.mode === goal.mode &&
        (goal.accessVlan === undefined || settings.accessVlan === goal.accessVlan) &&
        (goal.nativeVlan === undefined || settings.nativeVlan === goal.nativeVlan) &&
        (goal.allowedVlans === undefined || JSON.stringify(settings.allowedVlans) === JSON.stringify(goal.allowedVlans)));
    } else if (goal.type === 'subinterface') {
      const iface = device?.config.subinterfaces?.find(item => item.name === goal.port);
      passed = Boolean(iface && iface.vlan === goal.vlan && iface.native === goal.native && iface.enabled === goal.enabled &&
        (goal.ip === undefined || iface.ip === goal.ip) && (goal.mask === undefined || maskPrefix(iface.mask) === maskPrefix(goal.mask)));
    } else if (goal.type === 'ipRouting') passed = device?.config.ipRouting === goal.enabled;
    else if (goal.type === 'gateway') passed = device?.config.gateway === goal.value;
    else if (goal.type === 'gateway6') passed = sameAddress(device?.config.gateway6, goal.value);
    else if (goal.type === 'ipv6Routing') passed = device?.config.ipv6Routing === goal.enabled;
    else if (goal.type === 'traffic') {
      const result = testConnectivity(topology, goal.source, goal.target, goal.protocol, Object.fromEntries(['sourcePort', 'destinationPort'].filter(k => goal[k] !== undefined).map(k => [k, goal[k]])));
      passed = result.ok === goal.expected && (!goal.targetDevice || !goal.expected || result.targetId === goal.targetDevice); detail = result.message;
      if (result.ok && !goal.expected) detail = 'Traffic succeeds but should be blocked.';
    } else if (goal.type === 'ospfNeighbor') passed = Boolean(getOspfState(topology).devices[goal.device]?.neighbors.some(n => n.peerId === goal.peer && n.state === 'Full')) === goal.expected;
    else if (['ospfRoute', 'staticRoute'].includes(goal.type)) {
      const routes = goal.type === 'ospfRoute' ? getOspfState(topology).devices[goal.device]?.routes : parseNetwork(goal.destination).family === 6 ? device?.config.routes6 : device?.config.routes;
      passed = Boolean(routes?.some(r => networkFor(r.destination.split('/')[0], parseNetwork(r.destination).prefix) === goal.destination && (!goal.nextHop || sameAddress(r.nextHop, goal.nextHop)) && (!goal.port || r.port === goal.port)));
    } else if (goal.type === 'aclBinding') passed = allDeviceInterfaces(device)[goal.port]?.[`${goal.family === 6 ? 'acl6' : 'acl'}${goal.direction === 'in' ? 'In' : 'Out'}`] === goal.name;

    else if (goal.type === 'dhcp') {
      const result = requestDHCP(topology, goal.device, goal.port);
      const iface = device?.config.interfaces[goal.port];
      passed = Boolean(result.ok && iface?.ip && iface.ip === result.config.interfaces[goal.port].ip && maskPrefix(iface.mask) === maskPrefix(result.config.interfaces[goal.port].mask) && device.config.gateway === result.config.gateway && device.config.dns === result.config.dns);
    }
    return { id: goal.id, label: goal.label, passed, detail: passed ? 'Objective completed.' : detail || 'The configuration does not meet this objective yet.' };
  });
}
