import Terminal from '../models/Terminal.js';
import TerminalCategory from '../models/TerminalCategory.js';
import { terminalId, terminalProblemInput, terminalCategoryInput } from '../utils/terminalValidation.js';

const respondError = (res, error) => res.status(error.status || 500).json({
  message: error.status ? error.message : 'Unable to update terminal content. Please try again.',
});

export const getTerminalAdmin = async (req, res) => {
  try {
    const [problems, categories] = await Promise.all([
      Terminal.find().sort({ order: 1, _id: 1 }).lean(),
      TerminalCategory.find().sort({ createdAt: 1, _id: 1 }).lean(),
    ]);
    const existing = new Set(problems.map(problem => String(problem._id)));
    res.json({ problems, categories: categories.map(category => {
      const questions = [...new Set(category.questions.map(String))].filter(id => existing.has(id));
      return { ...category, questions, questionCount: questions.length };
    }) });
  } catch (error) { respondError(res, error); }
};

export const createTerminalProblem = async (req, res) => {
  try {
    const problem = await Terminal.create(terminalProblemInput(req.body));
    res.status(201).json({ success: true, problem });
  } catch (error) { respondError(res, error); }
};

export const updateTerminalProblem = async (req, res) => {
  try {
    const id = terminalId(req.params.id);
    const changes = terminalProblemInput(req.body);
    const problem = await Terminal.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true });
    if (!problem) return res.status(404).json({ message: 'Problem not found.' });
    res.json({ success: true, problem });
  } catch (error) { respondError(res, error); }
};

export const deleteTerminalProblem = async (req, res) => {
  try {
    const id = terminalId(req.params.id);
    const problem = await Terminal.findByIdAndDelete(id);
    if (!problem) return res.status(404).json({ message: 'Problem not found.' });
    await TerminalCategory.updateMany({ questions: id }, { $pull: { questions: id } });
    res.json({ success: true });
  } catch (error) { respondError(res, error); }
};

const categoryChanges = async body => {
  const changes = terminalCategoryInput(body);
  const found = await Terminal.countDocuments({ _id: { $in: changes.questions } });
  if (found !== changes.questions.length) throw Object.assign(new Error('Some selected problems no longer exist. Reload and select them again.'), { status: 400 });
  return changes;
};

export const createTerminalCategory = async (req, res) => {
  try {
    const category = await TerminalCategory.create(await categoryChanges(req.body));
    res.status(201).json({ success: true, category });
  } catch (error) { respondError(res, error); }
};

export const updateTerminalCategory = async (req, res) => {
  try {
    const id = terminalId(req.params.id);
    const changes = await categoryChanges(req.body);
    const category = await TerminalCategory.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    res.json({ success: true, category });
  } catch (error) { respondError(res, error); }
};

export const deleteTerminalCategory = async (req, res) => {
  try {
    const category = await TerminalCategory.findByIdAndDelete(terminalId(req.params.id));
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    res.json({ success: true });
  } catch (error) { respondError(res, error); }
};
