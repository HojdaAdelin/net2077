import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function verifyAuthSession(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded.userId !== 'string' || !/^[a-f\d]{24}$/i.test(decoded.userId)) throw new Error('Invalid session');
  const user = await User.findById(decoded.userId).select('authVersion');
  // Existing cookies without a version stay valid until that account resets its password.
  const version = decoded.authVersion ?? 0;
  if (!user || !Number.isSafeInteger(version) || version !== (user.authVersion || 0)) throw new Error('Expired session');
  return { userId: String(user._id), authVersion: version };
}
