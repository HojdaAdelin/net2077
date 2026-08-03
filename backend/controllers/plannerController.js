import PlannerTask from '../models/PlannerTask.js';

export const getTasks = async (req, res) => {
  try {
    const tasks = await PlannerTask.find().sort({ createdAt: -1 });
    res.json({ tasks });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createTask = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Text is required' });
    const task = new PlannerTask({ text: text.trim() });
    await task.save();
    res.json({ task });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleTask = async (req, res) => {
  try {
    const task = await PlannerTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date() : null;
    await task.save();
    res.json({ task });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTask = async (req, res) => {
  try {
    await PlannerTask.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
