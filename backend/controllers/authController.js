import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true pe Vercel, false local
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // none pentru cross-origin pe Vercel
      maxAge: 7 * 24 * 60 * 60 * 1000,
      // Pentru Vercel, nu setăm domain explicit - lasă browser-ul să decidă
    };
    
    console.log('Setting cookie with options:', cookieOptions);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    res.cookie('token', token, cookieOptions);



    res.status(201).json({ 
      success: true,
      user: { id: user._id, username }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true pe Vercel, false local
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // none pentru cross-origin pe Vercel
      maxAge: 7 * 24 * 60 * 60 * 1000,
      // Pentru Vercel, nu setăm domain explicit - lasă browser-ul să decidă
    };
    
    console.log('Setting cookie with options:', cookieOptions);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    res.cookie('token', token, cookieOptions);



    res.json({ 
      success: true,
      user: { id: user._id, username: user.username }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: { id: user._id, username: user.username } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
