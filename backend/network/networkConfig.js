export const isRoutingDevice = type => ['router', 'l3switch', 'cloud', 'firewall'].includes(type);
export const isBridgeDevice = type => ['switch', 'ap'].includes(type);
export const hasWireless = type => ['laptop', 'ap'].includes(type);
export const interfaceNames = (type, ports) => hasWireless(type) ? [...ports, 'wlan0'] : ports;

export function ipv4(value) {
  if (typeof value !== 'string' || !/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return null;
  const parts = value.split('.').map(Number);
  if (parts.some(part => part > 255)) return null;
  return parts.reduce((total, part) => (total * 256 + part) >>> 0, 0);
}
export function formatIPv4(value) { return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.'); }
export function maskPrefix(mask) {
  if (typeof mask !== 'string') return null;
  if (/^\/?\d{1,2}$/.test(mask)) {
    const prefix = Number(mask.replace('/', ''));
    return prefix <= 32 ? prefix : null;
  }
  const value = ipv4(mask);
  if (value === null) return null;
  const bits = value.toString(2).padStart(32, '0');
  return /^1*0*$/.test(bits) ? bits.indexOf('0') === -1 ? 32 : bits.indexOf('0') : null;
}
export const prefixMask = prefix => prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
export function sameSubnet(a, b, mask) {
  const left = ipv4(a), right = ipv4(b), prefix = maskPrefix(mask);
  return left !== null && right !== null && prefix !== null &&
    ((left & prefixMask(prefix)) >>> 0) === ((right & prefixMask(prefix)) >>> 0);
}
export function parseCIDR(value) {
  if (typeof value !== 'string') return null;
  const [ip, prefixText, extra] = value.split('/');
  const number = ipv4(ip);
  if (extra !== undefined || !/^\d{1,2}$/.test(prefixText || '') || number === null) return null;
  const prefix = Number(prefixText);
  if (prefix > 32 || ((number & prefixMask(prefix)) >>> 0) !== number) return null;
  return { ip, number, prefix };
}

export function defaultDeviceConfig(type, ports) {
  return {
    interfaces: Object.fromEntries(interfaceNames(type, ports).map(port => [port, { enabled: true, ip: '', mask: '255.255.255.0' }])),
    gateway: '', dns: '', routes: [],
    wireless: { enabled: true, ssid: type === 'ap' ? 'NET2077' : '', password: '' },
    firewall: { icmp: true, dns: true, http: true, dhcp: true },
    services: {
      dhcp: { enabled: false, start: '192.168.1.100', end: '192.168.1.150', mask: '255.255.255.0', gateway: '192.168.1.1', dns: '' },
      dns: { enabled: false, records: [] },
      http: { enabled: false, title: 'Welcome to the lab', body: 'This page is served by your simulated HTTP server.' },
    },
  };
}

export function validateDeviceSettings(type, ports, input) {
  const config = structuredClone(input.config);
  const fail = message => { throw new Error(message); };
  const name = String(input.name || '').trim();
  if (!name || name.length > 40) fail('Device name must contain 1–40 characters.');
  const validIP = (value, label, optional = true) => {
    if (optional && value === '') return;
    const number = ipv4(value);
    if (number === null || number === 0 || (number >>> 24) >= 224 || (number >>> 24) === 127) fail(`${label}: enter a valid unicast IPv4 address.`);
  };
  for (const port of interfaceNames(type, ports)) {
    const iface = config.interfaces[port];
    if (!iface) fail(`Missing interface ${port}.`);
    iface.ip = iface.ip.trim();
    iface.mask = iface.mask.trim();
    if (maskPrefix(iface.mask) === null) fail(`${port}: enter a contiguous subnet mask or prefix, such as 255.255.255.0 or /24.`);
    validIP(iface.ip, port);
    if (iface.ip && maskPrefix(iface.mask) <= 30) {
      const host = (ipv4(iface.ip) & ~prefixMask(maskPrefix(iface.mask))) >>> 0;
      if (host === 0 || host === (~prefixMask(maskPrefix(iface.mask)) >>> 0)) fail(`${port}: the network and broadcast addresses cannot be assigned to a host.`);
    }
  }
  config.gateway = config.gateway.trim(); config.dns = config.dns.trim();
  validIP(config.gateway, 'Gateway'); validIP(config.dns, 'DNS server');
  if (config.routes.length > 100) fail('Use at most 100 static routes.');
  for (const route of config.routes) {
    route.destination = route.destination.trim(); route.nextHop = route.nextHop.trim();
    if (!parseCIDR(route.destination)) fail('Routes must use a network address in CIDR notation, such as 192.168.2.0/24.');
    validIP(route.nextHop, 'Route next hop', false);
    const iface = config.interfaces[route.port];
    if (!iface || !iface.ip || !sameSubnet(iface.ip, route.nextHop, iface.mask)) fail('Each route next hop must be in the subnet of its outgoing interface.');
    if (Object.values(config.interfaces).some(item => item.ip === route.nextHop)) fail('A route next hop must be another device, not this device.');
  }
  if (config.wireless.ssid.length > 32 || config.wireless.password.length > 63) fail('Use at most 32 characters for the SSID and 63 for the Wi-Fi password.');
  if (type === 'server') {
    const pool = config.services.dhcp;
    if (pool.enabled) {
      for (const field of ['start', 'end']) validIP(pool[field], `DHCP ${field}`, false);
      if (maskPrefix(pool.mask) === null || !sameSubnet(pool.start, pool.end, pool.mask) || ipv4(pool.end) < ipv4(pool.start) || ipv4(pool.end) - ipv4(pool.start) > 4095) fail('DHCP pool: use up to 4,096 addresses in the same subnet.');
      validIP(pool.gateway, 'DHCP gateway'); validIP(pool.dns, 'DHCP DNS server');
      if (pool.gateway && !sameSubnet(pool.start, pool.gateway, pool.mask)) fail('DHCP gateway must be in the pool subnet.');
    }
    const records = config.services.dns.records;
    if (records.length > 100) fail('Use at most 100 DNS records.');
    const names = new Set();
    for (const record of records) {
      record.name = record.name.trim().toLowerCase().replace(/\.$/, ''); record.ip = record.ip.trim();
      if (!/^[a-z\d](?:[a-z\d.-]{0,251}[a-z\d])?$/.test(record.name) || record.name.includes('..') || names.has(record.name)) fail('DNS records must have unique, valid hostnames.');
      validIP(record.ip, 'DNS record address', false); names.add(record.name);
    }
    if (config.services.http.title.length > 120 || config.services.http.body.length > 5000) fail('HTTP page: use at most 120 title characters and 5,000 content characters.');
  }
  return { name, config };
}
