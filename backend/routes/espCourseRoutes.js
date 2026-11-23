import express from 'express';
import EspCourse, { EspLessonCompletion } from '../models/EspCourse.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';

const router = express.Router();
const catalog = 'slug title summary cover duration modules.title modules.lessons.id modules.lessons.title';
const handle = action => async (req, res, next) => {
  try {
    await action(req, res);
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    if (error.code === 11000 || error.name === 'VersionError') {
      return res.status(409).json({ message: 'This slug is already in use or the course was modified by another request.' });
    }
    next(error);
  }
};
const fields = ({ title, summary, cover, duration, published, modules }) => ({
  title, summary, cover, duration, published, modules,
});

router.get('/', handle(async (_req, res) => {
  res.json(await EspCourse.find({ published: true }, catalog).sort({ createdAt: 1 }).lean());
}));
router.get('/progress', authMiddleware, handle(async (req, res) => {
  res.json(await EspLessonCompletion.find({ user: req.userId }, 'course lesson -_id').lean());
}));
router.get('/admin', authMiddleware, isRoot, handle(async (_req, res) => {
  res.json(await EspCourse.find({}, 'slug title published').sort({ createdAt: 1 }).lean());
}));
router.get('/admin/:slug', authMiddleware, isRoot, handle(async (req, res) => {
  const course = await EspCourse.findOne({ slug: req.params.slug }).lean();
  if (!course) return res.sendStatus(404);
  res.json(course);
}));
router.post('/admin', authMiddleware, isRoot, handle(async (req, res) => {
  const course = await EspCourse.create({ slug: req.body.slug, ...fields(req.body) });
  res.status(201).json(course);
}));
router.put('/admin/:slug', authMiddleware, isRoot, handle(async (req, res) => {
  const course = await EspCourse.findOne({ slug: req.params.slug });
  if (!course) return res.sendStatus(404);
  if (req.body.__v !== course.__v) return res.status(409).json({ message: 'Reload the latest version of the course before saving.' });
  course.set(fields(req.body));
  await course.save();
  res.json(course);
}));
router.delete('/admin/:slug', authMiddleware, isRoot, handle(async (req, res) => {
  const courseId = req.body?.courseId;
  if (typeof courseId !== 'string' || !/^[a-f\d]{24}$/i.test(courseId)) {
    return res.status(400).json({ message: 'A valid course ID is required.' });
  }
  const deleted = await EspCourse.db.transaction(async session => {
    const course = await EspCourse.findOneAndDelete({ _id: courseId, slug: req.params.slug }, { session });
    if (!course) return false;
    await EspLessonCompletion.deleteMany({ course: course._id }, { session });
    return true;
  });
  return res.sendStatus(deleted ? 204 : 404);
}));
router.get('/:slug', handle(async (req, res) => {
  const course = await EspCourse.findOne({ slug: req.params.slug, published: true }).lean();
  if (!course) return res.sendStatus(404);
  res.json(course);
}));
router.put('/:slug/lessons/:lesson/complete', authMiddleware, handle(async (req, res) => {
  const course = await EspCourse.findOne({
    slug: req.params.slug, published: true, 'modules.lessons.id': req.params.lesson,
  }, '_id').lean();
  if (!course) return res.sendStatus(404);
  const completion = { user: req.userId, course: course._id, lesson: req.params.lesson };
  try {
    await EspLessonCompletion.updateOne(completion, { $setOnInsert: completion }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  if (!await EspCourse.exists({ _id: course._id })) {
    await EspLessonCompletion.deleteOne(completion);
    return res.sendStatus(404);
  }
  res.sendStatus(204);
}));

export default router;
