export const updateUserStreak = async (user) => {
  const now = new Date();
  const serverDate = now.toISOString().split('T')[0]; 
  
  if (!user.streak) {
    user.streak = {
      current: 0,
      max: 0,
      lastActivity: null,
      lastActivityDate: null
    };
  }

  const lastActivityDate = user.streak.lastActivityDate;
  
  if (!lastActivityDate) {
    user.streak.current = 1;
    user.streak.max = Math.max(user.streak.max, 1);
    user.streak.lastActivity = now;
    user.streak.lastActivityDate = serverDate;
    return;
  }

  if (lastActivityDate === serverDate) {
    return; 
  }

  const lastDate = new Date(lastActivityDate + 'T00:00:00.000Z');
  const currentDate = new Date(serverDate + 'T00:00:00.000Z');
  const daysDiff = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));

  if (daysDiff === 1) {
    
    user.streak.current += 1;
    user.streak.max = Math.max(user.streak.max, user.streak.current);
  } else if (daysDiff > 1) {
    user.streak.current = 1;
  }
  

  user.streak.lastActivity = now;
  user.streak.lastActivityDate = serverDate;
};

export const getStreakInfo = (user) => {
  if (!user.streak) {
    return {
      current: 0,
      max: 0,
      isActive: false
    };
  }

  const now = new Date();
  const serverDate = now.toISOString().split('T')[0];
  const lastActivityDate = user.streak.lastActivityDate;

  let isActive = false;
  if (lastActivityDate) {
    const lastDate = new Date(lastActivityDate + 'T00:00:00.000Z');
    const currentDate = new Date(serverDate + 'T00:00:00.000Z');
    const daysDiff = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
    
    isActive = daysDiff <= 1; 
  }

  return {
    current: user.streak.current || 0,
    max: user.streak.max || 0,
    isActive
  };
};