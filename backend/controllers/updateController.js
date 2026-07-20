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
