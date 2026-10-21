import test from 'node:test';
import assert from 'node:assert/strict';
import Question from '../models/Question.js';
import { updateQuestion, exportAllQuestions } from '../controllers/questionController.js';
import { parseExplanation, wrapExplanationSelection } from '../../frontend/src/utils/explanationMarkup.js';

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const data = { title: 'Example', answers: ['A', 'B'], correctAnswers: [0], type: 'all' };

test('legacy questions remain valid without an explanation', () => {
  const question = new Question(data);
  assert.equal(question.validateSync(), undefined);
  assert.equal(question.explanation, undefined);
  assert.equal('explanation' in question.toObject(), false);
});

test('optional explanations support formatted text, empty values and enforce a size limit', () => {
  for (const explanation of ['', '**Bold** *italic* __underline__\n/* echo test */']) {
    const question = new Question({ ...data, explanation });
    assert.equal(question.validateSync(), undefined);
    assert.equal(question.toObject().explanation, explanation);
  }
  assert.ok(new Question({ ...data, explanation: 'a'.repeat(20001) }).validateSync());
});

test('root question edits persist the explanation with the rest of the question JSON', async t => {
  const question = new Question({ ...data, explanation: 'New **explanation**' });
  const update = t.mock.method(Question, 'findByIdAndUpdate', async (id, values, options) => {
    assert.equal(values.explanation, question.explanation);
    assert.equal(options.runValidators, true);
    return question;
  });
  const res = response();
  await updateQuestion({ params: { id: String(question._id) }, body: { ...data, explanation: question.explanation } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.question.explanation, question.explanation);
  assert.equal(update.mock.callCount(), 1);
});

test('invalid explanation payloads are rejected before updating a question', async t => {
  const update = t.mock.method(Question, 'findByIdAndUpdate', async () => { throw new Error('Should not write'); });
  for (const explanation of [null, 123, {}, [], 'a'.repeat(20001)]) {
    const res = response(); await updateQuestion({ params: { id: 'question' }, body: { explanation } }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(update.mock.callCount(), 0);
});

test('JSON export preserves explanations and supports old records', async t => {
  t.mock.method(Question, 'find', () => ({ lean: async () => [{ ...data, explanation: 'Saved explanation' }, data] }));
  const res = { setHeader() {}, send(body) { this.body = body; } };
  await exportAllQuestions({}, res);
  const exported = JSON.parse(res.body);
  assert.equal(exported[0].explanation, 'Saved explanation');
  assert.equal(exported[1].explanation, undefined);
});

test('formatting supports bold, italic, underline and combinations', () => {
  const parts = parseExplanation('**bold** *italic* __underlined__ **bold *and italic* text**');
  const nodes = parts[0].children;
  assert.deepEqual(nodes[0], { type: 'strong', children: [{ type: 'text', text: 'bold' }] });
  assert.equal(nodes[2].type, 'em'); assert.equal(nodes[4].type, 'underline');
  assert.equal(nodes[6].children[1].type, 'em');
});

test('code blocks keep formatting markers and HTML literal instead of interpreting them', () => {
  const code = '/*\necho "**literal**"\n<script>alert(1)</script>\n*/';
  const parsed = parseExplanation(`Explanation\n${code}\nDone`);
  assert.equal(parsed[1].type, 'code'); assert.equal(parsed[1].text, code);
  assert.equal(parseExplanation('<img src=x onerror=alert(1)>')[0].children[0].type, 'text');
  assert.equal(parseExplanation('<script>alert(1)</script>')[0].children[0].text, '<script>alert(1)</script>');
});

test('empty, legacy and unfinished formatting remain safe to render', () => {
  assert.deepEqual(parseExplanation(undefined), []); assert.deepEqual(parseExplanation('   '), []);
  assert.equal(parseExplanation('plain text')[0].children[0].text, 'plain text');
  assert.doesNotThrow(() => parseExplanation('**unfinished __format /* code'));
});

test('toolbar formats the selected text and retains surrounding content', () => {
  assert.deepEqual(wrapExplanationSelection('hello world', 6, 11, 'bold'), { value: 'hello **world**', start: 8, end: 13 });
  assert.equal(wrapExplanationSelection('text', 0, 4, 'underline').value, '__text__');
  assert.equal(wrapExplanationSelection('', 0, 0, 'italic').value, '*italic text*');
  assert.equal(wrapExplanationSelection('echo test', 0, 9, 'code').value, '/*\necho test\n*/');
});

test('backticks render code inline between surrounding text and preserve formatting markers literally', () => {
  const children = parseExplanation('Use `ls -la` here and `**literal** __text__` next.')[0].children;
  assert.deepEqual(children, [{ type: 'text', text: 'Use ' }, { type: 'inlineCode', text: 'ls -la' },
    { type: 'text', text: ' here and ' }, { type: 'inlineCode', text: '**literal** __text__' }, { type: 'text', text: ' next.' }]);
});

test('inline code containing block delimiters stays inline, and real blocks stay separate', () => {
  const nodes = parseExplanation('Use `/* comment */` inline.\n/*\necho `date`\n*/');
  assert.equal(nodes.length, 2);
  assert.equal(nodes[0].children[1].type, 'inlineCode');
  assert.equal(nodes[0].children[1].text, '/* comment */');
  assert.equal(nodes[1].type, 'code');
  assert.equal(nodes[1].text, '/*\necho `date`\n*/');
});

test('inline code works inside emphasis without interpreting its code as formatting or HTML', () => {
  const nodes = parseExplanation('**Use `a**b` here**')[0].children;
  assert.equal(nodes[0].type, 'strong');
  assert.deepEqual(nodes[0].children[1], { type: 'inlineCode', text: 'a**b' });
  assert.deepEqual(parseExplanation('`<script>alert(1)</script>`')[0].children[0], { type: 'inlineCode', text: '<script>alert(1)</script>' });
  assert.equal(parseExplanation('Unclosed `example')[0].children[0].text, 'Unclosed `example');
});

test('inline code toolbar surrounds only the selection with backticks', () => {
  assert.deepEqual(wrapExplanationSelection('Use ls here', 4, 6, 'inlineCode'), { value: 'Use `ls` here', start: 5, end: 7 });
});
