import { verifyAuthSession } from '../utils/authSession.js';

export const authMiddleware = async (req, res, next) => {
  const token = req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = await verifyAuthSession(token);
    req.userId = decoded.userId;
    req.authVersion = decoded.authVersion;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
