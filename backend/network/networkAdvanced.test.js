import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTopology, normalizeProblem, evaluateObjectives, validateSubmission } from './problemDefinition.js';
import { simulatePing, simulateHTTP, testConnectivity, getOspfState } from './networkSimulation.js';
import { parseAddress, formatIPv6, addressInNetwork, parseNetwork } from './networkAddressing.js';
import { normalizeAcl, evaluateAcl } from './networkAcl.js';

const ip = (ip = '', ipv6 = '', mask = '/24') => ({ ip, mask, ipv6, prefix6: 64 });
const wire = (a, ap, b, bp) => ({ from: { deviceId: a, portId: ap }, to: { deviceId: b, portId: bp } });
const get = (t, id) => t.devices.find(d => d.id === id);
const basic = () => normalizeTopology({ devices: [
  { id: 'a', type: 'pc', config: { interfaces: { eth0: ip('192.168.1.10', '2001:db8:1::10') }, gateway: '192.168.1.1', gateway6: '2001:db8:1::1' } },
  { id: 'r', type: 'router', config: { interfaces: { eth0: ip('192.168.1.1', '2001:db8:1::1'), eth1: ip('192.168.2.1', '2001:db8:2::1') } } },
  { id: 'b', type: 'server', config: { interfaces: { eth0: ip('192.168.2.10', '2001:db8:2::10') }, gateway: '192.168.2.1', gateway6: '2001:db8:2::1', services: { http: { enabled: true } } } },
], cables: [wire('a', 'eth0', 'r', 'eth0'), wire('r', 'eth1', 'b', 'eth0')] });
const ospf = (routerId, ports) => ({ enabled: true, routerId, area: '0', interfaces: ports.map((port, i) => ({ port, passive: i === 0, cost: 10 })) });
const chain = () => normalizeTopology({ devices: [
  { id: 'a', type: 'pc', config: { interfaces: { eth0: ip('192.168.1.10') }, gateway: '192.168.1.1' } },
  { id: 'r1', type: 'router', config: { interfaces: { eth0: ip('192.168.1.1'), eth1: ip('10.0.1.1') }, ospf: ospf('1.1.1.1', ['eth0', 'eth1']) } },
  { id: 'r2', type: 'router', config: { interfaces: { eth0: ip('192.168.2.1'), eth1: ip('10.0.1.2'), eth2: ip('10.0.2.1') }, ospf: ospf('2.2.2.2', ['eth0', 'eth1', 'eth2']) } },
  { id: 'r3', type: 'router', config: { interfaces: { eth0: ip('192.168.3.1'), eth1: ip('10.0.2.2') }, ospf: ospf('3.3.3.3', ['eth0', 'eth1']) } },
  { id: 'b', type: 'pc', config: { interfaces: { eth0: ip('192.168.3.10') }, gateway: '192.168.3.1' } },
], cables: [wire('a', 'eth0', 'r1', 'eth0'), wire('r1', 'eth1', 'r2', 'eth1'), wire('r2', 'eth2', 'r3', 'eth1'), wire('r3', 'eth0', 'b', 'eth0')] });
const rule = (action = 'permit', protocol = 'ip', extra = {}) => ({ action, protocol, source: 'any', destination: 'any', ...extra });
const bind = (t, rules, port = 'eth0', direction = 'In', family = 4) => {
  const c = get(t, 'r').config;
  c.acls = [normalizeAcl({ name: 'FILTER', family, rules })]; c.interfaces[port][`${family === 6 ? 'acl6' : 'acl'}${direction}`] = 'FILTER';
};

test('IPv6 parser, compression, embedded IPv4 and prefix boundaries', () => {
  for (const value of ['::', '::1', '2001:db8::1', '2001:0db8:0000:0000:0000:0000:0000:0001', '::ffff:192.0.2.1']) assert.equal(parseAddress(value)?.family, 6);
  for (const value of ['1::2::3', ':::1', '::ffff:999.1.1.1', '1:2:3', '2001:db8::g', 'fe80::1%eth0']) assert.equal(parseAddress(value), null);
  assert.equal(formatIPv6(parseAddress('2001:0db8:0:0:0:0:0:1').number), '2001:db8::1');
  assert.equal(addressInNetwork('2001:db8:1::1', '2001:db8::/32'), true);
  assert.equal(addressInNetwork('2001:db9::1', '2001:db8::/32'), false);
  assert.equal(parseNetwork('2001:db8::1/64'), null);
});
test('dual stack routes IPv6 with ICMPv6 and IPv4 independently; HTTP accepts IPv6 literals', () => {
  const t = basic();
  assert.equal(simulatePing(t, 'a', '192.168.2.10').ok, true);
  const result = simulatePing(t, 'a', '2001:db8:2::10');
  assert.equal(result.ok, true); assert.equal(result.trace[0].protocol, 'icmpv6');
  assert.equal(simulateHTTP(t, 'a', 'http://[2001:db8:2::10]').ok, true);
  get(t, 'r').config.ipv6Routing = false;
  assert.equal(simulatePing(t, 'a', '2001:db8:2::10').ok, false);
  assert.equal(simulatePing(t, 'a', '192.168.2.10').ok, true);
  assert.equal(simulatePing(t, 'a', '2001:db8:1::1').ok, true);
});
test('wrong IPv6 prefix and missing return gateway stop traffic', () => {
  const t = basic(); get(t, 'b').config.gateway6 = '';
  assert.match(simulatePing(t, 'a', '2001:db8:2::10').message, /reply failed/);
  get(t, 'b').config.gateway6 = '2001:db8:2::1'; get(t, 'a').config.interfaces.eth0.prefix6 = 32;
  assert.equal(simulatePing(t, 'a', '2001:db8:2::10').ok, false);
});
test('IPv6 static routes require both directions and an on-link next hop', () => {
  const t = basic();
  const b = get(t, 'b'); b.config.gateway6 = '2001:db8:3::1'; b.config.interfaces.eth0.ipv6 = '2001:db8:3::10';
  t.devices.push(...normalizeTopology({ devices: [{ id: 'r2', type: 'router', config: { interfaces: { eth0: ip('', '2001:db8:2::2'), eth1: ip('', '2001:db8:3::1') } } }], cables: [] }).devices);
  t.cables = [t.cables[0], { id: 'c2', ...wire('r', 'eth1', 'r2', 'eth0') }, { id: 'c3', ...wire('r2', 'eth1', 'b', 'eth0') }];
  get(t, 'r').config.routes6.push({ destination: '2001:db8:3::/64', nextHop: '2001:db8:2::2', port: 'eth1' });
  assert.equal(simulatePing(t, 'a', '2001:db8:3::10').ok, false);
  get(t, 'r2').config.routes6.push({ destination: '2001:db8:1::/64', nextHop: '2001:db8:2::1', port: 'eth0' });
  assert.equal(simulatePing(t, 'a', '2001:db8:3::10').ok, true);
  get(t, 'r').config.routes6[0].nextHop = '2001:db8:99::1'; assert.throws(() => normalizeTopology(t), /IPv6 routes/);
});
test('ACL first match, source subnet, transport ports and implicit deny', () => {
  const t = basic(); bind(t, [rule('permit', 'tcp', { source: '192.168.1.0/24', destinationPort: 80 })]);
  assert.equal(simulateHTTP(t, 'a', '192.168.2.10').ok, true);
  assert.equal(testConnectivity(t, 'a', '192.168.2.10', 'tcp', { destinationPort: 22 }).ok, false);
  assert.match(simulatePing(t, 'a', '192.168.2.10').message, /implicit deny/);
  get(t, 'r').config.acls[0].rules.unshift(rule('deny'));
  assert.match(simulateHTTP(t, 'a', '192.168.2.10').message, /rule 1/);
});
test('ACL outbound direction is stateless and requires a return rule', () => {
  const t = basic(); bind(t, [rule('permit', 'tcp', { destinationPort: 80 })], 'eth1', 'Out');
  bind(t, [rule('permit', 'tcp', { destinationPort: 80 })], 'eth1', 'In');
  assert.match(simulateHTTP(t, 'a', '192.168.2.10').message, /reply failed/);
  get(t, 'r').config.acls[0].rules.push(rule('permit', 'tcp', { sourcePort: 80 }));
  assert.equal(simulateHTTP(t, 'a', '192.168.2.10').ok, true);
});
test('IPv6 ACLs do not affect IPv4 and match IPv6 subnet / ICMPv6', () => {
  const t = basic(); bind(t, [rule('deny', 'icmpv6', { source: '2001:db8:1::/64' }), rule()], 'eth0', 'In', 6);
  assert.equal(simulatePing(t, 'a', '2001:db8:2::10').ok, false);
  assert.equal(simulatePing(t, 'a', '192.168.2.10').ok, true);
  assert.equal(simulateHTTP(t, 'a', 'http://[2001:db8:2::10]').ok, true);
});
test('invalid ACLs, bindings and IPv6 settings are rejected on import', () => {
  for (const mutate of [t => { get(t, 'r').config.interfaces.eth0.aclIn = 'missing'; }, t => { get(t, 'a').config.interfaces.eth0.ipv6 = 'ff02::1'; }, t => { get(t, 'r').config.interfaces.eth0.prefix6 = 129; }]) { const t = basic(); mutate(t); assert.throws(() => normalizeTopology(t)); }
  assert.throws(() => normalizeAcl({ name: 'BAD', rules: [rule('permit', 'icmp', { destinationPort: 80 })] }));
  assert.throws(() => normalizeAcl({ name: 'BAD', rules: [rule('permit', 'tcp', { source: '192.168.1.1/24' })] }));
  assert.equal(evaluateAcl(normalizeAcl({ name: 'EMPTY', rules: [] }), {}).allowed, false);
});
test('OSPF learns routes through three routers and advertises passive LANs', () => {
  const t = chain(), state = getOspfState(t);
  assert.equal(state.devices.r1.neighbors[0].state, 'Full');
  assert.equal(state.devices.r1.routes.find(r => r.destination === '192.168.3.0/24').nextHop, '10.0.1.2');
  assert.equal(simulatePing(t, 'a', '192.168.3.10').ok, true);
  assert.equal(state.devices.r1.routes.some(r => r.destination === '10.0.1.0/24'), false);
  get(t, 'r1').config.routes.push({ destination: '0.0.0.0/0', nextHop: '10.0.1.99', port: 'eth1' });
  assert.equal(simulatePing(t, 'a', '192.168.3.10').ok, true);
});
test('OSPF detects wrong area, passive transit, duplicate ID and link failure', () => {
  for (const [mutate, pattern] of [
    [t => { get(t, 'r2').config.ospf.area = '1'; }, /Area/],
    [t => { get(t, 'r2').config.ospf.interfaces[1].passive = true; }, /Passive/],
    [t => { get(t, 'r2').config.ospf.routerId = '1.1.1.1'; }, /router ID/],
  ]) { const t = chain(); mutate(t); assert.equal(simulatePing(t, 'a', '192.168.3.10').ok, false); assert.match(getOspfState(t).devices.r1.neighbors[0].reason, pattern); }
  const t = chain(); t.cables.splice(2, 1); assert.equal(simulatePing(t, 'a', '192.168.3.10').ok, false);
});
test('OSPF missing LAN advertisement removes only that learned network', () => {
  const t = chain(); get(t, 'r3').config.ospf.interfaces = [{ port: 'eth1', passive: false, cost: 10 }];
  assert.equal(getOspfState(t).devices.r2.neighbors.some(n => n.peerId === 'r3' && n.state === 'Full'), true);
  assert.equal(simulatePing(t, 'a', '192.168.3.10').ok, false);
});
test('ACLs filter OSPF Hellos before neighbor formation', () => {
  const t = chain(); const c = get(t, 'r2').config;
  c.acls = [normalizeAcl({ name: 'HELLO', rules: [rule('deny', 'ospf'), rule()] })]; c.interfaces.eth1.aclIn = 'HELLO';
  assert.match(getOspfState(t).devices.r1.neighbors[0].reason, /Hello blocked/);
  c.acls[0].rules.reverse(); assert.equal(simulatePing(t, 'a', '192.168.3.10').ok, true);
});
test('OSPF chooses lower cost, then static routes win at the same prefix', () => {
  const t = chain();
  get(t, 'r1').config.interfaces.eth2 = { ...get(t, 'r1').config.interfaces.eth1, ip: '10.0.3.1' };
  get(t, 'r3').config.interfaces.eth2 = { ...get(t, 'r3').config.interfaces.eth1, ip: '10.0.3.2' };
  get(t, 'r1').config.ospf.interfaces.push({ port: 'eth2', passive: false, cost: 50 });
  get(t, 'r3').config.ospf.interfaces.push({ port: 'eth2', passive: false, cost: 50 });
  t.cables.push({ id: 'direct', ...wire('r1', 'eth2', 'r3', 'eth2') });
  assert.equal(getOspfState(t).devices.r1.routes.find(r => r.destination === '192.168.3.0/24').port, 'eth1');
  get(t, 'r1').config.ospf.interfaces.find(i => i.port === 'eth2').cost = 1;
  assert.equal(getOspfState(t).devices.r1.routes.find(r => r.destination === '192.168.3.0/24').port, 'eth2');
  get(t, 'r1').config.routes.push({ destination: '192.168.3.0/24', nextHop: '10.0.1.2', port: 'eth1' });
  const result = simulatePing(t, 'a', '192.168.3.10'); assert.equal(result.ok, true); assert.ok(result.steps.some(s => s.includes('r1') && s.includes('eth1')));
});
test('advanced objectives normalize, evaluate and retain locked-config protection', () => {
  const t = basic(); bind(t, [rule()]);
  const problem = normalizeProblem({ slug: 'dual-stack', title: 'Dual stack', description: 'Test IPv6 and ACL', topology: t, objectives: [
    { type: 'interface', label: 'Address', device: 'a', port: 'eth0', ipv6: '2001:0db8:1::10', prefix6: 64 },
    { type: 'gateway6', label: 'Gateway', device: 'a', value: '2001:db8:1::1' },
    { type: 'traffic', label: 'HTTP', source: 'a', target: '2001:db8:2::10', protocol: 'tcp', destinationPort: 80 },
    { type: 'aclBinding', label: 'ACL', device: 'r', port: 'eth0', family: 4, direction: 'in', name: 'FILTER' },
    { type: 'ipv6Routing', label: 'Routing', device: 'r', enabled: true },
  ], permissions: { configure: [] } });
  assert.ok(evaluateObjectives(problem, problem.topology).every(g => g.passed));
  validateSubmission(problem, t); get(t, 'r').config.acls[0].rules = []; assert.throws(() => validateSubmission(problem, t), /locked/);
  const o = normalizeProblem({ slug: 'ospf', title: 'OSPF', description: 'Three routers', topology: chain(), objectives: [
    { type: 'ospfNeighbor', label: 'Neighbor', device: 'r1', peer: 'r2' }, { type: 'ospfRoute', label: 'Route', device: 'r1', destination: '192.168.3.0/24', nextHop: '10.0.1.2' },
  ] }); assert.ok(evaluateObjectives(o, o.topology).every(g => g.passed));
});

test('IPv6 routes through tagged subinterfaces and SVIs with logical ACL bindings', () => {
  for (const type of ['router', 'l3switch']) {
    const hosts = basic().devices.filter(d => d.id !== 'r');
    const logical = [{ vlan: 10, parent: 'eth0', ipv6: '2001:db8:1::1' }, { vlan: 20, parent: 'eth0', ipv6: '2001:db8:2::1' }];
    const vlans = [{ id: 1 }, { id: 10 }, { id: 20 }];
    const switchports = { eth0: { mode: 'access', accessVlan: 10 }, eth1: { mode: 'access', accessVlan: 20 }, eth7: { mode: 'trunk', allowedVlans: [10, 20] } };
    const router = { id: 'r', type, config: type === 'router' ? { subinterfaces: logical } : { vlans, switchports, svis: logical } };
    const t = normalizeTopology({ devices: [...hosts, router, ...(type === 'router' ? [{ id: 'sw', type: 'switch', config: { vlans, switchports } }] : [])], cables: type === 'router' ? [wire('a', 'eth0', 'sw', 'eth0'), wire('b', 'eth0', 'sw', 'eth1'), wire('r', 'eth0', 'sw', 'eth7')] : [wire('a', 'eth0', 'r', 'eth0'), wire('b', 'eth0', 'r', 'eth1')] });
    assert.equal(simulatePing(t, 'a', '2001:db8:2::10').ok, true);
    const c = get(t, 'r').config;
    c.acls = [normalizeAcl({ name: 'V6', family: 6, rules: [rule('deny', 'icmpv6')] })];
    (type === 'router' ? c.subinterfaces[0] : c.svis[0]).acl6In = 'V6';
    assert.match(simulatePing(t, 'a', '2001:db8:2::10').message, /ACL V6/);
    assert.doesNotThrow(() => normalizeTopology(t));
  }
});
test('OSPF respects access VLAN isolation and stops advertising disconnected LANs', () => {
  const t = chain();
  t.devices.push(...normalizeTopology({ devices: [{ id: 'sw', type: 'switch', config: { vlans: [{ id: 1 }, { id: 10 }, { id: 20 }], switchports: { eth0: { mode: 'access', accessVlan: 10 }, eth1: { mode: 'access', accessVlan: 20 } } } }], cables: [] }).devices);
  t.cables.splice(1, 1, { id: 's1', ...wire('r1', 'eth1', 'sw', 'eth0') }, { id: 's2', ...wire('r2', 'eth1', 'sw', 'eth1') });
  assert.equal(getOspfState(t).devices.r1.neighbors.length, 0);
  get(t, 'sw').config.switchports.eth1.accessVlan = 10;
  assert.equal(simulatePing(t, 'a', '192.168.3.10').ok, true);
  t.cables = t.cables.filter(c => c.from.deviceId !== 'a');
  assert.equal(getOspfState(t).devices.r3.routes.some(r => r.destination === '192.168.1.0/24'), false);
});
