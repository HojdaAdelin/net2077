import test from 'node:test';
import assert from 'node:assert/strict';
import { courseLessons, courseChecks, courseStarter } from './networkCourse.js';
import { topologyReducer } from './networkTopology.js';
import { normalizeTopology } from './problemDefinition.js';

function fixture(types) {
  let t = courseStarter();
  for (const [i, type] of types.entries()) t = topologyReducer(t, { type: 'add', deviceType: type, x: i * 210, y: 100 });
  return t;
}
function connect(t, a, b, ap = 'eth0', bp = 'eth0') {
  t.cables.push({ id: `cable-${t.nextCable++}`, from: { deviceId: a, portId: ap }, to: { deviceId: b, portId: bp } });
}
function address(t, id, ip, port = 'eth0', mask = '255.255.255.0') {
  Object.assign(t.devices.find(d => d.id === id).config.interfaces[port], ip.includes(':') ? { ipv6: ip, prefix6: 64 } : { ip, mask });
}
function lan(network = '192.168.10', server = false) {
  const t = fixture(['pc', 'pc', 'switch', ...(server ? ['server'] : [])]);
  connect(t, 'pc-1', 'switch-1'); connect(t, 'pc-2', 'switch-1', 'eth0', 'eth1');
  address(t, 'pc-1', `${network}.10`); address(t, 'pc-2', `${network}.20`);
  if (server) { connect(t, 'server-1', 'switch-1', 'eth0', 'eth2'); address(t, 'server-1', `${network}.2`); }
  return t;
}
function passes(id, t) {
  const validated = normalizeTopology(t);
  assert.ok(courseChecks(id, validated).every(c => c.passed), `${id}: ${JSON.stringify(courseChecks(id, validated))}`);
}
test('Every lesson has a distinct ID and rejects an empty workspace', () => {
  assert.equal(new Set(courseLessons.map(l => l.id)).size, courseLessons.length);
  for (const lesson of courseLessons) {
    const checks = courseChecks(lesson.id, courseStarter());
    assert.ok(checks.length > 0);
    assert.ok(checks.some(c => !c.passed), lesson.id);
  }
});
test('Workspace, cables, IPv4 and packet connectivity', () => {
  passes('workspace', fixture(['pc']));
  const t = lan(); passes('lan', t); passes('ipv4', t); passes('ping', t);
  t.cables.pop(); assert.ok(courseChecks('ping', t).some(c => !c.passed));
});
test('Local gateway and IPv6 LAN', () => {
  const t = fixture(['pc', 'router']); connect(t, 'pc-1', 'router-1');
  address(t, 'pc-1', '192.168.10.10'); address(t, 'router-1', '192.168.10.1');
  t.devices[0].config.gateway = '192.168.10.1'; passes('gateway', t);
  address(t, 'pc-1', '2001:db8:10::10'); address(t, 'router-1', '2001:db8:10::20'); passes('ipv6', t);
});
test('DHCP, DNS and HTTP require reachable services', () => {
  const t = lan('192.168.1', true), server = t.devices.find(d => d.type === 'server');
  server.config.services.dhcp.enabled = true;
  address(t, 'pc-1', '192.168.1.100'); passes('dhcp', t);
  server.config.services.dns.enabled = true; server.config.services.dns.records = [{ name: 'lab.test', ip: '192.168.1.2' }];
  t.devices[0].config.dns = '192.168.1.2'; passes('dns', t);
  address(t, 'pc-1', '192.168.1.10'); server.config.services.http.enabled = true; passes('http', t);
  t.cables = []; assert.ok(courseChecks('http', t).some(c => !c.passed));
});
test('Wireless association checks the actual wireless link', () => {
  const t = fixture(['ap', 'laptop']);
  for (const d of t.devices) Object.assign(d.config.wireless, { enabled: true, ssid: 'CourseLAN', password: 'net2077lab' });
  passes('wifi', t); t.devices[1].config.interfaces.wlan0.enabled = false;
  assert.ok(courseChecks('wifi', t).some(c => !c.passed));
});
test('VLAN access, trunks and SVI forwarding configurations', () => {
  const t = fixture(['switch', 'switch']);
  for (const d of t.devices) {
    d.config.vlans.push({ id: 10, name: 'Lab' });
    for (const p of ['eth0', 'eth1']) d.config.switchports[p].accessVlan = 10;
    Object.assign(d.config.switchports.eth7, { mode: 'trunk', allowedVlans: [10] });
  }
  connect(t, 'switch-1', 'switch-2', 'eth7', 'eth7'); passes('vlan', t); passes('trunk', t);
  const l3 = fixture(['l3switch']), config = l3.devices[0].config;
  config.vlans.push({ id: 10, name: 'Users' }, { id: 20, name: 'Servers' }); config.ipRouting = true;
  config.svis = [10, 20].map(vlan => ({ vlan, enabled: true, ip: `192.168.${vlan}.1`, mask: '255.255.255.0' }));
  passes('intervlan', l3);
});
test('Static routing and real OSPF adjacency', () => {
  const t = fixture(['router', 'router']); connect(t, 'router-1', 'router-2');
  address(t, 'router-1', '10.0.0.1', 'eth0', '255.255.255.252'); address(t, 'router-2', '10.0.0.2', 'eth0', '255.255.255.252');
  t.devices[0].config.routes.push({ destination: '192.168.20.0/24', nextHop: '10.0.0.2', port: 'eth0' }); passes('static', t);
  for (const d of t.devices) Object.assign(d.config.ospf, { enabled: true, area: '0', interfaces: [{ port: 'eth0', passive: false, cost: 10 }] });
  passes('ospf', t); t.devices[1].config.ospf.area = '1'; assert.ok(courseChecks('ospf', t).some(c => !c.passed));
});
test('Tagged router interfaces and IPv6 static routes', () => {
  const r = fixture(['router']);
  r.devices[0].config.subinterfaces = [10, 20].map(vlan => ({ name: `eth0.${vlan}`, parent: 'eth0', vlan, enabled: true, native: false, ip: `192.168.${vlan}.1`, mask: '/24' }));
  passes('subinterfaces', r);
  const t = fixture(['router', 'router']); connect(t, 'router-1', 'router-2');
  address(t, 'router-1', '2001:db8:1::1'); address(t, 'router-2', '2001:db8:1::2');
  for (const d of t.devices) d.config.ipv6Routing = true;
  t.devices[0].config.routes6.push({ destination: '2001:db8:20::/64', nextHop: '2001:db8:1::2', port: 'eth0' });
  passes('routes6', t);
});
test('Firewall policy, bound ACL and final HTTP mission', () => {
  const f = fixture(['firewall']); f.devices[0].config.firewall.http = false; passes('firewall', f);
  const r = fixture(['router']);
  r.devices[0].config.acls.push({ name: 'LAB', family: 4, rules: [{ action: 'permit', protocol: 'icmp', source: 'any', destination: 'any', sourcePort: null, destinationPort: null }] });
  r.devices[0].config.interfaces.eth0.aclIn = 'LAB'; passes('acl', r);
  const t = lan('192.168.10', true); t.devices.find(d => d.type === 'server').config.services.http.enabled = true; passes('final', t);
});
