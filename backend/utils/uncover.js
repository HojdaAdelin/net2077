import { applyPrivilege } from './xpUtils.js';

export const uncoverDecisionKey = (questionId, optionIndex) => `${questionId}_${optionIndex}`;

export function uncoverProgress(attempt) {
  let completedQuestions = 0, xp = 0;
  const state = (questionIndex, optionIndex, failed = false) => ({ completedQuestions, xp,
    questionIndex, optionIndex, failed, totalQuestions: attempt.questions.length,
    ended: failed || completedQuestions === attempt.questions.length });
  for (let questionIndex = 0; questionIndex < attempt.questions.length; questionIndex++) {
    const question = attempt.questions[questionIndex];
    for (let optionIndex = 0; optionIndex < question.answers.length; optionIndex++) {
      const key = uncoverDecisionKey(question._id, optionIndex);
      if (!attempt.uncoverDecisions.has(key)) return state(questionIndex, optionIndex);
      if (attempt.uncoverDecisions.get(key) !== question.correctAnswers.includes(optionIndex)) {
        return state(questionIndex, optionIndex, true);
      }
    }
    completedQuestions++;
    xp += applyPrivilege((question.points || 1) * 3, { xpPrivilege: attempt.challengePrivilege });
  }
  return state(attempt.questions.length, 0);
}
