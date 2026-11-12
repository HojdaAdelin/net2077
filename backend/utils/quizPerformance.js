import { createHash, randomBytes } from 'node:crypto';
import User from '../models/User.js';
import { performanceKey, performanceScopes } from './questionRecommendations.js';

export const PERFORMANCE_WINDOW_MS = 7 * 86400000;
export function practiceReceipt(submissionId, questionId, now = Date.now()) {
  if (!submissionId) return { source: `legacy:${randomBytes(16).toString('hex')}`, expiresAt: new Date(now + PERFORMANCE_WINDOW_MS) };
  if (typeof submissionId !== 'string' || !/^\d{13}\.[a-f\d-]{36}$/.test(submissionId)) throw Object.assign(new Error('Invalid answer submission.'), { status: 400 });
  const issuedAt = Number(submissionId.split('.')[0]);
  if (issuedAt > now + 300000 || issuedAt + PERFORMANCE_WINDOW_MS <= now) throw Object.assign(new Error('This practice session expired. Reload the quiz.'), { status: 410 });
  return { source: `practice:${submissionId}:${questionId}`, expiresAt: new Date(issuedAt + PERFORMANCE_WINDOW_MS) };
}

export function performanceUpdate(event, now = new Date()) {
  if (!(event.expiresAt > now)) return null;
  const key = createHash('sha256').update(event.source).digest('hex');
  const increments = {}, changes = {};
  for (const scope of performanceScopes(event.question)) {
    const path = `quizPerformance.${performanceKey(scope.category, scope.type, scope.tag)}`;
    increments[`${path}.${event.correct ? 'correct' : 'wrong'}`] = 1;
    for (const [field, value] of Object.entries(scope)) changes[`${path}.${field}`] = value;
    changes[`${path}.lastAnsweredAt`] = now;
  }
  return { filter: { 'quizAnswerReceipts.key': { $ne: key } }, update: {
    $inc: increments, $set: changes, $min: { quizStatsSince: now },
    $push: { quizAnswerReceipts: { key, expiresAt: event.expiresAt } },
  } };
}

export const createPerformanceRecorder = users => async (userId, events) => {
  if (!userId || !events.length) return;
  const now = new Date();
  const updates = events.map(event => performanceUpdate(event, now)).filter(Boolean);
  if (!updates.length) return;
  // Expired receipts are only retry guards; lifetime counters are never pruned.
  await users.updateOne({ _id: userId }, { $pull: { quizAnswerReceipts: { expiresAt: { $lte: now } } } });
  await users.bulkWrite(updates.map(({ filter, update }) => ({ updateOne: { filter: { _id: userId, ...filter }, update } })), { ordered: true });
};
export const recordQuizPerformance = createPerformanceRecorder(User);
