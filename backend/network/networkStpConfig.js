const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export const validBridgePriority = value => Number.isInteger(value) && value >= 0 && value <= 61440 && value % 4096 === 0;

export function normalizeStp(type, ports, config) {
  if (!['switch', 'l3switch'].includes(type)) {
    if (config.stp !== undefined) fail('STP/RSTP is configured on switches and L3 switches only.');
    return config;
  }
  const input = config.stp ?? {};
  if (!object(input)) fail('Invalid spanning-tree configuration.');
  const enabled = input.enabled ?? true, mode = input.mode ?? 'rstp', priority = input.priority ?? 32768;
  if (typeof enabled !== 'boolean' || !['stp', 'rstp'].includes(mode)) fail('Choose STP or RSTP and a boolean enabled state.');
  if (!validBridgePriority(priority)) fail('Bridge priority must be 0–61440 in steps of 4096.');
  const bridgeMac = input.bridgeMac ?? '';
  if (typeof bridgeMac !== 'string' || bridgeMac && (!/^(?:[a-f\d]{2}:){5}[a-f\d]{2}$/i.test(bridgeMac) || parseInt(bridgeMac.slice(0, 2), 16) % 2 || bridgeMac === '00:00:00:00:00:00')) fail('Bridge MAC must be a nonzero unicast MAC address, or empty for automatic.');
  if (!Array.isArray(input.vlanPriorities ?? []) || (input.vlanPriorities?.length || 0) > 128) fail('Use at most 128 per-VLAN priorities.');
  const seen = new Set();
  const vlanPriorities = (input.vlanPriorities || []).map(item => {
    if (!object(item) || !config.vlans.some(v => v.id === item.vlan) || seen.has(item.vlan) || !validBridgePriority(item.priority)) fail('Per-VLAN priorities need unique defined VLAN IDs and priorities in steps of 4096.');
    seen.add(item.vlan); return { vlan: item.vlan, priority: item.priority };
  }).sort((a, b) => a.vlan - b.vlan);
  const settings = input.ports ?? {};
  if (!object(settings) || Object.keys(settings).some(port => !ports.includes(port))) fail('Spanning-tree port settings must reference physical ports.');
  config.stp = { enabled, mode, priority, bridgeMac: bridgeMac.toLowerCase(), vlanPriorities, ports: Object.fromEntries(ports.map(port => {
    const item = settings[port] ?? {};
    if (!object(item)) fail('Invalid spanning-tree port settings.');
    const cost = item.cost ?? 20000, portPriority = item.priority ?? 128, edge = item.edge ?? false;
    if (!Number.isInteger(cost) || cost < 1 || cost > 200000000) fail('STP path cost must be 1–200000000.');
    if (!Number.isInteger(portPriority) || portPriority < 0 || portPriority > 240 || portPriority % 16) fail('STP port priority must be 0–240 in steps of 16.');
    if (typeof edge !== 'boolean') fail('STP edge-port setting must be a boolean.');
    return [port, { cost, priority: portPriority, edge }];
  })) };
  return config;
}
