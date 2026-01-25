import Terminal from '../models/Terminal.js';
import User from '../models/User.js';
import { updateUserStreak } from '../utils/streakUtils.js';

const seedTerminalQuestions = async () => {
  const terminalData = [
    {
      "title": "Display kernel version",
      "description": "Show the current kernel version and system information",
      "acceptedCommands": ["uname -r", "uname -a", "cat /proc/version"],
      "points": 5,
      "difficulty": "easy",
      "order": 1
    },
    {
      "title": "List all running processes",
      "description": "Display all currently running processes on the system",
      "acceptedCommands": ["ps aux", "ps -ef", "ps -A"],
      "points": 5,
      "difficulty": "easy",
      "order": 2
    },
    {
      "title": "Show disk usage",
      "description": "Display disk space usage for all mounted filesystems",
      "acceptedCommands": ["df -h", "df", "df -H"],
      "points": 5,
      "difficulty": "easy",
      "order": 3
    },
    {
      "title": "Display memory usage",
      "description": "Show current memory usage and availability",
      "acceptedCommands": ["free -h", "free", "free -m"],
      "points": 5,
      "difficulty": "medium",
      "order": 4
    },
    {
      "title": "Find files by name",
      "description": "Search for files named 'config' in the current directory and subdirectories",
      "acceptedCommands": ["find . -name config", "find . -name 'config'", "find . -type f -name config"],
      "points": 5,
      "difficulty": "medium",
      "order": 5
    },
    {
      "title": "Show network interfaces",
      "description": "Display all network interfaces and their configuration",
      "acceptedCommands": ["ip addr", "ifconfig", "ip a"],
      "points": 5,
      "difficulty": "medium",
      "order": 6
    },
    {
      "title": "Display current directory",
      "description": "Show the current working directory path",
      "acceptedCommands": ["pwd"],
      "points": 5,
      "difficulty": "easy",
      "order": 7
    },
    {
      "title": "List directory contents",
      "description": "List all files and directories in the current directory with detailed information",
      "acceptedCommands": ["ls -la", "ls -l", "ll"],
      "points": 5,
      "difficulty": "easy",
      "order": 8
    },
    {
      "title": "Show system uptime",
      "description": "Display how long the system has been running",
      "acceptedCommands": ["uptime"],
      "points": 5,
      "difficulty": "easy",
      "order": 9
    },
    {
      "title": "Display environment variables",
      "description": "Show all environment variables",
      "acceptedCommands": ["env", "printenv"],
      "points": 5,
      "difficulty": "medium",
      "order": 10
    }
  ];

  try {
    for (const questionData of terminalData) {
      const existing = await Terminal.findOne({ title: questionData.title });
      if (!existing) {
        await Terminal.create(questionData);
        console.log(`Created terminal question: ${questionData.title}`);
      }
    }
    console.log('Terminal questions seeded successfully');
  } catch (error) {
    console.error('Error seeding terminal questions:', error);
  }
};

export const getTerminalQuestions = async (req, res) => {
  try {
    const questions = await Terminal.find({}).sort({ order: 1 });
    
    // If no terminal questions exist, seed them
    if (questions.length === 0) {
      console.log('No terminal questions found, seeding...');
      await seedTerminalQuestions();
      const newQuestions = await Terminal.find({}).sort({ order: 1 });
      return res.json(newQuestions);
    }
    
    res.json(questions);
  } catch (error) {
    console.error('Error fetching terminal questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const seedTerminalData = async (req, res) => {
  try {
    await seedTerminalQuestions();
    const questions = await Terminal.find({}).sort({ order: 1 });
    res.json({ 
      message: 'Terminal questions seeded successfully', 
      count: questions.length,
      questions 
    });
  } catch (error) {
    console.error('Error seeding terminal data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserTerminalProgress = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('solvedTerminalQuestions');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalQuestions = await Terminal.countDocuments();
    
    res.json({
      solved: user.solvedTerminalQuestions || [],
      totalSolved: user.terminalStats.solved,
      totalQuestions
    });
  } catch (error) {
    console.error('Error fetching user terminal progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const submitTerminalCommand = async (req, res) => {
  try {
    const { questionId, command } = req.body;
    const userId = req.userId;

    if (!questionId || !command) {
      return res.status(400).json({ message: 'Question ID and command are required' });
    }

    const question = await Terminal.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Terminal question not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already solved this question
    if (user.solvedTerminalQuestions.includes(questionId)) {
      return res.status(400).json({ message: 'Question already solved' });
    }

    // Check if command is accepted
    const isCorrect = question.acceptedCommands.some(acceptedCmd => 
      acceptedCmd.toLowerCase().trim() === command.toLowerCase().trim()
    );

    if (isCorrect) {
      // Add question to solved list
      user.solvedTerminalQuestions.push(questionId);
      user.terminalStats.solved += 1;
      
      // Add XP and calculate level (same as in questionController)
      user.xp += question.points;
      user.level = Math.floor(user.xp / 100) + 1;
      
      // Update streak
      await updateUserStreak(user);
      
      await user.save();

      console.log(`[✔] Terminal question ${questionId} solved by user ${user.username}: +${question.points} XP`);

      res.json({ 
        success: true, 
        message: 'Correct command!', 
        points: question.points,
        xp: user.xp,
        level: user.level,
        streak: {
          current: user.streak?.current || 0,
          max: user.streak?.max || 0,
          isActive: true
        }
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Incorrect command. Try again!' 
      });
    }
  } catch (error) {
    console.error('Error submitting terminal command:', error);
    res.status(500).json({ message: 'Server error' });
  }
};