import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export const getExams = async (req, res) => {
  try {
    const exams = await Exam.find().sort({ year: -1, phase: 1 });
    const tags = [...new Set(exams.map(exam => exam.tag))];
    const counts = tags.length ? await Question.aggregate([
      { $match: { tags: { $in: tags } } },
      { $project: { examTags: { $setIntersection: ['$tags', tags] } } },
      { $unwind: '$examTags' },
      { $group: { _id: '$examTags', count: { $sum: 1 } } }
    ]) : [];
    const countByTag = new Map(counts.map(entry => [entry._id, entry.count]));
    res.json(exams.map(exam => ({ ...exam.toObject(), questionCount: countByTag.get(exam.tag) || 0 })));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const examStats = async (req, res) => {
    try {
        const { id } = req.params;

        const exam = await Exam.findOneAndUpdate(
            { id: id },
            { $inc: { usage_ctn: 1 } },
            { new: true }
        );

        if (!exam) {
            return res.status(404).json({
                message: 'Exam not found'
            });
        }

        return res.status(200).json({
            usage_ctn: exam.usage_ctn
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Server error'
        });
    }
};

export const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findOne({ id: req.params.id });
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const questions = await Question.find({ tags: exam.tag });
    
    res.json({
      ...exam.toObject(),
      questionCount: questions.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createExam = async (req, res) => {
  try {
    const { id, title, description, duration, totalPoints, tag, year, phase, new_test_badge } = req.body;
    if (!id || !title || !description || !duration || !totalPoints || !tag || !year || !phase) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const existing = await Exam.findOne({ id });
    if (existing) {
      return res.status(400).json({ message: `Exam with id "${id}" already exists` });
    }
    const exam = await Exam.create({ id, title, description, duration: Number(duration), totalPoints: Number(totalPoints), tag, year: Number(year), phase, new_test_badge: !!new_test_badge });
    res.status(201).json({ success: true, exam });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateExam = async (req, res) => {
  try {
    const details = {};
    for (const field of ['id', 'title', 'description', 'tag', 'phase']) {
      if (typeof req.body[field] !== 'string' || !req.body[field].trim()) {
        return res.status(400).json({ message: 'All exam details are required.' });
      }
      details[field] = req.body[field].trim();
    }
    if (/[/?#]/.test(details.id)) {
      return res.status(400).json({ message: 'Exam ID cannot contain /, ? or #.' });
    }
    for (const field of ['duration', 'totalPoints', 'year']) {
      const value = req.body[field];
      const number = Number(value);
      if (!['number', 'string'].includes(typeof value) || !Number.isFinite(number) || number <= 0 ||
          (field === 'year' && !Number.isInteger(number))) {
        return res.status(400).json({ message: 'Duration, total points and year must be positive numbers; year must be an integer.' });
      }
      details[field] = number;
    }
    if (typeof req.body.new_test_badge !== 'boolean') {
      return res.status(400).json({ message: 'Invalid new test badge setting.' });
    }
    details.new_test_badge = req.body.new_test_badge;

    const existing = await Exam.findOne({ id: req.params.id });
    if (!existing) return res.status(404).json({ message: 'Exam not found' });
    const duplicate = await Exam.findOne({ id: details.id, _id: { $ne: existing._id } });
    if (duplicate) return res.status(409).json({ message: 'An exam with this ID already exists.' });
    const exam = await Exam.findOneAndUpdate({ _id: existing._id }, { $set: details }, { new: true, runValidators: true });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json({ success: true, exam });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An exam with this ID already exists.' });
    res.status(error.name === 'ValidationError' ? 400 : 500).json({ message: 'Unable to update exam.', error: error.message });
  }
};

export const bulkAddQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'questions must be a non-empty array' });
    }

    let inserted = 0;
    let skipped = 0;
    const errors = [];

    for (const q of questions) {
      try {
        await Question.create(q);
        inserted++;
      } catch (err) {
        if (err.code === 11000) {
          skipped++;
        } else {
          errors.push({ title: q.title, error: err.message });
        }
      }
    }

    res.json({ success: true, inserted, skipped, errors });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findOneAndDelete({ id });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Delete all questions that have this exam's tag
    await Question.deleteMany({ tags: exam.tag });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
