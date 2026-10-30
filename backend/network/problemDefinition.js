import { DEVICE_TYPES, emptyTopology, connectionError } from './networkTopology.js';
import { defaultDeviceConfig, validateDeviceSettings, interfaceNames, ipv4, maskPrefix } from './networkConfig.js';
import { simulatePing, simulateHTTP, resolveHostname, requestDHCP } from './networkSimulation.js';

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
    result.interfaces[port] = { enabled: boolean(data.enabled, true), ip: data.ip ?? '', mask: data.mask ?? '255.255.255.0' };
  }
  for (const key of ['gateway', 'dns']) result[key] = input[key] ?? result[key];
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
  const getPort = (id, port) => interfaceNames(device(id).type, DEVICE_TYPES[device(id).type].ports).includes(port) ? port : fail(`Unknown interface ${id}/${port}.`);
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
      if (goal.enabled !== undefined) result.enabled = boolean(goal.enabled, true);
      if (!['ip', 'mask', 'enabled'].some(key => Object.hasOwn(result, key))) fail('Interface objectives need an IP, mask or enabled setting.');
    } else if (goal.type === 'gateway') {
      device(goal.device); result.device = goal.device; result.value = address(goal.value);
    } else if (goal.type === 'dhcp') {
      device(goal.device); result.device = goal.device; result.port = getPort(goal.device, goal.port ?? 'eth0');
    } else fail('Objective type must be ping, http, dns, interface, gateway or dhcp.');
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
  for (const original of problem.topology.devices) {
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
      const iface = device?.config.interfaces[goal.port];
      passed = Boolean(iface && (goal.ip === undefined || iface.ip === goal.ip) && (goal.mask === undefined || maskPrefix(iface.mask) === maskPrefix(goal.mask)) && (goal.enabled === undefined || iface.enabled === goal.enabled));
    } else if (goal.type === 'gateway') passed = device?.config.gateway === goal.value;
    else if (goal.type === 'dhcp') {
      const result = requestDHCP(topology, goal.device, goal.port);
      const iface = device?.config.interfaces[goal.port];
      passed = Boolean(result.ok && iface?.ip && iface.ip === result.config.interfaces[goal.port].ip && maskPrefix(iface.mask) === maskPrefix(result.config.interfaces[goal.port].mask) && device.config.gateway === result.config.gateway && device.config.dns === result.config.dns);
    }
    return { id: goal.id, label: goal.label, passed, detail: passed ? 'Objective completed.' : detail || 'The configuration does not meet this objective yet.' };
  });
}
