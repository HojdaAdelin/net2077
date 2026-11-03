export const isSwitchDevice = type => ['switch', 'l3switch'].includes(type);
export const validVlanId = value => Number.isInteger(value) && value >= 1 && value <= 4094;
const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export const interfaceProtocolFields = item => Object.fromEntries(['ipv6', 'prefix6', 'aclIn', 'aclOut', 'acl6In', 'acl6Out'].filter(key => item[key] !== undefined).map(key => [key, item[key]]));
const vlanId = (value, label) => validVlanId(value) ? value : fail(`${label}: use a VLAN ID from 1 to 4094.`);

export function parseVlanList(value) {
  if (value === 'all') return 'all';
  if (Array.isArray(value)) {
    if (value.length > 4094 || value.some(id => !validVlanId(id))) fail('Allowed VLANs must contain IDs from 1 to 4094.');
    return [...new Set(value)].sort((a, b) => a - b);
  }
  if (typeof value !== 'string') fail('Allowed VLANs: use all, none, or a list such as 10,20,30-35.');
  const text = value.trim().toLowerCase();
  if (text === 'all') return 'all';
  if (text === 'none' || text === '') return [];
  const ids = new Set();
  for (const part of text.split(',')) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part.trim());
    if (!match) fail('Allowed VLANs: use a list such as 10,20,30-35.');
    const first = Number(match[1]), last = Number(match[2] || match[1]);
    if (!validVlanId(first) || !validVlanId(last) || last < first) fail('Allowed VLAN range must stay between 1 and 4094.');
    for (let id = first; id <= last; id++) ids.add(id);
  }
  return [...ids].sort((a, b) => a - b);
}

export const vlanListText = value => value === 'all' ? 'all' : value?.length ? value.join(',') : 'none';
export const switchPort = (device, port) => device.config.switchports?.[port] || {
  mode: device.type === 'l3switch' ? 'routed' : 'access', accessVlan: 1, nativeVlan: 1, allowedVlans: 'all',
};
export const isSwitchport = (device, port) => isSwitchDevice(device.type) &&
  Object.hasOwn(device.config.interfaces, port) && switchPort(device, port).mode !== 'routed';
export const activeVlan = (device, id) => (device.config.vlans || [{ id: 1, enabled: true }]).some(vlan => vlan.id === id && vlan.enabled !== false);
export const portCarriesVlan = (device, port, id) => {
  if (!isSwitchport(device, port) || !activeVlan(device, id)) return false;
  const settings = switchPort(device, port);
  return settings.mode === 'access' ? settings.accessVlan === id : settings.allowedVlans === 'all' || settings.allowedVlans.includes(id);
};

export function allDeviceInterfaces(device) {
  const result = { ...device.config.interfaces };
  for (const iface of device.config.subinterfaces || []) result[iface.name] = { ...iface, kind: 'subinterface' };
  for (const iface of device.config.svis || []) result[`vlan${iface.vlan}`] = { ...iface, kind: 'svi' };
  return result;
}

export function validInterfaceName(device, port) {
  if (typeof port !== 'string') return false;
  if (Object.hasOwn(device.config.interfaces, port)) return true;
  const subinterface = /^(eth\d+)\.([1-9]\d{0,3})$/.exec(port);
  if (device.type === 'router' && subinterface) return Object.hasOwn(device.config.interfaces, subinterface[1]) && validVlanId(Number(subinterface[2]));
  const svi = /^vlan([1-9]\d{0,3})$/.exec(port);
  return device.type === 'l3switch' && Boolean(svi) && validVlanId(Number(svi[1]));
}

export function interfaceEnabled(device, port) {
  const iface = allDeviceInterfaces(device)[port];
  if (!iface || iface.enabled === false) return false;
  if (iface.kind === 'subinterface') return device.config.interfaces[iface.parent]?.enabled !== false;
  if (iface.kind === 'svi') return activeVlan(device, iface.vlan);
  return port !== 'wlan0' || device.config.wireless.enabled;
}

export function normalizeVlanSettings(type, ports, config) {
  if (isSwitchDevice(type)) {
    const vlans = config.vlans ?? [{ id: 1, name: 'default', enabled: true }];
    if (!Array.isArray(vlans) || vlans.length > 128) fail('Use at most 128 VLANs per switch.');
    const seen = new Set();
    config.vlans = vlans.map(item => {
      if (!object(item)) fail('Invalid VLAN entry.');
      const id = vlanId(item.id, 'VLAN');
      if (seen.has(id)) fail('VLAN IDs must be unique on a switch.');
      seen.add(id);
      const name = item.name ?? (id === 1 ? 'default' : `VLAN ${id}`);
      if (typeof name !== 'string' || !name.trim() || name.length > 32) fail('VLAN names must contain 1–32 characters.');
      if (item.enabled !== undefined && typeof item.enabled !== 'boolean') fail('VLAN enabled must be a boolean.');
      return { id, name: name.trim(), enabled: item.enabled ?? true };
    }).sort((a, b) => a.id - b.id);
    const settings = config.switchports ?? {};
    if (!object(settings) || Object.keys(settings).some(port => !ports.includes(port))) fail('Switchport settings must reference physical ports.');
    config.switchports = Object.fromEntries(ports.map(port => {
      const data = settings[port] ?? {};
      if (!object(data)) fail(`Invalid switchport ${port}.`);
      const mode = data.mode ?? (type === 'l3switch' ? 'routed' : 'access');
      if (!(type === 'l3switch' ? ['access', 'trunk', 'routed'] : ['access', 'trunk']).includes(mode)) fail(`${port}: choose access, trunk${type === 'l3switch' ? ' or routed' : ''}.`);
      return [port, { mode, accessVlan: vlanId(data.accessVlan ?? 1, port), nativeVlan: vlanId(data.nativeVlan ?? 1, port), allowedVlans: parseVlanList(data.allowedVlans ?? 'all') }];
    }));
  } else if (config.vlans !== undefined || config.switchports !== undefined) fail('VLAN switching is available on switches and L3 switches.');

  if (type === 'router') {
    if (!Array.isArray(config.subinterfaces ?? []) || (config.subinterfaces?.length || 0) > 128) fail('Use at most 128 router subinterfaces.');
    const names = new Set(), nativeParents = new Set(), parentVlans = new Set();
    config.subinterfaces = (config.subinterfaces || []).map(item => {
      if (!object(item) || !ports.includes(item.parent)) fail('Subinterfaces need a valid physical parent port.');
      const vlan = vlanId(item.vlan, 'Subinterface VLAN');
      const name = item.name ?? `${item.parent}.${vlan}`;
      if (typeof name !== 'string' || !new RegExp(`^${item.parent}\\.[1-9][0-9]{0,3}$`).test(name) || Number(name.split('.')[1]) > 4094) fail('Subinterface names use parent.number, for example eth0.10.');
      if (names.has(name) || parentVlans.has(`${item.parent}/${vlan}`)) fail('Subinterface names and parent/VLAN pairs must be unique.');
      names.add(name); parentVlans.add(`${item.parent}/${vlan}`);
      if (item.native !== undefined && typeof item.native !== 'boolean') fail('Subinterface native must be a boolean.');
      if (item.enabled !== undefined && typeof item.enabled !== 'boolean') fail('Subinterface enabled must be a boolean.');
      if (item.native && nativeParents.has(item.parent)) fail('Only one native subinterface is allowed per parent.');
      if (item.native) nativeParents.add(item.parent);
      if (config.interfaces[item.parent]?.ip || config.interfaces[item.parent]?.ipv6) fail(`${item.parent}: remove the physical IP before using subinterfaces.`);
      return { name, parent: item.parent, vlan, native: item.native ?? false, enabled: item.enabled ?? true, ip: item.ip ?? '', mask: item.mask ?? '/24', ...interfaceProtocolFields(item) };
    }).sort((a, b) => a.name.localeCompare(b.name));
  } else if (config.subinterfaces?.length) fail('802.1Q subinterfaces are available on routers.');

  if (type === 'l3switch') {
    if (config.ipRouting !== undefined && typeof config.ipRouting !== 'boolean') fail('IP routing must be a boolean.');
    config.ipRouting ??= true;
    if (!Array.isArray(config.svis ?? []) || (config.svis?.length || 0) > 128) fail('Use at most 128 VLAN interfaces.');
    const seen = new Set();
    config.svis = (config.svis || []).map(item => {
      if (!object(item)) fail('Invalid VLAN interface.');
      const vlan = vlanId(item.vlan, 'VLAN interface');
      if (seen.has(vlan)) fail('Only one SVI per VLAN is allowed.');
      seen.add(vlan);
      if (item.enabled !== undefined && typeof item.enabled !== 'boolean') fail('SVI enabled must be a boolean.');
      return { vlan, enabled: item.enabled ?? true, ip: item.ip ?? '', mask: item.mask ?? '/24', ...interfaceProtocolFields(item) };
    }).sort((a, b) => a.vlan - b.vlan);
  } else if (config.svis?.length || config.ipRouting !== undefined) fail('SVIs and IP routing settings are available on L3 switches.');
  return config;
}
