import { questionSearchFilter, questionSearchPagination } from '../utils/questionSearch.js';
import { dailyChallengeStatus } from '../utils/dailyChallenge.js';
import { validateAnswers } from '../utils/questionValidation.js';
import { finishQuizAttempt } from './quizAttemptController.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { updateUserStreak } from '../utils/streakUtils.js';
import { trackCompetitiveXP, checkAndResetPeriod } from './competitiveController.js';
import { levelFromXp, applyPrivilege } from '../utils/xpUtils.js';
import CompetitivePeriod from '../models/CompetitivePeriod.js';
import SeasonPass from '../models/SeasonPass.js';
import { xpWithBoosts } from '../utils/boostUtils.js';

export const getQuestions = async (req, res) => {
  try {
    const { type, tags } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if (tags) {
      const tagArray = tags.split(',');
      filter.tags = { $in: tagArray };
    }
    
    const questions = await Question.find(filter);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUnsolvedQuestions = async (req, res) => {
  try {
    const { type, tags } = req.query;
    const user = await User.findById(req.userId);
    
    const filter = { _id: { $nin: user.solvedQuestions } };
    
    if (type) filter.type = type;
    if (tags) {
      const tagArray = tags.split(',');
      filter.tags = { $in: tagArray };
    }
    
    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: 10000 } }
    ]);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getRandom50 = async (req, res) => {
  try {
    const { type, tags } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if (tags) {
      const tagArray = tags.split(',');
      filter.tags = { $in: tagArray };
    }
    
    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: 50 } }
    ]);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const markSolved = async (req, res) => {
  try {
    const { questionId, answers } = req.body;
    if (typeof questionId !== 'string' || !/^[a-f\d]{24}$/i.test(questionId)) {
      return res.status(400).json({ message: 'Invalid question' });
    }
    let [user, question] = await Promise.all([
      User.findById(req.userId), Question.findById(questionId)
    ]);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (!user) return res.status(404).json({ message: 'User not found' });
    const correct = validateAnswers(question, answers);
    if (!correct) return res.json({ correct: false, correctAnswers: question.correctAnswers });
    if (user.solvedQuestions.some(id => String(id) === questionId)) {
      return res.json(practiceResult(user, question, true));
    }
    const [period, pass] = await Promise.all([
      CompetitivePeriod.findOne({ isActive: true }), SeasonPass.findOne({ isActive: true })
    ]);
    if (!period || (new Date() >= period.endDate && !period.rewardsDistributed)) {
      await checkAndResetPeriod();
      // A reset can change this user's competitive progress and rewards.
      user = await User.findById(req.userId);
    }
    for (;;) {
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (user.solvedQuestions.some(id => String(id) === questionId)) {
        return res.json(practiceResult(user, question, true));
      }
      const finalXP = xpWithBoosts(user, question.points || 1);
      const increments = { xp: finalXP };
      for (const tag of new Set(question.tags || [])) {
        if (['LINUX', 'NETWORK', 'ARDUINO'].includes(tag)) increments[`solvedByTag.${tag}`] = 1;
      }
      await updateUserStreak(user);
      const today = new Date().toISOString().split('T')[0];
      const activity = (user.dailyActivity || []).map(entry => entry.toObject());
      const day = activity.find(entry => entry.date === today);
      if (day) day.count += 1;
      else activity.push({ date: today, count: 1 });
      const changes = { streak: user.streak.toObject(), dailyActivity: activity.slice(-30),
        level: levelFromXp(user.xp + finalXP) };
      increments['competitiveStats.currentPeriodXP'] = finalXP;
      const now = new Date();
      const activeBoosts = user.activeBoosts.filter(boost => boost.expiresAt > now);
      if (activeBoosts.length !== user.activeBoosts.length) changes.activeBoosts = activeBoosts;
      if (pass) {
        const samePass = String(user.seasonPass?.passId) === String(pass._id);
        const seasonXP = Math.min((samePass ? user.seasonPass.xp || 0 : 0) + finalXP,
          pass.totalLevels * pass.xpPerLevel);
        if (!samePass) {
          changes.seasonPass = { passId: pass._id, xp: seasonXP,
            level: Math.min(Math.floor(seasonXP / pass.xpPerLevel), pass.totalLevels),
            isPremium: false, claimedLevels: { free: [], premium: [] } };
        } else {
          changes['seasonPass.xp'] = seasonXP;
          changes['seasonPass.level'] = Math.min(Math.floor(seasonXP / pass.xpPerLevel), pass.totalLevels);
        }
      }
      // Compare snapshots before writing: another solve or season purchase must
      // never be overwritten. Reload and recalculate if a concurrent write wins.
      const defaults = { xp: 0, xpPrivilege: 1, activeBoosts: [],
        'seasonPass.passId': null, 'seasonPass.xp': 0, 'seasonPass.isPremium': false,
        'seasonPass.claimedLevels.free': [], 'seasonPass.claimedLevels.premium': [] };
      const rewarded = await User.findOneAndUpdate({ _id: user._id,
        $expr: { $and: Object.entries(defaults).map(([path, fallback]) => ({
          $eq: [{ $ifNull: [`$${path}`, { $literal: fallback }] },
            { $literal: user.get(path)?.toObject?.() ?? user.get(path) ?? fallback }]
        })) }, solvedQuestions: { $ne: question._id } }, {
        $addToSet: { solvedQuestions: question._id }, $inc: increments,
        $set: changes
      }, { new: true });
      if (rewarded) return res.json(practiceResult(rewarded, question, false));
      user = await User.findById(req.userId);
    }
  } catch (error) {
    if (!error.status) console.error('Error marking question as solved:', error);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Server error', error: error.message });
  }
};

const practiceResult = (user, question, alreadySolved) => ({
  correct: true, correctAnswers: question.correctAnswers,
  xp: user.xp, level: user.level, solvedByTag: user.solvedByTag, alreadySolved,
  streak: { current: user.streak?.current || 0, max: user.streak?.max || 0, isActive: true }
});


export const dailyLinux = async (req, res) => {
  try {
    const questions = await Question.aggregate([
      { $match: { tags: { $in: ['LINUX'] } } },
      { $sample: { size: 20 } }
    ]);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const dailyNetwork = async (req, res) => {
  try {
    const questions = await Question.aggregate([
      { $match: { tags: { $in: ['NETWORK'] } } },
      { $sample: { size: 20 } }
    ]);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getDailyChallengeStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(dailyChallengeStatus(user.dailyChallenge));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const completeDailyChallenge = finishQuizAttempt('daily');
export const resetBasicStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.lastBasicReset) {
      const now = new Date();
      const lastReset = new Date(user.lastBasicReset);
      const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);
      
      if (hoursSinceReset < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceReset);
        return res.status(429).json({ 
          message: 'Reset limit reached. You can only reset once every 24 hours.',
          hoursRemaining,
          nextResetTime: new Date(lastReset.getTime() + 24 * 60 * 60 * 1000)
        });
      }
    }

    const basicQuestions = await Question.find({ type: 'basic' });
    const basicQuestionIds = basicQuestions.map(q => q._id.toString());
    
    const solvedBasicQuestions = user.solvedQuestions.filter(
      questionId => basicQuestionIds.includes(questionId.toString())
    );
    
    if (solvedBasicQuestions.length < 50) {
      return res.status(400).json({ 
        message: 'You need at least 50 solved basic commands questions to reset stats',
        currentSolved: solvedBasicQuestions.length
      });
    }

    user.solvedQuestions = user.solvedQuestions.filter(
      questionId => !basicQuestionIds.includes(questionId.toString())
    );

    const xpToAdd = solvedBasicQuestions.length;
    const finalXP = applyPrivilege(xpToAdd, user);
    user.xp += finalXP;
    user.level = levelFromXp(user.xp);
    await trackCompetitiveXP(user._id, finalXP);
  
    user.lastBasicReset = new Date();
    
    await user.save();
    
    console.log(`[✔] Basic stats reset for user ${user.username}: ${solvedBasicQuestions.length} questions reset, ${xpToAdd} XP added`);
    
    res.json({
      message: 'Basic commands stats reset successfully',
      questionsReset: solvedBasicQuestions.length,
      xpAdded: xpToAdd,
      newXp: user.xp,
      newLevel: user.level
    });
  } catch (error) {
    console.error('Error resetting basic stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
export const getLinuxOverviewTest = async (req, res) => {
  try {
    const chapters = [
      'CHAPTER3', 'CHAPTER4', 'CHAPTER5', 'CHAPTER6',
      'CHAPTER7', 'CHAPTER8', 'CHAPTER9', 'CHAPTER10',
      'CHAPTER11', 'CHAPTER12', 'CHAPTER14', 'CHAPTER15'
    ];

    const results = await Promise.all(
      chapters.map(ch =>
        Question.aggregate([
          { $match: { tags: ch } },
          { $sample: { size: 5 } }
        ])
      )
    );

    const questions = results.flatMap((chQuestions, i) =>
      chQuestions.map(q => ({ ...q, _chapterTag: chapters[i] }))
    );

    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const resetLinuxStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const linuxQuestions = await Question.find({ tags: 'LINUX', type: 'all' });
    const linuxQuestionIds = new Set(linuxQuestions.map(q => q._id.toString()));

    const solvedLinuxQuestions = user.solvedQuestions.filter(
      questionId => linuxQuestionIds.has(questionId.toString())
    );

    if (solvedLinuxQuestions.length < 500) {
      return res.status(400).json({
        message: 'You need at least 500 solved Linux questions to reset stats',
        currentSolved: solvedLinuxQuestions.length
      });
    }

    user.solvedQuestions = user.solvedQuestions.filter(
      questionId => !linuxQuestionIds.has(questionId.toString())
    );

    const xpToAdd = solvedLinuxQuestions.length;
    const finalXP = applyPrivilege(xpToAdd, user);
    user.xp += finalXP;
    user.level = levelFromXp(user.xp);
    await trackCompetitiveXP(user._id, finalXP);

    await user.save();

    console.log(`[✔] Linux stats reset for user ${user.username}: ${solvedLinuxQuestions.length} questions reset, ${xpToAdd} XP added`);

    res.json({
      message: 'Linux stats reset successfully',
      questionsReset: solvedLinuxQuestions.length,
      xpAdded: xpToAdd,
      newXp: user.xp,
      newLevel: user.level
    });
  } catch (error) {
    console.error('Error resetting Linux stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
export const resetArduinoStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.lastArduinoReset) {
      const now = new Date();
      const lastReset = new Date(user.lastArduinoReset);
      const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);
      if (hoursSinceReset < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceReset);
        return res.status(429).json({
          message: 'Reset limit reached. You can only reset once every 24 hours.',
          hoursRemaining,
          nextResetTime: new Date(lastReset.getTime() + 24 * 60 * 60 * 1000)
        });
      }
    }

    const arduinoQuestions = await Question.find({ tags: 'ARDUINO', type: 'all' });
    const arduinoQuestionIds = new Set(arduinoQuestions.map(q => q._id.toString()));

    const solvedArduinoQuestions = user.solvedQuestions.filter(
      questionId => arduinoQuestionIds.has(questionId.toString())
    );

    if (solvedArduinoQuestions.length < 50) {
      return res.status(400).json({
        message: 'You need at least 50 solved Arduino questions to reset stats',
        currentSolved: solvedArduinoQuestions.length
      });
    }

    user.solvedQuestions = user.solvedQuestions.filter(
      questionId => !arduinoQuestionIds.has(questionId.toString())
    );

    const xpToAdd = solvedArduinoQuestions.length;
    const finalXP = applyPrivilege(xpToAdd, user);
    user.xp += finalXP;
    user.level = levelFromXp(user.xp);
    await trackCompetitiveXP(user._id, finalXP);

    user.lastArduinoReset = new Date();
    await user.save();

    console.log(`[✔] Arduino stats reset for user ${user.username}: ${solvedArduinoQuestions.length} questions reset, ${xpToAdd} XP added`);

    res.json({
      message: 'Arduino stats reset successfully',
      questionsReset: solvedArduinoQuestions.length,
      xpAdded: xpToAdd,
      newXp: user.xp,
      newLevel: user.level
    });
  } catch (error) {
    console.error('Error resetting Arduino stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const resetNetworkStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.lastNetworkReset) {
      const now = new Date();
      const lastReset = new Date(user.lastNetworkReset);
      const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);
      if (hoursSinceReset < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceReset);
        return res.status(429).json({
          message: 'Reset limit reached. You can only reset once every 24 hours.',
          hoursRemaining,
          nextResetTime: new Date(lastReset.getTime() + 24 * 60 * 60 * 1000)
        });
      }
    }

    const networkQuestions = await Question.find({ tags: 'NETWORK', type: 'all' });
    const networkQuestionIds = new Set(networkQuestions.map(q => q._id.toString()));

    const solvedNetworkQuestions = user.solvedQuestions.filter(
      questionId => networkQuestionIds.has(questionId.toString())
    );

    if (solvedNetworkQuestions.length < 50) {
      return res.status(400).json({
        message: 'You need at least 50 solved Network questions to reset stats',
        currentSolved: solvedNetworkQuestions.length
      });
    }

    user.solvedQuestions = user.solvedQuestions.filter(
      questionId => !networkQuestionIds.has(questionId.toString())
    );

    const xpToAdd = solvedNetworkQuestions.length;
    const finalXP = applyPrivilege(xpToAdd, user);
    user.xp += finalXP;
    user.level = levelFromXp(user.xp);
    await trackCompetitiveXP(user._id, finalXP);

    user.lastNetworkReset = new Date();
    await user.save();

    console.log(`[✔] Network stats reset for user ${user.username}: ${solvedNetworkQuestions.length} questions reset, ${xpToAdd} XP added`);

    res.json({
      message: 'Network stats reset successfully',
      questionsReset: solvedNetworkQuestions.length,
      xpAdded: xpToAdd,
      newXp: user.xp,
      newLevel: user.level
    });
  } catch (error) {
    console.error('Error resetting Network stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const resetAcadnetStats = async (req, res) => {
  try {
    const questions = await Question.find({ type: 'acadnet' });
    const byId = new Map(questions.map(question => [String(question._id), question]));
    for (;;) {
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      const solved = user.solvedQuestions.filter(id => byId.has(String(id)));
      if (solved.length < 50) {
        return res.status(400).json({ message: 'You need at least 50 solved AcadNet questions to reset stats',
          currentSolved: solved.length });
      }
      const xpAdded = applyPrivilege(solved.length, user);
      const changes = { level: levelFromXp(user.xp + xpAdded) };
      // Remove only the contribution of these questions from category counters.
      for (const tag of ['LINUX', 'NETWORK', 'ARDUINO']) {
        const removed = solved.filter(id => byId.get(String(id)).tags?.includes(tag)).length;
        if (removed) changes[`solvedByTag.${tag}`] = Math.max(0, (user.solvedByTag?.[tag] || 0) - removed);
      }
      // Snapshot checks prevent concurrent solves/resets from being overwritten,
      // and prevent two reset requests from rewarding the same solved questions.
      const updated = await User.findOneAndUpdate({ _id: user._id, xp: user.xp,
        solvedQuestions: user.solvedQuestions }, {
        $pull: { solvedQuestions: { $in: solved } },
        $inc: { xp: xpAdded }, $set: changes
      }, { new: true });
      if (!updated) continue;
      await trackCompetitiveXP(user._id, xpAdded);
      return res.json({ message: 'AcadNet stats reset successfully', questionsReset: solved.length,
        xpAdded, newXp: updated.xp, newLevel: updated.level });
    }
  } catch (error) {
    console.error('Error resetting AcadNet stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const submitRandom50 = finishQuizAttempt('random');
export const getQuestionFilters = async (req, res) => {
  try {
    const tags = (await Question.distinct('tags')).filter(tag => typeof tag === 'string' && tag.trim())
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    res.json({ tags });
  } catch (error) { res.status(500).json({ message: 'Unable to load question tags.' }); }
};

export const searchQuestions = async (req, res) => {
  try {
    const filter = questionSearchFilter(req.query);
    if (req.query.page !== undefined) {
      const requested = questionSearchPagination(req.query);
      const total = await Question.countDocuments(filter);
      const totalPages = Math.max(1, Math.ceil(total / requested.pageSize));
      const page = Math.min(requested.page, totalPages);
      const questions = await Question.find(filter).sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * requested.pageSize).limit(requested.pageSize).lean();
      return res.json({ questions, total, page, pageSize: requested.pageSize, totalPages });
    }
    // Keep the existing array response for older callers.
    if (req.query.all === '1') {
      return res.json(await Question.find(filter).sort({ createdAt: -1, _id: -1 }).limit(200).lean());
    }
    if (!req.query.q || req.query.q.trim().length < 2) return res.json([]);
    res.json(await Question.find(filter).limit(30).lean());
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to load questions.' });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const q = await Question.findByIdAndDelete(id);
    if (!q) return res.status(404).json({ message: 'Question not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { _id, __v, createdAt, updatedAt, ...updates } = req.body;
    const q = await Question.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!q) return res.status(404).json({ message: 'Question not found' });
    res.json({ success: true, question: q });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export 
const exportAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find({}).lean();
    const clean = questions.map(({ _id, __v, createdAt, updatedAt, ...q }) => q);
    res.setHeader('Content-Disposition', 'attachment; filename="questions.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(clean, null, 2));
  } catch (error) {
    res.status(500).json({ message: 'Export failed', error: error.message });
  }
};
