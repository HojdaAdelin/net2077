import { randomUUID } from 'crypto';
import SeasonBoxConfig from '../models/SeasonBoxConfig.js';
import ShopItem from '../models/ShopItem.js';
import SeasonPass from '../models/SeasonPass.js';
import User from '../models/User.js';
import { DEFAULT_SEASON_BOX } from '../data/seasonBoxDefaults.js';

export const TICKET_TOTAL = 10000;
export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const invalid = message => Object.assign(new Error(message), { status: 400 });
const labelFor = key => key.replace(/[-_]/g, ' ').replace(/\b\w/g, value => value.toUpperCase());

export const loadSeasonBox = async () => await SeasonBoxConfig.findById('season-box').lean() || structuredClone(DEFAULT_SEASON_BOX);

export function prizeForTicket(prizes, ticket) {
  const prize = Number.isInteger(ticket) && ticket >= 1 && ticket <= TICKET_TOTAL &&
    prizes.find(row => ticket >= row.min && ticket <= row.max);
  if (!prize) throw new Error('Season Box has an invalid or uncovered ticket.');
  return prize;
}

export const publicSeasonBox = config => ({
  success: true, cost: config.cost, duplicateGold: config.duplicateGold,
  ticketTotal: TICKET_TOTAL, revision: config.revision,
  prizes: config.prizes.map(({ id, label, icon, type, amount, quantity, frameKey, effectKey, rarity, chance, min, max }) =>
    ({ id, label, icon, type, amount, quantity, frameKey, effectKey, rarity, chance, min, max })),
  frameImageMap: Object.fromEntries(config.prizes.filter(p => p.type === 'frame').map(p => [p.frameKey, `/${p.frameKey}.png`])),
});

export async function seasonBoxCatalog(config) {
  const [items, passes, frames, names, profiles] = await Promise.all([
    ShopItem.find({ $or: [{ category: 'boost' }, { itemId: 'reset_daily' }] }).sort({ order: 1, name: 1 }).lean(),
    SeasonPass.find({}).select('levels bestRewards').lean(),
    User.distinct('frames.owned'), User.distinct('nameEffects.owned'), User.distinct('profileEffects.owned'),
  ]);
  const entries = new Map();
  for (const item of items) {
    if (item.itemId !== 'reset_daily' && !(item.category === 'boost' && item.multiplier > 0 && item.duration > 0)) continue;
    entries.set(`item:${item.itemId}`, { sourceKey: `item:${item.itemId}`, type: 'item',
      label: `${item.name}${item.duration ? ` (${item.duration} min)` : ''}`, icon: item.icon,
      itemId: item.itemId, itemName: item.name, itemCategory: item.category,
      itemDuration: item.duration, itemMultiplier: item.multiplier });
  }
  const addCosmetic = (type, key, label) => {
    if (!['frame', 'nameEffect', 'profileEffect'].includes(type) || typeof key !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(key)) return;
    const sourceKey = `${type}:${key}`;
    if (!entries.has(sourceKey)) entries.set(sourceKey, { sourceKey, type, label: label || labelFor(key),
      icon: type === 'frame' ? 'Frame' : 'Sparkles', ...(type === 'frame' ? { frameKey: key } : { effectKey: key }) });
  };
  // Existing prizes remain available, even when nobody has won them yet.
  for (const prize of [...DEFAULT_SEASON_BOX.prizes, ...config.prizes]) {
    addCosmetic(prize.type, prize.frameKey || prize.effectKey, prize.label);
  }
  for (const pass of passes) {
    const rewards = [...(pass.bestRewards || []), ...(pass.levels || []).flatMap(level => [level.free, level.premium])];
    for (const reward of rewards) if (reward) addCosmetic(reward.type, reward.value, reward.label);
  }
  for (const key of frames) addCosmetic('frame', key);
  for (const key of names) addCosmetic('nameEffect', key);
  for (const key of profiles) addCosmetic('profileEffect', key);
  return [...entries.values()];
}

export function buildSeasonBox(input, catalog) {
  const whole = (value, name, minimum = 0) => {
    if (!['number', 'string'].includes(typeof value) || String(value).trim() === '' ||
        !Number.isSafeInteger(Number(value)) || Number(value) < minimum || Number(value) > 1e9) throw invalid(`Invalid ${name}.`);
    return Number(value);
  };
  const cost = whole(input.cost, 'opening cost');
  const duplicateGold = whole(input.duplicateGold, 'duplicate gold');
  if (!Array.isArray(input.prizes) || !input.prizes.length || input.prizes.length > TICKET_TOTAL) throw invalid('Add at least one reward.');
  const sources = new Map(catalog.map(item => [item.sourceKey, item]));
  const ids = new Set();
  let ticket = 1;
  const prizes = input.prizes.map((row, index) => {
    if (!row || !RARITIES.includes(row.rarity)) throw invalid(`Choose a rarity for reward ${index + 1}.`);
    const chance = Number(row.chance);
    const units = Math.round(chance * 100);
    if (!['number', 'string'].includes(typeof row.chance) || !Number.isFinite(chance) || chance <= 0 || chance > 100 ||
        Math.abs(chance * 100 - units) > 1e-7 || units < 1) throw invalid(`Reward ${index + 1}: enter a chance from 0.01% to 100%, with at most two decimals.`);
    const id = typeof row.id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(row.id) ? row.id : `box-${randomUUID()}`;
    if (ids.has(id)) throw invalid('Reward IDs must be unique.');
    ids.add(id);
    let prize;
    if (row.type === 'gold') {
      const amount = whole(row.amount, 'gold amount', 1);
      prize = { type: 'gold', amount, icon: 'Coins', label: `${amount} Gold` };
    } else {
      const source = sources.get(row.sourceKey);
      if (!source || source.type !== row.type) throw invalid(`Reward ${index + 1}: select an existing item or profile reward.`);
      prize = { ...source };
      if (source.type === 'item') prize.quantity = whole(row.quantity ?? 1, 'item quantity', 1);
    }
    if (typeof row.label === 'string' && row.label.trim()) prize.label = row.label.trim().slice(0, 160);
    const result = { ...prize, id, rarity: row.rarity, chance: units / 100, min: ticket, max: ticket + units - 1 };
    ticket += units;
    return result;
  });
  if (ticket !== TICKET_TOTAL + 1) throw invalid(`Chances must total exactly 100%. Current total: ${((ticket - 1) / 100).toFixed(2)}%.`);
  return { cost, duplicateGold, ticketTotal: TICKET_TOTAL, prizes };
}
