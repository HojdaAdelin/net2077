import SeasonPass from '../models/SeasonPass.js';
import User from '../models/User.js';

// ─── Admin: create a new season pass ─────────────────────────────────────────
export const createSeasonPass = async (req, res) => {
  try {
    const { name, hasPremium, premiumCost, totalLevels, xpPerLevel, levels } = req.body;
    if (!name || !totalLevels) return res.status(400).json({ message: 'name and totalLevels required' });

    const last = await SeasonPass.findOne().sort({ number: -1 });
    const number = last ? last.number + 1 : 1;

    const pass = new SeasonPass({
      number,
      name,
      hasPremium: hasPremium !== undefined ? hasPremium : true,
      premiumCost: premiumCost ?? 200,
      totalLevels: totalLevels ?? 10,
      xpPerLevel: xpPerLevel ?? 100,
      levels: levels || [],
      isActive: false,
    });

    await pass.save();
    res.json({ success: true, pass });
  } catch (err) {
    console.error('[SeasonPass] create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Admin: update an existing pass ──────────────────────────────────────────
export const updateSeasonPass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, hasPremium, premiumCost, totalLevels, xpPerLevel, levels, isActive } = req.body;

    const pass = await SeasonPass.findById(id);
    if (!pass) return res.status(404).json({ message: 'Pass not found' });

    if (name !== undefined)         pass.name = name;
    if (hasPremium !== undefined)   pass.hasPremium = hasPremium;
    if (premiumCost !== undefined)  pass.premiumCost = premiumCost;
    if (totalLevels !== undefined)  pass.totalLevels = totalLevels;
    if (xpPerLevel !== undefined)   pass.xpPerLevel = xpPerLevel;
    if (levels !== undefined)       pass.levels = levels;
    if (isActive !== undefined) {
      // Only one pass can be active at a time
      if (isActive) await SeasonPass.updateMany({ _id: { $ne: id } }, { isActive: false });
      pass.isActive = isActive;
    }

    await pass.save();
    res.json({ success: true, pass });
  } catch (err) {
    console.error('[SeasonPass] update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Admin: list all passes ───────────────────────────────────────────────────
export const listSeasonPasses = async (req, res) => {
  try {
    const passes = await SeasonPass.find().sort({ number: -1 });
    res.json({ success: true, passes });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Admin: delete a pass ─────────────────────────────────────────────────────
export const deleteSeasonPass = async (req, res) => {
  try {
    const { id } = req.params;
    await SeasonPass.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Public: get active pass + user progress ─────────────────────────────────
export const getActivePass = async (req, res) => {
  try {
    const pass = await SeasonPass.findOne({ isActive: true });
    if (!pass) return res.json({ success: true, pass: null });

    let userProgress = null;
    if (req.userId) {
      const user = await User.findById(req.userId).select('seasonPass');
      if (user) {
        const sp = user.seasonPass || {};
        // If user is linked to a different pass, reset progress for new pass
        const isSamePass = sp.passId?.toString() === pass._id.toString();
        userProgress = {
          xp: isSamePass ? (sp.xp || 0) : 0,
          level: isSamePass ? (sp.level || 0) : 0,
          isPremium: isSamePass ? (sp.isPremium || false) : false,
          claimedLevels: isSamePass ? (sp.claimedLevels || { free: [], premium: [] }) : { free: [], premium: [] },
        };
      }
    }

    res.json({ success: true, pass, userProgress });
  } catch (err) {
    console.error('[SeasonPass] getActive error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Collect a reward ────────────────────────────────────────────────────────
export const collectReward = async (req, res) => {
  try {
    const { level, tier } = req.body;
    if (!level || !tier) return res.status(400).json({ message: 'level and tier required' });
    if (!['free', 'premium'].includes(tier)) return res.status(400).json({ message: 'invalid tier' });

    const pass = await SeasonPass.findOne({ isActive: true });
    if (!pass) return res.status(404).json({ message: 'No active pass' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const sp = user.seasonPass || {};
    const isSamePass = sp.passId?.toString() === pass._id.toString();
    if (!isSamePass || (sp.level ?? 0) < level) {
      return res.status(400).json({ message: 'Level not reached yet' });
    }

    if (tier === 'premium' && !sp.isPremium) {
      return res.status(403).json({ message: 'Premium track not unlocked' });
    }

    const claimedArr = tier === 'free'
      ? (sp.claimedLevels?.free ?? [])
      : (sp.claimedLevels?.premium ?? []);

    if (claimedArr.includes(level)) {
      return res.status(400).json({ message: 'Already claimed' });
    }

    // Find the reward
    const levelEntry = pass.levels?.find(l => l.level === level);
    const reward = levelEntry?.[tier];

    // Apply reward
    if (reward && reward.type !== 'none') {
      if (reward.type === 'gold') {
        user.gold = (user.gold || 0) + Number(reward.value || 0);
      } else if (reward.type === 'frame') {
        // Add frame to user's owned frames
        if (!user.frames) user.frames = { owned: [], active: null };
        if (!user.frames.owned) user.frames.owned = [];
        const frameKey = reward.value;
        if (frameKey && !user.frames.owned.includes(frameKey)) {
          user.frames.owned.push(frameKey);
        }
      } else if (reward.type === 'nameEffect') {
        // Add name effect to user's owned effects
        if (!user.nameEffects) user.nameEffects = { owned: [], active: null };
        if (!user.nameEffects.owned) user.nameEffects.owned = [];
        const effectKey = reward.value;
        if (effectKey && !user.nameEffects.owned.includes(effectKey)) {
          user.nameEffects.owned.push(effectKey);
        }
      }
      // Other reward types (item) can be implemented later
    }

    // Mark as claimed
    if (!user.seasonPass.claimedLevels) {
      user.seasonPass.claimedLevels = { free: [], premium: [] };
    }
    if (tier === 'free') {
      user.seasonPass.claimedLevels.free = [...(user.seasonPass.claimedLevels.free || []), level];
    } else {
      user.seasonPass.claimedLevels.premium = [...(user.seasonPass.claimedLevels.premium || []), level];
    }
    user.markModified('seasonPass');
    await user.save();

    res.json({ success: true, gold: user.gold });
  } catch (err) {
    console.error('[SeasonPass] collect error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// ─── Buy premium track ────────────────────────────────────────────────────────
export const buyPremium = async (req, res) => {
  try {
    const pass = await SeasonPass.findOne({ isActive: true });
    if (!pass) return res.status(404).json({ message: 'No active pass' });
    if (!pass.hasPremium) return res.status(400).json({ message: 'This pass has no premium track' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const sp = user.seasonPass || {};
    const isSamePass = sp.passId?.toString() === pass._id.toString();
    if (isSamePass && sp.isPremium) {
      return res.status(400).json({ message: 'Already own premium' });
    }

    if ((user.gold || 0) < pass.premiumCost) {
      return res.status(400).json({ message: `Not enough gold. Need ${pass.premiumCost}, have ${user.gold || 0}` });
    }

    user.gold = (user.gold || 0) - pass.premiumCost;

    if (!isSamePass) {
      user.seasonPass = {
        passId: pass._id,
        xp: 0,
        level: 0,
        isPremium: true,
        claimedLevels: { free: [], premium: [] },
      };
    } else {
      user.seasonPass.isPremium = true;
    }

    user.markModified('seasonPass');
    await user.save();

    res.json({ success: true, gold: user.gold, isPremium: true });
  } catch (err) {
    console.error('[SeasonPass] buyPremium error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Root: add test XP to own pass (no global XP change) ────────────────────
export const addTestXP = async (req, res) => {
  try {
    const { amount, username } = req.body;
    const xp = Number(amount);
    if (!xp || xp <= 0) return res.status(400).json({ message: 'amount must be > 0' });

    const pass = await SeasonPass.findOne({ isActive: true });
    if (!pass) return res.status(404).json({ message: 'No active pass' });

    // Target: the calling root user, or a specific username if provided
    const User_ = User;
    const target = username
      ? await User_.findOne({ username })
      : await User_.findById(req.userId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    if (!target.seasonPass) {
      target.seasonPass = { passId: pass._id, xp: 0, level: 0, isPremium: false, claimedLevels: { free: [], premium: [] } };
    }

    const isSamePass = target.seasonPass.passId?.toString() === pass._id.toString();
    if (!isSamePass) {
      target.seasonPass = { passId: pass._id, xp: 0, level: 0, isPremium: false, claimedLevels: { free: [], premium: [] } };
    }

    target.seasonPass.xp = (target.seasonPass.xp || 0) + xp;
    const maxXP_ = pass.totalLevels * pass.xpPerLevel;
    target.seasonPass.xp = Math.min(target.seasonPass.xp, maxXP_);
    target.seasonPass.level = Math.min(Math.floor(target.seasonPass.xp / pass.xpPerLevel), pass.totalLevels);
    target.markModified('seasonPass');
    await target.save();

    res.json({ success: true, xp: target.seasonPass.xp, level: target.seasonPass.level });
  } catch (err) {
    console.error('[SeasonPass] addTestXP error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const trackSeasonPassXP = async (userId, xpGained) => {
  try {
    const pass = await SeasonPass.findOne({ isActive: true });
    if (!pass) return;

    const user = await User.findById(userId);
    if (!user) return;

    if (!user.seasonPass) user.seasonPass = { xp: 0, level: 0, isPremium: false, claimedLevels: { free: [], premium: [] } };

    const isSamePass = user.seasonPass.passId?.toString() === pass._id.toString();
    if (!isSamePass) {
      // New season started — reset
      user.seasonPass = {
        passId: pass._id,
        xp: 0,
        level: 0,
        isPremium: false,
        claimedLevels: { free: [], premium: [] },
      };
    }

    user.seasonPass.xp = (user.seasonPass.xp || 0) + xpGained;
    const maxXP   = pass.totalLevels * pass.xpPerLevel;
    user.seasonPass.xp = Math.min(user.seasonPass.xp, maxXP);
    const newLevel = Math.min(Math.floor(user.seasonPass.xp / pass.xpPerLevel), pass.totalLevels);
    user.seasonPass.level = newLevel;
    user.markModified('seasonPass');
    await user.save();
  } catch (err) {
    console.error('[SeasonPass] trackXP error:', err);
  }
};
