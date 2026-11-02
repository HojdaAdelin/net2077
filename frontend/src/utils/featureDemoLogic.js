import { defaultDeviceConfig } from './networkConfig.js';

export function formatDemoPermissions(values) {
  return { octal: values.join(''), symbolic: values.map(value =>
    `${value & 4 ? 'r' : '-'}${value & 2 ? 'w' : '-'}${value & 1 ? 'x' : '-'}`
  ).join('') };
}

export function demoNetwork(gateway) {
  const client = defaultDeviceConfig('pc', ['eth0']);
  client.interfaces.eth0.ip = '192.168.10.10';
  client.gateway = gateway;
  const router = defaultDeviceConfig('router', ['eth0', 'eth1']);
  router.interfaces.eth0.ip = '192.168.10.1';
  router.interfaces.eth1.ip = '192.168.20.1';
  const server = defaultDeviceConfig('server', ['eth0']);
  server.interfaces.eth0.ip = '192.168.20.80';
  server.gateway = '192.168.20.1';
  return { devices: [
    { id: 'client', type: 'pc', name: 'PC', config: client },
    { id: 'router', type: 'router', name: 'Router', config: router },
    { id: 'server', type: 'server', name: 'Server', config: server },
  ], cables: [
    { id: 'link-1', from: { deviceId: 'client', portId: 'eth0' }, to: { deviceId: 'router', portId: 'eth0' } },
    { id: 'link-2', from: { deviceId: 'router', portId: 'eth1' }, to: { deviceId: 'server', portId: 'eth0' } },
  ] };
}
