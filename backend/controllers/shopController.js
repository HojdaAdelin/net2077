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
    await user.save();

    res.json({
      success: true,
      message: `Successfully purchased ${item.name}`,
      item,
      remainingGold: user.gold
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
