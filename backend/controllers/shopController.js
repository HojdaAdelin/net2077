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

    // Clean expired boosts
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

// Helper function to calculate XP with active boosts
export const calculateXPWithBoosts = async (userId, baseXP) => {
  try {
    const user = await User.findById(userId).select('activeBoosts');
    if (!user) return baseXP;

    // Clean expired boosts
    const now = new Date();
    const activeBoosts = user.activeBoosts?.filter(boost => boost.expiresAt > now) || [];
    
    // Update user if boosts were cleaned
    if (activeBoosts.length !== (user.activeBoosts?.length || 0)) {
      user.activeBoosts = activeBoosts;
      await user.save();
    }

    // Find highest XP multiplier
    const xpBoost = activeBoosts.find(boost => boost.type === 'xp_multiplier');
    if (xpBoost) {
      return Math.floor(baseXP * xpBoost.multiplier);
    }

    return baseXP;
  } catch (error) {
    console.error('Error calculating XP with boosts:', error);
    return baseXP;
  }
};
