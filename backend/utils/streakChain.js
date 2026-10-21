import { validateAnswers } from './questionValidation.js';
import { applyPrivilege } from './xpUtils.js';

export function chainProgress(attempt) {
  let streak = 0, xp = 0, answered = 0, failed = false;
  for (const question of attempt.questions) {
    const answers = attempt.checked.get(String(question._id));
    if (!answers) break;
    answered++;
    if (!validateAnswers(question, answers)) { failed = true; break; }
    streak++;
    // Integer tenths avoid floating point over-rounding (e.g. 100 * 1.1).
    const reward = Math.ceil((question.points || 1) * (10 + streak) / 10);
    xp += applyPrivilege(reward, { xpPrivilege: attempt.chainPrivilege });
  }
  return { streak, xp, answered, failed, totalQuestions: attempt.questions.length,
    ended: failed || answered === attempt.questions.length,
    multiplier: (10 + Math.min(streak + 1, 20)) / 10 };
}
