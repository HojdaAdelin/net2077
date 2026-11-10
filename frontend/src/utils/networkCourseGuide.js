import { defaultDeviceConfig } from './networkConfig.js';
import { DEVICE_TYPES } from './networkTopology.js';

const field = label => `[data-guide-field="${label}"]`;
const step = (tab, selector, title, text, tip) => ({ tab, selector, title, text, tip });
const interfaceStep = step('network', '.nl-config-interface', 'Start with the right interface', 'eth0 is the first wired interface. Its Enabled switch must be on before the device can send or receive packets.', 'A laptop also has wlan0 for Wi-Fi. A router has several independent wired interfaces.');
const addressStep = step('network', field('IPv4 address'), 'Give this interface an address', 'This is where the host IPv4 address goes. The example uses a private LAN address, not a network or broadcast address.', 'In your workspace, double-click a PC, enter the address from the lesson and save it.');
const maskStep = step('network', field('Subnet mask / prefix'), 'Define the local subnet', 'The mask decides which destinations are local. You can enter 255.255.255.0 or /24; they describe the same network size.', 'Both hosts in the lesson need compatible masks and different host addresses.');
const gatewayStep = step('network', field('Default gateway (optional)'), 'Choose the way out', 'For a destination outside its subnet, a host sends traffic to this router address. The gateway itself must be on the host’s local subnet.', 'A gateway is not needed for two hosts talking on the same subnet.');
const definitions = {
  ipv4: { type: 'pc', steps: [interfaceStep, addressStep, maskStep] },
  gateway: { type: 'pc', steps: [interfaceStep, addressStep, gatewayStep] },
  ipv6: { type: 'pc', steps: [
    step('ipv6', field('IPv6 address'), 'Configure IPv6 on the interface', 'Use an address such as 2001:db8:10::10 on eth0. IPv6 lives alongside IPv4; it does not replace the IPv4 fields.', 'The second host uses 2001:db8:10::20.'),
    step('ipv6', field('Prefix length (0–128)'), 'Match the LAN prefix', 'A /64 puts both example hosts in the same IPv6 LAN. The prefix is entered separately from the address.', 'Use 64 on both hosts, then test an IPv6 Ping.'),
    step('ipv6', field('IPv6 default gateway'), 'A separate IPv6 gateway', 'IPv6 traffic uses its own default gateway when leaving the local prefix.', 'Leave it empty for this lesson’s local-only test.'),
  ] },
  dhcp: { type: 'server', steps: [addressStep,
    step('services', field('DHCP server'), 'Enable the DHCP service', 'This switch reveals the server’s address pool. The server still needs a static interface address in that same subnet.', 'The example server uses 192.168.1.2/24.'),
    step('services', field('Pool start'), 'Define the lease range', 'Pool start and Pool end bound the addresses DHCP can assign. Do not include the server or gateway address.', 'Use 192.168.1.100 through 192.168.1.150 for this lesson.'),
    step('services', '[data-guide-service="dhcp"] .nl-config-grid', 'Supply the client settings', 'The pool includes a subnet mask, default gateway and DNS server. These become the client’s network settings after a successful request.', 'Back in the sandbox, select the PC in Simulation and run DHCP. No relay is simulated across routers.'),
  ] },
  dns: { type: 'server', steps: [addressStep,
    step('services', field('DNS server'), 'Turn on name resolution', 'Enable the DNS service here. This is the server-side control, separate from the client’s DNS setting.', 'The server must be reachable at 192.168.1.2.'),
    step('services', '.nl-dns-row', 'Create a name-to-address record', 'A record pairs Hostname with IPv4 address. Here lab.test resolves to 192.168.1.2. Add DNS record creates another row.', 'On the client PC, set DNS server to 192.168.1.2, then test lab.test in Simulation.'),
  ] },
  http: { type: 'server', steps: [addressStep,
    step('services', field('HTTP server'), 'Enable the web service', 'A server does not serve a page until HTTP is enabled. Reachability and service availability are separate checks.', 'Start with an IP-based HTTP request so DNS is not part of the first test.'),
    step('services', field('Page title'), 'Set the page title', 'This title is returned by the simulated HTTP server. The response preview displays it after a successful request.', 'Change it to something you recognise when testing.'),
    step('services', field('Page content'), 'Write the response body', 'The simulator returns this text as page content. It is a text preview, not a real external website.', 'In Simulation, run HTTP to the server address and inspect the response.'),
  ] },
  wifi: { type: 'laptop', steps: [
    step('wifi', field('Wi-Fi enabled'), 'Enable the wireless radio', 'This control enables wireless association. The wlan0 interface also needs to stay enabled in Network.', 'An access point uses the same Wi-Fi configuration tab.'),
    step('wifi', field('SSID'), 'Join the same network', 'The laptop and access point must use the same SSID. In this simulator, the nearest matching access point is chosen.', 'Use CourseLAN on both devices.'),
    step('wifi', field('Wi-Fi password (optional)'), 'Match the password', 'The password must match on the client and access point. A wireless link appears when their settings agree.', 'The lesson password is net2077lab. Association still needs IP addressing before you can test traffic.'),
  ] },
  vlan: { type: 'switch', steps: [
    step('switching', '[data-guide-vlan="10"]', 'Define the VLAN', 'The VLAN database lists the broadcast domains this switch can carry. Add VLAN creates another entry; keep the VLAN active.', 'VLAN 10 is the domain for the lesson.'),
    step('switching', '.nl-vlan-port', 'Assign an access port', 'Choose Access for a host-facing port and set Access VLAN to 10. Frames from an untagged host are placed into that VLAN.', 'Configure eth0 and eth1, then attach one PC to each.'),
  ] },
  trunk: { type: 'switch', steps: [
    step('switching', '[data-guide-vlan="10"]', 'Define VLANs at both ends', 'A trunk does not create VLANs on the neighboring switch. Define each VLAN on every switch that needs to carry it.', 'Create VLAN 10 on both switches.'),
    step('switching', '[data-guide-port="eth7"]', 'Configure the uplink as a trunk', 'For eth7, choose Trunk (802.1Q). Allowed VLANs controls which tags cross the link; the native VLAN carries untagged traffic.', 'Set both ends to allow VLAN 10 and keep their native VLAN consistent.'),
  ] },
  intervlan: { type: 'l3switch', steps: [
    step('switching', '[data-guide-vlan="10"]', 'Create the routed VLANs', 'Create VLAN 10 and VLAN 20 in the switching database before assigning their gateways.', 'Access ports and trunks still decide how hosts reach each VLAN.'),
    step('svis', field('Enable IP routing between VLANs and routed ports'), 'Enable Layer 3 forwarding', 'This toggle permits forwarding between routed ports and VLAN interfaces.', 'Without it, SVIs do not route traffic between the VLANs.'),
    step('svis', '.nl-logical-interface', 'Give each VLAN its gateway', 'Each SVI has a VLAN ID and an address in that VLAN’s subnet. Hosts use that address as their default gateway.', 'Use 192.168.10.1/24 and 192.168.20.1/24. An SVI needs an active VLAN and a live switchport to become operational.'),
  ] },
  subinterfaces: { type: 'router', steps: [
    step('subinterfaces', '.nl-logical-interface', 'Split a physical link into tagged interfaces', 'A subinterface associates a physical parent, an 802.1Q VLAN tag and a gateway address.', 'Keep the parent eth0 enabled and without a physical IP address.'),
    step('subinterfaces', field('802.1Q VLAN ID'), 'Match the tag on the trunk', 'The VLAN ID must be allowed on the attached switch trunk. The same physical link can carry several tagged subinterfaces.', 'Create eth0.10 for VLAN 10 and eth0.20 for VLAN 20.'),
    step('subinterfaces', field('IPv4 address'), 'Set the per-VLAN gateway', 'The address on this logical interface is the gateway for hosts in its VLAN.', 'Use a different subnet for each VLAN and configure host default gateways accordingly.'),
  ] },
  static: { type: 'router', steps: [interfaceStep,
    step('routes', field('Destination network'), 'Name the remote network', 'A static route matches a destination network prefix, not the router’s own interface address.', 'The lesson destination is 192.168.20.0/24.'),
    step('routes', field('Next hop'), 'Point to the neighboring router', 'The next hop must be an address on the outgoing interface’s local subnet.', 'Use 10.0.0.2, with the first router at 10.0.0.1/30.'),
    step('routes', field('Interface'), 'Choose the outgoing interface', 'This is the interface used to reach the next hop. A return route is also required for end-to-end traffic.', 'For the lesson transit link, choose eth0.'),
  ] },
  routes6: { type: 'router', steps: [
    step('ipv6', field('Forward IPv6 packets'), 'Enable IPv6 forwarding', 'IPv6 forwarding has its own switch. IPv4 configuration does not enable it automatically.', 'Enable it on both lesson routers.'),
    step('ipv6', field('IPv6 address'), 'Address the transit link', 'Both transit interfaces need addresses in the same IPv6 prefix.', 'Use 2001:db8:1::1/64 and 2001:db8:1::2/64.'),
    step('ipv6', '.nl-advanced-card', 'Add the remote prefix route', 'An IPv6 static route contains a destination prefix, next hop and outgoing interface, just like the IPv4 equivalent.', 'Route 2001:db8:20::/64 via 2001:db8:1::2 on eth0. Remember the route back.'),
  ] },
  ospf: { type: 'router', steps: [
    step('ospf', field('Enable OSPF'), 'Start OSPF on the router', 'This enables OSPFv2 for IPv4. The interface still needs an enabled link and an IPv4 address.', 'Configure the transit interfaces before looking for neighbors.'),
    step('ospf', field('Area'), 'Use a common area', 'Routers on the transit link must agree on the area. Router IDs must be unique.', 'Use area 0 on both routers; leaving Router ID empty selects an active IPv4 address automatically.'),
    step('ospf', '.nl-config-interface', 'Advertise the transit interface', 'Check Advertise eth0 to include it. A passive interface advertises its network but does not establish neighbors.', 'Keep transit eth0 non-passive. Inspect the Device panel for a Full adjacency.'),
  ] },
  firewall: { type: 'firewall', steps: [
    step('policy', field('Allow ICMP (ping)'), 'Keep diagnostics reachable', 'Allow ICMP controls Ping traffic through this firewall. Policies apply in both directions.', 'A permitted Ping does not mean web traffic is permitted.'),
    step('policy', field('Allow HTTP'), 'Block the web protocol', 'Uncheck Allow HTTP to refuse web traffic while keeping other protocols independent.', 'For the lesson, leave ICMP allowed and HTTP blocked.'),
  ] },
  acl: { type: 'router', steps: [
    step('acl', '.nl-advanced-card', 'Create an ordered access list', 'An ACL has a name and address family. Rules run top to bottom; the first match wins and unmatched traffic is denied.', 'The example uses an IPv4 ACL named LAB.'),
    step('acl', '.nl-acl-rule', 'Describe the traffic to permit', 'This rule permits ICMP from any to any. Use source, destination and protocol fields to narrow a rule.', 'ACLs are stateless. Return traffic must be permitted too.'),
    step('acl', '.nl-config-interface', 'Bind the list to a direction', 'The ACL only affects traffic once bound to an interface, inbound or outbound. IPv4 and IPv6 have separate bindings.', 'Bind LAB to eth0 IPv4 inbound for this lesson.'),
  ] },
};

export function settingsLessonGuide(lesson) {
  const definition = definitions[lesson.id];
  if (!definition) return null;
  const { type } = definition;
  const config = defaultDeviceConfig(type, DEVICE_TYPES[type].ports);
  // Examples are isolated from the user's topology and are never saved or awarded.
  if (type !== 'switch' && type !== 'l3switch') config.interfaces.eth0.ip = type === 'server' ? '192.168.1.2' : type === 'router' ? '10.0.0.1' : '192.168.10.10';
  config.gateway = type === 'pc' ? '192.168.10.1' : '';
  if (['ipv6', 'routes6'].includes(lesson.id)) { config.interfaces.eth0.ipv6 = type === 'pc' ? '2001:db8:10::10' : '2001:db8:1::1'; config.interfaces.eth0.prefix6 = 64; }
  if (type === 'server') {
    config.services[lesson.id].enabled = true;
    if (lesson.id === 'dns') config.services.dns.records = [{ name: 'lab.test', ip: '192.168.1.2' }];
  }
  if (lesson.id === 'wifi') { config.wireless.ssid = 'CourseLAN'; config.wireless.password = 'net2077lab'; }
  if (['switch', 'l3switch'].includes(type)) config.vlans.push({ id: 10, name: 'Users', enabled: true }, { id: 20, name: 'Servers', enabled: true });
  if (lesson.id === 'vlan') for (const port of ['eth0', 'eth1']) config.switchports[port].accessVlan = 10;
  if (lesson.id === 'trunk') Object.assign(config.switchports.eth7, { mode: 'trunk', allowedVlans: [10], nativeVlan: 1 });
  if (lesson.id === 'intervlan') { config.ipRouting = true; config.svis = [10, 20].map(vlan => ({ vlan, enabled: true, ip: `192.168.${vlan}.1`, mask: '/24' })); }
  if (lesson.id === 'subinterfaces') { config.interfaces.eth0.ip = ''; config.subinterfaces = [10, 20].map(vlan => ({ name: `eth0.${vlan}`, parent: 'eth0', vlan, enabled: true, native: false, ip: `192.168.${vlan}.1`, mask: '/24' })); }
  if (lesson.id === 'static') { config.interfaces.eth0.mask = '/30'; config.routes = [{ destination: '192.168.20.0/24', nextHop: '10.0.0.2', port: 'eth0' }]; }
  if (lesson.id === 'routes6') { config.ipv6Routing = true; config.routes6 = [{ destination: '2001:db8:20::/64', nextHop: '2001:db8:1::2', port: 'eth0' }]; }
  if (lesson.id === 'ospf') Object.assign(config.ospf, { enabled: true, area: '0', interfaces: [{ port: 'eth0', passive: false, cost: 10 }] });
  if (lesson.id === 'firewall') config.firewall.http = false;
  if (lesson.id === 'acl') { config.acls = [{ name: 'LAB', family: 4, rules: [{ action: 'permit', protocol: 'icmp', source: 'any', destination: 'any', sourcePort: null, destinationPort: null }] }]; config.interfaces.eth0.aclIn = 'LAB'; }
  return { device: { id: `example-${type}`, type, name: `${DEVICE_TYPES[type].label} · lesson example`, config }, steps: definition.steps };
}
