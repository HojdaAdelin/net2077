import Event from '../models/Event.js';
import EventParticipation from '../models/EventParticipation.js';
import Question from '../models/Question.js';
import { eventError, eventId, eventInput, eventStatus, scoreEvent, eventQuestions, publicEvent } from '../utils/eventCompetition.js';

const handle = action => async (req, res) => {
  try { await action(req, res); }
  catch (error) {
    if (!error.status) console.error('[Events]', error);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to process this event request.' });
  }
};
const findEvent = async (req, questions = false) => {
  const query = Event.findById(eventId(req.params.id)).populate('organizer', 'username');
  if (questions) query.select('+questions');
  const event = await query.lean();
  if (!event) throw eventError('Event not found.', 404);
  return event;
};
const ownParticipation = (req, answers = false) => {
  const query = EventParticipation.findOne({ eventId: eventId(req.params.id), userId: req.userId });
  return answers ? query.select('+answers').lean() : query.lean();
};
const visibleParticipation = (event, participation, now = Date.now()) => {
  if (!participation) return null;
  const ended = eventStatus(event, now) === 'ended';
  const value = { ...participation, finishedAt: ended ? event.endsAt : null };
  if (ended) return value;
  const { score, correctCount, ...visible } = value;
  return visible;
};
const attemptResponse = (event, participation, now = Date.now()) => {
  const status = eventStatus(event, now);
  return { event: publicEvent(event, now), serverNow: new Date(now),
    participation: participation ? { ...visibleParticipation(event, participation, now), answers: participation.answers || {} } : null,
    questions: participation && status !== 'upcoming' ? eventQuestions(event, status === 'ended') : [] };
};

export const listEvents = handle(async (req, res) => {
  const page = Math.max(1, Math.min(10000, Number(req.query.page) || 1));
  if (!Number.isInteger(page)) throw eventError('Invalid page.');
  const past = req.query.past === '1';
  const now = new Date();
  const filter = { endsAt: past ? { $lte: now } : { $gt: now } };
  if (req.query.q) {
    if (typeof req.query.q !== 'string' || req.query.q.length > 200) throw eventError('Invalid search.');
    filter.title = { $regex: req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  if (req.query.difficulty) {
    if (!['easy', 'normal', 'hard', 'unrated'].includes(req.query.difficulty)) throw eventError('Invalid event level.');
    filter.difficulty = req.query.difficulty;
  }
  const [total, events, next] = await Promise.all([
    Event.countDocuments(filter),
    Event.find(filter).sort({ startsAt: past ? -1 : 1, _id: 1 }).skip((page - 1) * 12).limit(12).populate('organizer', 'username').lean(),
    !past ? Event.findOne({ startsAt: { $gt: now } }).sort({ startsAt: 1, _id: 1 }).populate('organizer', 'username').lean() : null,
  ]);
  const ids = [...events, ...(next ? [next] : [])].map(event => event._id);
  const [counts, mine] = await Promise.all([
    EventParticipation.aggregate([{ $match: { eventId: { $in: ids } } }, { $group: { _id: '$eventId', count: { $sum: 1 } } }]),
    req.userId ? EventParticipation.find({ eventId: { $in: ids }, userId: req.userId }).select('eventId finishedAt').lean() : [],
  ]);
  const decorate = event => ({ ...publicEvent(event), participants: counts.find(item => String(item._id) === String(event._id))?.count || 0,
    joined: mine.some(item => String(item.eventId) === String(event._id)) });
  res.json({ events: events.map(decorate), nextEvent: next ? decorate(next) : null, total, page, totalPages: Math.max(1, Math.ceil(total / 12)), serverNow: now });
});

export const getEvent = handle(async (req, res) => {
  const event = await findEvent(req);
  const [participants, participation] = await Promise.all([
    EventParticipation.countDocuments({ eventId: event._id }), req.userId ? ownParticipation(req) : null,
  ]);
  res.json({ event: { ...publicEvent(event), participants }, participation: visibleParticipation(event, participation), serverNow: new Date() });
});

export const joinEvent = handle(async (req, res) => {
  const event = await findEvent(req);
  if (eventStatus(event) === 'ended') throw eventError('This event has ended.', 409);
  let participation;
  try {
    participation = await EventParticipation.findOneAndUpdate({ eventId: event._id, userId: req.userId },
      { $setOnInsert: { eventId: event._id, userId: req.userId } }, { upsert: true, new: true }).lean();
  } catch (error) {
    if (error.code !== 11000) throw error;
    participation = await ownParticipation(req);
  }
  res.json({ participation: visibleParticipation(event, participation), serverNow: new Date() });
});

export const getEventAttempt = handle(async (req, res) => {
  const event = await findEvent(req, true);
  let participation = await ownParticipation(req, true);
  if (!participation) throw eventError('Join this event before entering the competition.', 403);
  if (eventStatus(event) === 'live' && !participation.startedAt) {
    await EventParticipation.updateOne({ _id: participation._id, startedAt: null }, { $set: { startedAt: new Date() } });
    participation = await ownParticipation(req, true);
  }
  res.json(attemptResponse(event, participation));
});

export const saveEventAttempt = handle(async (req, res) => {
  const event = await findEvent(req, true);
  const now = Date.now();
  if (eventStatus(event, now) !== 'live') throw eventError('Answers are only accepted while the event is live.', 409);
  const participation = await ownParticipation(req, true);
  if (!participation) throw eventError('Join this event first.', 403);
  if (req.body.finish === true) throw eventError('The competition ends automatically when the time expires.');
  if (!Number.isInteger(req.body.revision)) throw eventError('Invalid competition save.');
  const result = scoreEvent(event.questions, req.body.answers);
  const changed = JSON.stringify(result.answers) !== JSON.stringify(participation.answers || {});
  const update = { ...result, startedAt: participation.startedAt || new Date(now) };
  if (changed) {
    update.lastAnsweredAt = new Date(now);
    update.elapsedSeconds = Math.floor((now - +new Date(event.startsAt)) / 1000);
  }
  const updated = await EventParticipation.findOneAndUpdate({ _id: participation._id, revision: req.body.revision },
    { $set: update, $inc: { revision: 1 } }, { new: true }).select('+answers').lean();
  if (!updated) throw eventError('Your answers changed in another tab. Reload before continuing.', 409);
  res.json(attemptResponse(event, updated, now));
});

export const eventLeaderboard = handle(async (req, res) => {
  const event = await findEvent(req);
  if (eventStatus(event) !== 'ended') return res.json({ published: false, entries: [], total: 0,
    page: 1, totalPages: 1, myRank: null, availableAt: event.endsAt, serverNow: new Date() });
  const page = Number(req.query.page || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw eventError('Invalid leaderboard page.');
  const filter = { eventId: event._id };
  const order = { score: -1, elapsedSeconds: 1, createdAt: 1, _id: 1 };
  const [total, entries, mine] = await Promise.all([
    EventParticipation.countDocuments(filter),
    EventParticipation.find(filter).sort(order).skip((page - 1) * 50).limit(50)
      .populate('userId', 'username level frames.active nameEffects.active').lean(),
    req.userId ? ownParticipation(req) : null,
  ]);
  let myRank = null;
  if (mine) myRank = 1 + await EventParticipation.countDocuments({ ...filter, $or: [
    { score: { $gt: mine.score } },
    { score: mine.score, elapsedSeconds: { $lt: mine.elapsedSeconds } },
    { score: mine.score, elapsedSeconds: mine.elapsedSeconds, createdAt: { $lt: mine.createdAt } },
    { score: mine.score, elapsedSeconds: mine.elapsedSeconds, createdAt: mine.createdAt, _id: { $lt: mine._id } },
  ] });
  res.json({ entries: entries.map((entry, index) => ({ rank: (page - 1) * 50 + index + 1,
    user: entry.userId ? { username: entry.userId.username, level: entry.userId.level, frame: entry.userId.frames?.active, nameEffect: entry.userId.nameEffects?.active } : null,
    score: entry.score, correctCount: entry.correctCount, answeredCount: entry.answeredCount, elapsedSeconds: entry.elapsedSeconds,
    status: 'finished',
    isMe: String(entry.userId?._id) === req.userId })), published: true, total, page, totalPages: Math.max(1, Math.ceil(total / 50)), myRank, serverNow: new Date() });
});

async function selectedQuestions(ids) {
  ids = ids.map(eventId);
  const found = await Question.find({ _id: { $in: ids } }).lean();
  if (found.length !== ids.length) throw eventError('Some selected questions were removed. Refresh your selection.');
  return ids.map(id => {
    const question = found.find(item => String(item._id) === id);
    if (!question.answers?.length || !question.correctAnswers?.length || !Number.isFinite(question.points) || question.points <= 0) throw eventError('Selected questions must have answers and positive points.');
    validateQuestion(question);
    return { ...question, _id: String(question._id) };
  });
}
function validateQuestion(question) {
  if (new Set(question.correctAnswers).size !== question.correctAnswers.length || question.correctAnswers.some(index => !Number.isInteger(index) || index < 0 || index >= question.answers.length)) throw eventError('A selected question has invalid correct answers.');
}
export const createEvent = handle(async (req, res) => {
  const input = eventInput(req.body);
  const questions = await selectedQuestions(req.body.questionIds);
  const event = await Event.create({ ...input, questions, questionCount: questions.length,
    totalPoints: questions.reduce((sum, question) => sum + question.points, 0), organizer: req.userId });
  res.status(201).json({ event: publicEvent(event) });
});
export const getEventEditor = handle(async (req, res) => {
  const event = await findEvent(req, true);
  res.json({ event: { ...publicEvent(event), questionIds: event.questions.map(question => String(question._id)), questions: eventQuestions(event) } });
});
export const updateEvent = handle(async (req, res) => {
  const input = eventInput(req.body);
  if (!Number.isInteger(req.body.revision)) throw eventError('Reload the event editor.', 409);
  const questions = await selectedQuestions(req.body.questionIds);
  const event = await Event.findOneAndUpdate({ _id: eventId(req.params.id), revision: req.body.revision, startsAt: { $gt: new Date() } },
    { $set: { ...input, questions, questionCount: questions.length, totalPoints: questions.reduce((sum, question) => sum + question.points, 0) }, $inc: { revision: 1 } }, { new: true });
  if (!event) throw eventError('The event has started or was edited elsewhere. Reload to continue.', 409);
  res.json({ event: publicEvent(event) });
});

export const deleteEvent = handle(async (req, res) => {
  const id = eventId(req.params.id);
  const event = await Event.findById(id).select('endsAt').lean();
  if (event) {
    if (+new Date(event.endsAt) > Date.now()) throw eventError('Only finished events can be deleted.', 409);
    const deleted = await Event.findOneAndDelete({ _id: id, endsAt: { $lte: new Date() } });
    if (!deleted) throw eventError('The event changed while deleting. Reload and try again.', 409);
  }
  // Also clean up on retries if the event was removed but participation cleanup failed.
  await EventParticipation.deleteMany({ eventId: id });
  res.json({ success: true });
});
