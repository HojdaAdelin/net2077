import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { Terminal as TerminalIcon, Maximize2, Minimize2 } from 'lucide-react';
import LoginRequired from '../components/LoginRequired';
import '../styles/Terminal.css';

const PAGE_SIZE = 10;

// States: 'welcome' | 'category' | 'questions' | 'solving'
function TerminalSession({ questions, userProgress, fetchUserProgress, updateUser, username }) {
  const [lines, setLines] = useState([]);
  const [input, setInput] = useState('');
  const [state, setState] = useState('welcome');
  const [category, setCategory] = useState(null);   // 'easy' | 'medium' | 'hard'
  const [page, setPage] = useState(0);
  const [solvingQuestion, setSolvingQuestion] = useState(null);
  const [unsolvedOnly, setUnsolvedOnly] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  // keep refs for use inside async handlers without stale closure
  const categoryRef = useRef(null);
  const pageRef = useRef(0);
  const unsolvedOnlyRef = useRef(false);
  const shellUser = username || 'user';
  const prompt = <><span className="t2-prompt-user">{shellUser}@net2077</span><span className="t2-prompt-colon">:</span><span className="t2-prompt-path">~</span><span className="t2-prompt-dollar">$</span></>;

  useEffect(() => {
    if (!isFullscreen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = event => { if (event.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isFullscreen]);

  const isQuestionSolved = (questionId) =>
    userProgress.solved.some(s => s._id === questionId);

  // Scroll to bottom on new lines
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines]);

  // When unsolvedOnly toggles while in questions state, re-render the list
  useEffect(() => {
    unsolvedOnlyRef.current = unsolvedOnly;
    if (state === 'questions' && categoryRef.current) {
      setLines([{ content: 'welcome', type: 'welcome', id: 1 }]);
      // small timeout so lines clear first
      setTimeout(() => {
        showCategoryPromptSilent();
        showQuestions(categoryRef.current, 0, unsolvedOnly);
        setPage(0);
        pageRef.current = 0;
      }, 10);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unsolvedOnly]);

  const addLine = (content, type = 'output') => {
    setLines(prev => [...prev, { content, type, id: Date.now() + Math.random() }]);
  };

  const addUserLine = (content) => addLine(content, 'user');
  const addSuccessLine = (content) => addLine(content, 'success');
  const addErrorLine = (content) => addLine(content, 'error');

  const showWelcome = () => {
    setLines([
      { content: 'welcome', type: 'welcome', id: 1 },
    ]);
    setState('welcome');
    setCategory(null);
    categoryRef.current = null;
    setPage(0);
    pageRef.current = 0;
    setSolvingQuestion(null);
  };

  const showCategoryPrompt = () => {
    setLines([
      { content: 'welcome', type: 'welcome', id: 1 },
      { content: '', type: 'separator', id: 2 },
      { content: 'Select a category by typing one of the commands below:', type: 'server', id: 3 },
      { content: '  cd /easy', type: 'command-hint', id: 4 },
      { content: '  cd /medium', type: 'command-hint', id: 5 },
      { content: '  cd /hard', type: 'command-hint', id: 6 },
    ]);
    setState('category');
  };

  // silent version (doesn't add separator/setState) for re-renders
  const showCategoryPromptSilent = () => {
    // no-op — used to chain into showQuestions after welcome reset
  };

  const showQuestions = (cat, pg, unsolved = unsolvedOnlyRef.current) => {
    let filtered = questions.filter(q => q.difficulty === cat);
    if (unsolved) filtered = filtered.filter(q => !isQuestionSolved(q._id));
    const totalPgs = Math.ceil(filtered.length / PAGE_SIZE);
    const pq = filtered.slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE);

    const batch = [];

    batch.push({ content: '', type: 'separator', id: Date.now() + 1 });
    batch.push({
      content: '',
      type: 'server-green-hint',
      id: Date.now() + 2
    });
    batch.push({ content: '', type: 'separator', id: Date.now() + 3 });

    pq.forEach((q, i) => {
      const num = pg * PAGE_SIZE + i + 1;
      const solved = userProgress.solved.some(s => s._id === q._id);
      batch.push({
        content: `  ${num}. ${q.title}`,
        type: solved ? 'question-solved' : 'question',
        id: Date.now() + 10 + i
      });
    });

    batch.push({ content: '', type: 'separator', id: Date.now() + 100 });

    const hints = [];
    if (pg + 1 < totalPgs) hints.push({ label: 'next questions', short: 'cd next' });
    if (pg > 0) hints.push({ label: 'previous questions', short: 'cd prev' });
    hints.push({ label: 'back to categories', short: 'cd ..' });

    batch.push({
      content: hints,
      type: 'nav-hint',
      id: Date.now() + 101
    });

    setLines(batch);
    setState('questions');
  };

  const showSolvingQuestion = (q) => {
    setLines([
      { content: q, type: 'q-box', id: Date.now() + 1 },
      { content: '', type: 'separator', id: Date.now() + 2 },
      { content: "Type your command and press Enter. Type exit to go back.", type: 'q-instruction', id: Date.now() + 3 },
    ]);
    setSolvingQuestion(q);
    setState('solving');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;

    addUserLine(cmd);
    setInput('');

    if (state === 'welcome') {
      if (cmd === 'start') {
        showCategoryPrompt();
      } else if (cmd === 'clear') {
        showWelcome();
      } else {
        addErrorLine(`Command not found: ${cmd}. Type 'start' to begin.`);
      }
      return;
    }

    if (state === 'category') {
      if (cmd === 'cd /easy' || cmd === 'cd /medium' || cmd === 'cd /hard') {
        const cat = cmd.replace('cd /', '');
        setCategory(cat);
        categoryRef.current = cat;
        setPage(0);
        pageRef.current = 0;
        showQuestions(cat, 0, unsolvedOnlyRef.current);
      } else if (cmd === 'back to categories' || cmd === 'cd ..') {
        showWelcome();
        setTimeout(showCategoryPrompt, 50);
      } else if (cmd === 'clear') {
        showCategoryPrompt();
      } else {
        addErrorLine(`Unknown command: ${cmd}`);
        addLine("  Try: cd /easy   cd /medium   cd /hard", 'hint');
      }
      return;
    }

    if (state === 'questions') {
      const cat = category;
      let filtered = questions.filter(q => q.difficulty === cat);
      if (unsolvedOnly) filtered = filtered.filter(q => !isQuestionSolved(q._id));
      const totalPgs = Math.ceil(filtered.length / PAGE_SIZE);

      if (cmd === 'next questions' || cmd === 'cd next') {
        if (page + 1 < totalPgs) {
          const nextPage = page + 1;
          setPage(nextPage);
          pageRef.current = nextPage;
          showQuestions(cat, nextPage);
        } else {
          addErrorLine('No more pages.');
        }
        return;
      }

      if (cmd === 'previous questions' || cmd === 'cd prev') {
        if (page > 0) {
          const prevPage = page - 1;
          setPage(prevPage);
          pageRef.current = prevPage;
          showQuestions(cat, prevPage);
        } else {
          addErrorLine('Already on the first page.');
        }
        return;
      }

      if (cmd === 'back to categories' || cmd === 'cd ..') {
        showWelcome();
        setTimeout(showCategoryPrompt, 50);
        return;
      }

      if (cmd === 'clear') {
        showQuestions(cat, page, unsolvedOnlyRef.current);
        return;
      }

      const num = parseInt(cmd, 10);
      if (!isNaN(num) && num >= 1 && num <= filtered.length) {
        const question = filtered[num - 1];
        showSolvingQuestion(question);
      } else {
        addErrorLine(`Unknown command: ${cmd}`);
        addLine("  Type a question number or a navigation command.", 'hint');
      }
      return;
    }

    if (state === 'solving') {
      if (cmd === 'exit') {
        setSolvingQuestion(null);
        showQuestions(category, page, unsolvedOnlyRef.current);
        return;
      }

      if (cmd === 'clear') {
        showSolvingQuestion(solvingQuestion);
        return;
      }

      if (isQuestionSolved(solvingQuestion._id)) {
        addErrorLine('This question is already solved.');
        addLine('  Type exit to go back.', 'hint-exit');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/terminal/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ questionId: solvingQuestion._id, command: cmd })
        });
        const result = await response.json();

        if (result.success) {
          addSuccessLine(`✓ Correct! +${result.points} XP`);
          if (result.xp !== undefined && result.level !== undefined) {
            updateUser({ xp: result.xp, level: result.level, streak: result.streak });
          }
          await fetchUserProgress();
          addLine('  Type exit to go back or keep trying other commands.', 'hint-exit');
        } else {
          addErrorLine(`✗ ${result.message}`);
          addLine('  Type exit to go back.', 'hint-exit');
        }
      } catch {
        addErrorLine('Connection error. Try again.');
        addLine('  Type exit to go back.', 'hint-exit');
      }
      return;
    }
  };

  const renderLine = (line) => {
    switch (line.type) {
      case 'welcome':
        return null;
      case 'server':
        return (
          <div key={line.id} className="t2-line t2-server">
            <span className="t2-server-text">{line.content}</span>
          </div>
        );
      case 'server-green-hint':
        return (
          <div key={line.id} className="t2-line t2-server t2-server-bold">
            <span className="t2-server-text">Type a question number to begin. </span>
            <span className="t2-green-word">Green</span>
            <span className="t2-server-text"> questions are solved.</span>
          </div>
        );
      case 'user':
        return (
          <div key={line.id} className="t2-line t2-user-line">
            <span className="t2-user-prefix">{prompt}</span>
            <span className="t2-user-cmd"> {line.content}</span>
          </div>
        );
      case 'success':
        return <div key={line.id} className="t2-line t2-success">{line.content}</div>;
      case 'error':
        return <div key={line.id} className="t2-line t2-error">{line.content}</div>;
      case 'command-hint':
        return <div key={line.id} className="t2-line t2-cmd-hint">{line.content}</div>;
      case 'hint':
        return <div key={line.id} className="t2-line t2-hint">{line.content}</div>;
      case 'hint-exit':
        return (
          <div key={line.id} className="t2-line t2-hint">
            {line.content.split('exit').map((part, i, arr) => (
              i < arr.length - 1
                ? <span key={i}>{part}<span className="t2-exit-cmd">exit</span></span>
                : <span key={i}>{part}</span>
            ))}
          </div>
        );
      case 'question':
        return <div key={line.id} className="t2-line t2-question">{line.content}</div>;
      case 'question-solved':
        return <div key={line.id} className="t2-line t2-question-solved">{line.content}</div>;
      case 'description':
        return <div key={line.id} className="t2-line t2-description">{line.content}</div>;
      case 'meta':
        return <div key={line.id} className="t2-line t2-meta">{line.content}</div>;
      case 'q-label':
        return <div key={line.id} className="t2-line t2-q-label">{line.content}</div>;
      case 'q-meta-colored':
        return (
          <div key={line.id} className="t2-line t2-q-meta-colored">
            <span>  Difficulty: </span>
            <span className={`t2-diff-${line.content.difficulty}`}>{line.content.difficulty}</span>
            <span>   Points: {line.content.points}</span>
          </div>
        );
      case 'q-box': {
        const q = line.content;
        return (
          <div key={line.id} className={`t2-q-box t2-q-box-${q.difficulty}`}>
            <div className="t2-q-box-row">
              <span className="t2-q-box-label">Question:</span>
              <span className="t2-q-box-value">{q.title}</span>
            </div>
            <div className="t2-q-box-row">
              <span className="t2-q-box-label">Description:</span>
              <span className="t2-q-box-value">{q.description}</span>
            </div>
            <div className="t2-q-box-row">
              <span className="t2-q-box-label">Difficulty:</span>
              <span className={`t2-diff-${q.difficulty}`}>{q.difficulty}</span>
              <span className="t2-q-box-sep">·</span>
              <span className="t2-q-box-label">Points:</span>
              <span className="t2-q-box-value">{q.points}</span>
            </div>
          </div>
        );
      }
      case 'q-instruction':
        return (
          <div key={line.id} className="t2-line t2-q-instruction">
            {line.content.split('exit').map((part, i, arr) => (
              i < arr.length - 1
                ? <span key={i}>{part}<span className="t2-exit-cmd">exit</span></span>
                : <span key={i}>{part}</span>
            ))}
          </div>
        );
      case 'nav-hint':
        return (
          <div key={line.id} className="t2-line t2-nav-hint">
            <span className="t2-nav-label">Available: </span>
            {line.content.map((h, i) => (
              <span key={i}>
                {i > 0 && <span className="t2-nav-sep"> | </span>}
                <span className="t2-nav-cmd">{h.label}</span>
                <span className="t2-nav-short"> ({h.short})</span>
              </span>
            ))}
          </div>
        );
      case 'separator':
        return <div key={line.id} className="t2-separator" />;
      default:
        return <div key={line.id} className="t2-line">{line.content}</div>;
    }
  };

  return (
    <div className={`t2-wrapper${isFullscreen ? ' t2-fullscreen' : ''}`}>
      <div className="t2-terminal">
        <div className="t2-topbar">
          <div className="t2-tab">
            <TerminalIcon size={16} aria-hidden="true" />
            <span>Terminal</span>
          </div>
          <span className="t2-topbar-title">{shellUser}@net2077: ~</span>
          <div className="t2-window-actions">
            <button
              className="t2-fullscreen-btn"
              onClick={() => setIsFullscreen(f => !f)}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-pressed={isFullscreen}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        <div className="t2-body" ref={bodyRef} onClick={event => {
          if (!window.getSelection()?.toString() && !event.target.closest('input, button, a, label')) inputRef.current?.focus();
        }}>
          {lines.map(renderLine)}

          <form onSubmit={handleSubmit} className="t2-input-row">
            <span className="t2-user-prefix">{prompt}</span>
            <input
              ref={inputRef}
              type="text"
              className="t2-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              aria-label="Terminal command"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </form>
        </div>
        <div className="t2-statusbar">
          <div className="t2-session-status"><span className="t2-status-dot" aria-hidden="true" />bash<span className="t2-status-divider">/</span>UTF-8</div>
          <div className="t2-statusbar-right">
            <label className="t2-unsolved-check">
              <input type="checkbox" checked={unsolvedOnly} onChange={event => setUnsolvedOnly(event.target.checked)} />
              <span>Unsolved only</span>
            </label>
            <span className="t2-topbar-progress">{userProgress.totalSolved}/{userProgress.totalQuestions} solved</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Terminal Page ───────────────────────────────────────────────────────

export default function Terminal() {
  const { user, updateUser } = useContext(AuthContext);
  const [questions, setQuestions] = useState([]);
  const [userProgress, setUserProgress] = useState({ solved: [], totalSolved: 0, totalQuestions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchQuestions();
      fetchUserProgress();
    }
  }, [user]);

  if (!user) {
    return (
      <LoginRequired
        icon={TerminalIcon}
        title="Terminal Access Required"
        description="Please login to access the interactive Linux terminal and practice real commands."
      />
    );
  }

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`${API_URL}/terminal`);
      const data = await response.json();
      setQuestions(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    try {
      const response = await fetch(`${API_URL}/terminal/progress`, { credentials: 'include' });
      const data = await response.json();
      setUserProgress(data);
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="terminal-page">
        <div className="container">
          <div className="terminal-loading">Loading terminal questions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-page">
      <div className="container">
        <div className="terminal-header">
          <h1 className="terminal-glitch" data-text="Terminal Practice">Terminal Practice</h1>
        </div>

        <TerminalSession
          username={user.username}
          questions={questions}
          userProgress={userProgress}
          fetchUserProgress={fetchUserProgress}
          updateUser={updateUser}
        />
      </div>
    </div>
  );
}
