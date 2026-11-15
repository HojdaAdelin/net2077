import test from 'node:test';
import assert from 'node:assert/strict';
import { createNatExample } from './networkNatExample.js';
import { createNatSession, natOutbound, natInbound } from './networkNat.js';
import { normalizeTopology, normalizeProblem, evaluateObjectives, validateSubmission } from './problemDefinition.js';
import { simulatePing, simulateHTTP, resolveHostname, testConnectivity, requestDHCP } from './networkSimulation.js';

const get = (t, id) => t.devices.find(d => d.id === id);
const edge = t => get(t, 'edge');
const rule = (action = 'permit', protocol = 'ip', source = 'any', destination = 'any') => ({ action, protocol, source, destination, sourcePort: null, destinationPort: null });

test('PAT translates ICMP, TCP and UDP and restores the original reply tuple', () => {
  const t = createNatExample(), original = structuredClone(t);
  for (const [protocol, options] of [['icmp', { icmpId: 123 }], ['tcp', { sourcePort: 12345, destinationPort: 443 }], ['udp', { sourcePort: 12345, destinationPort: 53 }]]) {
    const result = testConnectivity(t, 'client', '198.51.100.10', protocol, options);
    assert.equal(result.ok, true, result.message);
    assert.equal(result.natTranslations[0].insideLocal, '192.168.10.10');
    assert.equal(result.natTranslations[0].insideGlobal, '203.0.113.2');
    assert.equal(result.natTranslations[0].globalPort, 40000);
    assert.equal(result.trace.at(-1).destinationIP, '192.168.10.10');
    assert.ok(result.trace.some(e => e.nat?.direction === 'inside → outside'));
    assert.ok(result.trace.some(e => e.nat?.direction === 'outside → inside'));
  }
  assert.deepEqual(t, original, 'Simulations must not persist runtime translations in configurations.');
});
test('Without NAT the remote server has no route back to the private LAN', () => {
  const t = createNatExample(); edge(t).config.nat.enabled = false;
  const result = simulatePing(t, 'client', '198.51.100.10');
  assert.equal(result.ok, false); assert.match(result.message, /reply failed/);
  assert.deepEqual(result.natTranslations, []);
});
test('Static NAT publishes a private HTTP server and takes precedence over overload', () => {
  const t = createNatExample();
  const inbound = simulateHTTP(t, 'public-web', '203.0.113.50');
  assert.equal(inbound.ok, true, inbound.message); assert.equal(inbound.targetId, 'private-web');
  assert.equal(inbound.natTranslations[0].kind, 'Static NAT');
  assert.equal(inbound.trace.find(e => e.phase === 'Reply' && e.status === 'delivered').sourceIP, '203.0.113.50');
  assert.equal(simulatePing(t, 'public-web', '192.168.10.20').ok, false);
  const outbound = simulatePing(t, 'private-web', '198.51.100.10');
  assert.equal(outbound.ok, true); assert.equal(outbound.natTranslations[0].kind, 'Static NAT');
  assert.equal(outbound.sourceIP, '203.0.113.50');
  const result = simulatePing(t, 'public-web', '203.0.113.2');
  assert.equal(result.targetId, 'edge', 'An unsolicited PAT-address request cannot reach an internal host.');
});
test('DNS and named HTTP preserve both DNS and HTTP translation evidence', () => {
  const t = createNatExample();
  const dns = resolveHostname(t, 'client', 'outside.test');
  assert.equal(dns.ok, true); assert.equal(dns.ip, '198.51.100.10');
  const http = simulateHTTP(t, 'client', 'outside.test');
  assert.equal(http.ok, true); assert.equal(http.natTranslations.length, 2);
  assert.deepEqual(http.natTranslations.map(r => r.protocol).sort(), ['tcp', 'udp']);
});
test('Output ACL evaluates translated source, input ACL evaluates the original on-wire tuple', () => {
  const t = createNatExample(), config = edge(t).config;
  config.acls = [{ name: 'IN', family: 4, rules: [rule('permit', 'ip', '192.168.10.0/24')] },
    { name: 'OUT', family: 4, rules: [rule('permit', 'ip', '203.0.113.2')] }];
  config.interfaces.eth0.aclIn = 'IN'; config.interfaces.eth1.aclOut = 'OUT';
  assert.equal(simulatePing(t, 'client', '198.51.100.10').ok, true);
  config.acls[1].rules[0].source = '192.168.10.0/24';
  assert.match(simulatePing(t, 'client', '198.51.100.10').message, /ACL OUT/);
  config.interfaces.eth1.aclOut = ''; config.interfaces.eth0.aclIn = '';
  config.acls = [{ name: 'PUBLIC', family: 4, rules: [rule('permit', 'ip', 'any', '203.0.113.50')] },
    { name: 'PRIVATE', family: 4, rules: [rule('permit', 'ip', 'any', '192.168.10.20')] }];
  config.interfaces.eth1.aclIn = 'PUBLIC'; config.interfaces.eth0.aclOut = 'PRIVATE';
  assert.equal(simulateHTTP(t, 'public-web', '203.0.113.50').ok, true);
  config.acls[0].rules[0].destination = '192.168.10.20';
  assert.match(simulateHTTP(t, 'public-web', '203.0.113.50').message, /ACL PUBLIC/);
});
test('A NAT classification ACL deny skips translation rather than blocking the packet', () => {
  const t = createNatExample(), config = edge(t).config;
  config.acls = [{ name: 'NATONLY', family: 4, rules: [rule('permit', 'tcp', '192.168.10.0/24')] }];
  config.nat.overload[0].acl = 'NATONLY';
  assert.equal(simulateHTTP(t, 'client', '198.51.100.10').ok, true);
  const denied = simulatePing(t, 'client', '198.51.100.10');
  assert.equal(denied.ok, false); assert.match(denied.message, /reply failed/);
  assert.equal(denied.natTranslations.length, 0);
});
test('PAT allocates different ports for simultaneous hosts sharing a source port', () => {
  const t = createNatExample(), session = createNatSession();
  const packet = ip => ({ family: 4, protocol: 'tcp', sourceIP: ip, destinationIP: '198.51.100.10', sourcePort: 49152, destinationPort: 80 });
  const a = packet('192.168.10.10'), b = packet('192.168.10.11');
  natOutbound(edge(t), 'eth0', 'eth1', a, session); natOutbound(edge(t), 'eth0', 'eth1', b, session);
  assert.notEqual(a.sourcePort, b.sourcePort);
  for (const [translated, expected] of [[a, '192.168.10.10'], [b, '192.168.10.11']]) {
    const reply = { family: 4, protocol: 'tcp', sourceIP: '198.51.100.10', destinationIP: '203.0.113.2', sourcePort: 80, destinationPort: translated.sourcePort };
    natInbound(edge(t), 'eth1', reply, session);
    assert.equal(reply.destinationIP, expected); assert.equal(reply.destinationPort, 49152);
  }
});
test('OSPF-learned routes work with PAT without translating routing protocol traffic', () => {
  const t = createNatExample(); edge(t).config.routes = [];
  edge(t).config.ospf = { enabled: true, routerId: '203.0.113.2', area: '0', interfaces: [{ port: 'eth1', passive: false, cost: 10 }] };
  get(t, 'isp').config.ospf = { enabled: true, routerId: '203.0.113.1', area: '0', interfaces: [{ port: 'eth0', passive: false, cost: 10 }, { port: 'eth1', passive: true, cost: 10 }] };
  assert.equal(simulatePing(t, 'client', '198.51.100.10').ok, true);
});
test('Inside NAT roles support tagged router subinterfaces and routed L3 switch SVIs', () => {
  const t = createNatExample(), config = edge(t).config, sw = get(t, 'lan').config;
  sw.vlans.push({ id: 10, name: 'LAN', enabled: true });
  sw.switchports.eth0.accessVlan = 10; sw.switchports.eth1.accessVlan = 10;
  Object.assign(sw.switchports.eth2, { mode: 'trunk', allowedVlans: [10] });
  config.interfaces.eth0.ip = '';
  config.subinterfaces = [{ name: 'eth0.10', parent: 'eth0', vlan: 10, enabled: true, native: false, ip: '192.168.10.1', mask: '/24' }];
  config.nat.inside = ['eth0.10'];
  assert.equal(simulateHTTP(normalizeTopology(t), 'client', '198.51.100.10').ok, true);
  const s = createNatExample(), e = edge(s); e.type = 'l3switch'; e.config.interfaces.eth0.ip = '';
  e.config.vlans = [{ id: 1, name: 'Default', enabled: true }, { id: 10, name: 'LAN', enabled: true }];
  e.config.switchports = { eth0: { mode: 'access', accessVlan: 10 } }; e.config.ipRouting = true;
  e.config.svis = [{ vlan: 10, enabled: true, ip: '192.168.10.1', mask: '/24' }]; e.config.nat.inside = ['vlan10'];
  assert.equal(simulatePing(normalizeTopology(s), 'client', '198.51.100.10').ok, true);
});
test('NAT roles and malformed mappings are validated and legacy topology defaults stay compatible', () => {
  const mutations = [
    t => { edge(t).config.nat.enabled = 'yes'; },
    t => { edge(t).config.nat.inside.push('eth1'); },
    t => { edge(t).config.nat.inside = ['missing']; },
      t => { edge(t).config.nat.inside = ['constructor']; },
    t => { edge(t).config.nat.staticMappings.push({ local: '192.168.10.30', global: '203.0.113.50' }); },
    t => { edge(t).config.nat.overload[0].source = '192.168.10.12/24'; },
    t => { edge(t).config.nat.overload[0].acl = 'MISSING'; },
    t => { get(t, 'client').config.nat = { enabled: true, inside: ['eth0'] }; },
  ];
  for (const mutate of mutations) { const t = createNatExample(); mutate(t); assert.throws(() => normalizeTopology(t)); }
  const t = createNatExample(); delete edge(t).config.nat;
  assert.equal(normalizeTopology(t).devices.find(d => d.id === 'edge').config.nat.enabled, false);
});
test('IPv6 routes stay independent of enabled IPv4 NAT/PAT', () => {
  const t = createNatExample();
  const set6 = (id, port, ipv6) => Object.assign(get(t, id).config.interfaces[port], { ipv6, prefix6: 64 });
  set6('client', 'eth0', '2001:db8:10::10'); get(t, 'client').config.gateway6 = '2001:db8:10::1';
  set6('edge', 'eth0', '2001:db8:10::1'); set6('edge', 'eth1', '2001:db8:20::2');
  set6('isp', 'eth0', '2001:db8:20::1'); set6('isp', 'eth1', '2001:db8:30::1');
  set6('public-web', 'eth0', '2001:db8:30::10'); get(t, 'public-web').config.gateway6 = '2001:db8:30::1';
  edge(t).config.routes6 = [{ destination: '::/0', nextHop: '2001:db8:20::1', port: 'eth1' }];
  get(t, 'isp').config.routes6 = [{ destination: '2001:db8:10::/64', nextHop: '2001:db8:20::2', port: 'eth0' }];
  const result = simulatePing(normalizeTopology(t), 'client', '2001:db8:30::10');
  assert.equal(result.ok, true, result.message); assert.deepEqual(result.natTranslations, []);
});
test('DHCP leases work on the inside LAN and can subsequently use PAT', () => {
  const t = createNatExample();
  get(t, 'private-web').config.services.dhcp = { enabled: true, start: '192.168.10.100', end: '192.168.10.150', mask: '/24', gateway: '192.168.10.1', dns: '198.51.100.10' };
  get(t, 'client').config.interfaces.eth0.ip = '';
  const lease = requestDHCP(t, 'client');
  assert.equal(lease.ok, true); assert.ok(!lease.trace.some(e => e.nat));
  get(t, 'client').config = lease.config;
  const result = simulateHTTP(t, 'client', 'outside.test');
  assert.equal(result.ok, true); assert.equal(result.natTranslations[0].insideLocal, '192.168.10.100');
});
test('Chained NAT devices restore the source through both reverse translations', () => {
  const t = createNatExample();
  get(t, 'isp').config.nat = { enabled: true, inside: ['eth0'], outside: ['eth1'], staticMappings: [], overload: [{ source: '203.0.113.0/24', outside: 'eth1', acl: '' }] };
  const result = simulateHTTP(normalizeTopology(t), 'client', '198.51.100.10');
  assert.equal(result.ok, true, result.message); assert.equal(result.natTranslations.length, 2);
  assert.equal(result.trace.find(e => e.phase === 'Reply' && e.status === 'delivered').destinationIP, '192.168.10.10');
});
test('Firewall protocol policy remains effective with NAT enabled', () => {
  const t = createNatExample(); edge(t).type = 'firewall'; edge(t).config.firewall.http = false;
  const normalized = normalizeTopology(t);
  assert.equal(simulatePing(normalized, 'client', '198.51.100.10').ok, true);
  assert.match(simulateHTTP(normalized, 'client', '198.51.100.10').message, /blocked by the firewall/);
});
test('NAT configuration survives imports, lab validation and NAT-specific objectives', () => {
  const topology = createNatExample();
  const problem = normalizeProblem({ schemaVersion: 1, slug: 'nat-practice', title: 'NAT', description: 'Configure NAT', topology,
    objectives: [
      { id: 'inside', label: 'Inside role', type: 'natRole', device: 'edge', port: 'eth0', role: 'inside' },
      { id: 'static', label: 'Published host', type: 'natStatic', device: 'edge', local: '192.168.10.20', global: '203.0.113.50' },
      { id: 'pat', label: 'Overload', type: 'natOverload', device: 'edge', sourcePrefix: '192.168.10.0/24', port: 'eth1' },
      { id: 'web', label: 'Reach outside', type: 'http', source: 'client', target: '198.51.100.10', expected: true, targetDevice: 'public-web' },
    ], permissions: { configure: [], cables: false, devices: false } });
  assert.ok(evaluateObjectives(problem, validateSubmission(problem, topology)).every(goal => goal.passed));
  const tampered = structuredClone(topology); edge(tampered).config.nat.enabled = false;
  assert.throws(() => validateSubmission(problem, tampered), /locked/);
});
