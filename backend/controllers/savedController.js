import User from '../models/User.js';
import Question from '../models/Question.js';
import Lesson from '../models/Lesson.js';

export const getSaved = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('saved');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ saved: user.saved || [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const toggleSave = async (req, res) => {
  try {
    const { itemId, type, title } = req.body;

    if (!itemId || !type || !['question', 'lesson'].includes(type)) {
      return res.status(400).json({ message: 'Invalid data' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.saved) user.saved = [];

    const existingIndex = user.saved.findIndex(
      s => s.itemId.toString() === itemId.toString() && s.type === type
    );

    let saved;
    if (existingIndex !== -1) {
      // unsave
      user.saved.splice(existingIndex, 1);
      saved = false;
    } else {
      // check limit
      if (user.saved.length >= 10) {
        return res.status(400).json({ 
          message: 'You have reached the limit of 10 saved items. Remove something first.' 
        });
      }
      // save
      user.saved.push({ itemId, type, title, savedAt: new Date() });
      saved = true;
    }

    await user.save();

    res.json({ success: true, saved, savedItems: user.saved });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
