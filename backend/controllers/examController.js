import Exam from '../models/Exam.js';
import Question from '../models/Question.js';

export const getExams = async (req, res) => {
  try {
    const exams = await Exam.find().sort({ year: -1, phase: 1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findOne({ id: req.params.id });
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Get questions for this exam
    const questions = await Question.find({ tags: exam.tag });
    
    res.json({
      ...exam.toObject(),
      questionCount: questions.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
