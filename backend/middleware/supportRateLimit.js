import rateLimit from 'express-rate-limit';

export const supportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 2,
  message: {
    error: 'Too many support requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    
    return req.userId ? `user:${req.userId}` : undefined;
  }
});