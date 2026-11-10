import test from 'node:test';
import assert from 'node:assert/strict';
import { courseLessons } from '../../../backend/network/networkCourse.js';
import { normalizeTopology } from '../../../backend/network/problemDefinition.js';
import { settingsLessonGuide } from './networkCourseGuide.js';
import { lockModalScroll } from './modalScrollLock.js';

test('Every configuration lesson opens a valid example on a supported settings tab', () => {
  const nonConfiguration = new Set(['workspace', 'lan', 'ping', 'final']);
  for (const lesson of courseLessons) {
    const guide = settingsLessonGuide(lesson);
    if (nonConfiguration.has(lesson.id)) { assert.equal(guide, null); continue; }
    assert.ok(guide, lesson.id);
    const topology = normalizeTopology({ devices: [{ ...guide.device, x: 0, y: 0 }], cables: [] });
    assert.equal(topology.devices.length, 1);
    const tabs = new Set(['network']);
    const type = guide.device.type;
    if (!['switch', 'ap'].includes(type)) tabs.add('ipv6');
    if (['router', 'l3switch', 'firewall', 'cloud'].includes(type)) for (const t of ['routes', 'acl', 'ospf']) tabs.add(t);
    if (['switch', 'l3switch'].includes(type)) tabs.add('switching');
    if (type === 'l3switch') tabs.add('svis');
    if (type === 'router') tabs.add('subinterfaces');
    if (type === 'server') tabs.add('services');
    if (['laptop', 'ap'].includes(type)) tabs.add('wifi');
    if (type === 'firewall') tabs.add('policy');
    for (const step of guide.steps) { assert.ok(tabs.has(step.tab), `${lesson.id}: ${step.tab}`); assert.ok(step.selector); }
  }
});
test('Editing an example does not change subsequent examples or curriculum', () => {
  const lesson = courseLessons.find(l => l.id === 'ipv4');
  const original = structuredClone(lesson);
  const guide = settingsLessonGuide(lesson);
  guide.device.config.interfaces.eth0.ip = '10.99.0.1';
  assert.equal(settingsLessonGuide(lesson).device.config.interfaces.eth0.ip, '192.168.10.10');
  assert.deepEqual(lesson, original);
});
test('Nested modal scroll locks restore the original page state in either cleanup order', () => {
  const previousDocument = globalThis.document;
  try {
    globalThis.document = { body: { style: { overflow: 'auto' } } };
    for (const parentFirst of [true, false]) {
      const parent = lockModalScroll(), child = lockModalScroll();
      assert.equal(document.body.style.overflow, 'hidden');
      const [first, last] = parentFirst ? [parent, child] : [child, parent];
      first(); first(); // Cleanup is idempotent under repeated calls.
      assert.equal(document.body.style.overflow, 'hidden');
      last();
      assert.equal(document.body.style.overflow, 'auto');
    }
  } finally { globalThis.document = previousDocument; }
});
