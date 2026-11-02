import test from 'node:test';
import assert from 'node:assert/strict';
import { createNetworkHistory, networkHistoryReducer as reduce, HISTORY_LIMIT } from './networkHistory.js';
import { emptyTopology } from './networkTopology.js';
import { normalizeProblem, validateSubmission } from '../../../backend/network/problemDefinition.js';
import { requestDHCP } from '../../../backend/network/networkSimulation.js';

const edit = (state, operation) => reduce(state, { type: 'edit', operation });
const add = (state, deviceType = 'pc') => edit(state, { type: 'add', deviceType, x: 0, y: 0 });
const move = (state, x, id = 'pc-1') => edit(state, { type: 'move', id, x, y: 0 });

test('undo/redo restores deleted devices together with their cables and ID counters', () => {
  let state = add(add(createNetworkHistory(emptyTopology())), 'switch');
  state = edit(state, { type: 'connect', from: { deviceId: 'pc-1', portId: 'eth0' }, to: { deviceId: 'switch-1', portId: 'eth0' } });
  const connected = state.present;
  state = edit(state, { type: 'delete-device', id: 'pc-1' });
  assert.equal(state.present.cables.length, 0);
  state = reduce(state, { type: 'undo' });
  assert.deepEqual(state.present, connected);
  state = reduce(state, { type: 'redo' });
  assert.equal(state.present.devices.some(device => device.id === 'pc-1'), false);
  assert.equal(state.present.cables.length, 0);
  state = reduce(state, { type: 'undo' });
  assert.equal(state.present.counts.pc, 1);
  assert.equal(state.present.nextCable, 2);
});

test('an entire drag is one undo step; returning to the starting position preserves redo', () => {
  let state = add(createNetworkHistory(emptyTopology()));
  const baseline = state.present;
  state = reduce(state, { type: 'begin' });
  for (let x = 1; x <= 100; x++) state = move(state, x);
  assert.equal(state.past.length, 1);
  assert.equal(reduce(state, { type: 'undo' }), state);
  state = reduce(state, { type: 'commit' });
  assert.equal(state.past.length, 2);
  state = reduce(state, { type: 'undo' });
  assert.deepEqual(state.present, baseline);
  const future = state.future;
  state = reduce(state, { type: 'begin' });
  state = move(state, 80);
  state = move(state, 0);
  state = reduce(state, { type: 'commit' });
  assert.equal(state.future, future);
  state = reduce(state, { type: 'redo' });
  assert.equal(state.present.devices[0].x, 100);
});

test('no-op edits retain redo; a new real edit clears it', () => {
  let state = move(add(createNetworkHistory(emptyTopology())), 30);
  state = reduce(state, { type: 'undo' });
  const unchanged = state;
  state = move(state, 3);
  assert.equal(state, unchanged);
  const device = state.present.devices[0];
  state = edit(state, { type: 'configure', id: device.id, settings: { name: device.name, config: device.config } });
  assert.equal(state, unchanged);
  state = edit(state, { type: 'configure', id: device.id, settings: { name: '', config: device.config } });
  assert.equal(state, unchanged);
  state = move(state, 50);
  assert.equal(state.future.length, 0);
});

test('history retains only the most recent 50 changes and does not mutate old snapshots', () => {
  let state = add(createNetworkHistory(emptyTopology()));
  const original = state.present;
  for (let index = 1; index <= 70; index++) state = move(state, index * 10);
  assert.equal(state.past.length, HISTORY_LIMIT);
  for (let index = 0; index < HISTORY_LIMIT; index++) state = reduce(state, { type: 'undo' });
  assert.equal(state.present.devices[0].x, 200);
  assert.equal(reduce(state, { type: 'undo' }), state);
  assert.equal(original.devices[0].x, 0);
});

test('DHCP application can be undone and redone while preserving locked lab configurations', () => {
  const problem = normalizeProblem({ schemaVersion: 1, slug: 'history-test', title: 'Test', description: 'Test DHCP history.',
    permissions: { configure: ['pc-1'], cables: false, devices: false },
    topology: { devices: [
      { id: 'pc-1', type: 'pc', name: 'Client', x: 0, y: 0 },
      { id: 'server-1', type: 'server', name: 'DHCP', x: 300, y: 0, config: {
        interfaces: { eth0: { ip: '192.168.1.2', mask: '/24' } },
        services: { dhcp: { enabled: true, start: '192.168.1.100', end: '192.168.1.110', mask: '/24', gateway: '192.168.1.1', dns: '192.168.1.2' } },
      } },
    ], cables: [{ id: 'link-1', from: { deviceId: 'pc-1', portId: 'eth0' }, to: { deviceId: 'server-1', portId: 'eth0' } }] },
    objectives: [{ type: 'dhcp', label: 'Obtain lease', device: 'pc-1' }],
  });
  let state = createNetworkHistory(structuredClone(problem.topology));
  const lockedServer = structuredClone(state.present.devices[1]);
  const lease = requestDHCP(state.present, 'pc-1');
  assert.equal(lease.ok, true);
  state = edit(state, { type: 'configure', id: 'pc-1', settings: { name: 'Client', config: lease.config } });
  const assigned = state.present;
  assert.equal(assigned.devices[0].config.interfaces.eth0.ip, '192.168.1.100');
  validateSubmission(problem, assigned);
  state = reduce(state, { type: 'undo' });
  assert.equal(state.present.devices[0].config.interfaces.eth0.ip, '');
  validateSubmission(problem, state.present);
  state = reduce(state, { type: 'redo' });
  assert.deepEqual(state.present, assigned);
  assert.deepEqual(state.present.devices[1], lockedServer);
  validateSubmission(problem, state.present);
  assert.equal(createNetworkHistory(assigned).past.length, 0);
});
