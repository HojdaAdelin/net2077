import Question from '../models/Question.js';
import User from '../models/User.js';
import { recommendQuestions, recommendationFilter } from '../utils/questionRecommendations.js';
import { publicQuestion } from '../utils/questionValidation.js';

export async function getRecommendedQuestions(req, res) {
  try {
    const filter = recommendationFilter(req.query);
    const user = await User.findById(req.userId).select('solvedQuestions quizPerformance');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const [candidates, solved] = await Promise.all([
      Question.find({ ...filter, _id: { $nin: user.solvedQuestions } }).select('_id tags type difficulty').lean(),
      Question.find({ ...filter, _id: { $in: user.solvedQuestions } }).select('_id tags type difficulty').lean(),
    ]);
    const category = typeof req.query.tags === 'string' && !req.query.tags.includes(',') ? req.query.tags : req.query.type === 'acadnet' ? 'ACADNET' : undefined;
    const selected = recommendQuestions(candidates, { solved, performance: user.quizPerformance, category });
    const questions = await Question.find({ _id: { $in: selected.map(q => q._id) } }).lean();
    const byId = new Map(questions.map(q => [String(q._id), q]));
    res.json(selected.map(q => byId.get(String(q._id))).filter(Boolean).map(publicQuestion));
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to load recommended questions.' }); }
}
