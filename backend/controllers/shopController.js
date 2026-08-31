import ShopItem from '../models/ShopItem.js';
import User from '../models/User.js';

export const getShopItems = async (req, res) => {
  try {
    const items = await ShopItem.find({ isActive: true }).sort({ order: 1 });
    
    const specialOffers = items.filter(item => item.isSpecialOffer);
    const regularItems = items.filter(item => !item.isSpecialOffer);

    res.json({
      success: true,
      specialOffers,
      regularItems
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const purchaseItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const item = await ShopItem.findOne({ itemId, isActive: true });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (user.gold < item.price) {
      return res.status(400).json({ 
        message: 'Insufficient gold',
        required: item.price,
        current: user.gold
      });
    }

    if (item.category === 'addon' && item.privilegeLevel != null) {
      const PRIVILEGE_LEVELS = [1.2, 1.4, 1.6, 1.8, 2.0];
      const currentPrivilege = user.xpPrivilege || 1.0;

      const currentIndex = currentPrivilege <= 1.0
        ? -1
        : PRIVILEGE_LEVELS.findIndex(l => Math.abs(l - currentPrivilege) < 0.001);

      const targetIndex = PRIVILEGE_LEVELS.findIndex(l => Math.abs(l - item.multiplier) < 0.001);

      if (targetIndex === -1) {
        return res.status(400).json({ message: 'Invalid privilege level.' });
      }
      if (currentIndex >= targetIndex) {
        return res.status(400).json({
          message: `You already have XP Privilege ${currentPrivilege}x or higher.`
        });
      }
      if (targetIndex !== currentIndex + 1) {
        return res.status(400).json({
          message: `You must purchase levels in order. Next available: ${PRIVILEGE_LEVELS[currentIndex + 1]}x`
        });
      }

      user.gold -= item.price;
      user.xpPrivilege = item.multiplier;

      await user.save();

      return res.json({
        success: true,
        message: `XP Privilege upgraded to ${item.multiplier}x! All future XP will be multiplied permanently.`,
        item,
        remainingGold: user.gold,
        inventory: user.inventory,
        xpPrivilege: user.xpPrivilege
      });
    }

    user.gold -= item.price;
    
    if (!user.inventory) {
      user.inventory = [];
    }
    
    const existingItem = user.inventory.find(inv => inv.itemId === item.itemId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.inventory.push({
        itemId: item.itemId,
        name: item.name,
        icon: item.icon,
        duration: item.duration,
        category: item.category,
        quantity: 1
      });
    }
    
    await user.save();

    res.json({
      success: true,
      message: `Successfully purchased ${item.name}`,
      item,
      remainingGold: user.gold,
      inventory: user.inventory
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const useItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const inventoryItem = user.inventory?.find(inv => inv.itemId === itemId);
    if (!inventoryItem || inventoryItem.quantity <= 0) {
      return res.status(400).json({ message: 'Item not in inventory' });
    }

    const item = await ShopItem.findOne({ itemId });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Clean expired boosts
    user.activeBoosts = user.activeBoosts?.filter(boost => boost.expiresAt > new Date()) || [];

    if (itemId === 'reset_daily') {
      user.dailyChallenge.lastCompleted = null;
      user.dailyChallenge.lastScore = 0;
      user.dailyChallenge.lastTotalPoints = 0;
      
      inventoryItem.quantity -= 1;
      if (inventoryItem.quantity === 0) {
        user.inventory = user.inventory.filter(inv => inv.itemId !== itemId);
      }
      
      await user.save();
      
      return res.json({
        success: true,
        message: 'Daily challenge reset successfully',
        inventory: user.inventory,
        activeBoosts: user.activeBoosts
      });
    }

    // Handle XP boost items
    if (item.category === 'boost' && item.multiplier) {
      // Check if user already has an active XP boost
      const hasActiveXPBoost = user.activeBoosts?.some(boost => 
        boost.type === 'xp_multiplier' && boost.expiresAt > new Date()
      );

      if (hasActiveXPBoost) {
        return res.status(400).json({ 
          message: 'You already have an active XP boost. Wait for it to expire before using another.' 
        });
      }

      // Add new boost
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + item.duration);

      if (!user.activeBoosts) {
        user.activeBoosts = [];
      }

      user.activeBoosts.push({
        type: 'xp_multiplier',
        multiplier: item.multiplier,
        expiresAt,
        itemId: item.itemId
      });

      inventoryItem.quantity -= 1;
      if (inventoryItem.quantity === 0) {
        user.inventory = user.inventory.filter(inv => inv.itemId !== itemId);
      }

      await user.save();

      return res.json({
        success: true,
        message: `${item.multiplier}x XP boost activated for ${item.duration} minutes!`,
        inventory: user.inventory,
        activeBoosts: user.activeBoosts
      });
    }

    res.status(400).json({ message: 'Item functionality not implemented yet' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getInventory = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('inventory activeBoosts');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const activeBoosts = user.activeBoosts?.filter(boost => boost.expiresAt > now) || [];
    
    if (activeBoosts.length !== (user.activeBoosts?.length || 0)) {
      user.activeBoosts = activeBoosts;
      await user.save();
    }

    res.json({
      success: true,
      inventory: user.inventory || [],
      activeBoosts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const calculateXPWithBoosts = async (userId, baseXP) => {
  try {
    const user = await User.findById(userId).select('activeBoosts xpPrivilege');
    if (!user) return baseXP;

    const now = new Date();
    const activeBoosts = user.activeBoosts?.filter(boost => boost.expiresAt > now) || [];

    if (activeBoosts.length !== (user.activeBoosts?.length || 0)) {
      user.activeBoosts = activeBoosts;
      await user.save();
    }

    const privilege = (user.xpPrivilege && user.xpPrivilege > 1.0) ? user.xpPrivilege : 1.0;
    let xp = privilege > 1.0 ? Math.ceil(baseXP * privilege) : baseXP;

    const xpBoost = activeBoosts.find(boost => boost.type === 'xp_multiplier');
    if (xpBoost) {
      xp = Math.ceil(xp * xpBoost.multiplier);
    }

    return xp;
  } catch (error) {
    console.error('Error calculating XP with boosts:', error);
    return baseXP;
  }
};

export const transferGold = async (req, res) => {
  try {
    const senderId = req.userId;
    const { recipientUsername, amount } = req.body;

    // Validate input types
    const parsedAmount = parseInt(amount, 10);
    if (!recipientUsername || typeof recipientUsername !== 'string') {
      return res.status(400).json({ message: 'Invalid recipient username.' });
    }
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive integer.' });
    }
    if (parsedAmount > 1_000_000) {
      return res.status(400).json({ message: 'Amount exceeds maximum transfer limit.' });
    }

    const sender = await User.findById(senderId);
    if (!sender) return res.status(404).json({ message: 'Sender not found.' });

    // Can't send to yourself
    if (sender.username.toLowerCase() === recipientUsername.trim().toLowerCase()) {
      return res.status(400).json({ message: 'You cannot send gold to yourself.' });
    }

    // Check sender has enough gold (strict server-side check)
    if (!sender.gold || sender.gold < parsedAmount) {
      return res.status(400).json({
        message: `Insufficient gold. You have ${sender.gold || 0} gold.`
      });
    }

    const recipient = await User.findOne({
      username: { $regex: new RegExp(`^${recipientUsername.trim()}$`, 'i') }
    });
    if (!recipient) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Apply 10% commission (floor)
    const commission = Math.floor(parsedAmount * 0.1);
    const received = parsedAmount - commission;

    // Atomic update to prevent race conditions
    const updatedSender = await User.findOneAndUpdate(
      { _id: senderId, gold: { $gte: parsedAmount } },
      { $inc: { gold: -parsedAmount } },
      { new: true }
    );

    if (!updatedSender) {
      return res.status(400).json({ message: 'Insufficient gold or concurrent transaction error.' });
    }

    await User.findByIdAndUpdate(recipient._id, { $inc: { gold: received } });

    res.json({
      success: true,
      sent: parsedAmount,
      received,
      commission,
      remainingGold: updatedSender.gold
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Win chance: 2x→49%, 3x→32%, 5x→19%, 10x→9.5%, 25x→3.8%, 50x→1.9%, 100x→0.95%, 200x→0.5%, 500x→0.2%, 1000x→0.1%
const GAMBLE_TABLE = {
  2: 49.0, 3: 32.0, 5: 19.0, 10: 9.5, 25: 3.8,
  50: 1.9, 100: 0.95, 200: 0.5, 500: 0.2, 1000: 0.1,
};
const MAX_GAMBLE = 100_000;
const lastGambleTime = new Map();

export const gambleGold = async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, multiplier } = req.body;

    const parsedAmount = Math.floor(Number(amount));
    const parsedMultiplier = Number(multiplier);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !Number.isInteger(parsedAmount)) {
      return res.status(400).json({ message: 'Amount must be a positive integer.' });
    }
    if (parsedAmount > MAX_GAMBLE) {
      return res.status(400).json({ message: `Maximum gamble is ${MAX_GAMBLE.toLocaleString()} gold.` });
    }
    if (!GAMBLE_TABLE[parsedMultiplier]) {
      return res.status(400).json({ message: 'Invalid multiplier.' });
    }

    const now = Date.now();
    if (now - (lastGambleTime.get(userId) || 0) < 3000) {
      return res.status(429).json({ message: 'Please wait before gambling again.' });
    }
    lastGambleTime.set(userId, now);

    const user = await User.findOneAndUpdate(
      { _id: userId, gold: { $gte: parsedAmount } },
      { $inc: { gold: -parsedAmount } },
      { new: true }
    );
    if (!user) {
      return res.status(400).json({ message: 'Insufficient gold.' });
    }

    const chance = GAMBLE_TABLE[parsedMultiplier];
    const roll = Math.random() * 100;
    const won = roll < chance;

    let goldAfter = user.gold;
    if (won) {
      const updated = await User.findByIdAndUpdate(
        userId,
        { $inc: { gold: parsedAmount * parsedMultiplier } },
        { new: true }
      );
      goldAfter = updated.gold;
    }

    res.json({
      success: true,
      won,
      chance,
      multiplier: parsedMultiplier,
      amount: parsedAmount,
      payout: won ? parsedAmount * parsedMultiplier : 0,
      goldAfter,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
