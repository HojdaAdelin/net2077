import Roadmap from '../models/Roadmap.js';
import Chapter from '../models/Chapter.js';
import Lesson from '../models/Lesson.js';
import LessonProgress from '../models/LessonProgress.js';

// ── Chapters ──────────────────────────────────────────────────────────────────

export const getChapters = async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const chapters = await Chapter.find({ roadmapId }).sort({ order: 1 });
    res.json(chapters);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createChapter = async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });

    const count = await Chapter.countDocuments({ roadmapId });
    const chapter = new Chapter({ roadmapId, title: title.trim(), order: count });
    await chapter.save();
    res.status(201).json(chapter);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { title, order } = req.body;
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });
    if (title !== undefined) chapter.title = title;
    if (order !== undefined) chapter.order = order;
    await chapter.save();
    res.json(chapter);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    await Chapter.findByIdAndDelete(chapterId);
    await Lesson.deleteMany({ chapterId });
    res.json({ message: 'Chapter deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── Lessons ───────────────────────────────────────────────────────────────────

export const getLessons = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const lessons = await Lesson.find({ chapterId }).sort({ order: 1 }).select('-items');
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    // Strip answer from question items before sending to client
    const lessonObj = lesson.toObject();
    lessonObj.items = lessonObj.items.map(item => {
      if (item.type === 'question') {
        const { answer, ...rest } = item;
        return rest;
      }
      return item;
    });

    res.json(lessonObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getLessonForEdit = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createLesson = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { title, roadmapId } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });

    const count = await Lesson.countDocuments({ chapterId });
    const lesson = new Lesson({ chapterId, roadmapId, title: title.trim(), order: count, items: [] });
    await lesson.save();
    res.status(201).json(lesson);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, order, items } = req.body;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    if (title !== undefined) lesson.title = title;
    if (order !== undefined) lesson.order = order;
    if (items !== undefined) lesson.items = items;
    await lesson.save();
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    await Lesson.findByIdAndDelete(lessonId);
    await LessonProgress.deleteMany({ lessonId });
    res.json({ message: 'Lesson deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── Progress ──────────────────────────────────────────────────────────────────

export const checkAnswer = async (req, res) => {
  try {
    const { lessonId, itemId } = req.params;
    const { answer } = req.body;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const item = lesson.items.id(itemId);
    if (!item || item.type !== 'question') return res.status(404).json({ message: 'Question not found' });

    const correct = item.answer.trim().toLowerCase() === answer.trim().toLowerCase();

    if (correct) {
      let progress = await LessonProgress.findOne({ userId: req.userId, lessonId });
      if (!progress) {
        progress = new LessonProgress({
          userId: req.userId,
          lessonId,
          roadmapId: lesson.roadmapId,
          chapterId: lesson.chapterId,
          solvedQuestions: [],
        });
      }
      if (!progress.solvedQuestions.map(String).includes(String(itemId))) {
        progress.solvedQuestions.push(itemId);
        await progress.save();
      }
    }

    res.json({ correct });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getRoadmapProgress = async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const userId = req.userId;

    const chapters = await Chapter.find({ roadmapId }).sort({ order: 1 });
    const lessons = await Lesson.find({ roadmapId }).select('_id chapterId items');
    const progressDocs = await LessonProgress.find({ userId, roadmapId });

    const solvedMap = {};
    for (const p of progressDocs) {
      solvedMap[String(p.lessonId)] = p.solvedQuestions.map(String);
    }

    let totalQuestions = 0;
    let totalSolved = 0;

    const chapterProgress = chapters.map(ch => {
      const chLessons = lessons.filter(l => String(l.chapterId) === String(ch._id));
      let chTotal = 0;
      let chSolved = 0;
      for (const l of chLessons) {
        const qItems = l.items.filter(i => i.type === 'question');
        chTotal += qItems.length;
        const solved = solvedMap[String(l._id)] || [];
        chSolved += qItems.filter(q => solved.includes(String(q._id))).length;
      }
      totalQuestions += chTotal;
      totalSolved += chSolved;
      return {
        chapterId: ch._id,
        title: ch.title,
        total: chTotal,
        solved: chSolved,
        percent: chTotal > 0 ? Math.round((chSolved / chTotal) * 100) : 0,
      };
    });

    res.json({
      totalQuestions,
      totalSolved,
      percent: totalQuestions > 0 ? Math.round((totalSolved / totalQuestions) * 100) : 0,
      chapters: chapterProgress,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getLessonProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const progress = await LessonProgress.findOne({ userId: req.userId, lessonId });
    res.json({ solvedQuestions: progress?.solvedQuestions?.map(String) || [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
