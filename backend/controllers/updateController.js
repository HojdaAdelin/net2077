import Update from '../models/Update.js';

export const getUpdates = async (req, res) => {
  try {
    const updates = await Update.find().sort({ createdAt: -1 });
    res.json({ success: true, updates });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch updates' });
  }
};

export const publishUpdate = async (req, res) => {
  try {
    const { version, date, sections } = req.body;
    if (!version?.trim() || !date?.trim()) {
      return res.status(400).json({ message: 'Version and date are required' });
    }
    const update = await Update.create({
      version: version.trim(),
      date: date.trim(),
      author: req.user.username,
      authorRole: req.user.role,
      sections: {
        features: (sections?.features || []).filter(i => i.trim()),
        improvements: (sections?.improvements || []).filter(i => i.trim()),
        bugFixes: (sections?.bugFixes || []).filter(i => i.trim())
      }
    });
    res.json({ success: true, update });
  } catch {
    res.status(500).json({ message: 'Failed to publish update' });
  }
};

export const deleteUpdate = async (req, res) => {
  try {
    const update = await Update.findByIdAndDelete(req.params.id);
    if (!update) return res.status(404).json({ message: 'Update not found' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Failed to delete update' });
  }
};

export const getWhatsNew = async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.userId).select('lastSeenVersion');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Get all updates sorted newest first
    const allUpdates = await Update.find().sort({ createdAt: -1 });
    if (!allUpdates.length) return res.json({ hasNew: false });

    const latestVersion = allUpdates[0].version;

    // If user already saw the latest version, nothing new
    if (user.lastSeenVersion === latestVersion) {
      return res.json({ hasNew: false });
    }

    // Collect all new updates (everything if lastSeenVersion is null, else newer ones)
    // We compare by createdAt order — updates after the user's last seen version
    let newUpdates = allUpdates;
    if (user.lastSeenVersion) {
      const seenIdx = allUpdates.findIndex(u => u.version === user.lastSeenVersion);
      newUpdates = seenIdx === -1 ? allUpdates : allUpdates.slice(0, seenIdx);
    }

    if (!newUpdates.length) return res.json({ hasNew: false });

    // Merge all sections from new updates into one aggregated object
    const merged = { features: [], improvements: [], bugFixes: [] };
    for (const u of newUpdates) {
      if (u.sections?.features?.length)     merged.features.push(...u.sections.features);
      if (u.sections?.improvements?.length) merged.improvements.push(...u.sections.improvements);
      if (u.sections?.bugFixes?.length)     merged.bugFixes.push(...u.sections.bugFixes);
    }

    res.json({ hasNew: true, latestVersion, sections: merged });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const markSeen = async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    const { version } = req.body;
    await User.findByIdAndUpdate(req.userId, { lastSeenVersion: version });
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
