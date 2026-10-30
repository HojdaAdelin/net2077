import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react';

const options = [
  { value: 'all', label: 'All difficulties', description: 'Explore every challenge', color: 'var(--text-muted)' },
  { value: 'easy', label: 'Easy', description: 'Start with the fundamentals', color: 'var(--nlp-accent)' },
  { value: 'medium', label: 'Medium', description: 'Put your skills to work', color: 'var(--warning)' },
  { value: 'hard', label: 'Hard', description: 'Take on advanced labs', color: 'var(--error)' },
];

export default function NetworkDifficultyFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const container = useRef(null), trigger = useRef(null), menu = useRef(null);
  const id = useId();
  const selected = options.find(option => option.value === value) || options[0];
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector('[aria-checked="true"]')?.focus();
    const outside = event => { if (!container.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const navigate = event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = [...menu.current.querySelectorAll('[role="menuitemradio"]')];
    const current = items.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };
  return <div className="nlp-difficulty-filter" ref={container} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} id={`${id}-trigger`} type="button" className={`nlp-difficulty-trigger${open ? ' is-open' : ''}`} aria-label={`Difficulty: ${selected.label}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? `${id}-menu` : undefined} onClick={() => setOpen(current => !current)} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); } }}>
      <SlidersHorizontal size={14} /><span>{selected.label}</span>{value !== 'all' && <i className="nlp-difficulty-dot" style={{ background: selected.color }} />}<ChevronDown size={14} className="nlp-difficulty-chevron" />
    </button>
    {open && <div ref={menu} id={`${id}-menu`} className="nlp-difficulty-menu" role="menu" aria-labelledby={`${id}-trigger`} onKeyDown={navigate}>
      <span className="nlp-difficulty-menu-label">FILTER BY DIFFICULTY</span>
      {options.map(option => <button type="button" key={option.value} role="menuitemradio" aria-checked={value === option.value} tabIndex={-1} onClick={() => { onChange(option.value); close(); }}>
        <span className="nlp-difficulty-option-icon" style={{ '--difficulty-color': option.color }}>{option.value === 'all' ? <SlidersHorizontal size={14} /> : <span className="nlp-difficulty-level" aria-hidden="true">{[1, 2, 3].map(level => <i key={level} className={level <= options.indexOf(option) ? 'filled' : ''} />)}</span>}</span>
        <span className="nlp-difficulty-option-text"><strong>{option.label}</strong><small>{option.description}</small></span>
        {value === option.value && <Check size={15} className="nlp-difficulty-check" />}
      </button>)}
    </div>}
  </div>;
}
