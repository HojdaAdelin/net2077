const fail = message => Object.assign(new Error(message), { status: 400 });
const text = (value, name, maximum) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) {
    throw fail(`${name} is required and must contain at most ${maximum} characters.`);
  }
  return value.trim();
};
const whole = (value, name, maximum) => {
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '' ||
      !Number.isSafeInteger(Number(value)) || Number(value) < 0 || Number(value) > maximum) {
    throw fail(`${name} must be a whole number between 0 and ${maximum}.`);
  }
  return Number(value);
};
export function terminalId(value) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) throw fail('Invalid terminal ID.');
  return value.toLowerCase();
}

export function terminalProblemInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('Invalid problem.');
  if (!['easy', 'medium', 'hard'].includes(body.difficulty)) throw fail('Choose a valid difficulty.');
  if (!Array.isArray(body.acceptedCommands) || !body.acceptedCommands.length || body.acceptedCommands.length > 100) {
    throw fail('Add between 1 and 100 accepted commands.');
  }
  return {
    title: text(body.title, 'Title', 300),
    description: text(body.description, 'Description', 10000),
    difficulty: body.difficulty,
    points: whole(body.points, 'Points', 10000),
    order: whole(body.order, 'Order', 1000000),
    acceptedCommands: [...new Set(body.acceptedCommands.map(command => text(command, 'Accepted command', 2000)))],
  };
}

export function terminalCategoryInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('Invalid category.');
  if (typeof body.levelColor !== 'string' || !/^#[a-f\d]{6}$/i.test(body.levelColor)) throw fail('Choose a valid tag color.');
  if (!Array.isArray(body.questions) || body.questions.length > 10000) throw fail('Invalid category problems.');
  if (body.badge !== undefined && body.badge !== null && body.badge !== '' &&
      (typeof body.badge !== 'string' || !/^terminal_[a-z\d][a-z\d_. -]{0,150}\.(png|jpe?g|webp|avif|gif|svg)$/i.test(body.badge))) {
    throw fail('Choose a terminal badge from the available images.');
  }
  return {
    name: text(body.name, 'Category name', 120),
    levelName: text(body.levelName, 'Level name', 40),
    levelColor: body.levelColor.toLowerCase(),
    questions: [...new Set(body.questions.map(terminalId))],
    ...(body.badge !== undefined ? { badge: body.badge || null } : {}),
  };
}
