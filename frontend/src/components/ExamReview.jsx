import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import QuestionTitle from './QuestionTitle';
import '../styles/ExamReview.css';

export default function ExamReview({ questions, selectedAnswers }) {
  const [reviewIndex, setReviewIndex] = useState(null);
  const dialogRef = useRef(null);
  const question = reviewIndex === null ? null : questions[reviewIndex];
  const isCorrect = item => {
    const expected = item.correctAnswers || [];
    const selected = selectedAnswers[item._id] || [];
    return expected.length > 0 && selected.length === expected.length &&
      selected.every(answer => expected.includes(answer));
  };

  useEffect(() => {
    if (reviewIndex === null) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [reviewIndex]);

  return (
    <section className="exam-review" aria-label="Exam question review">
      <div className="exam-review-heading">
        <h2>Question review</h2>
        <p>Select a question to review its answers. Green: correct. Red: incorrect or unanswered.</p>
      </div>
      <div className="exam-review-grid">
        {questions.map((item, index) => {
          const correct = isCorrect(item);
          return (
            <button
              key={item._id}
              type="button"
              className={`exam-review-cell ${correct ? 'correct' : 'incorrect'}`}
              aria-label={`Question ${index + 1}: ${correct ? 'correct' : 'incorrect or unanswered'}. Review answers`}
              aria-haspopup="dialog"
              onClick={() => setReviewIndex(index)}
            >
              #{index + 1}
            </button>
          );
        })}
      </div>
      <dialog
        ref={dialogRef}
        className="exam-review-dialog"
        aria-labelledby="exam-review-title"
        onClose={() => setReviewIndex(null)}
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right ||
              event.clientY < bounds.top || event.clientY > bounds.bottom) {
            setReviewIndex(null);
          }
        }}
      >
        {question && (
          <>
            <div className="exam-review-dialog-header">
              <h2 id="exam-review-title">Question #{reviewIndex + 1}</h2>
              <button type="button" className="exam-review-close" aria-label="Close question review" onClick={() => setReviewIndex(null)}>
                <X size={22} />
              </button>
            </div>
            <p className={`exam-review-status ${isCorrect(question) ? 'correct' : 'incorrect'}`}>
              {isCorrect(question) ? 'Correct answer' : (selectedAnswers[question._id]?.length ? 'Incorrect answer' : 'Unanswered')}
            </p>
            <div className="exam-review-question"><QuestionTitle title={question.title} /></div>
            <p className="exam-review-hint">Correct answers are highlighted in green. Your selections are marked below.</p>
            <ul className="exam-review-answers">
              {question.answers.map((answer, index) => {
                const correct = question.correctAnswers?.includes(index);
                const selected = selectedAnswers[question._id]?.includes(index);
                return (
                  <li key={index} className={`exam-review-answer ${correct ? 'correct' : selected ? 'incorrect' : ''}`}>
                    <span className="exam-review-answer-letter">{String.fromCharCode(65 + index)}</span>
                    <div className="exam-review-answer-content">
                      <span className="exam-review-answer-text">{answer}</span>
                      {(correct || selected) && <span className="exam-review-answer-note">{correct ? 'Correct answer' : 'Incorrect answer'}{selected ? ' · Your selection' : ''}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </dialog>
    </section>
  );
}
