import ArenaMatch from '../models/ArenaMatch.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { updateUserStreak } from '../utils/streakUtils.js';

const generateMatchId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createMatch = async (req, res) => {
  try {
    const { category, questionCount, mode, visibility } = req.body;
    
    const durationMap = { 10: 120, 20: 240, 30: 360 };
    const duration = durationMap[questionCount];

    const questions = await Question.aggregate([
      { $match: { tags: category } },
      { $sample: { size: questionCount } }
    ]);

    if (questions.length < questionCount) {
      return res.status(400).json({ message: 'Not enough questions available' });
    }

    const matchId = generateMatchId();
    
    const match = new ArenaMatch({
      matchId,
      creator: req.userId,
      category,
      questionCount,
      duration,
      mode,
      visibility: visibility || 'public',
      questions: questions.map(q => q._id)
    });

    await match.save();
    
    res.json({ 
      success: true, 
      matchId: match.matchId,
      match: await match.populate('creator', 'username level')
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const joinMatch = async (req, res) => {
  try {
    const { matchId } = req.body;
    
    const match = await ArenaMatch.findOne({ matchId })
      .populate('creator', 'username level')
      .populate('questions');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.status !== 'waiting') {
      return res.status(400).json({ message: 'Match already started or finished' });
    }

    if (match.creator._id.toString() === req.userId) {
      return res.status(400).json({ message: 'Cannot join your own match' });
    }

    if (match.opponent) {
      return res.status(400).json({ message: 'Match is full' });
    }

    match.opponent = req.userId;
    match.status = 'active';
    match.startedAt = new Date();
    await match.save();

    await match.populate('opponent', 'username level');

    res.json({ success: true, match });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const match = await ArenaMatch.findOne({ matchId })
      .populate('creator', 'username level')
      .populate('opponent', 'username level')
      .populate('questions');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const isParticipant = 
      match.creator._id.toString() === req.userId || 
      (match.opponent && match.opponent._id.toString() === req.userId);

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to view this match' });
    }

    res.json({ match });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { matchId, questionId, answers } = req.body;
    
    console.log('Submit answer:', { matchId, questionId, answers });
    
    const match = await ArenaMatch.findOne({ matchId });

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.status !== 'active') {
      return res.status(400).json({ message: 'Match is not active' });
    }

    const isCreator = match.creator.toString() === req.userId;
    const isOpponent = match.opponent && match.opponent.toString() === req.userId;

    if (!isCreator && !isOpponent) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (isCreator) {
      match.creatorAnswers.set(questionId, answers);
      console.log('Saved creator answer for question', questionId, ':', answers);
    } else {
      match.opponentAnswers.set(questionId, answers);
      console.log('Saved opponent answer for question', questionId, ':', answers);
    }

    await match.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const finishMatch = async (req, res) => {
  try {
    const { matchId } = req.body;
    
    const match = await ArenaMatch.findOne({ matchId })
      .populate('questions')
      .populate('creator', 'username level')
      .populate('opponent', 'username level')
      .populate('winner', 'username level');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.status === 'finished') {
      return res.json({ 
        success: true, 
        match,
        results: {
          creatorScore: match.creatorScore,
          opponentScore: match.opponentScore,
          winner: match.winner
        }
      });
    }

    const isCreator = match.creator._id.toString() === req.userId;
    const isOpponent = match.opponent && match.opponent._id.toString() === req.userId;

    if (!isCreator && !isOpponent) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let creatorScore = 0;
    let opponentScore = 0;

    match.questions.forEach((question) => {
      const correctAnswers = question.correctAnswers || [question.correctIndex];
      const points = question.points || 1;

      const creatorAnswers = match.creatorAnswers.get(question._id.toString()) || [];
      const opponentAnswers = match.opponentAnswers.get(question._id.toString()) || [];

      console.log('Question:', question.title);
      console.log('Correct answers:', correctAnswers);
      console.log('Creator answers:', creatorAnswers);
      console.log('Opponent answers:', opponentAnswers);

      const creatorCorrect = 
        creatorAnswers.length === correctAnswers.length &&
        creatorAnswers.every(ans => correctAnswers.includes(ans));

      const opponentCorrect = 
        opponentAnswers.length === correctAnswers.length &&
        opponentAnswers.every(ans => correctAnswers.includes(ans));

      console.log('Creator correct:', creatorCorrect);
      console.log('Opponent correct:', opponentCorrect);

      if (creatorCorrect) creatorScore += points;
      if (opponentCorrect) opponentScore += points;
    });

    match.creatorScore = creatorScore;
    match.opponentScore = opponentScore;
    match.status = 'finished';
    match.finishedAt = new Date();

    if (creatorScore > opponentScore) {
      match.winner = match.creator;
    } else if (opponentScore > creatorScore) {
      match.winner = match.opponent;
    }

    await match.save();

    const creator = await User.findById(match.creator);
    const opponent = await User.findById(match.opponent);

    if (match.mode === 'normal') {
      creator.xp += creatorScore;
      creator.level = Math.floor(creator.xp / 100) + 1;
      
      if (opponent) {
        opponent.xp += opponentScore;
        opponent.level = Math.floor(opponent.xp / 100) + 1;
      }

      if (creatorScore > 0) await updateUserStreak(creator);
      if (opponent && opponentScore > 0) await updateUserStreak(opponent);

      await creator.save();
      if (opponent) await opponent.save();
    } else if (match.mode === 'bloody') {
      if (creatorScore === opponentScore) {
        // Draw: fiecare primește propriul scor
        creator.xp += creatorScore;
        creator.level = Math.floor(creator.xp / 100) + 1;
        
        if (opponent) {
          opponent.xp += opponentScore;
          opponent.level = Math.floor(opponent.xp / 100) + 1;
        }

        if (creatorScore > 0) await updateUserStreak(creator);
        if (opponent && opponentScore > 0) await updateUserStreak(opponent);

        await creator.save();
        if (opponent) await opponent.save();
      } else if (match.winner) {
        // Win/Loss: doar câștigătorul primește tot XP-ul
        const winner = match.winner.toString() === creator._id.toString() ? creator : opponent;
        const totalXP = creatorScore + opponentScore;
        
        winner.xp += totalXP;
        winner.level = Math.floor(winner.xp / 100) + 1;
        await updateUserStreak(winner);
        await winner.save();
      }
    }

    await match.populate('creator', 'username level');
    await match.populate('opponent', 'username level');
    await match.populate('winner', 'username level');

    res.json({ 
      success: true, 
      match,
      results: {
        creatorScore,
        opponentScore,
        winner: match.winner
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getAvailableMatches = async (req, res) => {
  try {
    const matches = await ArenaMatch.find({ 
      status: 'waiting',
      visibility: 'public',
      creator: { $ne: req.userId }
    })
    .populate('creator', 'username level')
    .sort({ createdAt: -1 })
    .limit(20);

    res.json({ matches });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const cancelMatch = async (req, res) => {
  try {
    const { matchId } = req.body;
    
    const match = await ArenaMatch.findOne({ matchId });

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.creator.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only the creator can cancel the match' });
    }

    if (match.status !== 'waiting') {
      return res.status(400).json({ message: 'Can only cancel matches in waiting state' });
    }

    await ArenaMatch.deleteOne({ matchId });

    res.json({ success: true, message: 'Match cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getMyWaitingMatch = async (req, res) => {
  try {
    const match = await ArenaMatch.findOne({
      creator: req.userId,
      status: 'waiting'
    }).populate('creator', 'username level');

    if (!match) {
      return res.json({ match: null });
    }

    res.json({ match });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
