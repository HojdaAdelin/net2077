import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import { passwordResetMailer, resetMailConfigured } from '../services/passwordResetMailer.js';
import { RESET_TTL, GRANT_TTL, resetError, resetDigest, generateResetCode, passwordState, sameDigest,
  normalizeResetEmail, takeResetLimit, takeResetCooldown, versionCondition } from '../utils/passwordReset.js';

const invalidCode = () => resetError('INVALID_CODE', 'The code is incorrect, expired or no longer available. Request a new code.');
const ip = req => req.ip || req.socket?.remoteAddress || 'unknown';
const sendError = (res, error) => {
  if (error.retryAfter) res.set('Retry-After', String(error.retryAfter));
  return res.status(error.status || 503).json({ success: false, code: error.code || 'UNAVAILABLE',
    message: error.status ? error.message : 'Password reset is temporarily unavailable. Please try again later.',
    ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}) });
};

export const requestPasswordReset = async (req, res) => {
  const started = Date.now();
  // Pad normal requests equally; do not fast-exit when the account is absent.
  const minimumTime = 1200 + Math.floor(Math.random() * 250);
  const waitForResponse = () => new Promise(resolve => setTimeout(resolve, Math.max(0, started + minimumTime - Date.now())));
  try {
    const email = normalizeResetEmail(req.body?.email);
    if (!resetMailConfigured()) throw resetError('UNAVAILABLE', 'Password reset is temporarily unavailable. Please try again later.', 503);
    const now = new Date();
    await takeResetLimit('reset-request-ip', ip(req), 10, 3600000, now);
    await takeResetCooldown(email, now);
    await takeResetLimit('reset-request-email', email, 3, 3600000, now);
    // Reserve headroom within Brevo Free's allowance for other site emails.
    await takeResetLimit('reset-request-global', 'all', 250, 86400000, now);
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ email: { $regex: `^${escaped}$`, $options: 'i' } }).select('_id email password authVersion');
    const requestId = randomBytes(32).toString('hex');
    const code = generateResetCode();
    const emailHash = resetDigest('email', email);
    const expiresAt = new Date(Date.now() + RESET_TTL);
    await PasswordReset.create({ _id: requestId, userId: user?._id || null, emailHash,
      passwordState: user ? passwordState(user) : undefined,
      codeHash: resetDigest('code', `${requestId}:${code}`), status: 'delivering', expiresAt });
    let delivered = !user;
    if (user) {
      try { await passwordResetMailer.send({ to: user.email, code }); delivered = true; }
      catch (error) { console.error('[PasswordReset] Email delivery unavailable.', error.providerStatus ? `HTTP ${error.providerStatus}` : 'Network or timeout'); }
    }
    if (delivered) {
      await PasswordReset.updateMany({ emailHash, _id: { $ne: requestId }, status: { $in: ['pending', 'verified'] } },
        { $set: { status: 'superseded' }, $unset: { grantHash: 1 } });
    }
    await PasswordReset.updateOne({ _id: requestId, status: 'delivering' }, { $set: { status: delivered ? 'pending' : 'failed' } });
    // The same shape/status/message applies to unknown addresses and delivery failures.
    await waitForResponse();
    res.json({ success: true, message: 'If an account exists for this email, you will receive a reset code.',
      requestId, expiresAt: expiresAt.toISOString(), serverTime: new Date().toISOString(), resendAfter: 60 });
  } catch (error) { await waitForResponse(); sendError(res, error); }

};

export const verifyPasswordReset = async (req, res) => {
  try {
    const { requestId, code } = req.body || {};
    if (typeof requestId !== 'string' || !/^[a-f\d]{64}$/.test(requestId) || typeof code !== 'string' || !/^\d{8}$/.test(code)) throw invalidCode();
    await takeResetLimit('reset-verify-ip', ip(req), 50, 900000);
    const now = new Date();
    const attempt = await PasswordReset.findOneAndUpdate({ _id: requestId, status: 'pending', expiresAt: { $gt: now }, attempts: { $lt: 5 } },
      { $inc: { attempts: 1 } }, { new: true });
    if (!attempt) throw invalidCode();
    if (!sameDigest(attempt.codeHash, resetDigest('code', `${requestId}:${code}`)) || !attempt.userId) {
      if (attempt.attempts >= 5) await PasswordReset.updateOne({ _id: requestId, status: 'pending', attempts: { $gte: 5 } }, { $set: { status: 'locked' } });
      throw invalidCode();
    }
    const user = await User.findById(attempt.userId).select('_id email password authVersion');
    if (!user || !sameDigest(passwordState(user), attempt.passwordState)) throw invalidCode();
    const grant = randomBytes(32).toString('hex');
    const grantExpiresAt = new Date(Math.min(new Date(attempt.expiresAt).getTime(), Date.now() + GRANT_TTL));
    const verified = await PasswordReset.findOneAndUpdate({ _id: requestId, status: 'pending', attempts: attempt.attempts,
      expiresAt: { $gt: new Date() } }, { $set: { status: 'verified', grantHash: resetDigest('grant', `${requestId}:${grant}`), grantExpiresAt } }, { new: true });
    if (!verified) throw invalidCode();
    res.json({ success: true, resetToken: grant, expiresAt: grantExpiresAt.toISOString(), serverTime: new Date().toISOString() });
  } catch (error) { sendError(res, error); }
};

export const completePasswordReset = async (req, res) => {
  try {
    const { requestId, resetToken, password, confirmPassword } = req.body || {};
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      throw resetError('INVALID_PASSWORD', 'Use at least 8 characters. The password must not exceed 72 bytes.');
    }
    if (password !== confirmPassword) throw resetError('PASSWORD_MISMATCH', 'Passwords do not match.');
    if (typeof requestId !== 'string' || !/^[a-f\d]{64}$/.test(requestId) || typeof resetToken !== 'string' || !/^[a-f\d]{64}$/.test(resetToken)) {
      throw resetError('RESET_EXPIRED', 'The reset session is invalid or expired. Request a new code.');
    }
    await takeResetLimit('reset-complete-ip', ip(req), 20, 900000);
    const now = new Date();
    const filter = { _id: requestId, status: 'verified', expiresAt: { $gt: now }, grantExpiresAt: { $gt: now },
      grantHash: resetDigest('grant', `${requestId}:${resetToken}`) };
    const attempt = await PasswordReset.findOne(filter);
    if (!attempt?.userId) throw resetError('RESET_EXPIRED', 'The reset session is invalid or expired. Request a new code.');
    const user = await User.findById(attempt.userId).select('_id email password authVersion');
    if (!user || !sameDigest(passwordState(user), attempt.passwordState)) throw resetError('RESET_EXPIRED', 'The account changed. Request a new code.');
    const hashedPassword = await bcrypt.hash(password, 10);
    const consumed = await PasswordReset.findOneAndUpdate({ ...filter, expiresAt: { $gt: new Date() }, grantExpiresAt: { $gt: new Date() } },
      { $set: { status: 'consumed' }, $unset: { grantHash: 1, codeHash: 1 } }, { new: true });
    if (!consumed) throw resetError('RESET_EXPIRED', 'The reset session has already been used or expired. Request a new code.');
    const changed = await User.findOneAndUpdate({ _id: user._id, password: user.password, email: user.email,
      authVersion: versionCondition(user.authVersion || 0) }, { $set: { password: hashedPassword }, $inc: { authVersion: 1 } }, { new: true });
    if (!changed) throw resetError('RESET_EXPIRED', 'The account changed. Request a new code.');
    const production = process.env.NODE_ENV === 'production';
    res.clearCookie('token', { httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax', path: '/' });
    res.json({ success: true, message: 'Password changed. Sign in with your new password.' });
  } catch (error) { sendError(res, error); }
};
