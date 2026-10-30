import { defaultDeviceConfig, validateDeviceSettings } from './networkConfig.js';

export const DEVICE_TYPES = {
  pc: { label: 'PC', ports: ['eth0'], color: '#60a5fa' },
  switch: { label: 'Switch', ports: Array.from({ length: 8 }, (_, index) => `eth${index}`), color: '#a78bfa' },
  router: { label: 'Router', ports: ['eth0', 'eth1', 'eth2', 'eth3'], color: '#2dd4bf' },
  server: { label: 'Server', ports: ['eth0'], color: '#fbbf24' },
  ap: { label: 'Access Point', ports: ['eth0'], color: '#f472b6' },
  laptop: { label: 'Laptop', ports: ['eth0'], color: '#93c5fd' },
  l3switch: { label: 'L3 Switch', ports: Array.from({ length: 8 }, (_, index) => `eth${index}`), color: '#c4b5fd' },
  cloud: { label: 'Cloud / ISP', ports: ['eth0', 'eth1'], color: '#94a3b8' },
  firewall: { label: 'Firewall', ports: ['eth0', 'eth1'], color: '#fb923c' },
};

export const emptyTopology = () => ({ devices: [], cables: [], counts: Object.fromEntries(Object.keys(DEVICE_TYPES).map(type => [type, 0])), nextCable: 1 });
export const samePort = (a, b) => a.deviceId === b.deviceId && a.portId === b.portId;
export const portInUse = (topology, endpoint) => topology.cables.some(cable => samePort(cable.from, endpoint) || samePort(cable.to, endpoint));

export function connectionError(topology, from, to) {
  const source = topology.devices.find(device => device.id === from?.deviceId);
  const target = topology.devices.find(device => device.id === to?.deviceId);
  if (!source || !target || !DEVICE_TYPES[source.type]?.ports.includes(from.portId) || !DEVICE_TYPES[target.type]?.ports.includes(to.portId)) return 'Choose a valid device port.';
  if (source.id === target.id) return 'Connect ports on two different devices.';
  if (portInUse(topology, from) || portInUse(topology, to)) return 'This port already has a cable. Choose a free port.';
  return '';
}

export function topologyReducer(state, action) {
  if (action.type === 'add') {
    if (!DEVICE_TYPES[action.deviceType] || !Number.isFinite(action.x) || !Number.isFinite(action.y)) return state;
    const number = state.counts[action.deviceType] + 1;
    const device = { id: `${action.deviceType}-${number}`, type: action.deviceType,
      name: `${DEVICE_TYPES[action.deviceType].label}-${String(number).padStart(2, '0')}`,
      config: defaultDeviceConfig(action.deviceType, DEVICE_TYPES[action.deviceType].ports),
      x: Math.round(action.x / 10) * 10, y: Math.round(action.y / 10) * 10 };
    return { ...state, devices: [...state.devices, device], counts: { ...state.counts, [action.deviceType]: number } };
  }
  if (action.type === 'move') {
    if (!Number.isFinite(action.x) || !Number.isFinite(action.y)) return state;
    return { ...state, devices: state.devices.map(device => device.id === action.id ?
      { ...device, x: Math.round(action.x / 10) * 10, y: Math.round(action.y / 10) * 10 } : device) };
  }
  if (action.type === 'configure') {
    const device = state.devices.find(item => item.id === action.id);
    if (!device) return state;
    try {
      const settings = validateDeviceSettings(device.type, DEVICE_TYPES[device.type].ports, action.settings);
      return { ...state, devices: state.devices.map(item => item.id === device.id ? { ...item, ...settings } : item) };
    } catch { return state; }
  }
  if (action.type === 'connect') {
    if (connectionError(state, action.from, action.to)) return state;
    return { ...state, nextCable: state.nextCable + 1,
      cables: [...state.cables, { id: `cable-${state.nextCable}`, from: { ...action.from }, to: { ...action.to } }] };
  }
  if (action.type === 'delete-device') return { ...state,
    devices: state.devices.filter(device => device.id !== action.id),
    cables: state.cables.filter(cable => cable.from.deviceId !== action.id && cable.to.deviceId !== action.id) };
  if (action.type === 'delete-cable') return { ...state, cables: state.cables.filter(cable => cable.id !== action.id) };
  return state;
}

export function portPosition(device, portId) {
  const ports = DEVICE_TYPES[device.type].ports;
  return { x: device.x + (ports.indexOf(portId) + 1) * 160 / (ports.length + 1), y: device.y + 128 };
}

export function cablePath(start, end) {
  const bend = Math.max(55, Math.abs(start.x - end.x) * 0.3, Math.abs(start.y - end.y) * 0.4);
  return `M ${start.x} ${start.y} C ${start.x} ${start.y + bend}, ${end.x} ${end.y + bend}, ${end.x} ${end.y}`;
}

export function fitTopology(devices, width, height) {
  if (!devices.length) return { x: 0, y: 0, zoom: 1 };
  const left = Math.min(...devices.map(device => device.x)) - 65;
  const top = Math.min(...devices.map(device => device.y)) - 65;
  const right = Math.max(...devices.map(device => device.x + 160)) + 65;
  const bottom = Math.max(...devices.map(device => device.y + 155)) + 65;
  const zoom = Math.max(0.15, Math.min(1.5, width / (right - left), height / (bottom - top)));
  return { x: (left + right) / 2 - width / zoom / 2, y: (top + bottom) / 2 - height / zoom / 2, zoom };
}
