export const explanationAfterAnswer = question => typeof question.explanation === 'string' && question.explanation.trim() ? { explanation: question.explanation } : {};

export const publicQuestion = (question) => {
  const object = question.toObject ? question.toObject() : { ...question };
  if (object.correctAnswers?.length) object.multipleCorrect = object.correctAnswers.length > 1;
  delete object.correctAnswers;
  delete object.correctIndex;
  delete object.explanation;
  return object;
};

export const validateAnswers = (question, answers) => {
  if (!Array.isArray(answers) || new Set(answers).size !== answers.length ||
      answers.some(index => !Number.isInteger(index) || index < 0 || index >= question.answers.length)) {
    const error = new Error('Invalid selected answers');
    error.status = 400;
    throw error;
  }
  const expected = question.correctAnswers || [question.correctIndex];
  return expected.length > 0 && answers.length === expected.length && answers.every(index => expected.includes(index));
};

// Strip solutions from every public question response, including aggregate queries.
export const hideQuestionSolutions = (req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => json(Array.isArray(body) ? body.map(publicQuestion) :
    body?.answers ? publicQuestion(body) : body);
  next();
};

export const hideArenaSolutions = (req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (!body?.match) return json(body);
    const match = body.match.toObject ? body.match.toObject({ flattenMaps: true }) : body.match;
    const creatorId = String(match.creator?._id || match.creator);
    const checked = creatorId === req.userId ? match.creatorAnswers : match.opponentAnswers;
    if (match.status !== 'finished') {
      match.questions = match.questions.map(q => q?.answers && !Object.hasOwn(checked || {}, String(q._id)) ? publicQuestion(q) : q);
    }
    return json({ ...body, match });
  };
  next();
};
