import QuestionTitle from './QuestionTitle';
import { parseExplanation } from '../utils/explanationMarkup';
import '../styles/Explanation.css';

const renderInline = nodes => nodes.map((node, index) => {
  if (node.type === 'text') return node.text;
  if (node.type === 'inlineCode') return <code key={index} className="explanation-inline-code">{node.text}</code>;
  const Tag = { strong: 'strong', em: 'em', underline: 'u' }[node.type];
  return <Tag key={index}>{renderInline(node.children)}</Tag>;
});

export function ExplanationContent({ content }) {
  return <div className="explanation-content">{parseExplanation(content).map((node, index) =>
    node.type === 'code' ? <QuestionTitle key={index} title={node.text} /> : <span key={index}>{renderInline(node.children)}</span>)}</div>;
}

export default function ExplanationViewer({ content }) {
  if (typeof content !== 'string' || !content.trim()) return null;
  return <section className="question-explanation" aria-label="Answer explanation">
    <h3>Explanation</h3><ExplanationContent content={content} />
  </section>;
}
