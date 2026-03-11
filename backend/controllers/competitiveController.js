import User from '../models/User.js';
import CompetitivePeriod from '../models/CompetitivePeriod.js';
import InboxMessage from '../models/InboxMessage.js';

// Get next reset time (19:00 every 24h)
const getNextResetTime = () => {
  const now = new Date();
  const resetHour = 19;
  
  const nextReset = new Date(now);
  nextReset.setHours(resetHour, 0, 0, 0);
  
  // If we've passed today's 19:00, move to tomorrow's 19:00
  if (now >= nextReset) {
    nextReset.setDate(nextReset.getDate() + 1);
  }
  
  return nextReset;
};

const getCurrentPeriodStart = () => {
  const nextReset = getNextResetTime();
  const periodStart = new Date(nextReset);
  periodStart.setDate(periodStart.getDate() - 1); // 24h period
  return periodStart;
};

export const initializeCompetitiveSystem = async () => {
  try {
    const activePeriod = await CompetitivePeriod.findOne({ isActive: true });
    
    if (!activePeriod) {
      const periodStart = getCurrentPeriodStart();
      const periodEnd = getNextResetTime();
      
      const newPeriod = new CompetitivePeriod({
        periodNumber: 1,
        startDate: periodStart,
        endDate: periodEnd,
        isActive: true
      });
      
      await newPeriod.save();
      console.log('[Competitive] Initialized first period');
    }
  } catch (error) {
    console.error('[Competitive] Error initializing:', error);
  }
};

export const checkAndResetPeriod = async () => {
  try {
    const now = new Date();
    const activePeriod = await CompetitivePeriod.findOne({ isActive: true });
    
    if (!activePeriod) {
      await initializeCompetitiveSystem();
      return;
    }
    
    if (now >= activePeriod.endDate && !activePeriod.rewardsDistributed) {
      console.log('[Competitive] Period ended, distributing rewards...');
      
      const topUsers = await User.find({ 'competitiveStats.currentPeriodXP': { $gt: 0 } })
        .sort({ 'competitiveStats.currentPeriodXP': -1 })
        .limit(5)
        .select('username competitiveStats.currentPeriodXP gold');
     
      const goldRewards = [20, 10, 5, 3, 3];
      const winners = [];
      
      for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        const goldAwarded = goldRewards[i];
        
        // Initialize fields if they don't exist (for old users)
        if (user.gold === undefined) user.gold = 0;
        if (!user.competitiveStats) {
          user.competitiveStats = {
            currentPeriodXP: 0,
            lastPeriodRank: null,
            totalGoldEarned: 0
          };
        }
        if (user.competitiveStats.totalGoldEarned === undefined) {
          user.competitiveStats.totalGoldEarned = 0;
        }
        
        user.gold += goldAwarded;
        user.competitiveStats.lastPeriodRank = i + 1;
        user.competitiveStats.totalGoldEarned += goldAwarded;
        user.competitiveStats.currentPeriodXP = 0;
        
        await user.save();
        
        const rankEmojis = ['🥇', '🥈', '🥉', '🏅', '🏅'];
        const inboxMessage = new InboxMessage({
          recipientId: user._id,
          recipientUsername: user.username,
          sender: 'NET2077 System',
          title: `${rankEmojis[i]} Competitive Season #${activePeriod.periodNumber} - Rank ${i + 1}`,
          description: `Congratulations! You finished Rank ${i + 1} in Competitive Season #${activePeriod.periodNumber}!\n\nYou earned ${topUsers[i].competitiveStats.currentPeriodXP} XP during this season.\n\n🏆 Reward: ${goldAwarded} Gold\n\nYour gold has been added to your account. Keep up the great work in the next season!`
        });
        
        await inboxMessage.save();
        
        winners.push({
          userId: user._id,
          username: user.username,
          xpEarned: topUsers[i].competitiveStats.currentPeriodXP,
          rank: i + 1,
          goldAwarded
        });
        
        console.log(`[Competitive] Awarded ${goldAwarded} gold to ${user.username} (Rank ${i + 1})`);
      }
      
      await User.updateMany(
        { _id: { $nin: topUsers.map(u => u._id) } },
        { $set: { 'competitiveStats.currentPeriodXP': 0 } }
      );
      
      activePeriod.winners = winners;
      activePeriod.rewardsDistributed = true;
      activePeriod.isActive = false;
      await activePeriod.save();
     
      // Calculate next reset time (next day at 19:00)
      const newPeriodStart = activePeriod.endDate;
      const newPeriodEnd = getNextResetTime(); // Use the function to get next 19:00
      
      const newPeriod = new CompetitivePeriod({
        periodNumber: activePeriod.periodNumber + 1,
        startDate: newPeriodStart,
        endDate: newPeriodEnd,
        isActive: true
      });
      
      await newPeriod.save();
      console.log('[Competitive] New period started');
    }
  } catch (error) {
    console.error('[Competitive] Error checking period:', error);
  }
};


export const getCompetitiveLeaderboard = async (req, res) => {
  try {
    await checkAndResetPeriod();
    
    const activePeriod = await CompetitivePeriod.findOne({ isActive: true });
    
    if (!activePeriod) {
      return res.status(404).json({ message: 'No active period' });
    }
    
    const topUsers = await User.find({ 'competitiveStats.currentPeriodXP': { $gt: 0 } })
      .sort({ 'competitiveStats.currentPeriodXP': -1 })
      .limit(5)
      .select('username level competitiveStats.currentPeriodXP');
    
    const leaderboard = topUsers.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      level: user.level,
      xpEarned: user.competitiveStats.currentPeriodXP,
      goldReward: [20, 10, 5, 3, 3][index]
    }));
    
    // Calculate time remaining
    const now = new Date();
    const timeRemaining = activePeriod.endDate - now;
    
    res.json({
      leaderboard,
      periodNumber: activePeriod.periodNumber,
      endDate: activePeriod.endDate,
      timeRemaining: Math.max(0, timeRemaining)
    });
  } catch (error) {
    console.error('[Competitive] Error getting leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Track XP gain for competitive
export const trackCompetitiveXP = async (userId, xpGained) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    
    // Initialize fields if they don't exist (for old users)
    if (user.gold === undefined) user.gold = 0;
    if (!user.competitiveStats) {
      user.competitiveStats = {
        currentPeriodXP: 0,
        lastPeriodRank: null,
        totalGoldEarned: 0
      };
    }
    
    user.competitiveStats.currentPeriodXP += xpGained;
    await user.save();
  } catch (error) {
    console.error('[Competitive] Error tracking XP:', error);
  }
};
