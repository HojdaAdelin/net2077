import User from '../models/User.js';

// Token range: 1-10000
//
// Distribution:
//   10 gold         1-2400   (24%)
//   reset_daily     2401-4700 (23%)
//   20 gold         4701-6400 (17%)
//   2x XP 10min     6401-7100 (7%)
//   2x XP 20min     7101-7600 (5%)
//   3x XP 10min     7601-7900 (3%)
//   frame_silver    7901-8900 (10%)
//   nameeffect_aw   8901-9100 (2%)
//   frame_gold      9101-9600 (5%)
//   frame_diamond   9601-9900 (3%)
//   500 gold        9901-10000(1%)

export const SEASON_BOX_PRIZES = [
  {
    id: 'gold_10',
    label: '10 Gold',
    icon: 'Coins',
    type: 'gold',
    amount: 10,
    min: 1,
    max: 2400,
  },
  {
    id: 'reset_daily',
    label: 'Reset Daily Challenge',
    icon: 'RotateCcw',
    type: 'item',
    itemId: 'reset_daily',
    itemName: 'Reset Daily Challenge',
    itemCategory: 'reset',
    itemDuration: null,
    min: 2401,
    max: 4700,
  },
  {
    id: 'gold_20',
    label: '20 Gold',
    icon: 'Coins',
    type: 'gold',
    amount: 20,
    min: 4701,
    max: 6400,
  },
  {
    id: '2x_xp_10min',
    label: '2× XP Boost 10min',
    icon: 'Zap',
    type: 'item',
    itemId: '2x_xp_5min',
    itemName: '2x XP Boost',
    itemCategory: 'boost',
    itemDuration: 10,
    itemMultiplier: 2,
    min: 6401,
    max: 7100,
  },
  {
    id: '2x_xp_20min',
    label: '2× XP Boost 20min',
    icon: 'Zap',
    type: 'item',
    itemId: '2x_xp_10min',
    itemName: '2x XP Boost',
    itemCategory: 'boost',
    itemDuration: 20,
    itemMultiplier: 2,
    min: 7101,
    max: 7600,
  },
  {
    id: '3x_xp_10min',
    label: '3× XP Boost 10min',
    icon: 'Sparkles',
    type: 'item',
    itemId: '3x_xp_5min',
    itemName: '3x XP Boost',
    itemCategory: 'boost',
    itemDuration: 10,
    itemMultiplier: 3,
    min: 7601,
    max: 7900,
  },
  {
    id: 'frame_silver_s1',
    label: 'Silver Frame',
    icon: 'Frame',
    type: 'frame',
    frameKey: 'silver-season1',
    rarity: 'silver',
    min: 7901,
    max: 8900,
  },
  {
    id: 'nameeffect_autumn_wave',
    label: 'Autumn Wave',
    icon: 'Sparkles',
    type: 'nameEffect',
    effectKey: 'autumn-wave',
    rarity: 'epic',
    min: 8901,
    max: 9100,
  },
  {
    id: 'frame_gold_s1',
    label: 'Gold Frame',
    icon: 'Frame',
    type: 'frame',
    frameKey: 'gold-season1',
    rarity: 'gold',
    min: 9101,
    max: 9600,
  },
  {
    id: 'frame_diamond_s1',
    label: 'Diamond Frame',
    icon: 'Frame',
    type: 'frame',
    frameKey: 'diamond-season1',
    rarity: 'diamond',
    min: 9601,
    max: 9900,
  },
  {
    id: 'gold_500',
    label: '500 Gold',
    icon: 'Coins',
    type: 'gold',
    amount: 500,
    min: 9901,
    max: 10000,
  },
];

export const FRAME_IMAGE_MAP = {
  'silver-season1':  '/silver-season1.png',
  'gold-season1':    '/gold-season1.png',
  'diamond-season1': '/diamond-season1.png',
};

const OPEN_COST = 20;
const FRAME_DUPLICATE_GOLD = 50;

function getPrizeForToken(token) {
  return SEASON_BOX_PRIZES.find(p => token >= p.min && token <= p.max);
}

export const getSeasonBoxPrizes = async (req, res) => {
  const prizes = SEASON_BOX_PRIZES.map(({ id, label, icon, type, amount, frameKey, effectKey, rarity, min, max }) => ({
    id, label, icon, type,
    amount: amount ?? null,
    frameKey: frameKey ?? null,
    effectKey: effectKey ?? null,
    rarity: rarity ?? null,
    min, max,
  }));
  res.json({ success: true, prizes, cost: OPEN_COST, frameImageMap: FRAME_IMAGE_MAP });
};

export const openSeasonBox = async (req, res) => {
  try {
    const count = Math.min(5, Math.max(1, parseInt(req.body?.count) || 1));

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Normalize fields that may be missing on old accounts
    if (!user.frames)      user.frames      = { owned: [], active: null };
    if (!user.frames.owned) user.frames.owned = [];
    if (!user.nameEffects)       user.nameEffects       = { owned: [], active: null };
    if (!user.nameEffects.owned) user.nameEffects.owned = [];
    if (user.gold === undefined || user.gold === null) user.gold = 0;

    const totalCost = OPEN_COST * count;
    if (user.gold < totalCost) {
      return res.status(400).json({
        message: `Insufficient gold. Need ${totalCost}, have ${user.gold}.`,
      });
    }

    user.gold -= totalCost;

    const results = [];

    for (let i = 0; i < count; i++) {
      const token = Math.floor(Math.random() * 10000) + 1;
      const prize = getPrizeForToken(token);
      if (!prize) continue;

      let duplicate = false;

      if (prize.type === 'gold') {
        user.gold += prize.amount;
      } else if (prize.type === 'item') {
        if (!user.inventory) user.inventory = [];
        const existing = user.inventory.find(inv => inv.itemId === prize.itemId);
        if (existing) {
          existing.quantity += 1;
        } else {
          user.inventory.push({
            itemId: prize.itemId,
            name: prize.itemName,
            icon: prize.icon,
            duration: prize.itemDuration ?? undefined,
            category: prize.itemCategory,
            quantity: 1,
          });
        }
      } else if (prize.type === 'frame') {
        if (user.frames.owned.includes(prize.frameKey)) {
          user.gold += FRAME_DUPLICATE_GOLD;
          duplicate = true;
        } else {
          user.frames.owned.push(prize.frameKey);
          if (!user.frames.active) user.frames.active = prize.frameKey;
        }
      } else if (prize.type === 'nameEffect') {
        if (user.nameEffects.owned.includes(prize.effectKey)) {
          user.gold += FRAME_DUPLICATE_GOLD;
          duplicate = true;
        } else {
          user.nameEffects.owned.push(prize.effectKey);
          if (!user.nameEffects.active) user.nameEffects.active = prize.effectKey;
        }
      }

      results.push({
        token,
        id: prize.id,
        label: duplicate ? `${prize.label} → ${FRAME_DUPLICATE_GOLD} Gold` : prize.label,
        icon: prize.icon,
        type: prize.type,
        amount: prize.amount ?? null,
        frameKey: prize.frameKey ?? null,
        effectKey: prize.effectKey ?? null,
        rarity: prize.rarity ?? null,
        duplicate,
        duplicateGold: duplicate ? FRAME_DUPLICATE_GOLD : null,
      });
    }

    await user.save();

    res.json({
      success: true,
      results,
      remainingGold: user.gold,
      inventory: user.inventory,
      frames: user.frames,
      nameEffects: user.nameEffects,
    });
  } catch (error) {
    console.error('[SeasonBox] Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const setActiveNameEffect = async (req, res) => {
  try {
    const { effect } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (effect !== null && effect !== undefined) {
      if (!user.nameEffects?.owned?.includes(effect)) {
        return res.status(403).json({ message: 'Name effect not owned' });
      }
    }

    if (!user.nameEffects) user.nameEffects = { owned: [], active: null };
    user.nameEffects.active = effect ?? null;
    await user.save();

    res.json({ success: true, nameEffects: user.nameEffects });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const setActiveFrame = async (req, res) => {
  try {
    const { frame } = req.body; 

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (frame !== null && frame !== undefined) {
      if (!user.frames?.owned?.includes(frame)) {
        return res.status(403).json({ message: 'Frame not owned' });
      }
    }

    if (!user.frames) user.frames = { owned: [], active: null };
    user.frames.active = frame ?? null;
    await user.save();

    res.json({ success: true, frames: user.frames });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
