import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export const getExams = async (req, res) => {
  try {
    const exams = await Exam.find().sort({ year: -1, phase: 1 });
    res.json(exams);
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
