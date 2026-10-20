import test from 'node:test';
import assert from 'node:assert/strict';
import User from '../models/User.js';
import ShopItem from '../models/ShopItem.js';
import SeasonPass from '../models/SeasonPass.js';
import SeasonBoxConfig from '../models/SeasonBoxConfig.js';
import RareDrop from '../models/RareDrop.js';
import { DEFAULT_SEASON_BOX } from '../data/seasonBoxDefaults.js';
import { buildSeasonBox, loadSeasonBox, publicSeasonBox, prizeForTicket, seasonBoxCatalog } from '../utils/seasonBoxConfig.js';
import { seasonBoxDistribution } from '../../frontend/src/utils/seasonBoxDistribution.js';
import { openSeasonBox, saveSeasonBoxConfig } from '../controllers/seasonBoxController.js';
import routes from '../routes/seasonBoxRoutes.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';

const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const gold = (chance = 100, amount = 10) => ({ id: 'gold-reward', type: 'gold', amount, chance, rarity: 'common' });
const config = prizes => ({ cost: 20, duplicateGold: 20, revision: 1, ticketTotal: 10000, prizes });
const source = { sourceKey: 'item:boost', type: 'item', label: '2x XP', icon: 'Zap',
  itemId: 'boost', itemName: 'Boost', itemCategory: 'boost', itemDuration: 10, itemMultiplier: 2 };

test('fallback retains all existing rewards, costs and every ticket boundary', async t => {
  t.mock.method(SeasonBoxConfig, 'findById', () => ({ lean: async () => null }));
  const box = await loadSeasonBox();
  assert.equal(box.cost, 20);
  assert.equal(box.duplicateGold, 20);
  assert.equal(box.prizes.length, 12);
  assert.equal(box.prizes[0].min, 1);
  assert.equal(box.prizes.at(-1).max, 10000);
  const counts = new Map();
  for (let ticket = 1; ticket <= 10000; ticket++) {
    const prize = prizeForTicket(box.prizes, ticket);
    counts.set(prize.id, (counts.get(prize.id) || 0) + 1);
  }
  for (const prize of box.prizes) assert.equal(counts.get(prize.id), prize.chance * 100);
  assert.throws(() => prizeForTicket(box.prizes, 0));
  assert.throws(() => prizeForTicket(box.prizes, 10001));
  box.prizes[0].label = 'Changed';
  assert.notEqual(DEFAULT_SEASON_BOX.prizes[0].label, 'Changed');
});

test('percentage conversion and ordering match the editor down to one ticket', () => {
  const prizes = [gold(.01), { ...gold(99.99), id: 'second' }];
  const box = buildSeasonBox({ ...config(prizes) }, []);
  const preview = seasonBoxDistribution(prizes);
  assert.equal(preview.valid, true);
  assert.deepEqual(box.prizes.map(({ min, max }) => ({ min, max })), preview.ranges);
  assert.deepEqual(preview.ranges, [{ min: 1, max: 1 }, { min: 2, max: 10000 }]);
  assert.equal(prizeForTicket(box.prizes, 1).id, 'gold-reward');
  assert.equal(prizeForTicket(box.prizes, 2).id, 'second');
  const reversed = buildSeasonBox(config([...prizes].reverse()), []);
  assert.equal(reversed.prizes[0].max, 9999);
});

test('invalid totals, extra decimals, negative values and unknown rewards are rejected', () => {
  for (const prizes of [[], [gold(99)], [gold(100.01)], [gold(0)], [gold(-1)], [gold(.001)],
    [{ ...gold(), rarity: 'invented' }], [{ ...gold(), amount: -1 }],
    [{ ...gold(), type: 'item', sourceKey: 'missing' }],
    [{ ...gold(50) }, { ...gold(50) }]]) {
    assert.throws(() => buildSeasonBox(config(prizes), []), { status: 400 });
  }
});

test('inventory metadata comes from the catalog, not forged request fields', () => {
  const box = buildSeasonBox(config([{ id: 'boost-row', type: 'item', sourceKey: source.sourceKey,
    chance: 100, rarity: 'epic', quantity: 3, itemId: 'forged', itemMultiplier: 1000 }]), [source]);
  assert.equal(box.prizes[0].itemId, 'boost');
  assert.equal(box.prizes[0].itemMultiplier, 2);
  assert.equal(box.prizes[0].quantity, 3);
  assert.equal(box.prizes[0].rarity, 'epic');
  assert.equal(publicSeasonBox(box).prizes[0].rarity, 'epic');
});

function mockCatalog(t) {
  t.mock.method(ShopItem, 'find', () => ({ sort: () => ({ lean: async () => [
    { itemId: 'boost', name: 'XP', icon: 'Zap', category: 'boost', duration: 10, multiplier: 2 },
    { itemId: 'bad-boost', name: 'Bad', category: 'boost' },
  ] }) }));
  t.mock.method(SeasonPass, 'find', () => ({ select: () => ({ lean: async () => [{ levels: [
    { free: { type: 'frame', value: 'gold-phase1', label: 'Phase Frame' }, premium: { type: 'nameEffect', value: 'flame' } }
  ] }] }) }));
  t.mock.method(User, 'distinct', async path => path === 'profileEffects.owned' ? ['flame-border'] : []);
}

test('catalog includes usable database items, season pass frames and owned profile effects', async t => {
  mockCatalog(t);
  const catalog = await seasonBoxCatalog(DEFAULT_SEASON_BOX);
  assert.ok(catalog.some(item => item.sourceKey === 'item:boost'));
  assert.ok(!catalog.some(item => item.sourceKey === 'item:bad-boost'));
  assert.ok(catalog.some(item => item.sourceKey === 'frame:gold-phase1'));
  assert.ok(catalog.some(item => item.sourceKey === 'profileEffect:flame-border'));
  assert.equal(catalog.filter(item => item.sourceKey === 'nameEffect:flame').length, 1);
});

test('saving requires 100%, uses canonical ranges and increments the persisted revision', async t => {
  mockCatalog(t);
  t.mock.method(SeasonBoxConfig, 'findById', () => ({ lean: async () => null }));
  const save = t.mock.method(SeasonBoxConfig, 'findOneAndUpdate', (filter, update) => {
    assert.deepEqual(filter, { _id: 'season-box', revision: 0 });
    assert.equal(update.$set.prizes[0].max, 10000);
    return { lean: async () => ({ ...update.$set, revision: 1 }) };
  });
  const res = response();
  await saveSeasonBoxConfig({ body: { ...config([gold()]), revision: 0 } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.config.revision, 1);
  await saveSeasonBoxConfig({ body: { ...config([gold(99)]), revision: 0 } }, response());
  assert.equal(save.mock.callCount(), 1);
});

function setupOpen(t, prize, balance = 100) {
  const box = { ...config([{ ...prize, min: 1, max: 10000, icon: prize.icon || 'Coins', label: prize.label || 'Reward' }]) };
  let stored = new User({ username: 'test', email: 'test@example.com', password: 'unused', gold: balance });
  t.mock.method(SeasonBoxConfig, 'findById', () => ({ lean: async () => box }));
  const find = t.mock.method(User, 'findById', async () => User.hydrate(stored.toObject()));
  t.mock.method(User, 'findOneAndUpdate', async (filter, update) => {
    if (!filter.$expr.$and.every(({ $eq: [field, expected] }) => {
      const [path, fallback] = field.$ifNull;
      return JSON.stringify(stored.get(path.slice(1)) ?? fallback.$literal) === JSON.stringify(expected.$literal);
    })) return null;
    stored.set(update.$set);
    return User.hydrate(stored.toObject());
  });
  t.mock.method(RareDrop, 'find', () => ({ sort: () => ({ skip: async () => [] }) }));
  return { box, find, stored: () => stored, req: { userId: String(stored._id), body: { count: 1, revision: 1 } } };
}

test('gold openings charge the configured price and grant the configured amount', async t => {
  const state = setupOpen(t, { ...gold(), label: '10 Gold' });
  state.req.body.count = 5;
  const res = response();
  await openSeasonBox(state.req, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.results.length, 5);
  assert.equal(res.body.remainingGold, 50);
});

test('inventory quantities stack and keep metadata needed by useItem', async t => {
  const state = setupOpen(t, { ...source, id: 'boost', quantity: 3, rarity: 'rare' });
  state.req.body.count = 2;
  const res = response();
  await openSeasonBox(state.req, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.remainingGold, 60);
  assert.equal(res.body.inventory.length, 1);
  assert.equal(res.body.inventory[0].quantity, 6);
  assert.equal(res.body.inventory[0].duration, 10);
  assert.equal(res.body.inventory[0].itemId, 'boost');
});

for (const [type, field, keyField, key] of [
  ['frame', 'frames', 'frameKey', 'gold-season1'],
  ['nameEffect', 'nameEffects', 'effectKey', 'flame'],
  ['profileEffect', 'profileEffects', 'effectKey', 'flame-border'],
]) {
  test(`${type} is owned and active; duplicate converts to configured gold`, async t => {
    const state = setupOpen(t, { id: 'cosmetic', type, [keyField]: key, rarity: 'legendary' });
    state.req.body.count = 2;
    const res = response();
    await openSeasonBox(state.req, res);
    assert.equal(res.code, 200);
    assert.deepEqual([...res.body[field].owned], [key]);
    assert.equal(res.body[field].active, key);
    assert.equal(res.body.results[1].duplicate, true);
    assert.equal(res.body.remainingGold, 80);
  });
}

test('outdated preview is refreshed without charging the user', async t => {
  const state = setupOpen(t, gold());
  state.req.body.revision = 0;
  const res = response();
  await openSeasonBox(state.req, res);
  assert.equal(res.code, 409);
  assert.equal(res.body.revision, 1);
  assert.equal(state.find.mock.callCount(), 0);
  assert.equal(state.stored().gold, 100);
});

test('concurrent opens cannot spend the same balance twice', async t => {
  const state = setupOpen(t, { ...source, id: 'boost', quantity: 1, rarity: 'common' }, 30);
  const first = response(), second = response();
  await Promise.all([openSeasonBox(state.req, first), openSeasonBox(state.req, second)]);
  assert.deepEqual([first.code, second.code].sort(), [200, 400]);
  assert.equal(state.stored().gold, 10);
  assert.equal(state.stored().inventory[0].quantity, 1);
});

test('both configuration routes require authentication and root role', () => {
  for (const method of ['get', 'put']) {
    const route = routes.stack.find(layer => layer.route?.path === '/config' && layer.route.methods[method]).route;
    assert.equal(route.stack[0].handle, authMiddleware);
    assert.equal(route.stack[1].handle, isRoot);
  }
});
