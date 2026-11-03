import { allDeviceInterfaces, isSwitchport } from './networkVlans.js';
import { parseAddress, parseNetwork, validPrefix6, validUnicast6, formatIPv6, addressInNetwork, sameAddress } from './networkAddressing.js';
import { normalizeAcl } from './networkAcl.js';

const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
export function canonicalArea(value) {
  if (typeof value === 'string' && /^\d+\.\d+\.\d+\.\d+$/.test(value)) {
    const address = parseAddress(value);
    if (address?.family === 4) return String(address.number);
  }
  if ((typeof value === 'number' || typeof value === 'string') && /^\d+$/.test(String(value)) && Number(value) >= 0 && Number(value) <= 4294967295) return String(Number(value));
  fail('OSPF area must be a 32-bit number or dotted-decimal area ID.');
}

export function normalizeAdvancedConfig(type, config) {
  const routing = ['router', 'l3switch', 'firewall', 'cloud'].includes(type);
  config.gateway6 ??= '';
  if (typeof config.gateway6 !== 'string' || (config.gateway6 && !validUnicast6(config.gateway6))) fail('Enter a unicast IPv6 gateway or leave it empty.');
  if (config.gateway6) config.gateway6 = formatIPv6(parseAddress(config.gateway6).number);
  if (routing) {
    if (config.ipv6Routing !== undefined && typeof config.ipv6Routing !== 'boolean') fail('IPv6 routing must be a boolean.');
    config.ipv6Routing ??= true;
  }
  const device = { type, config };
  const entries = [...Object.entries(config.interfaces), ...(config.subinterfaces || []).map(iface => [iface.name, iface]), ...(config.svis || []).map(iface => [`vlan${iface.vlan}`, iface])];
  for (const [port, iface] of entries) {
    iface.ipv6 ??= ''; iface.prefix6 ??= 64;
    if (typeof iface.ipv6 !== 'string' || !validPrefix6(iface.prefix6)) fail(`${port}: IPv6 requires an address and a prefix length from 0 to 128.`);
    if (iface.ipv6 && !validUnicast6(iface.ipv6)) fail(`${port}: enter a valid unicast IPv6 address.`);
    if (iface.ipv6 && isSwitchport(device, port)) fail(`${port}: use an SVI or routed port for IPv6.`);
    if (iface.ipv6) iface.ipv6 = formatIPv6(parseAddress(iface.ipv6).number);
    for (const key of ['aclIn', 'aclOut', 'acl6In', 'acl6Out']) {
      iface[key] ??= '';
      if (typeof iface[key] !== 'string') fail('ACL bindings must be names.');
      if (iface[key] && (!routing || isSwitchport(device, port))) fail('Apply ACLs to routed interfaces, subinterfaces or SVIs.');
    }
  }
  if (!Array.isArray(config.routes6 ?? []) || (config.routes6?.length || 0) > 100) fail('Use at most 100 IPv6 static routes.');
  const all = allDeviceInterfaces(device);
  config.routes6 = (config.routes6 || []).map(route => {
    const prefix = parseNetwork(route.destination), iface = all[route.port];
    if (prefix?.family !== 6 || !validUnicast6(route.nextHop) || !iface?.ipv6 || !addressInNetwork(route.nextHop, `${iface.ipv6}/${iface.prefix6}`)) fail('IPv6 routes need an aligned destination prefix and a next hop on the outgoing interface subnet.');
    if (Object.values(all).some(item => item.ipv6 && sameAddress(item.ipv6, route.nextHop))) fail('An IPv6 next hop must be another device.');
    return { destination: route.destination, nextHop: formatIPv6(parseAddress(route.nextHop).number), port: route.port };
  });
  if (!Array.isArray(config.acls ?? []) || (config.acls?.length || 0) > 32) fail('Use at most 32 ACLs per device.');
  if (!routing && config.acls?.length) fail('ACLs are available on routing devices.');
  const seen = new Set();
  config.acls = (config.acls || []).map(input => {
    const acl = normalizeAcl(input);
    if (seen.has(acl.name)) fail('ACL names must be unique on a device.');
    seen.add(acl.name); return acl;
  });
  for (const [, iface] of entries) for (const key of ['aclIn', 'aclOut', 'acl6In', 'acl6Out']) {
    if (iface[key] && !config.acls.some(acl => acl.name === iface[key] && acl.family === (key.startsWith('acl6') ? 6 : 4))) fail(`Define ACL ${iface[key]} with the matching address family before applying it.`);
  }
  const ospf = config.ospf ?? {};
  if (typeof ospf !== 'object' || Array.isArray(ospf) || ospf === null) fail('Invalid OSPF configuration.');
  if (ospf.enabled !== undefined && typeof ospf.enabled !== 'boolean') fail('OSPF enabled must be a boolean.');
  if (ospf.enabled && !routing) fail('OSPF runs on routing devices.');
  const routerId = ospf.routerId ?? '';
  if (typeof routerId !== 'string' || (routerId && (parseAddress(routerId)?.family !== 4 || parseAddress(routerId).number === 0n))) fail('OSPF router ID must be a nonzero IPv4-style address.');
  if (!Array.isArray(ospf.interfaces ?? []) || (ospf.interfaces?.length || 0) > 128) fail('Use at most 128 OSPF interface entries.');
  const used = new Set();
  const interfaces = (ospf.interfaces || []).map(item => {
    if (!all[item.port] || isSwitchport(device, item.port) || used.has(item.port)) fail('OSPF entries need unique routed or logical interfaces.');
    used.add(item.port);
    const cost = item.cost ?? 10;
    if (!Number.isInteger(cost) || cost < 1 || cost > 65535) fail('OSPF cost must be an integer from 1 to 65535.');
    if (item.passive !== undefined && typeof item.passive !== 'boolean') fail('OSPF passive must be a boolean.');
    return { port: item.port, passive: item.passive ?? false, cost };
  });
  config.ospf = { enabled: ospf.enabled ?? false, routerId, area: canonicalArea(ospf.area ?? '0'), interfaces };
  return config;
}
