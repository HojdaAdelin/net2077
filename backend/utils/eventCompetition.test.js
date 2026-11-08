import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import eventRoutes from '../routes/eventRoutes.js';
import Event from '../models/Event.js';
import EventParticipation from '../models/EventParticipation.js';
import Question from '../models/Question.js';
import { eventInput, eventStatus, eventQuestions, publicEvent, scoreEvent } from './eventCompetition.js';
import { getEventAttempt, getEvent, saveEventAttempt, joinEvent, createEvent, updateEvent, deleteEvent, eventLeaderboard } from '../controllers/eventController.js';

const eventId = '0123456789abcdef01234567', userId = 'abcdef0123456789abcdef01';
const questionId = 'abcdef0123456789abcdef02', secondId = 'abcdef0123456789abcdef03';
const now = Date.now();
const questions = [
  { _id: questionId, title: 'Choose A', answers: ['A', 'B'], correctAnswers: [0], points: 3, explanation: 'Private solution' },
  { _id: secondId, title: 'Choose both', answers: ['A', 'B', 'C'], correctAnswers: [0, 2], points: 5, explanation: 'Private solution' },
];
const competition = (changes = {}) => ({ _id: eventId, title: 'Local round', description: 'Simulation',
  startsAt: new Date(now - 60000), endsAt: new Date(now + 60000), durationMinutes: 2, difficulty: 'normal',
  questions, questionCount: 2, totalPoints: 8, revision: 1, organizer: { username: 'Host' }, ...changes });
const input = (changes = {}) => ({ title: 'Local round', description: 'Simulation', startsAt: new Date(now + 3600000).toISOString(),
  durationMinutes: 90, difficulty: 'normal', questionIds: [questionId, secondId], ...changes });
const participation = (changes = {}) => ({ _id: userId, eventId, userId, answers: {}, revision: 0, finishedAt: null,
  startedAt: null, score: 0, correctCount: 0, answeredCount: 0, elapsedSeconds: 0, ...changes });
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const request = body => ({ params: { id: eventId }, userId, body });
const query = value => {
  const chain = { select: () => chain, populate: () => chain, sort: () => chain, skip: () => chain, limit: () => chain, lean: async () => value };
  return chain;
};
function mockEvent(t, event = competition(), entry = participation()) {
  t.mock.method(Event, 'findById', () => query(event));
  t.mock.method(EventParticipation, 'findOne', () => query(entry));
  t.after(() => t.mock.restoreAll());
}

test('schedule uses exact server boundaries', () => {
  const event = competition();
  assert.equal(eventStatus(event, +event.startsAt - 1), 'upcoming');
  assert.equal(eventStatus(event, +event.startsAt), 'live');
  assert.equal(eventStatus(event, +event.endsAt), 'ended');
});

test('organizer input validates dates, level, duration and question selection', () => {
  assert.equal(+eventInput(input(), now).endsAt, now + 3600000 + 90 * 60000);
  for (const changes of [{ title: ' ' }, { description: '' }, { startsAt: 'invalid' }, { startsAt: new Date(now).toISOString() },
    { durationMinutes: 4 }, { durationMinutes: 1441 }, { durationMinutes: '90' }, { difficulty: 'medium' },
    { questionIds: [] }, { questionIds: [questionId, questionId.toUpperCase()] }, { questionIds: ['invalid'] }, { questionIds: Array(201).fill(questionId) }]) {
    assert.throws(() => eventInput(input(changes), now), error => error.status === 400);
  }
});

test('public event and live question payloads never reveal correct answers or explanations', () => {
  const event = competition();
  assert.equal(publicEvent(event).questions, undefined);
  for (const question of eventQuestions(event)) {
    assert.equal(question.correctAnswers, undefined); assert.equal(question.explanation, undefined);
  }
  assert.equal(eventQuestions(event)[1].multipleCorrect, true);
  assert.deepEqual(eventQuestions(event, true)[1].correctAnswers, [0, 2]);
});

test('scoring is authoritative, weighted and order independent', () => {
  assert.deepEqual(scoreEvent(questions, { [questionId]: [0], [secondId]: [2, 0] }), {
    answers: { [questionId]: [0], [secondId]: [2, 0] }, score: 8, correctCount: 2, answeredCount: 2,
  });
  assert.equal(scoreEvent(questions, { [secondId]: [0] }).score, 0);
  assert.equal(scoreEvent(questions, {}).answeredCount, 0);
});

test('scoring rejects forged IDs, repeated indexes, invalid answer types and out-of-range indexes', () => {
  for (const answers of [null, [], { forged: [0] }, { [questionId]: [0, 0] }, { [questionId]: ['0'] }, { [questionId]: [-1] }, { [questionId]: [2] }]) {
    assert.throws(() => scoreEvent(questions, answers));
  }
});

test('enrolled users cannot open questions before start', async t => {
  mockEvent(t, competition({ startsAt: new Date(now + 60000) }));
  const res = response(); await getEventAttempt(request(), res);
  assert.equal(res.statusCode, 200); assert.deepEqual(res.body.questions, []);
});

test('only the enrolled account can load its attempt', async t => {
  mockEvent(t, competition(), null);
  const res = response(); await getEventAttempt(request(), res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.questions, undefined);
});

test('live attempts hide solutions even after an early submission', async t => {
  mockEvent(t, competition(), participation({ startedAt: new Date(now), finishedAt: new Date(now) }));
  const res = response(); await getEventAttempt(request(), res);
  assert.equal(res.body.questions[0].correctAnswers, undefined);
  assert.equal(res.body.questions[0].explanation, undefined);
  assert.equal(res.body.participation.score, undefined);
  assert.equal(res.body.participation.correctCount, undefined);
  assert.equal(res.body.participation.finishedAt, null);
});

test('ended attempts reveal question review to their owner', async t => {
  mockEvent(t, competition({ endsAt: new Date(now - 1) }));
  const res = response(); await getEventAttempt(request(), res);
  assert.deepEqual(res.body.questions[0].correctAnswers, [0]);
  assert.equal(res.body.participation.score, 0);
  assert.equal(+new Date(res.body.participation.finishedAt), now - 1);
});

test('saving outside the competition window is rejected before any participation write', async t => {
  mockEvent(t, competition({ endsAt: new Date(now - 1) }));
  const write = t.mock.method(EventParticipation, 'findOneAndUpdate', () => { throw new Error('Must not write'); });
  const res = response(); await saveEventAttempt(request({ answers: {}, revision: 0, finish: false }), res);
  assert.equal(res.statusCode, 409); assert.equal(write.mock.callCount(), 0);
});

test('answer saves use a revision guard and ignore client-provided scores', async t => {
  mockEvent(t);
  let updateFilter, update;
  t.mock.method(EventParticipation, 'findOneAndUpdate', (filter, changes) => {
    updateFilter = filter; update = changes;
    return query(participation({ ...changes.$set, revision: 1 }));
  });
  const res = response();
  await saveEventAttempt(request({ answers: { [questionId]: [0] }, score: 99999, correctCount: 99999, revision: 0, finish: false }), res);
  assert.equal(res.statusCode, 200); assert.equal(update.$set.score, 3); assert.equal(update.$set.correctCount, 1);
  assert.equal(updateFilter.revision, 0); assert.equal(update.$set.finishedAt, undefined);
  assert.equal(res.body.questions[0].correctAnswers, undefined);
  assert.equal(res.body.participation.score, undefined);
  assert.equal(res.body.participation.correctCount, undefined);
});

test('parallel stale saves cannot overwrite a newer attempt', async t => {
  mockEvent(t); t.mock.method(EventParticipation, 'findOneAndUpdate', () => query(null));
  const res = response(); await saveEventAttempt(request({ answers: {}, revision: 0, finish: false }), res);
  assert.equal(res.statusCode, 409);
});

test('legacy early submissions no longer lock answers during the competition', async t => {
  mockEvent(t, competition(), participation({ finishedAt: new Date(now), score: 3 }));
  const write = t.mock.method(EventParticipation, 'findOneAndUpdate', (filter, update) => query(participation({ ...update.$set, revision: 1 })));
  const res = response(); await saveEventAttempt(request({ answers: { [secondId]: [0, 2] }, revision: 0 }), res);
  assert.equal(res.statusCode, 200); assert.equal(write.mock.callCount(), 1);
  assert.equal(res.body.participation.score, undefined); assert.equal(res.body.participation.finishedAt, null);
});

test('saving unchanged answers keeps the time at which the score was saved', async t => {
  mockEvent(t, competition(), participation({ answers: { [questionId]: [0] }, lastAnsweredAt: new Date(now - 20000), elapsedSeconds: 40 }));
  let update;
  t.mock.method(EventParticipation, 'findOneAndUpdate', (filter, changes) => { update = changes; return query(participation({ ...changes.$set, revision: 1 })); });
  const res = response(); await saveEventAttempt(request({ answers: { [questionId]: [0] }, revision: 0 }), res);
  assert.equal(update.$set.finishedAt, undefined); assert.equal(update.$set.elapsedSeconds, undefined);
});

test('manual early finish requests are rejected without writing', async t => {
  mockEvent(t);
  const write = t.mock.method(EventParticipation, 'findOneAndUpdate', () => { throw new Error('Must not write'); });
  const res = response(); await saveEventAttempt(request({ answers: {}, revision: 0, finish: true }), res);
  assert.equal(res.statusCode, 400); assert.equal(write.mock.callCount(), 0);
});

test('event details never leak the participant score before the competition ends', async t => {
  mockEvent(t, competition(), participation({ score: 8, correctCount: 2 }));
  t.mock.method(EventParticipation, 'countDocuments', async () => 1);
  const res = response(); await getEvent(request(), res);
  assert.equal(res.body.participation.score, undefined); assert.equal(res.body.participation.correctCount, undefined);
});

test('leaderboard remains completely empty before the event ends without querying standings', async t => {
  mockEvent(t);
  const read = t.mock.method(EventParticipation, 'find', () => { throw new Error('Must not load standings'); });
  const res = response(); await eventLeaderboard({ ...request(), query: {} }, res);
  assert.equal(res.body.published, false); assert.deepEqual(res.body.entries, []);
  assert.equal(res.body.myRank, null); assert.equal(read.mock.callCount(), 0);
});

test('joining twice recovers duplicate-key races without creating another entry', async t => {
  mockEvent(t);
  t.mock.method(EventParticipation, 'findOneAndUpdate', () => ({ lean: async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }); } }));
  const res = response(); await joinEvent(request(), res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.participation.userId, userId);
});

test('joining a finished event is refused', async t => {
  mockEvent(t, competition({ endsAt: new Date(now - 1) }));
  const res = response(); await joinEvent(request(), res); assert.equal(res.statusCode, 409);
});

test('organizing freezes chosen content in selection order and rejects missing questions', async t => {
  t.after(() => t.mock.restoreAll());
  t.mock.method(Question, 'find', () => query([...questions].reverse()));
  let stored;
  t.mock.method(Event, 'create', async value => { stored = value; return { _id: eventId, ...value }; });
  const res = response(); await createEvent(request(input()), res);
  assert.equal(res.statusCode, 201); assert.equal(stored.totalPoints, 8);
  assert.deepEqual(stored.questions.map(question => question._id), [questionId, secondId]);
  assert.equal(res.body.event.questions, undefined);
  t.mock.method(Question, 'find', () => query([questions[0]]));
  const missing = response(); await createEvent(request(input()), missing); assert.equal(missing.statusCode, 400);
});

test('event editing checks both the revision and that the old start time is in the future', async t => {
  t.after(() => t.mock.restoreAll());
  t.mock.method(Question, 'find', () => query(questions));
  let guard;
  t.mock.method(Event, 'findOneAndUpdate', async filter => { guard = filter; return null; });
  const res = response(); await updateEvent(request({ ...input(), revision: 2 }), res);
  assert.equal(res.statusCode, 409); assert.equal(guard.revision, 2); assert.ok(guard.startsAt.$gt instanceof Date);
});

test('leaderboard exposes only standings and profile fields, never another user’s answers', async t => {
  mockEvent(t, competition({ endsAt: new Date(now - 1) }), null);
  t.mock.method(EventParticipation, 'countDocuments', async () => 1);
  t.mock.method(EventParticipation, 'find', () => query([{ ...participation(), answers: { [questionId]: [0] }, userId: { _id: userId, username: 'Learner', level: 5 } }]));
  const res = response(); await eventLeaderboard({ ...request(), query: {} }, res);
  assert.equal(res.body.entries[0].rank, 1); assert.equal(res.body.entries[0].answers, undefined);
  assert.equal(res.body.entries[0].user.username, 'Learner');
  assert.equal(res.body.published, true); assert.equal(res.body.entries[0].status, 'finished');
});

test('deleting a finished event removes its participation records without touching bank questions', async t => {
  mockEvent(t, competition({ endsAt: new Date(now - 1) }));
  let guard, cleanup;
  t.mock.method(Event, 'findOneAndDelete', async filter => { guard = filter; return { _id: eventId }; });
  t.mock.method(EventParticipation, 'deleteMany', async filter => { cleanup = filter; return { deletedCount: 2 }; });
  const bankDelete = t.mock.method(Question, 'deleteMany', () => { throw new Error('Must not delete bank questions'); });
  const res = response(); await deleteEvent(request(), res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.success, true);
  assert.equal(guard._id, eventId); assert.ok(guard.endsAt.$lte instanceof Date);
  assert.deepEqual(cleanup, { eventId }); assert.equal(bankDelete.mock.callCount(), 0);
});

test('live and upcoming events cannot be deleted', async t => {
  mockEvent(t);
  const remove = t.mock.method(Event, 'findOneAndDelete', () => { throw new Error('Must not delete'); });
  const cleanup = t.mock.method(EventParticipation, 'deleteMany', () => { throw new Error('Must not clean up'); });
  const res = response(); await deleteEvent(request(), res);
  assert.equal(res.statusCode, 409); assert.equal(remove.mock.callCount(), 0); assert.equal(cleanup.mock.callCount(), 0);
});

test('deletion retries can finish participation cleanup after the event is already gone', async t => {
  mockEvent(t, null);
  const cleanup = t.mock.method(EventParticipation, 'deleteMany', async () => ({ deletedCount: 1 }));
  const res = response(); await deleteEvent(request(), res);
  assert.equal(res.body.success, true); assert.equal(cleanup.mock.callCount(), 1);
});

test('deletion aborts before participation cleanup when the atomic event guard fails', async t => {
  mockEvent(t, competition({ endsAt: new Date(now - 1) }));
  t.mock.method(Event, 'findOneAndDelete', async () => null);
  const cleanup = t.mock.method(EventParticipation, 'deleteMany', () => { throw new Error('Must not clean up'); });
  const res = response(); await deleteEvent(request(), res);
  assert.equal(res.statusCode, 409); assert.equal(cleanup.mock.callCount(), 0);
});

test('HTTP routes allow public browsing, require login to compete, and enforce root organization', async t => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'events-test-secret-only';
  let role = 'user';
  t.mock.method(User, 'findById', () => ({ select: async () => ({ _id: userId, authVersion: 0, username: 'Learner', role }) }));
  const app = express(); app.use(express.json(), cookieParser()); app.use('/events', eventRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); t.mock.restoreAll();
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
  });
  const base = `http://127.0.0.1:${server.address().port}/events`;
  const token = jwt.sign({ userId, authVersion: 0 }, process.env.JWT_SECRET, { algorithm: 'HS256' });
  const send = (path, body, loggedIn = true, method = 'POST') => fetch(`${base}${path}`, { method,
    headers: { 'Content-Type': 'application/json', ...(loggedIn ? { Cookie: `token=${token}` } : {}) }, body: JSON.stringify(body) });
  assert.equal((await fetch(`${base}/invalid`)).status, 400, 'Public route is accessible without login');
  assert.equal((await send('', {}, false)).status, 401);
  assert.equal((await send(`/${eventId}/join`, {}, false)).status, 401);
  assert.equal((await send(`/${eventId}/attempt`, {}, false, 'PUT')).status, 401);
  assert.equal((await send(`/${eventId}`, {}, false, 'DELETE')).status, 401);
  assert.equal((await send(`/${eventId}`, {}, true, 'DELETE')).status, 403);
  assert.equal((await send('', {})).status, 403, 'Ordinary users cannot organize');
  assert.equal((await fetch(`${base}/${eventId}/editor`, { headers: { Cookie: `token=${token}` } })).status, 403);
  role = 'root';
  const root = await send('', {});
  assert.equal(root.status, 400, 'Root reaches event input validation');
  assert.match((await root.json()).message, /title/);
  const invalidDelete = await send('/invalid', {}, true, 'DELETE');
  assert.equal(invalidDelete.status, 400);
  assert.match((await invalidDelete.json()).message, /event ID/);
});
