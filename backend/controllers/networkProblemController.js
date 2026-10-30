import { randomBytes } from 'crypto';
import NetworkProblem from '../models/NetworkProblem.js';
import NetworkLabProgress from '../models/NetworkLabProgress.js';
import User from '../models/User.js';
import { normalizeProblem, validateSubmission, evaluateObjectives } from '../network/problemDefinition.js';
import { awardNetworkProblem } from '../utils/networkProblemReward.js';

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const id = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value) ? value : fail('Invalid problem ID.');
const handle = action => async (req, res) => {
  try { await action(req, res); }
  catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A problem with this slug already exists.' });
    if (!error.status) console.error('[NetworkLab]', error);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to process this Network Lab request.' });
  }
};
const publicProblem = problem => ({ ...problem, objectives: problem.objectives.map(({ id, label, type }) => ({ id, label, type })) });
async function availableProblem(req) {
  const [problem, user] = await Promise.all([NetworkProblem.findById(id(req.params.id)).lean(), User.findById(req.userId).select('role solvedNetworkProblems')]);
  if (!user) fail('User not found.', 404);
  if (!problem || (!problem.published && user.role !== 'root')) fail('Problem not found.', 404);
  return { problem, user };
}
async function persist(req, problem, topology) {
  if (req.body.revision !== problem.revision) fail('This problem was updated. Reload it to continue.', 409);
  if (typeof req.body.token !== 'string' || !/^[a-f\d]{48}$/.test(req.body.token)) fail('Invalid workspace token. Reload this lab.', 409);
  const attempt = await NetworkLabProgress.findOneAndUpdate({ userId: req.userId, problemId: problem._id, revision: problem.revision, token: req.body.token },
    { $set: { topology } }, { new: true });
  if (!attempt) fail('This workspace was reset or updated. Reload it to continue.', 409);
  return attempt;
}

export const listNetworkProblems = handle(async (req, res) => {
  const user = await User.findById(req.userId).select('role solvedNetworkProblems');
  if (!user) fail('User not found.', 404);
  const problems = await NetworkProblem.find(user.role === 'root' ? {} : { published: true }).sort({ order: 1, createdAt: 1, _id: 1 })
    .select('title slug summary difficulty xp tags published order revision objectives.id').lean();
  const solved = new Set(user.solvedNetworkProblems.map(String));
  res.json({ problems: problems.map(({ objectives, ...problem }) => ({ ...problem, objectiveCount: objectives.length, solved: solved.has(String(problem._id)) })) });
});
export const getNetworkProblem = handle(async (req, res) => {
  const { problem, user } = await availableProblem(req);
  let attempt;
  try {
    attempt = await NetworkLabProgress.findOneAndUpdate({ userId: req.userId, problemId: problem._id }, { $setOnInsert: {
      revision: problem.revision, token: randomBytes(24).toString('hex'), topology: problem.topology,
    } }, { new: true, upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    attempt = await NetworkLabProgress.findOne({ userId: req.userId, problemId: problem._id });
  }
  if (attempt.revision !== problem.revision) {
    attempt = await NetworkLabProgress.findOneAndUpdate({ _id: attempt._id }, { $set: { revision: problem.revision, token: randomBytes(24).toString('hex'), topology: problem.topology } }, { new: true });
  }
  res.json({ problem: publicProblem(problem), attempt: { topology: attempt.topology, token: attempt.token }, solved: user.solvedNetworkProblems.some(value => String(value) === String(problem._id)) });
});
export const saveNetworkAttempt = handle(async (req, res) => {
  const { problem } = await availableProblem(req);
  await persist(req, problem, validateSubmission(problem, req.body.topology));
  res.json({ success: true });
});
export const resetNetworkAttempt = handle(async (req, res) => {
  const { problem } = await availableProblem(req);
  if (req.body.revision !== problem.revision) fail('This problem was updated. Reload it to continue.', 409);
  if (typeof req.body.token !== 'string' || !/^[a-f\d]{48}$/.test(req.body.token)) fail('Invalid workspace token. Reload this lab.', 409);
  const token = randomBytes(24).toString('hex');
  const updated = await NetworkLabProgress.findOneAndUpdate({ userId: req.userId, problemId: problem._id, revision: problem.revision, token: req.body.token }, { $set: { token, topology: problem.topology } }, { new: true });
  if (!updated) fail('This workspace was reset elsewhere. Reload it to continue.', 409);
  res.json({ topology: problem.topology, token });
});
export const checkNetworkProblem = handle(async (req, res) => {
  const { problem } = await availableProblem(req);
  const topology = validateSubmission(problem, req.body.topology);
  await persist(req, problem, topology);
  const objectives = evaluateObjectives(problem, topology);
  const completed = objectives.every(goal => goal.passed);
  const reward = completed && problem.published ? await awardNetworkProblem(req.userId, problem) : { xpGained: 0 };
  res.json({ completed, objectives, preview: !problem.published, ...reward });
});

export const adminListNetworkProblems = handle(async (req, res) => {
  res.json({ problems: await NetworkProblem.find().sort({ order: 1, createdAt: 1, _id: 1 }).lean() });
});
export const previewNetworkProblems = handle(async (req, res) => {
  const input = Array.isArray(req.body.problems) ? req.body.problems : [req.body.problems];
  if (!input.length || input.length > 20) fail('Preview between 1 and 20 problems at a time.');
  const problems = input.map(normalizeProblem);
  if (new Set(problems.map(item => item.slug)).size !== problems.length) fail('Each problem needs a unique slug.');
  res.json({ problems });
});
export const createNetworkProblems = handle(async (req, res) => {
  const input = Array.isArray(req.body.problems) ? req.body.problems : [req.body.problems];
  if (!input.length || input.length > 20) fail('Import between 1 and 20 problems at a time.');
  const problems = input.map(normalizeProblem);
  if (new Set(problems.map(item => item.slug)).size !== problems.length) fail('Each problem needs a unique slug.');
  if (await NetworkProblem.exists({ slug: { $in: problems.map(item => item.slug) } })) fail('One of these slugs already exists. Change it or edit the existing problem.', 409);
  const last = await NetworkProblem.findOne().sort({ order: -1 }).select('order');
  res.status(201).json({ problems: await NetworkProblem.insertMany(problems.map((problem, index) => ({ ...problem, order: (last?.order ?? -1) + index + 1 }))) });
});
export const updateNetworkProblem = handle(async (req, res) => {
  const changes = normalizeProblem(req.body.problem);
  if (!Number.isSafeInteger(req.body.revision)) fail('Reload the editor before saving.', 409);
  const problem = await NetworkProblem.findOneAndUpdate({ _id: id(req.params.id), revision: req.body.revision }, { $set: changes, $inc: { revision: 1 } }, { new: true, runValidators: true });
  if (!problem) fail('The problem was changed or deleted elsewhere. Reload the list.', 409);
  res.json({ problem });
});
export const deleteNetworkProblem = handle(async (req, res) => {
  const problemId = id(req.params.id);
  await NetworkProblem.findByIdAndDelete(problemId);
  await NetworkLabProgress.deleteMany({ problemId });
  // Keep solve receipts: deletion must not alter earned XP or competitive history.
  res.json({ success: true });
});
export const reorderNetworkProblems = handle(async (req, res) => {
  const ids = req.body.ids;
  if (!Array.isArray(ids) || ids.length > 10000 || new Set(ids).size !== ids.length) fail('Invalid problem order.');
  ids.forEach(id);
  const all = await NetworkProblem.find().select('_id').lean();
  if (all.length !== ids.length || all.some(problem => !ids.includes(String(problem._id)))) fail('The problem list changed. Reload it before reordering.', 409);
  if (ids.length) await NetworkProblem.bulkWrite(ids.map((value, order) => ({ updateOne: { filter: { _id: value }, update: { $set: { order } } } })));
  res.json({ success: true });
});
