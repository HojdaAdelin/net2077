import { topologyReducer } from './networkTopology.js';

export const HISTORY_LIMIT = 50;
export const createNetworkHistory = present => ({ past: [], present, future: [], transaction: null });
const remember = (past, topology) => [...past, topology].slice(-HISTORY_LIMIT);

export function networkHistoryReducer(state, action) {
  if (action.type === 'begin') {
    return state.transaction ? state : { ...state, transaction: state.present };
  }
  if (action.type === 'commit') {
    if (!state.transaction) return state;
    const changed = JSON.stringify(state.transaction) !== JSON.stringify(state.present);
    return { ...state, transaction: null,
      past: changed ? remember(state.past, state.transaction) : state.past,
      future: changed ? [] : state.future };
  }
  if (action.type === 'undo') {
    if (state.transaction || !state.past.length) return state;
    return { past: state.past.slice(0, -1), present: state.past.at(-1),
      future: [state.present, ...state.future].slice(0, HISTORY_LIMIT), transaction: null };
  }
  if (action.type === 'redo') {
    if (state.transaction || !state.future.length) return state;
    return { past: remember(state.past, state.present), present: state.future[0],
      future: state.future.slice(1), transaction: null };
  }
  if (action.type !== 'edit') return state;
  const operation = action.operation;
  // Pointer movement may fire many times within the same snapped grid position.
  if (operation.type === 'move') {
    const device = state.present.devices.find(item => item.id === operation.id);
    if (!device || (device.x === Math.round(operation.x / 10) * 10 && device.y === Math.round(operation.y / 10) * 10)) return state;
  }
  const next = topologyReducer(state.present, operation);
  if (next === state.present) return state;
  if (operation.type === 'configure') {
    const before = state.present.devices.find(item => item.id === operation.id);
    const after = next.devices.find(item => item.id === operation.id);
    if (JSON.stringify(before) === JSON.stringify(after)) return state;
  }
  if (state.transaction) return { ...state, present: next };
  return { past: remember(state.past, state.present), present: next, future: [], transaction: null };
}
