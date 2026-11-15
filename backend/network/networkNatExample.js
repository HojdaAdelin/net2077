import { normalizeTopology } from './problemDefinition.js';

export function createNatExample() {
  const iface = ip => ({ ip, mask: '/24' });
  const cable = (deviceId, portId, target, targetPort) => ({ from: { deviceId, portId }, to: { deviceId: target, portId: targetPort } });
  return normalizeTopology({ devices: [
    { id: 'client', type: 'pc', name: 'Inside PC', x: 0, y: 0, config: { interfaces: { eth0: iface('192.168.10.10') }, gateway: '192.168.10.1', dns: '198.51.100.10' } },
    { id: 'private-web', type: 'server', name: 'Private web server', x: 0, y: 240, config: { interfaces: { eth0: iface('192.168.10.20') }, gateway: '192.168.10.1', services: { http: { enabled: true, title: 'Published through static NAT', body: 'This server is 192.168.10.20 internally, published as 203.0.113.50.' } } } },
    { id: 'lan', type: 'switch', name: 'LAN switch', x: 230, y: 100 },
    { id: 'edge', type: 'router', name: 'NAT edge', x: 470, y: 100, config: {
      interfaces: { eth0: iface('192.168.10.1'), eth1: iface('203.0.113.2') },
      routes: [{ destination: '0.0.0.0/0', nextHop: '203.0.113.1', port: 'eth1' }],
      nat: { enabled: true, inside: ['eth0'], outside: ['eth1'], staticMappings: [{ local: '192.168.10.20', global: '203.0.113.50' }], overload: [{ source: '192.168.10.0/24', outside: 'eth1' }] },
    } },
    { id: 'isp', type: 'cloud', name: 'ISP router', x: 720, y: 100, config: { interfaces: { eth0: iface('203.0.113.1'), eth1: iface('198.51.100.1') } } },
    { id: 'public-web', type: 'server', name: 'Outside web server', x: 970, y: 100, config: { interfaces: { eth0: iface('198.51.100.10') }, gateway: '198.51.100.1', services: {
      http: { enabled: true, title: 'PAT connection successful', body: 'The outside server sees the NAT edge address, not the private PC address.' },
      dns: { enabled: true, records: [{ name: 'outside.test', ip: '198.51.100.10' }, { name: 'inside.test', ip: '203.0.113.50' }] },
    } } },
  ], cables: [cable('client', 'eth0', 'lan', 'eth0'), cable('private-web', 'eth0', 'lan', 'eth1'), cable('lan', 'eth2', 'edge', 'eth0'), cable('edge', 'eth1', 'isp', 'eth0'), cable('isp', 'eth1', 'public-web', 'eth0')] });
}
