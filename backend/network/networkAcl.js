import { parseAddress, parseNetwork, addressInNetwork, sameAddress } from './networkAddressing.js';
import { allDeviceInterfaces } from './networkVlans.js';

const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
export const ACL_PROTOCOLS = ['ip', 'icmp', 'icmpv6', 'tcp', 'udp', 'ospf'];
export const validTransportPort = value => Number.isInteger(value) && value >= 0 && value <= 65535;

export function normalizeAcl(input) {
  if (!input || typeof input.name !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(input.name)) fail('ACL names use 1–40 letters, digits, underscores or hyphens, starting with a letter.');
  const family = input.family ?? 4;
  if (![4, 6].includes(family)) fail('ACL address family must be 4 or 6.');
  if (!Array.isArray(input.rules) || input.rules.length > 100) fail('Use at most 100 rules per ACL.');
  const rules = input.rules.map(rule => {
    if (!rule || !['permit', 'deny'].includes(rule.action) || !ACL_PROTOCOLS.includes(rule.protocol)) fail('Each ACL rule needs permit/deny and a valid protocol.');
    if ((family === 4 && rule.protocol === 'icmpv6') || (family === 6 && ['icmp', 'ospf'].includes(rule.protocol))) fail('ACL protocol does not match the address family.');
    const result = { action: rule.action, protocol: rule.protocol };
    for (const key of ['source', 'destination']) {
      const value = rule[key] ?? 'any';
      if (value !== 'any' && (parseAddress(value)?.family !== family && parseNetwork(value)?.family !== family)) fail(`${key}: use any, a host address or an aligned IPv${family} prefix.`);
      result[key] = value;
    }
    for (const key of ['sourcePort', 'destinationPort']) {
      const value = rule[key] ?? null;
      if (value !== null && (!['tcp', 'udp'].includes(rule.protocol) || !validTransportPort(value))) fail('ACL ports are 0–65535 and apply only to TCP/UDP.');
      result[key] = value;
    }
    return result;
  });
  return { name: input.name, family, rules };
}

const matchesAddress = (address, pattern) => pattern === 'any' || (pattern.includes('/') ? addressInNetwork(address, pattern) : sameAddress(address, pattern));
export function evaluateAcl(acl, packet) {
  for (let index = 0; index < acl.rules.length; index++) {
    const rule = acl.rules[index];
    if (rule.protocol !== 'ip' && rule.protocol !== packet.protocol) continue;
    if (!matchesAddress(packet.sourceIP, rule.source) || !matchesAddress(packet.destinationIP, rule.destination)) continue;
    if (rule.sourcePort !== null && rule.sourcePort !== undefined && rule.sourcePort !== packet.sourcePort) continue;
    if (rule.destinationPort !== null && rule.destinationPort !== undefined && rule.destinationPort !== packet.destinationPort) continue;
    return { allowed: rule.action === 'permit', rule: index + 1, name: acl.name };
  }
  return { allowed: false, rule: null, name: acl.name };
}

export function interfaceAcl(device, port, direction, packet) {
  const all = allDeviceInterfaces(device), iface = all[port];
  const names = iface?.parent ? direction === 'in' ? [iface.parent, port] : [port, iface.parent] : [port];
  for (const name of names) {
    const binding = all[name]?.[`${packet.family === 6 ? 'acl6' : 'acl'}${direction === 'in' ? 'In' : 'Out'}`];
    if (!binding) continue;
    const acl = device.config.acls?.find(item => item.name === binding && item.family === packet.family);
    if (!acl) return { allowed: false, name: binding, rule: null, message: `ACL ${binding} is not defined.` };
    const result = evaluateAcl(acl, packet);
    if (!result.allowed) return { ...result, message: `ACL ${binding} ${direction} on ${port}: ${result.rule ? `rule ${result.rule} denies` : 'implicit deny blocks'} ${packet.protocol.toUpperCase()} traffic.` };
  }
  return { allowed: true };
}
