import BuildNote from '../models/BuildNote.js';
import User from '../models/User.js';

const isRoot = async (userId) => {
  const user = await User.findById(userId).select('role');
  return user?.role === 'root';
};

export const getBuildNote = async (req, res) => {
  try {
    const note = await BuildNote.findOne().sort({ createdAt: -1 });
    res.json({ note: note || null });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const setBuildNote = async (req, res) => {
  try {
    if (!await isRoot(req.userId)) return res.status(403).json({ message: 'Access denied' });

    const { features } = req.body;
    if (!Array.isArray(features) || features.length === 0) {
      return res.status(400).json({ message: 'At least one feature is required' });
    }

    // Only one note at a time - delete existing
    await BuildNote.deleteMany({});

    const note = new BuildNote({ features });
    await note.save();

    res.json({ note });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteBuildNote = async (req, res) => {
  try {
    if (!await isRoot(req.userId)) return res.status(403).json({ message: 'Access denied' });
    await BuildNote.deleteMany({});
    res.json({ message: 'Build note removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
