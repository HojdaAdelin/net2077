import test from 'node:test';
import assert from 'node:assert/strict';
import SeasonBoxConfig from '../models/SeasonBoxConfig.js';
import ShopItem from '../models/ShopItem.js';
import SeasonPass from '../models/SeasonPass.js';
import User from '../models/User.js';
import RareDrop from '../models/RareDrop.js';
import { loadSeasonBox, loadSeasonBoxes, publicSeasonBox, buildBoxIdentity, buildSeasonBox, seasonBoxImages, prizeForTicket, rareDropFilter } from './seasonBoxConfig.js';
import { getSeasonBoxes, getSeasonBoxConfig, createSeasonBoxConfig, saveSeasonBoxConfig, deleteSeasonBoxConfig, openSeasonBox, getRecentRareDrops } from '../controllers/seasonBoxController.js';

const reward = amount => ({ id: 'gold', type: 'gold', label: `${amount} Gold`, icon: 'Coins', amount, rarity: 'common', chance: 100, min: 1, max: 10000 });
const box = (id = 'box-extra', changes = {}) => ({ _id: id, name: 'Extra box', image: '/season.png', cost: 75, duplicateGold: 50, revision: 2, prizes: [reward(10)], ...changes });
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
function database(t, configs = []) {
  t.mock.method(SeasonBoxConfig, 'findById', id => ({ lean: async () => configs.find(c => c._id === id) || null }));
  t.mock.method(SeasonBoxConfig, 'find', () => {
    const query = { sort: () => query, select: () => query, lean: async () => configs };
    return query;
  });
  t.mock.method(ShopItem, 'updateOne', async () => ({}));
  t.mock.method(ShopItem, 'find', () => ({ sort: () => ({ lean: async () => [] }) }));
  t.mock.method(SeasonPass, 'find', () => ({ select: () => ({ lean: async () => [] }) }));
  t.mock.method(User, 'distinct', async () => []);
}
function user(t, gold = 1000, owned = []) {
  const account = { _id: 'account', username: 'Learner', gold, inventory: [], frames: { owned, active: owned[0] || null }, nameEffects: { owned: [], active: null }, profileEffects: { owned: [], active: null } };
  account.get = path => path.split('.').reduce((value, key) => value?.[key], account);
  t.mock.method(User, 'findById', async () => account);
  let changes;
  t.mock.method(User, 'findOneAndUpdate', async (filter, update) => { changes = update.$set; return changes; });
  t.mock.method(RareDrop, 'find', () => ({ sort: () => ({ skip: async () => [] }) }));
  return () => changes;
}

test('legacy main box is preserved when the collection has only new boxes', async t => {
  database(t, [box()]);
  const list = await loadSeasonBoxes();
  assert.equal(list.length, 2); assert.equal(list[0]._id, 'season-box'); assert.equal(list[0].image, '/season.png');
  assert.equal(list[1]._id, 'box-extra');
  assert.equal((await loadSeasonBox()).cost, 20);
  assert.equal(await loadSeasonBox('box-missing'), null);
  await assert.rejects(loadSeasonBox({ $ne: null }), /Invalid box ID/);
});
test('saved main box and independently edited boxes are exposed in primary-first order', async t => {
  database(t, [box(), box('season-box', { name: undefined, image: undefined, cost: 30 })]);
  const res = response(); await getSeasonBoxes({}, res);
  assert.equal(res.body.boxes.length, 2); assert.equal(res.body.boxes[0].id, 'season-box');
  assert.equal(res.body.boxes[0].name, 'Season Box'); assert.equal(res.body.boxes[0].cost, 30);
  assert.equal(res.body.boxes[1].cost, 75); assert.equal(res.body.boxes[1].image, '/season.png');
  assert.equal(publicSeasonBox(box()).prizes[0].amount, 10);
});
test('images and names accept only available assets and bounded names', async () => {
  const images = ['/season.png', '/box_silver.webp'];
  assert.deepEqual(buildBoxIdentity({ name: ' Silver ', image: '/box_silver.webp' }, images), { name: 'Silver', image: '/box_silver.webp' });
  for (const image of ['https://example.com/box.png', '/../box_silver.webp', '/unlisted.png']) assert.throws(() => buildBoxIdentity({ name: 'Box', image }, images), /available box image/);
  for (const name of ['', ' '.repeat(5), 'x'.repeat(61), {}]) assert.throws(() => buildBoxIdentity({ name }, images), /Box name/);
  const available = await seasonBoxImages(); assert.equal(available[0], '/season.png');
  assert.ok(available.slice(1).every(path => /^\/box_/.test(path)));
});
test('new box reward distribution still requires all 10,000 tickets', () => {
  const config = buildSeasonBox({ cost: 45, duplicateGold: 12, prizes: [{ ...reward(5), chance: 80 }, { ...reward(25), id: 'rare-gold', chance: 20 }] }, []);
  assert.equal(prizeForTicket(config.prizes, 8000).amount, 5);
  assert.equal(prizeForTicket(config.prizes, 8001).amount, 25);
  assert.equal(prizeForTicket(config.prizes, 10000).amount, 25);
  assert.throws(() => buildSeasonBox({ cost: 45, duplicateGold: 12, prizes: [{ ...reward(5), chance: 99 }] }, []), /exactly 100%/);
});
test('root editor loads the chosen configuration with box list and asset choices', async t => {
  database(t, [box()]);
  const res = response(); await getSeasonBoxConfig({ query: { boxId: 'box-extra' } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.config._id, 'box-extra');
  assert.equal(res.body.boxes[0]._id, 'season-box'); assert.ok(res.body.images.includes('/season.png'));
  const missing = response(); await getSeasonBoxConfig({ query: { boxId: 'missing' } }, missing); assert.equal(missing.statusCode, 404);
});
test('create assigns an independent ID and validates the complete configuration', async t => {
  database(t);
  let inserted;
  t.mock.method(SeasonBoxConfig, 'create', async input => { inserted = input; return { toObject: () => input }; });
  const res = response(); await createSeasonBoxConfig({ body: { ...box(), name: 'New box', revision: 999 } }, res);
  assert.equal(res.statusCode, 201); assert.match(inserted._id, /^box-/); assert.notEqual(inserted._id, 'box-extra');
  assert.equal(inserted.revision, 0); assert.equal(inserted.name, 'New box'); assert.equal(inserted.cost, 75);
});
test('save targets only the selected ID and guards concurrent edits without resurrecting deleted boxes', async t => {
  database(t, [box()]);
  let query, options;
  t.mock.method(SeasonBoxConfig, 'findOneAndUpdate', (filter, update, opts) => { query = filter; options = opts; return { lean: async () => ({ ...box(), ...update.$set, revision: 3 }) }; });
  const res = response(); await saveSeasonBoxConfig({ body: { ...box(), cost: 99 } }, res);
  assert.equal(res.statusCode, 200); assert.deepEqual(query, { _id: 'box-extra', revision: 2 }); assert.equal(options.upsert, false);
  assert.equal(res.body.config.cost, 99);
  const stale = response(); await saveSeasonBoxConfig({ body: { ...box(), revision: 1 } }, stale); assert.equal(stale.statusCode, 409);
  const removed = response(); await saveSeasonBoxConfig({ body: { ...box('removed') } }, removed); assert.equal(removed.statusCode, 404);
});
test('delete uses ID and revision, preserves the main box and never touches user rewards', async t => {
  database(t, [box()]); let deleted;
  t.mock.method(SeasonBoxConfig, 'findOneAndDelete', async filter => { deleted = filter; return box(); });
  const res = response(); await deleteSeasonBoxConfig({ params: { boxId: 'box-extra' }, body: { revision: 2 } }, res);
  assert.equal(res.statusCode, 200); assert.deepEqual(deleted, { _id: 'box-extra', revision: 2 });
  const main = response(); await deleteSeasonBoxConfig({ params: { boxId: 'season-box' }, body: { revision: 2 } }, main); assert.equal(main.statusCode, 400);
  const invalid = response(); await deleteSeasonBoxConfig({ params: { boxId: 'box-extra' }, body: {} }, invalid); assert.equal(invalid.statusCode, 400);
});
test('opening charges the chosen box price and grants its rewards for a multi-open', async t => {
  database(t, [box()]); const changed = user(t);
  const res = response(); await openSeasonBox({ userId: 'account', body: { boxId: 'box-extra', count: 2, revision: 2 } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.results.length, 2);
  assert.equal(res.body.remainingGold, 870); assert.equal(changed().gold, 870);
  assert.ok(res.body.results.every(prize => prize.amount === 10));
});
test('duplicate cosmetics use the selected box compensation', async t => {
  const config = box('box-extra', { prizes: [{ ...reward(10), type: 'frame', frameKey: 'silver-season1', label: 'Silver frame' }] });
  database(t, [config]); user(t, 1000, ['silver-season1']);
  const res = response(); await openSeasonBox({ userId: 'account', body: { boxId: 'box-extra', revision: 2 } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.remainingGold, 975); assert.equal(res.body.results[0].duplicateGold, 50);
});
test('missing, changed or unaffordable boxes cannot charge an account', async t => {
  database(t, [box()]); const changed = user(t, 10);
  for (const [body, status] of [[{ boxId: 'missing', revision: 2 }, 404], [{ boxId: 'box-extra', revision: 1 }, 409], [{ boxId: 'box-extra', revision: 2 }, 400], [{ boxId: 'box-extra', revision: 2, count: 6 }, 400]]) {
    const res = response(); await openSeasonBox({ userId: 'account', body }, res); assert.equal(res.statusCode, status);
    if (status === 409) { assert.equal(res.body.id, 'box-extra'); assert.equal(res.body.cost, 75); }
  }
  assert.equal(changed(), undefined);
});
test('recent drops are scoped to each box and legacy main-box drops remain visible', async t => {
  let filter;
  t.mock.method(RareDrop, 'find', query => { filter = query; return { sort: () => ({ limit: () => ({ lean: async () => [] }) }) }; });
  const res = response(); await getRecentRareDrops({ query: { boxId: 'box-extra' } }, res);
  assert.deepEqual(filter, { boxId: 'box-extra' }); assert.equal(res.statusCode, 200);
  await getRecentRareDrops({ query: {} }, response()); assert.deepEqual(filter, rareDropFilter('season-box'));
  assert.deepEqual(filter.$or[1], { boxId: { $exists: false } });
});
