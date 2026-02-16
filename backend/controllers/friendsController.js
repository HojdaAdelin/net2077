import User from '../models/User.js';
import DirectMessage from '../models/DirectMessage.js';

export const sendFriendRequest = async (req, res) => {
  try {
    const { username } = req.body;
    const currentUserId = req.userId;

    const targetUser = await User.findOne({ username });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser._id.toString() === currentUserId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    const currentUser = await User.findById(currentUserId);

    if (currentUser.friends.includes(targetUser._id)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    if (currentUser.sentFriendRequests.includes(targetUser._id)) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    const alreadyReceived = targetUser.friendRequests.some(
      req => req.from.toString() === currentUserId
    );
    if (alreadyReceived) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    targetUser.friendRequests.push({ from: currentUserId });
    currentUser.sentFriendRequests.push(targetUser._id);

    await targetUser.save();
    await currentUser.save();

    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.userId;

    const currentUser = await User.findById(currentUserId);
    const requestUser = await User.findById(userId);

    if (!requestUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const requestIndex = currentUser.friendRequests.findIndex(
      req => req.from.toString() === userId
    );

    if (requestIndex === -1) {
      return res.status(400).json({ message: 'No friend request from this user' });
    }

    currentUser.friendRequests.splice(requestIndex, 1);
    currentUser.friends.push(userId);

    requestUser.sentFriendRequests = requestUser.sentFriendRequests.filter(
      id => id.toString() !== currentUserId
    );
    requestUser.friends.push(currentUserId);

    await currentUser.save();
    await requestUser.save();

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.userId;

    const currentUser = await User.findById(currentUserId);
    const requestUser = await User.findById(userId);

    if (!requestUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const requestIndex = currentUser.friendRequests.findIndex(
      req => req.from.toString() === userId
    );

    if (requestIndex === -1) {
      return res.status(400).json({ message: 'No friend request from this user' });
    }

    currentUser.friendRequests.splice(requestIndex, 1);
    requestUser.sentFriendRequests = requestUser.sentFriendRequests.filter(
      id => id.toString() !== currentUserId
    );

    await currentUser.save();
    await requestUser.save();

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.userId;

    const currentUser = await User.findById(currentUserId);
    const friendUser = await User.findById(userId);

    if (!friendUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    currentUser.friends = currentUser.friends.filter(
      id => id.toString() !== userId
    );
    friendUser.friends = friendUser.friends.filter(
      id => id.toString() !== currentUserId
    );

    await currentUser.save();
    await friendUser.save();

    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getFriends = async (req, res) => {
  try {
    const currentUserId = req.userId;

    const user = await User.findById(currentUserId)
      .populate('friends', 'username level xp role')
      .populate('friendRequests.from', 'username level xp role');

    res.json({
      friends: user.friends,
      friendRequests: user.friendRequests
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const sendDirectMessage = async (req, res) => {
  try {
    const { userId, message } = req.body;
    const currentUserId = req.userId;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ message: 'Message too long (max 1000 characters)' });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!currentUser.friends.includes(userId)) {
      return res.status(403).json({ message: 'Can only message friends' });
    }

    const lastMessage = await DirectMessage.findOne({
      from: currentUserId,
      to: userId
    }).sort({ createdAt: -1 });

    if (lastMessage) {
      const timeSinceLastMessage = (Date.now() - lastMessage.createdAt) / 1000;
      if (timeSinceLastMessage < 15) {
        return res.status(429).json({ 
          message: 'Please wait before sending another message',
          waitTime: Math.ceil(15 - timeSinceLastMessage)
        });
      }
    }

    const dm = new DirectMessage({
      from: currentUserId,
      to: userId,
      message: message.trim()
    });

    await dm.save();

    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    const messages = await DirectMessage.find({
      $or: [
        { from: currentUserId, to: userId },
        { from: userId, to: currentUserId }
      ]
    })
    .sort({ createdAt: 1 })
    .limit(100)
    .populate('from', 'username')
    .populate('to', 'username');

    await DirectMessage.updateMany(
      { from: userId, to: currentUserId, read: false },
      { read: true }
    );

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.userId;

    const unreadCount = await DirectMessage.countDocuments({
      to: currentUserId,
      read: false
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
