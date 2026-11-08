import { publicQuestion, validateAnswers } from './questionValidation.js';

export const eventError = (message, status = 400) => Object.assign(new Error(message), { status });
export const eventStatus = (event, now = Date.now()) => now < +new Date(event.startsAt) ? 'upcoming' : now < +new Date(event.endsAt) ? 'live' : 'ended';
export const eventId = value => {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) throw eventError('Invalid event ID.');
  return value.toLowerCase();
};

export function eventInput(body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw eventError('Invalid event details.');
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const startsAt = typeof body.startsAt === 'string' ? new Date(body.startsAt) : new Date(NaN);
  const durationMinutes = body.durationMinutes;
  if (!title || title.length > 160) throw eventError('Enter a title of up to 160 characters.');
  if (!description || description.length > 6000) throw eventError('Enter a description of up to 6,000 characters.');
  if (!Number.isFinite(+startsAt) || +startsAt <= now) throw eventError('Choose a start date in the future.');
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 1440) throw eventError('Duration must be between 5 and 1,440 minutes.');
  if (!['easy', 'normal', 'hard', 'unrated'].includes(body.difficulty)) throw eventError('Choose a valid event level.');
  if (!Array.isArray(body.questionIds) || !body.questionIds.length || body.questionIds.length > 200) throw eventError('Select between 1 and 200 unique questions.');
  body.questionIds.forEach(eventId);
  if (new Set(body.questionIds.map(eventId)).size !== body.questionIds.length) throw eventError('Select unique questions.');
  return { title, description, startsAt, durationMinutes, endsAt: new Date(+startsAt + durationMinutes * 60000), difficulty: body.difficulty };
}

export function scoreEvent(questions, answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw eventError('Invalid answers.');
  const ids = new Set(questions.map(question => String(question._id)));
  if (Object.keys(answers).some(id => !ids.has(id))) throw eventError('Unknown competition question.');
  let score = 0, correctCount = 0, answeredCount = 0;
  const normalized = {};
  for (const question of questions) {
    const selected = answers[String(question._id)] || [];
    const correct = validateAnswers(question, selected);
    if (selected.length) { normalized[String(question._id)] = [...selected]; answeredCount++; }
    if (correct) { score += question.points; correctCount++; }
  }
  return { answers: normalized, score, correctCount, answeredCount };
}

export function eventQuestions(event, reveal = false) {
  return event.questions.map(question => reveal ? { ...publicQuestion(question), correctAnswers: question.correctAnswers, explanation: question.explanation } : publicQuestion(question));
}

export function publicEvent(event, now = Date.now()) {
  return { _id: event._id, title: event.title, description: event.description, startsAt: event.startsAt,
    endsAt: event.endsAt, durationMinutes: event.durationMinutes, difficulty: event.difficulty,
    questionCount: event.questionCount, totalPoints: event.totalPoints, revision: event.revision,
    status: eventStatus(event, now), organizer: event.organizer?.username || 'NET2077' };
}
