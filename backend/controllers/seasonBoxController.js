import User from '../models/User.js';

// ── Season Box Prize Table ──────────────────────────────────────────────────
// Token range: 1-10000 (inclusive). All ranges together = 10000 = 100%.
// To add new prizes: add an entry with { min, max, ... } — ranges must not overlap.
// Rarity order (most → least common):
//   5 gold       1-3000   (30%)
//   reset_daily  3001-6000 (30%)
//   10 gold      6001-7500 (15%)
//   15 gold      7501-8500 (10%)
//   2x 10min     8501-9300 (8%)
//   2x 20min     9301-9750 (4.5%)
//   3x 10min     9751-10000(2.5%)

export const SEASON_BOX_PRIZES = [
  {
    id: 'gold_5',
    label: '5 Gold',
    icon: 'Coins',
    type: 'gold',
    amount: 5,
    min: 1,
    max: 3000,
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
    min: 3001,
    max: 6000,
  },
  {
    id: 'gold_10',
    label: '10 Gold',
    icon: 'Coins',
    type: 'gold',
    amount: 10,
    min: 6001,
    max: 7500,
  },
  {
    id: 'gold_15',
    label: '15 Gold',
    icon: 'Coins',
    type: 'gold',
    amount: 15,
    min: 7501,
    max: 8500,
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
    min: 8501,
    max: 9300,
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
    min: 9301,
    max: 9750,
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
    min: 9751,
    max: 10000,
  },
];

const OPEN_COST = 20;

// Returns the prize object for a given token (1-10000)
function getPrizeForToken(token) {
  return SEASON_BOX_PRIZES.find(p => token >= p.min && token <= p.max);
}

// GET /api/season-box/prizes — public, returns the prize table for the frontend animation
export const getSeasonBoxPrizes = async (req, res) => {
  const prizes = SEASON_BOX_PRIZES.map(({ id, label, icon, type, amount, min, max }) => ({
    id, label, icon, type, amount: amount ?? null, min, max,
  }));
  res.json({ success: true, prizes, cost: OPEN_COST });
};

// POST /api/season-box/open — authenticated
export const openSeasonBox = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if ((user.gold ?? 0) < OPEN_COST) {
      return res.status(400).json({
        message: `Insufficient gold. Need ${OPEN_COST}, have ${user.gold ?? 0}.`,
      });
    }

    // Deduct cost
    user.gold -= OPEN_COST;

    // Roll
    const token = Math.floor(Math.random() * 10000) + 1; // 1-10000
    const prize = getPrizeForToken(token);

    if (!prize) {
      // Fallback safety — should never happen if ranges are correct
      await user.save();
      return res.status(500).json({ message: 'Prize lookup failed. Gold refunded next request.' });
    }

    // Apply reward
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
    }

    await user.save();

    res.json({
      success: true,
      token,
      prize: {
        id: prize.id,
        label: prize.label,
        icon: prize.icon,
        type: prize.type,
        amount: prize.amount ?? null,
      },
      remainingGold: user.gold,
      inventory: user.inventory,
    });
  } catch (error) {
    console.error('[SeasonBox] Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
