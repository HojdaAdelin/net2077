import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  console.log('Auth Middleware - Cookies:', req.cookies);
  console.log('Auth Middleware - Headers:', req.headers.cookie);
  
  const token = req.cookies?.token;
  
  if (!token) {
    console.log('Auth Middleware: No token found');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth Middleware: Token valid for user:', decoded.userId);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.log('Auth Middleware: Token invalid:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
