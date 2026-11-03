import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTopology, normalizeProblem, validateSubmission, evaluateObjectives } from './problemDefinition.js';
import { simulatePing, requestDHCP, simulateHTTP, resolveHostname } from './networkSimulation.js';
import { parseVlanList } from './networkConfig.js';

const ip = (value = '', mask = '/24') => ({ ip: value, mask });
const host = (id, address, gateway = '', extra = {}) => ({ id, type: 'pc', config: { interfaces: { eth0: ip(address) }, gateway, ...extra } });
const wire = (a, ap, b, bp) => ({ from: { deviceId: a, portId: ap }, to: { deviceId: b, portId: bp } });
const vlans = [{ id: 1 }, { id: 10, name: 'Staff' }, { id: 20, name: 'Students' }];
const access = vlan => ({ mode: 'access', accessVlan: vlan });
const trunk = (allowedVlans = [10, 20], nativeVlan = 1) => ({ mode: 'trunk', nativeVlan, allowedVlans });
const get = (topology, id) => topology.devices.find(device => device.id === id);
const twoSwitches = () => normalizeTopology({ devices: [
  host('a10', '192.168.1.10'), host('b10', '192.168.1.11'), host('a20', '192.168.1.20'), host('b20', '192.168.1.21'),
  { id: 'sw-a', type: 'switch', config: { vlans, switchports: { eth0: access(10), eth1: access(20), eth7: trunk() } } },
  { id: 'sw-b', type: 'switch', config: { vlans, switchports: { eth0: access(10), eth1: access(20), eth7: trunk() } } },
], cables: [wire('a10', 'eth0', 'sw-a', 'eth0'), wire('a20', 'eth0', 'sw-a', 'eth1'), wire('b10', 'eth0', 'sw-b', 'eth0'), wire('b20', 'eth0', 'sw-b', 'eth1'), wire('sw-a', 'eth7', 'sw-b', 'eth7')] });

const onAStick = () => normalizeTopology({ devices: [
  host('pc-a', '192.168.10.10', '192.168.10.1'), host('pc-b', '192.168.20.10', '192.168.20.1'),
  { id: 'sw', type: 'switch', config: { vlans, switchports: { eth0: access(10), eth1: access(20), eth7: trunk() } } },
  { id: 'router', type: 'router', config: { subinterfaces: [
    { parent: 'eth0', vlan: 10, ip: '192.168.10.1', mask: '/24' },
    { parent: 'eth0', vlan: 20, ip: '192.168.20.1', mask: '/24' },
  ] } },
], cables: [wire('pc-a', 'eth0', 'sw', 'eth0'), wire('pc-b', 'eth0', 'sw', 'eth1'), wire('sw', 'eth7', 'router', 'eth0')] });

const l3Topology = () => normalizeTopology({ devices: [
  host('pc-a', '192.168.10.10', '192.168.10.1'), host('pc-b', '192.168.20.10', '192.168.20.1'),
  { id: 'core', type: 'l3switch', config: { vlans, ipRouting: true, switchports: { eth0: access(10), eth1: access(20) }, svis: [
    { vlan: 10, ip: '192.168.10.1', mask: '/24' }, { vlan: 20, ip: '192.168.20.1', mask: '/24' },
  ] } },
], cables: [wire('pc-a', 'eth0', 'core', 'eth0'), wire('pc-b', 'eth0', 'core', 'eth1')] });

test('access VLANs isolate hosts even inside the same IPv4 subnet; trunks carry both VLANs', () => {
  const topology = twoSwitches();
  assert.equal(simulatePing(topology, 'a10', '192.168.1.11').ok, true);
  assert.equal(simulatePing(topology, 'a20', '192.168.1.21').ok, true);
  assert.equal(simulatePing(topology, 'a10', '192.168.1.20').ok, false);
  assert.equal(simulatePing(topology, 'a10', '192.168.1.21').ok, false);
  get(topology, 'sw-b').config.switchports.eth0.accessVlan = 20;
  assert.equal(simulatePing(topology, 'a10', '192.168.1.11').ok, false);
});

test('allowed VLANs, VLAN database state and physical port state block traffic independently', () => {
  for (const breakIt of [
    topology => { get(topology, 'sw-a').config.switchports.eth7.allowedVlans = [10]; },
    topology => { get(topology, 'sw-b').config.switchports.eth7.allowedVlans = [10]; },
    topology => { get(topology, 'sw-b').config.vlans.find(vlan => vlan.id === 20).enabled = false; },
    topology => { get(topology, 'sw-b').config.interfaces.eth7.enabled = false; },
  ]) {
    const topology = twoSwitches(); breakIt(topology);
    assert.equal(simulatePing(topology, 'a20', '192.168.1.21').ok, false);
  }
});

test('router-on-a-stick routes between VLANs over one physical cable and traces 802.1Q tags', () => {
  const topology = onAStick();
  const result = simulatePing(topology, 'pc-a', '192.168.20.10');
  assert.equal(result.ok, true, result.message);
  assert.equal(simulatePing(topology, 'pc-b', '192.168.10.10').ok, true);
  assert.ok(result.trace.some(event => event.vlanTag === 10));
  assert.ok(result.trace.some(event => event.vlanTag === 20));
  for (const breakIt of [
    value => { get(value, 'router').config.interfaces.eth0.enabled = false; },
    value => { get(value, 'router').config.subinterfaces[1].enabled = false; },
    value => { get(value, 'router').config.subinterfaces[1].vlan = 30; },
    value => { get(value, 'sw').config.switchports.eth7.allowedVlans = [10]; },
    value => { get(value, 'pc-b').config.gateway = '192.168.20.254'; },
  ]) { const broken = onAStick(); breakIt(broken); assert.equal(simulatePing(broken, 'pc-a', '192.168.20.10').ok, false); }
});

test('native VLAN sends untagged frames and must match a native router subinterface', () => {
  const topology = onAStick();
  get(topology, 'sw').config.switchports.eth7.nativeVlan = 10;
  assert.equal(simulatePing(topology, 'pc-a', '192.168.20.10').ok, false);
  get(topology, 'router').config.subinterfaces[0].native = true;
  assert.equal(simulatePing(topology, 'pc-a', '192.168.20.10').ok, true);
});

test('L3 switch SVIs route VLANs; disabled IP routing blocks transit but preserves gateway access', () => {
  const topology = l3Topology();
  assert.equal(simulatePing(topology, 'pc-a', '192.168.20.10').ok, true);
  get(topology, 'core').config.ipRouting = false;
  assert.equal(simulatePing(topology, 'pc-a', '192.168.20.10').ok, false);
  assert.equal(simulatePing(topology, 'pc-a', '192.168.10.1').ok, true);
  get(topology, 'core').config.ipRouting = true;
  get(topology, 'core').config.svis[1].enabled = false;
  assert.equal(simulatePing(topology, 'pc-a', '192.168.20.10').ok, false);
});

test('DHCP broadcasts stay inside their access VLAN', () => {
  const topology = twoSwitches();
  const server = get(topology, 'a10');
  server.type = 'server';
  server.config.interfaces.eth0.ip = '192.168.1.2';
  server.config.services.dhcp = { enabled: true, start: '192.168.1.100', end: '192.168.1.110', mask: '/24', gateway: '', dns: '' };
  assert.equal(requestDHCP(topology, 'b10').ok, true);
  assert.equal(requestDHCP(topology, 'b20').ok, false);
  assert.equal(requestDHCP(topology, 'a20').ok, false);
});

test('DNS and HTTP work through inter-VLAN routing', () => {
  const topology = onAStick();
  const server = get(topology, 'pc-b'); server.type = 'server';
  server.config.services.dns = { enabled: true, records: [{ name: 'school.lab', ip: '192.168.20.10' }] };
  server.config.services.http = { enabled: true, title: 'School', body: 'Hello' };
  get(topology, 'pc-a').config.dns = '192.168.20.10';
  assert.equal(resolveHostname(topology, 'pc-a', 'school.lab').ip, '192.168.20.10');
  assert.equal(simulateHTTP(topology, 'pc-a', 'http://school.lab').ok, true);
});

test('VLAN lists and invalid logical interfaces are validated', () => {
  assert.deepEqual(parseVlanList('20,10,30-32,10'), [10, 20, 30, 31, 32]);
  assert.deepEqual(parseVlanList('none'), []);
  for (const invalid of ['0', '4095', '20-10', '10,,20', ['10'], [10.5]]) assert.throws(() => parseVlanList(invalid));
  const raw = onAStick();
  get(raw, 'router').config.subinterfaces.push({ ...get(raw, 'router').config.subinterfaces[0] });
  assert.throws(() => normalizeTopology(raw), /unique/);
});

test('legacy labs retain flat switching and locked-device protection after adding defaults', () => {
  const legacy = { devices: [host('a', '192.168.1.10'), { id: 'switch', type: 'switch' }, host('b', '192.168.1.20')], cables: [wire('a', 'eth0', 'switch', 'eth0'), wire('b', 'eth0', 'switch', 'eth1')] };
  const topology = normalizeTopology(legacy);
  assert.equal(simulatePing(topology, 'a', '192.168.1.20').ok, true);
  const problem = normalizeProblem({ slug: 'legacy-test', title: 'Legacy', description: 'Legacy', topology: legacy, permissions: { configure: ['a'], cables: false, devices: false }, objectives: [{ type: 'ping', label: 'Connect', source: 'a', target: '192.168.1.20' }] });
  delete problem.topology.devices[1].config.vlans;
  delete problem.topology.devices[1].config.switchports;
  validateSubmission(problem, topology);
  get(topology, 'switch').config.switchports.eth0.mode = 'trunk';
  assert.throws(() => validateSubmission(problem, topology), /locked/);
});

test('new objective types check VLANs, switchport mode/allowed lists, subinterfaces and SVI addressing', () => {
  const topology = onAStick();
  const problem = normalizeProblem({ slug: 'vlan-objectives', title: 'VLAN', description: 'VLAN', topology, objectives: [
    { type: 'vlan', label: 'VLAN 10', device: 'sw', vlan: 10 },
    { type: 'switchport', label: 'Access 10', device: 'sw', port: 'eth0', mode: 'access', accessVlan: 10 },
    { type: 'switchport', label: 'Trunk', device: 'sw', port: 'eth7', mode: 'trunk', nativeVlan: 1, allowedVlans: [10, 20] },
    { type: 'subinterface', label: 'Gateway', device: 'router', port: 'eth0.10', vlan: 10, ip: '192.168.10.1', mask: '/24' },
  ] });
  assert.ok(evaluateObjectives(problem, topology).every(goal => goal.passed));
  get(topology, 'sw').config.switchports.eth7.allowedVlans = 'all';
  assert.equal(evaluateObjectives(problem, topology)[2].passed, false);
  const l3 = l3Topology();
  const sviProblem = normalizeProblem({ slug: 'svi-objectives', title: 'SVI', description: 'SVI', topology: l3, objectives: [
    { type: 'interface', label: 'SVI', device: 'core', port: 'vlan10', ip: '192.168.10.1', mask: '/24', enabled: true },
    { type: 'ipRouting', label: 'IP routing', device: 'core', enabled: true },
  ] });
  assert.ok(evaluateObjectives(sviProblem, l3).every(goal => goal.passed));
});

test('SVIs become inactive without a connected member; an L3 switch still switches within one VLAN with routing disabled', () => {
  const topology = l3Topology();
  topology.cables = topology.cables.filter(cable => cable.from.deviceId !== 'pc-b');
  assert.equal(simulatePing(topology, 'pc-a', '192.168.20.1').ok, false);
  const lan = l3Topology();
  get(lan, 'core').config.ipRouting = false;
  get(lan, 'core').config.switchports.eth1 = { ...access(10), nativeVlan: 1, allowedVlans: 'all' };
  get(lan, 'pc-b').config.interfaces.eth0.ip = '192.168.10.20';
  assert.equal(simulatePing(lan, 'pc-a', '192.168.10.20').ok, true);
});

test('native VLAN mismatch maps untagged frames to the receiving native VLAN', () => {
  const topology = twoSwitches();
  get(topology, 'sw-a').config.switchports.eth7.nativeVlan = 10;
  get(topology, 'sw-b').config.switchports.eth7.nativeVlan = 20;
  assert.equal(simulatePing(topology, 'a10', '192.168.1.11').ok, false);
  // The mismatch can leak untagged traffic between VLANs, rather than acting as a blanket deny.
  assert.equal(simulatePing(topology, 'a10', '192.168.1.21').ok, true);
});

test('Wi-Fi bridges into the VLAN assigned to the AP uplink', () => {
  const topology = normalizeTopology({ devices: [
    { id: 'laptop', type: 'laptop', config: { interfaces: { wlan0: ip('192.168.1.10') }, wireless: { enabled: true, ssid: 'School', password: 'test' } } },
    { id: 'ap', type: 'ap', config: { wireless: { enabled: true, ssid: 'School', password: 'test' } } },
    { id: 'sw', type: 'switch', config: { vlans, switchports: { eth0: access(10), eth1: access(10) } } },
    host('server', '192.168.1.20'),
  ], cables: [wire('ap', 'eth0', 'sw', 'eth0'), wire('server', 'eth0', 'sw', 'eth1')] });
  assert.equal(simulatePing(topology, 'laptop', '192.168.1.20').ok, true);
  get(topology, 'sw').config.switchports.eth1.accessVlan = 20;
  assert.equal(simulatePing(topology, 'laptop', '192.168.1.20').ok, false);
});

test('static routes can use a router subinterface or an SVI as their outgoing interface', () => {
  const topology = onAStick();
  const router = get(topology, 'router');
  router.config.routes = [{ destination: '172.16.0.0/24', nextHop: '192.168.20.10', port: 'eth0.20' }];
  normalizeTopology(topology);
  const l3 = l3Topology();
  get(l3, 'core').config.routes = [{ destination: '172.16.0.0/24', nextHop: '192.168.20.10', port: 'vlan20' }];
  normalizeTopology(l3);
});

test('invalid VLAN configuration cannot be imported or substituted for locked lab configuration', () => {
  for (const change of [
    topology => { get(topology, 'sw').config.vlans.push({ id: 4095 }); },
    topology => { get(topology, 'sw').config.switchports.eth7.allowedVlans = [0]; },
    topology => { get(topology, 'router').config.interfaces.eth0.ip = '10.0.0.1'; },
    topology => { get(topology, 'router').config.subinterfaces[0].native = true; get(topology, 'router').config.subinterfaces[1].native = true; },
    topology => { get(topology, 'router').config.subinterfaces[0].parent = 'eth99'; },
  ]) {
    const topology = onAStick(); change(topology);
    assert.throws(() => normalizeTopology(topology));
  }
  const topology = l3Topology();
  const problem = normalizeProblem({ slug: 'locked-svis', title: 'Locked', description: 'Locked', topology,
    permissions: { configure: ['pc-a'], cables: false, devices: false },
    objectives: [{ type: 'ping', label: 'Connect', source: 'pc-a', target: '192.168.20.10' }] });
  get(topology, 'core').config.ipRouting = false;
  assert.throws(() => validateSubmission(problem, topology), /locked/);
});
