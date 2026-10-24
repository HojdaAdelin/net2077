import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import PasswordResetLimit from '../models/PasswordResetLimit.js';

export const RESET_TTL = 15 * 60 * 1000;
export const GRANT_TTL = 5 * 60 * 1000;
export const resetError = (code, message, status = 400, retryAfter) => Object.assign(new Error(message), { code, status, retryAfter });
export const resetDigest = (scope, value) => createHmac('sha256', process.env.JWT_SECRET).update(`${scope}:${value}`).digest('hex');
export const generateResetCode = () => String(randomInt(0, 100000000)).padStart(8, '0');
export const passwordState = user => resetDigest('password-state', JSON.stringify([String(user._id), user.password, user.email, user.authVersion || 0]));
export const versionCondition = version => version ? version : { $in: [0, null] };
export const sameDigest = (left, right) => typeof left === 'string' && typeof right === 'string' &&
  left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right));

export function normalizeResetEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    throw resetError('INVALID_EMAIL', 'Enter a valid email address.');
  }
  return value.trim().toLowerCase();
}

export async function takeResetLimit(scope, identity, maximum, windowMs, now = new Date()) {
  const window = Math.floor(now.getTime() / windowMs);
  const end = (window + 1) * windowMs;
  try {
    await PasswordResetLimit.findOneAndUpdate({ _id: `${scope}:${resetDigest('limit', identity)}:${window}`, count: { $lt: maximum } },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(end) } }, { upsert: true, new: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    throw resetError('RATE_LIMITED', 'Too many attempts. Please try again later.', 429, Math.max(1, Math.ceil((end - now.getTime()) / 1000)));
  }
}

export async function takeResetCooldown(email, now = new Date()) {
  const id = `reset-cooldown:${resetDigest('limit', email)}`;
  try {
    await PasswordResetLimit.findOneAndUpdate({ _id: id, expiresAt: { $lte: now } },
      { $set: { expiresAt: new Date(now.getTime() + 60000), count: 1 } }, { upsert: true, new: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await PasswordResetLimit.findById(id);
    const wait = Math.max(1, Math.ceil((new Date(existing?.expiresAt || now).getTime() - now.getTime()) / 1000));
    throw resetError('RATE_LIMITED', 'Please wait before requesting another code.', 429, wait);
  }
}
