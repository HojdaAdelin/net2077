import { randomInt, randomUUID } from 'crypto';
import User from '../models/User.js';
import RareDrop from '../models/RareDrop.js';
import SeasonBoxConfig from '../models/SeasonBoxConfig.js';
import { PRIMARY_BOX_ID, validBoxId, loadSeasonBoxes, seasonBoxSummary, seasonBoxImages, buildBoxIdentity, rareDropFilter, loadSeasonBox, publicSeasonBox, seasonBoxCatalog, buildSeasonBox, prizeForTicket, TICKET_TOTAL } from '../utils/seasonBoxConfig.js';

const missingBox = res => res.status(404).json({ message: 'This box no longer exists. Refresh the Season page.' });
const editorPayload = async config => {
  const [catalog, boxes, images] = await Promise.all([seasonBoxCatalog(config), loadSeasonBoxes(), seasonBoxImages()]);
  return { success: true, config, catalog, boxes: boxes.map(seasonBoxSummary), images };
};

export const getSeasonBoxes = async (req, res) => {
  try { res.json({ success: true, boxes: (await loadSeasonBoxes()).map(publicSeasonBox) }); }
  catch { res.status(500).json({ message: 'Unable to load Season Boxes.' }); }
};
export const getSeasonBoxPrizes = async (req, res) => {
  try {
    const config = await loadSeasonBox(req.query.boxId);
    if (!config) return missingBox(res);
    res.json(publicSeasonBox(config));
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to load Season Box.' }); }
};
export const getSeasonBoxConfig = async (req, res) => {
  try {
    const config = await loadSeasonBox(req.query.boxId);
    if (!config) return missingBox(res);
    res.json(await editorPayload(config));
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to load Season Box editor.' }); }
};
export const saveSeasonBoxConfig = async (req, res) => {
  try {
    if (!Number.isSafeInteger(req.body.revision) || req.body.revision < 0) return res.status(400).json({ message: 'Invalid configuration revision. Reload the editor.' });
    const current = await loadSeasonBox(req.body._id ?? PRIMARY_BOX_ID);
    if (!current) return missingBox(res);
    if (current.revision !== req.body.revision) return res.status(409).json({ message: 'This box was changed elsewhere. Reload the editor before saving.' });
    const catalog = await seasonBoxCatalog(current);
    const changes = { ...buildSeasonBox(req.body, catalog), ...buildBoxIdentity(req.body, await seasonBoxImages(), current) };
    const config = await SeasonBoxConfig.findOneAndUpdate({ _id: current._id, revision: req.body.revision },
      { $set: changes, $inc: { revision: 1 } }, { new: true, upsert: current._id === PRIMARY_BOX_ID, runValidators: true }).lean();
    if (!config) return res.status(409).json({ message: 'This box was changed or deleted. Reload the editor.' });
    res.json(await editorPayload(config));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This box was changed elsewhere. Reload the editor before saving.' });
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to save Season Box.' });
  }
};
export const createSeasonBoxConfig = async (req, res) => {
  try {
    const primary = await loadSeasonBox();
    const catalog = await seasonBoxCatalog(primary);
    const changes = { ...buildSeasonBox(req.body, catalog), ...buildBoxIdentity(req.body, await seasonBoxImages()) };
    const config = await SeasonBoxConfig.create({ _id: `box-${randomUUID()}`, ...changes, revision: 0 });
    res.status(201).json(await editorPayload(config.toObject()));
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to create Season Box.' }); }
};
export const deleteSeasonBoxConfig = async (req, res) => {
  try {
    const id = req.params.boxId;
    if (!validBoxId(id)) return res.status(400).json({ message: 'Invalid box ID.' });
    if (id === PRIMARY_BOX_ID) return res.status(400).json({ message: 'The main Season Box cannot be deleted.' });
    if (!Number.isSafeInteger(req.body.revision) || req.body.revision < 0) return res.status(400).json({ message: 'Invalid configuration revision. Reload the editor.' });
    const deleted = await SeasonBoxConfig.findOneAndDelete({ _id: id, revision: req.body.revision });
    if (!deleted) return res.status(409).json({ message: 'This box was changed or deleted. Reload the editor.' });
    res.json(await editorPayload(await loadSeasonBox()));
  } catch { res.status(500).json({ message: 'Unable to delete Season Box.' }); }
};

const snapshotFilter = user => {
  const fields = { gold: 0, inventory: [], 'frames.owned': [], 'frames.active': null,
    'nameEffects.owned': [], 'nameEffects.active': null, 'profileEffects.owned': [], 'profileEffects.active': null };
  return { _id: user._id, $expr: { $and: Object.entries(fields).map(([path, fallback]) => ({
    $eq: [{ $ifNull: [`$${path}`, { $literal: fallback }] },
      { $literal: user.get(path)?.toObject?.() ?? user.get(path) ?? fallback }]
  })) } };
};

export const openSeasonBox = async (req, res) => {
  try {
    const count = Number(req.body?.count ?? 1);
    if (!Number.isInteger(count) || count < 1 || count > 5) return res.status(400).json({ message: 'Choose between 1 and 5 boxes.' });
    const config = await loadSeasonBox(req.body.boxId);
    if (!config) return missingBox(res);
    if (req.body.revision !== config.revision) {
      return res.status(409).json({ ...publicSeasonBox(config), success: false,
        message: 'Season Box rewards or price changed. The contents have been refreshed; please review them and try again.' });
    }
    const totalCost = config.cost * count;
    // Keep one configuration and one draw per box throughout retries.
    const drawn = Array.from({ length: count }, () => {
      const token = randomInt(1, TICKET_TOTAL + 1);
      const prize = prizeForTicket(config.prizes, token);
      return { token, prize };
    });
    for (;;) {
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if ((user.gold || 0) < totalCost) return res.status(400).json({ message: `Insufficient gold. Need ${totalCost}, have ${user.gold || 0}.` });
      const filter = snapshotFilter(user);
      user.gold = (user.gold || 0) - totalCost;
      if (!user.inventory) user.inventory = [];
      for (const field of ['frames', 'nameEffects', 'profileEffects']) {
        if (!user[field]) user[field] = { owned: [], active: null };
        if (!user[field].owned) user[field].owned = [];
      }
      const results = [];
      const rareDrops = [];
      for (const { token, prize } of drawn) {
        let duplicate = false;
        if (prize.type === 'gold') user.gold += prize.amount;
        else if (prize.type === 'item') {
          const quantity = prize.quantity || 1;
          const existing = user.inventory.find(item => item.itemId === prize.itemId);
          if (existing) existing.quantity += quantity;
          else user.inventory.push({ itemId: prize.itemId, name: prize.itemName,
            icon: prize.icon, duration: prize.itemDuration, category: prize.itemCategory, quantity });
        } else {
          const field = { frame: 'frames', nameEffect: 'nameEffects', profileEffect: 'profileEffects' }[prize.type];
          if (!field) throw new Error('Unsupported Season Box reward.');
          const key = prize.frameKey || prize.effectKey;
          if (user[field].owned.includes(key)) {
            user.gold += config.duplicateGold;
            duplicate = true;
          } else {
            user[field].owned.push(key);
            if (!user[field].active) user[field].active = key;
          }
        }
        const chance = (prize.max - prize.min + 1) / 100;
        results.push({ token, id: prize.id, label: duplicate ? `${prize.label} -> ${config.duplicateGold} Gold` : prize.label,
          icon: prize.icon, type: prize.type, amount: prize.amount ?? null, quantity: prize.quantity || 1,
          frameKey: prize.frameKey ?? null, effectKey: prize.effectKey ?? null, rarity: prize.rarity,
          duplicate, duplicateGold: duplicate ? config.duplicateGold : null });
        if (chance <= 5 && !duplicate) rareDrops.push({ boxId: config._id, username: user.username, prizeId: prize.id,
          label: prize.label, icon: prize.icon, type: prize.type, frameKey: prize.frameKey ?? null,
          effectKey: prize.effectKey ?? null, rarity: prize.rarity, chance });
      }
      // Charge and grant rewards together, without overwriting another purchase/open.
      const updated = await User.findOneAndUpdate(filter, { $set: { gold: user.gold, inventory: user.inventory,
        frames: user.frames, nameEffects: user.nameEffects, profileEffects: user.profileEffects } }, { new: true });
      if (!updated) continue;
      try {
        if (rareDrops.length) await RareDrop.insertMany(rareDrops);
        const old = await RareDrop.find(rareDropFilter(config._id)).sort({ droppedAt: -1 }).skip(5);
        if (old.length) await RareDrop.deleteMany({ _id: { $in: old.map(drop => drop._id) } });
      } catch (error) { console.error('[SeasonBox] Rare drop log:', error.message); }
      return res.json({ success: true, results, remainingGold: updated.gold, inventory: updated.inventory,
        frames: updated.frames, nameEffects: updated.nameEffects, profileEffects: updated.profileEffects });
    }
  } catch (error) {
    console.error('[SeasonBox] Error:', error);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to open Season Box.' });
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

export const setActiveProfileEffect = async (req, res) => {
  try {
    const { effect } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (effect !== null && effect !== undefined) {
      if (!user.profileEffects?.owned?.includes(effect)) {
        return res.status(403).json({ message: 'Profile effect not owned' });
      }
    }

    if (!user.profileEffects) user.profileEffects = { owned: [], active: null };
    user.profileEffects.active = effect ?? null;
    await user.save();

    res.json({ success: true, profileEffects: user.profileEffects });
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

export const getRecentRareDrops = async (req, res) => {
  try {
    const id = req.query.boxId ?? PRIMARY_BOX_ID;
    if (!validBoxId(id)) return res.status(400).json({ message: 'Invalid box ID.' });
    const drops = await RareDrop.find(rareDropFilter(id)).sort({ droppedAt: -1 }).limit(5).lean();
    res.json({ success: true, drops });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
