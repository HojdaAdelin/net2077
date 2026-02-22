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

    // If match has no opponent (expired), just delete it
    if (!match.opponent) {
      await ArenaMatch.deleteOne({ matchId: match.matchId });
      return res.status(400).json({ message: 'Match expired without opponent' });
    }

    if (match.status === 'finished') {
      // Mark that this user has viewed the results
      const viewerIsCreator = match.creator._id.toString() === req.userId;
      if (viewerIsCreator) {
        match.creatorViewed = true;
      } else {
        match.opponentViewed = true;
      }
      await match.save();

      // Delete match if both have viewed
      if (match.creatorViewed && match.opponentViewed) {
        await ArenaMatch.deleteOne({ matchId: match.matchId });
      }

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

    let creatorXPGained = 0;
    let opponentXPGained = 0;
    let creatorResult = 'draw';
    let opponentResult = 'draw';

    if (match.mode === 'normal') {
      creatorXPGained = creatorScore;
      opponentXPGained = opponentScore;
      
      creator.xp += creatorScore;
      creator.level = Math.floor(creator.xp / 100) + 1;
      
      if (opponent) {
        opponent.xp += opponentScore;
        opponent.level = Math.floor(opponent.xp / 100) + 1;
      }

      if (creatorScore > 0) await updateUserStreak(creator);
      if (opponent && opponentScore > 0) await updateUserStreak(opponent);
    } else if (match.mode === 'bloody') {
      if (creatorScore === opponentScore) {
        creatorXPGained = creatorScore;
        opponentXPGained = opponentScore;
        
        creator.xp += creatorScore;
        creator.level = Math.floor(creator.xp / 100) + 1;
        
        if (opponent) {
          opponent.xp += opponentScore;
          opponent.level = Math.floor(opponent.xp / 100) + 1;
        }

        if (creatorScore > 0) await updateUserStreak(creator);
        if (opponent && opponentScore > 0) await updateUserStreak(opponent);
      } else if (match.winner) {
        const totalXP = creatorScore + opponentScore;
        
        if (match.winner.toString() === creator._id.toString()) {
          creatorXPGained = totalXP;
          opponentXPGained = 0;
          creator.xp += totalXP;
          creator.level = Math.floor(creator.xp / 100) + 1;
          await updateUserStreak(creator);
        } else {
          creatorXPGained = 0;
          opponentXPGained = totalXP;
          opponent.xp += totalXP;
          opponent.level = Math.floor(opponent.xp / 100) + 1;
          await updateUserStreak(opponent);
        }
      }
    }

    // Determine results
    if (creatorScore > opponentScore) {
      creatorResult = 'win';
      opponentResult = 'loss';
    } else if (opponentScore > creatorScore) {
      creatorResult = 'loss';
      opponentResult = 'win';
    }

    // Update arena stats for creator
    if (!creator.arenaStats) {
      creator.arenaStats = { wins: 0, losses: 0, totalXP: 0, matchHistory: [] };
    }

    if (creatorResult === 'win') creator.arenaStats.wins += 1;
    else if (creatorResult === 'loss') creator.arenaStats.losses += 1;

    creator.arenaStats.totalXP += creatorXPGained;

    // Add to creator match history (keep last 5)
    if (!creator.arenaStats.matchHistory) {
      creator.arenaStats.matchHistory = [];
    }
    creator.arenaStats.matchHistory.unshift({
      matchId: match.matchId,
      opponent: opponent._id,
      opponentName: opponent.username,
      myScore: creatorScore,
      opponentScore: opponentScore,
      result: creatorResult,
      mode: match.mode,
      category: match.category,
      xpGained: creatorXPGained,
      date: new Date()
    });
    if (creator.arenaStats.matchHistory.length > 5) {
      creator.arenaStats.matchHistory = creator.arenaStats.matchHistory.slice(0, 5);
    }

    await creator.save();

    // Update arena stats for opponent
    if (opponent) {
      if (!opponent.arenaStats) {
        opponent.arenaStats = { wins: 0, losses: 0, totalXP: 0, matchHistory: [] };
      }

      if (opponentResult === 'win') opponent.arenaStats.wins += 1;
      else if (opponentResult === 'loss') opponent.arenaStats.losses += 1;

      opponent.arenaStats.totalXP += opponentXPGained;

      // Add to opponent match history (keep last 5)
      if (!opponent.arenaStats.matchHistory) {
        opponent.arenaStats.matchHistory = [];
      }
      opponent.arenaStats.matchHistory.unshift({
        matchId: match.matchId,
        opponent: creator._id,
        opponentName: creator.username,
        myScore: opponentScore,
        opponentScore: creatorScore,
        result: opponentResult,
        mode: match.mode,
        category: match.category,
        xpGained: opponentXPGained,
        date: new Date()
      });
      if (opponent.arenaStats.matchHistory.length > 5) {
        opponent.arenaStats.matchHistory = opponent.arenaStats.matchHistory.slice(0, 5);
      }

      await opponent.save();
    }

    await match.populate('creator', 'username level');
    await match.populate('opponent', 'username level');
    await match.populate('winner', 'username level');

    // Mark that this user has viewed the results
    const viewerIsCreator = match.creator._id.toString() === req.userId;
    if (viewerIsCreator) {
      match.creatorViewed = true;
    } else {
      match.opponentViewed = true;
    }
    await match.save();

    const responseData = { 
      success: true, 
      match,
      results: {
        creatorScore,
        opponentScore,
        winner: match.winner
      }
    };

    // Delete match only if both players have viewed the results
    if (match.creatorViewed && match.opponentViewed) {
      await ArenaMatch.deleteOne({ matchId: match.matchId });
    }

    res.json(responseData);
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

export const getArenaLeaderboard = async (req, res) => {
  try {
    const users = await User.find({
      'arenaStats.wins': { $gt: 0 }
    })
    .select('username level arenaStats')
    .sort({ 
      'arenaStats.wins': -1, 
      'arenaStats.totalXP': -1 
    })
    .limit(5);

    const leaderboard = users.map(user => ({
      username: user.username,
      level: user.level,
      wins: user.arenaStats?.wins || 0,
      losses: user.arenaStats?.losses || 0,
      totalXP: user.arenaStats?.totalXP || 0,
      winRate: user.arenaStats?.wins && (user.arenaStats.wins + user.arenaStats.losses) > 0
        ? ((user.arenaStats.wins / (user.arenaStats.wins + user.arenaStats.losses)) * 100).toFixed(1)
        : '0.0'
    }));

    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getMyArenaStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('username level arenaStats')
      .populate('arenaStats.matchHistory.opponent', 'username level');

    if (!user.arenaStats) {
      return res.json({
        wins: 0,
        losses: 0,
        totalXP: 0,
        matchHistory: []
      });
    }

    res.json({
      wins: user.arenaStats.wins || 0,
      losses: user.arenaStats.losses || 0,
      totalXP: user.arenaStats.totalXP || 0,
      matchHistory: user.arenaStats.matchHistory || []
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
