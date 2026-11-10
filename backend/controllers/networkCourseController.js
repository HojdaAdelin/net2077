import Progress from '../models/NetworkCourseProgress.js';
import { courseLessons, courseChecks } from '../network/networkCourse.js';
import { normalizeTopology } from '../network/problemDefinition.js';
import { awardNetworkCourse } from '../utils/networkCourseReward.js';
const handle = fn => async (req, res) => { try { await fn(req, res); } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to save course progress.' }); } };
export const getCourseProgress = handle(async (req, res) => {
  const progress = await Progress.findOne({ userId: req.userId }).lean();
  const reward = await awardNetworkCourse(req.userId, progress?.completed || []);
  res.json({ completed: progress?.completed || [], workspaces: progress?.workspaces || {}, reward });
});
export const saveCourseLesson = handle(async (req, res) => {
  const lesson = courseLessons.find(l => l.id === req.params.lessonId);
  if (!lesson) return res.status(404).json({ message: 'Lesson not found.' });
  const topology = normalizeTopology(req.body.topology);
  const checks = courseChecks(lesson.id, topology);
  const correct = req.body.answer === (courseLessons.indexOf(lesson) % 3);
  const completed = req.body.finish === true && correct && checks.length > 0 && checks.every(c => c.passed);
  const update = { $set: { [`workspaces.${lesson.id}`]: topology }, ...(completed ? { $addToSet: { completed: lesson.id } } : {}) };
  // Retry a concurrent first save if another request created the unique document.
  let progress;
  try { progress = await Progress.findOneAndUpdate({ userId: req.userId }, update, { upsert: true, new: true }); }
  catch (error) { if (error.code !== 11000) throw error; progress = await Progress.findOneAndUpdate({ userId: req.userId }, update, { new: true }); }
  const reward = await awardNetworkCourse(req.userId, progress.completed);
  res.json({ completed: progress.completed, checks, correct, passed: completed, reward });
});
