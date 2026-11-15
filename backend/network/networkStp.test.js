import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { automaticBridgeMac, getStpState, stpPortKey } from './networkStp.js';
import { normalizeProblem, normalizeTopology, validateSubmission, evaluateObjectives } from './problemDefinition.js';
import { simulatePing, simulateHTTP, requestDHCP } from './networkSimulation.js';

const problems = JSON.parse(readFileSync(new URL('../data/network-stp-problems.json', import.meta.url), 'utf8'));
const triangle = (mode = 'rstp') => {
  const t = structuredClone(problems[2].topology);
  for (const d of t.devices.filter(d => d.type === 'switch')) d.config.stp.mode = mode;
  return t;
};
const device = (t, id) => t.devices.find(d => d.id === id);
const instance = (tree, id, vlan = 10) => tree.devices[id].vlans[vlan];
const port = (tree, id, name, vlan = 10) => tree.ports[stpPortKey(id, name, vlan)];

test('RSTP elects one root, selects root/designated ports and discards the redundant link', () => {
  const t = triangle(), original = structuredClone(t), tree = getStpState(t);
  for (const id of ['core', 'access-a', 'access-b']) assert.equal(instance(tree, id).rootId, 'core');
  assert.equal(instance(tree, 'access-a').rootCost, 20000);
  assert.equal(instance(tree, 'access-b').rootPort, 'eth0');
  assert.equal(port(tree, 'core', 'eth0').role, 'designated');
  assert.equal(port(tree, 'access-a', 'eth0').role, 'root');
  assert.equal(port(tree, 'access-b', 'eth1').role, 'alternate');
  assert.equal(port(tree, 'access-b', 'eth1').state, 'discarding');
  const result = simulatePing(t, 'pc-a', '192.168.10.20');
  assert.equal(result.ok, true, result.message); assert.ok(!result.links.includes('backup-a-b'));
  assert.deepEqual(t, original, 'Election and simulation must not mutate a saved topology.');
});
test('Classic STP blocks standby ports and mixed RSTP/STP links fall back per port', () => {
  const stp = getStpState(triangle('stp'));
  assert.equal(port(stp, 'access-b', 'eth1').state, 'blocking');
  const mixed = triangle(); device(mixed, 'access-b').config.stp.mode = 'stp';
  const tree = getStpState(mixed);
  assert.equal(port(tree, 'access-b', 'eth1').state, 'blocking');
  assert.equal(port(tree, 'access-a', 'eth1').effectiveMode, 'stp');
  assert.equal(port(tree, 'access-a', 'eth0').effectiveMode, 'rstp');
  assert.equal(simulatePing(mixed, 'pc-a', '192.168.10.20').ok, true);
});
test('Failover unblocks the alternate path after cable deletion or interface shutdown', () => {
  for (const shutdown of [false, true]) {
    const t = triangle();
    if (shutdown) device(t, 'access-b').config.interfaces.eth0.enabled = false;
    else t.cables = t.cables.filter(c => c.id !== 'core-b');
    const tree = getStpState(t);
    assert.equal(instance(tree, 'access-b').rootPort, 'eth1');
    assert.equal(instance(tree, 'access-b').rootCost, 40000);
    assert.equal(port(tree, 'access-b', 'eth1').state, 'forwarding');
    const result = simulatePing(t, 'pc-a', '192.168.10.20');
    assert.equal(result.ok, true, result.message); assert.ok(result.links.includes('backup-a-b'));
  }
});
test('Root failure elects the next best bridge without losing the surviving LAN', () => {
  const t = triangle(); t.devices = t.devices.filter(d => d.id !== 'core'); t.cables = t.cables.filter(c => ![c.from.deviceId, c.to.deviceId].includes('core'));
  const tree = getStpState(t);
  assert.equal(instance(tree, 'access-a').rootId, 'access-a'); assert.equal(instance(tree, 'access-b').rootId, 'access-a');
  assert.equal(simulatePing(t, 'pc-a', '192.168.10.20').ok, true);
});
test('Path costs, bridge MACs and port IDs resolve ties deterministically', () => {
  const t = triangle();
  device(t, 'access-b').config.stp.ports.eth0.cost = 100000; device(t, 'access-b').config.stp.ports.eth1.cost = 1000;
  assert.equal(instance(getStpState(t), 'access-b').rootPort, 'eth1');
  assert.equal(port(getStpState(t), 'access-b', 'eth0').state, 'discarding');
  device(t, 'core').config.stp.priority = 8192; device(t, 'access-a').config.stp.bridgeMac = '02:00:00:00:00:00';
  const normal = getStpState(t);
  assert.equal(instance(normal, 'access-a').rootId, 'access-a');
  const shuffled = { ...t, devices: [...t.devices].reverse(), cables: [...t.cables].reverse() };
  for (const id of ['core', 'access-a', 'access-b']) assert.equal(instance(getStpState(shuffled), id).rootPort, instance(normal, id).rootPort);
});
test('Per-VLAN priorities elect independent roots on the same trunks', () => {
  const t = triangle();
  for (const d of t.devices.filter(d => d.type === 'switch')) {
    d.config.vlans.push({ id: 20, name: 'Second LAN', enabled: true });
    d.config.switchports.eth0.allowedVlans = [10, 20]; d.config.switchports.eth1.allowedVlans = [10, 20];
  }
  device(t, 'core').config.stp.vlanPriorities = [{ vlan: 20, priority: 32768 }];
  device(t, 'access-b').config.stp.vlanPriorities = [{ vlan: 20, priority: 0 }];
  const tree = getStpState(normalizeTopology(t));
  assert.equal(instance(tree, 'access-a', 10).rootId, 'core'); assert.equal(instance(tree, 'access-a', 20).rootId, 'access-b');
  assert.notEqual(instance(tree, 'access-a', 10).rootPort, instance(tree, 'access-a', 20).rootPort);
});
test('Unprotected Layer 2 loops fail explicitly instead of silently taking a BFS path', () => {
  const t = triangle(); for (const d of t.devices.filter(d => d.type === 'switch')) d.config.stp.enabled = false;
  const result = simulatePing(t, 'pc-a', '192.168.10.20');
  assert.equal(result.ok, false); assert.match(result.message, /Layer 2 loop/);
  t.cables = t.cables.filter(c => c.id !== 'backup-a-b');
  assert.equal(simulatePing(t, 'pc-a', '192.168.10.20').ok, true);
});
test('Duplicate bridge IDs fail safely and administrative edge cannot bypass a bridge neighbor', () => {
  const t = triangle();
  device(t, 'access-a').config.stp.ports.eth1.edge = true;
  assert.equal(port(getStpState(t), 'access-a', 'eth1').edge, false);
  device(t, 'access-a').config.stp.ports.eth2.edge = true;
  assert.equal(port(getStpState(t), 'access-a', 'eth2').edge, true);
  device(t, 'access-a').config.stp.priority = 0; device(t, 'access-a').config.stp.bridgeMac = device(t, 'core').config.stp.bridgeMac;
  assert.match(instance(getStpState(t), 'core').errors[0], /Duplicate bridge/);
  assert.equal(simulatePing(t, 'pc-a', '192.168.10.20').ok, false);
});
test('DHCP and IPv6 work on a redundant LAN after spanning-tree selection', () => {
  const t = triangle(); const b = device(t, 'pc-b'); b.type = 'server';
  b.config.services.dhcp = { enabled: true, start: '192.168.10.100', end: '192.168.10.150', mask: '/24', gateway: '', dns: '' };
  b.config.services.http.enabled = true;
  assert.equal(requestDHCP(t, 'pc-a').ok, true);
  assert.equal(simulatePing(t, 'pc-a', '2001:db8:10::20').ok, true);
  assert.equal(simulateHTTP(t, 'pc-a', '192.168.10.20').ok, true);
});
test('Validation rejects malformed priorities, costs, MAC addresses and non-switch configuration', () => {
  const cases = [
    t => { device(t, 'core').config.stp.priority = 1; },
    t => { device(t, 'core').config.stp.mode = 'mst'; },
    t => { device(t, 'core').config.stp.ports.eth0.cost = 0; },
    t => { device(t, 'core').config.stp.ports.eth0.priority = 17; },
    t => { device(t, 'core').config.stp.bridgeMac = 'ff:ff:ff:ff:ff:ff'; },
    t => { device(t, 'core').config.stp.vlanPriorities = [{ vlan: 999, priority: 0 }]; },
    t => { device(t, 'pc-a').config.stp = { enabled: true }; },
  ];
  for (const change of cases) { const t = triangle(); change(t); assert.throws(() => normalizeTopology(t)); }
  assert.equal(automaticBridgeMac('switch-1'), automaticBridgeMac('switch-1'));
  assert.notEqual(automaticBridgeMac('switch-1'), automaticBridgeMac('switch-2'));
});
test('All three importable problems start unsolved, preserve locks, and accept their working solutions', () => {
  for (const [index, raw] of problems.entries()) {
    const problem = normalizeProblem(raw);
    assert.equal(problem.published, false);
    assert.ok(evaluateObjectives(problem, problem.topology).some(goal => !goal.passed));
    const solved = structuredClone(problem.topology), target = device(solved, problem.permissions.configure[0]);
    if (index === 0) target.config.stp.priority = 0;
    if (index === 1) { target.config.stp.enabled = true; target.config.stp.mode = 'rstp'; target.config.stp.ports.eth0.cost = 20000; target.config.stp.ports.eth1.cost = 20000; }
    if (index === 2) target.config.stp.priority = 24576;
    const checks = evaluateObjectives(problem, validateSubmission(problem, solved));
    assert.ok(checks.every(goal => goal.passed), JSON.stringify(checks));
    const original = structuredClone(solved);
    evaluateObjectives(problem, solved); assert.deepEqual(solved, original, 'Virtual failover must leave the workspace cables intact.');
    const locked = problem.topology.devices.find(d => !problem.permissions.configure.includes(d.id));
    device(solved, locked.id).name = 'Changed'; assert.throws(() => validateSubmission(problem, solved), /locked/);
  }
});
test('Isolating the requested root does not satisfy the member-switch root objective', () => {
  const problem = normalizeProblem(problems[0]), t = structuredClone(problem.topology);
  device(t, 'core').config.stp.priority = 0; t.cables = t.cables.filter(c => ![c.from.deviceId, c.to.deviceId].includes('core'));
  assert.equal(evaluateObjectives(problem, t).find(goal => goal.id === 'root').passed, false);
});
test('Parallel links compare sender port IDs before receiver port IDs', () => {
  const t = triangle(); t.devices = t.devices.filter(d => d.id !== 'access-b' && d.id !== 'pc-b');
  t.cables = [
    { id: 'first', from: { deviceId: 'core', portId: 'eth0' }, to: { deviceId: 'access-a', portId: 'eth1' } },
    { id: 'second', from: { deviceId: 'core', portId: 'eth1' }, to: { deviceId: 'access-a', portId: 'eth0' } },
    ...t.cables.filter(c => c.id === 'host-a'),
  ];
  assert.equal(instance(getStpState(t), 'access-a').rootPort, 'eth1');
  device(t, 'core').config.stp.ports.eth1.priority = 0;
  assert.equal(instance(getStpState(t), 'access-a').rootPort, 'eth0');
});
test('A repeated bridge port on a transparent segment becomes Backup rather than forming a loop', () => {
  const t = triangle(); device(t, 'access-b').config.stp.enabled = false;
  device(t, 'access-b').config.switchports.eth2 = { mode: 'trunk', nativeVlan: 1, allowedVlans: [10] };
  const wire = (id, a, ap, b, bp) => ({ id, from: { deviceId: a, portId: ap }, to: { deviceId: b, portId: bp } });
  t.cables = [wire('root-first', 'core', 'eth0', 'access-b', 'eth0'), wire('root-second', 'core', 'eth1', 'access-b', 'eth1'),
    wire('leaf', 'access-a', 'eth0', 'access-b', 'eth2'), wire('host-a', 'pc-a', 'eth0', 'access-a', 'eth2'), wire('host-b', 'pc-b', 'eth0', 'core', 'eth2')];
  const tree = getStpState(t);
  assert.equal(port(tree, 'core', 'eth1').role, 'backup'); assert.equal(port(tree, 'core', 'eth1').state, 'discarding');
  assert.equal(simulatePing(t, 'pc-a', '192.168.10.20').ok, true);
  t.cables = [wire('root-first', 'core', 'eth0', 'access-b', 'eth0'), wire('leaf-first', 'access-a', 'eth0', 'access-b', 'eth1'),
    wire('leaf-second', 'access-a', 'eth1', 'access-b', 'eth2'), wire('host-a', 'pc-a', 'eth0', 'access-a', 'eth2'), wire('host-b', 'pc-b', 'eth0', 'core', 'eth2')];
  device(t, 'access-a').config.stp.ports.eth1.priority = 0;
  assert.equal(instance(getStpState(t), 'access-a').rootPort, 'eth1', 'Receiver priority resolves the same-sender tie on a shared segment.');
});
