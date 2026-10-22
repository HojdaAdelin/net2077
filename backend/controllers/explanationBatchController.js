import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import Question from '../models/Question.js';
import { questionSearchFilter } from '../utils/questionSearch.js';
import { parseExplanationBatch, MAX_EXPLANATION_BATCH } from '../utils/explanationBatch.js';

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const fields = ['title', 'answers', 'correctAnswers', 'type', 'tags', 'difficulty', 'points', 'multipleCorrect', 'updatedAt', '__v'];
const fingerprint = question => createHash('sha256').update(JSON.stringify(fields.map(field => question[field]))).digest('hex');
const hasExplanation = question => typeof question.explanation === 'string' && question.explanation.trim().length > 0;
const readBatch = req => {
  let batch;
  try { batch = jwt.verify(req.body?.token, process.env.JWT_SECRET, { algorithms: ['HS256'], subject: String(req.userId) }); }
  catch { throw fail('This batch is invalid or expired. Prepare a new batch and review the associations again.', 409); }
  if (batch.purpose !== 'explanation-batch-v1' || !Array.isArray(batch.entries) || !batch.entries.length || batch.entries.length > MAX_EXPLANATION_BATCH) {
    throw fail('Invalid explanation batch.');
  }
  let explanations;
  try { explanations = parseExplanationBatch(req.body.text, batch.entries.length); }
  catch (error) { throw fail(error.message); }
  return { batch, explanations };
};

export const previewExplanationBatch = async (req, res) => {
  try { res.json({ entries: readBatch(req).explanations }); }
  catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to preview explanations.' }); }
};

export const prepareExplanationBatch = async (req, res) => {
  try {
    const size = req.query.size === undefined ? 25 : Number(req.query.size);
    if (![25, 50, MAX_EXPLANATION_BATCH].includes(size)) throw fail('Choose a batch size of 25, 50 or 100.');
    const filter = questionSearchFilter({ ...req.query, hasExplanation: 'no' });
    const questions = await Question.find(filter).sort({ createdAt: -1, _id: -1 }).limit(size).lean();
    if (!questions.length) throw fail('No questions without an explanation match these filters.');
    const token = jwt.sign({ purpose: 'explanation-batch-v1', entries: questions.map(question => ({
      id: String(question._id), hash: fingerprint(question)
    })) }, process.env.JWT_SECRET, { algorithm: 'HS256', subject: String(req.userId), expiresIn: '24h' });
    res.json({ token, questions: questions.map((question, index) => ({ ...question, number: index + 1 })) });
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to prepare the explanation batch.' }); }
};

export const applyExplanationBatch = async (req, res) => {
  try {
    const { batch, explanations } = readBatch(req);
    const questions = await Question.find({ _id: { $in: batch.entries.slice(0, explanations.length).map(entry => entry.id) } }).lean();
    const byId = new Map(questions.map(question => [String(question._id), question]));
    const results = [];
    const apply = async ({ number, explanation }) => {
      const snapshot = batch.entries[number - 1];
      const result = status => ({ number, id: snapshot.id, status });
      const question = byId.get(snapshot.id);
      if (!question) return result('missing');
      if (question.explanation === explanation) return result('already-saved');
      if (hasExplanation(question) || fingerprint(question) !== snapshot.hash) return result('conflict');
      // Match the reviewed content and empty explanation again in the write,
      // so an edit between this read and update is never overwritten.
      const filter = { _id: snapshot.id, explanation: { $not: { $regex: '\\S' } } };
      for (const field of fields) filter[field] = question[field] === undefined ? { $exists: false } : { $eq: question[field] };
      const updated = await Question.updateOne(filter, { $set: { explanation } }, { runValidators: true });
      if (updated.matchedCount) return result('saved');
      const current = await Question.findById(snapshot.id).lean();
      return result(current?.explanation === explanation ? 'already-saved' : current ? 'conflict' : 'missing');
    };
    // Bound concurrent writes and preserve one result per reviewed question.
    for (let offset = 0; offset < explanations.length; offset += 10) {
      const chunk = explanations.slice(offset, offset + 10);
      const outcomes = await Promise.allSettled(chunk.map(apply));
      outcomes.forEach((outcome, index) => results.push(outcome.status === 'fulfilled' ? outcome.value : {
        number: chunk[index].number, id: batch.entries[chunk[index].number - 1].id, status: 'error'
      }));
    }
    res.json({ results, saved: results.filter(result => result.status === 'saved').length,
      alreadySaved: results.filter(result => result.status === 'already-saved').length,
      skipped: results.filter(result => ['conflict', 'missing'].includes(result.status)).length,
      errors: results.filter(result => result.status === 'error').length });
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to save the explanation batch. You can safely retry the same batch.' }); }
};
