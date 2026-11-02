import { readFileSync } from 'fs';
import ShopItem from '../models/ShopItem.js';

// The legacy 2x_xp_5min ID represents a 10-minute boost and must keep its duration.
export const COMMON_XP_BOOST = JSON.parse(
  readFileSync(new URL('../data/shop.json', import.meta.url), 'utf8')
).find(item => item.itemId === '2x_xp_5min_common');

export async function ensureCommonBoost() {
  try {
    await ShopItem.updateOne({ itemId: COMMON_XP_BOOST.itemId },
      { $setOnInsert: COMMON_XP_BOOST }, { upsert: true, runValidators: true });
  } catch (error) {
    // Another request may insert the same unique item while this one is running.
    if (error.code !== 11000) throw error;
  }
}
