import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { API_URL } from '../config';
import { CheckCircle, Lock, Unlock, X, Terminal as TerminalIcon, History, Zap, Maximize2 } from 'lucide-react';
import LoginRequired from '../components/LoginRequired';
import '../styles/Terminal.css';

// ─── Legacy Terminal ──────────────────────────────────────────────────────────

function LegacyTerminal({ questions, userProgress, fetchUserProgress, updateUser }) {
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [command, setCommand] = useState('');
  const [terminalHistory, setTerminalHistory] = useState([]);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [showUnsolvedOnly, setShowUnsolvedOnly] = useState(false);
  const [showAnswersModal, setShowAnswersModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const terminalInputRef = useRef(null);

  useEffect(() => {
    let filtered = questions;
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(q => q.difficulty === difficultyFilter);
    }
    if (showUnsolvedOnly) {
      filtered = filtered.filter(q => !isQuestionSolved(q._id));
    }
    setFilteredQuestions(filtered);
    if (filtered.length > 0) {
      if (!currentQuestion || !filtered.find(q => q._id === currentQuestion._id)) {
        setCurrentQuestion(filtered[0]);
        setTerminalHistory([]);
        setCommand('');
      }
    } else {
      setCurrentQuestion(null);
      setTerminalHistory([]);
      setCommand('');
    }
  }, [questions, difficultyFilter, showUnsolvedOnly, userProgress]);

  const handleQuestionSelect = (question) => {
    setCurrentQuestion(question);
    setTerminalHistory([]);
    setCommand('');
    if (terminalInputRef.current) terminalInputRef.current.focus();
  };

  const handleCommandSubmit = async (e) => {
    e.preventDefault();
    if (!command.trim() || !currentQuestion) return;

    setTerminalHistory(prev => [...prev, {
      command: command.trim(),
      timestamp: new Date().toLocaleTimeString()
    }]);

    try {
      const response = await fetch(`${API_URL}/terminal/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questionId: currentQuestion._id, command: command.trim() })
      });
      const result = await response.json();

      if (result.success) {
        setTerminalHistory(prev => [...prev, {
          output: `✅ ${result.message} (+${result.points} points)`,
          timestamp: new Date().toLocaleTimeString(),
          success: true
        }]);
        if (result.xp !== undefined && result.level !== undefined) {
          updateUser({ xp: result.xp, level: result.level, streak: result.streak });
        }
        await fetchUserProgress();
        setTimeout(() => {
          const currentIndex = filteredQuestions.findIndex(q => q._id === currentQuestion._id);
          const nextQuestion = filteredQuestions[currentIndex + 1];
          if (nextQuestion && !userProgress.solved.some(s => s._id === nextQuestion._id)) {
            handleQuestionSelect(nextQuestion);
          }
        }, 500);
      } else {
        setTerminalHistory(prev => [...prev, {
          output: `❌ ${result.message}`,
          timestamp: new Date().toLocaleTimeString(),
          success: false
        }]);
      }
    } catch {
      setTerminalHistory(prev => [...prev, {
        output: '❌ Error submitting command',
        timestamp: new Date().toLocaleTimeString(),
        success: false
      }]);
    }
    setCommand('');
  };

  const isQuestionSolved = (questionId) =>
    userProgress.solved.some(solved => solved._id === questionId);

  const handleModalKeyDown = (e) => {
    if (e.ctrlKey && (e.key === 'c' || e.key === 'a' || e.key === 'v' || e.key === 'x')) {
      e.preventDefault();
    }
  };
  const handleModalContextMenu = (e) => e.preventDefault();
  const handleModalSelectStart = (e) => e.preventDefault();
  const handleModalDragStart = (e) => e.preventDefault();

  return (
    <div className="terminal-content">
      <div className="terminal-sidebar">
        <div className="terminal-difficulty-filter">
          <h3>Filter by Difficulty</h3>
          <div className="terminal-filter-buttons">
            {['all', 'easy', 'medium', 'hard'].map(d => (
              <button
                key={d}
                className={`terminal-filter-btn ${difficultyFilter === d ? 'active' : ''}`}
                onClick={() => setDifficultyFilter(d)}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <div className="terminal-unsolved-filter">
            <label className="terminal-checkbox-label">
              <input
                type="checkbox"
                checked={showUnsolvedOnly}
                onChange={(e) => setShowUnsolvedOnly(e.target.checked)}
                className="terminal-checkbox"
              />
              <span>Show Unsolved Only</span>
            </label>
          </div>
        </div>

        <div className="terminal-questions-list">
          <h3>Questions ({filteredQuestions.length})</h3>
          <div className="terminal-questions-scroll">
            {filteredQuestions.map((question, index) => (
              <div
                key={question._id}
                className={`terminal-question-item ${currentQuestion?._id === question._id ? 'active' : ''} ${isQuestionSolved(question._id) ? 'solved' : ''}`}
                onClick={() => handleQuestionSelect(question)}
              >
                <span className="terminal-question-number">{index + 1}</span>
                <span className="terminal-question-title">{question.title}</span>
                {isQuestionSolved(question._id) && <CheckCircle size={16} className="terminal-solved-indicator" />}
              </div>
            ))}
          </div>
        </div>

        <div className="terminal-progress-stats">
          <h3>Progress</h3>
          <div className="terminal-stat-item">
            <span>Solved:</span>
            <span>{userProgress.totalSolved}/{userProgress.totalQuestions}</span>
          </div>
        </div>
      </div>

      <div className="terminal-main">
        {currentQuestion ? (
          <>
            <div className="terminal-question-header">
              <div className="terminal-question-info">
                <h2>{currentQuestion.title}</h2>
                <p>{currentQuestion.description}</p>
                <div className="terminal-question-meta">
                  <span className={`terminal-difficulty ${currentQuestion.difficulty}`}>{currentQuestion.difficulty}</span>
                  <span className="terminal-points">{currentQuestion.points} points</span>
                </div>
              </div>
              <div className="terminal-answers-section">
                {isQuestionSolved(currentQuestion._id) ? (
                  <div className="terminal-accepted-commands">
                    <h3><CheckCircle size={16} /> Accepted Commands</h3>
                    <div className="terminal-commands-list">
                      {currentQuestion.acceptedCommands.slice(0, 3).map((cmd, i) => (
                        <div key={i} className="terminal-command-item"><code>{cmd}</code></div>
                      ))}
                      {currentQuestion.acceptedCommands.length > 3 && (
                        <div className="terminal-more-commands">+{currentQuestion.acceptedCommands.length - 3} more commands</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="terminal-locked-answers">
                    <h3><Lock size={16} /> Solution</h3>
                    <p>Complete this question to see accepted commands</p>
                    <button className="terminal-unlock-btn" onClick={() => setShowConfirmModal(true)}>
                      <Unlock size={14} /> Show Answers
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="terminal-container">
              <div className="terminal-header-bar">
                <div className="terminal-buttons">
                  <span className="terminal-button close"></span>
                  <span className="terminal-button minimize"></span>
                  <span className="terminal-button maximize"></span>
                </div>
                <div className="terminal-title">user@net2077: ~</div>
              </div>
              <div className="terminal-body">
                <div className="terminal-input-section">
                  <form onSubmit={handleCommandSubmit} className="terminal-input-form">
                    <div className="terminal-input-line">
                      <span className="terminal-prompt">user@net2077:~$ </span>
                      <input
                        ref={terminalInputRef}
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        className="terminal-input"
                        placeholder="Enter your command..."
                        autoFocus
                        disabled={isQuestionSolved(currentQuestion._id)}
                      />
                    </div>
                  </form>
                </div>
                <div className="terminal-history">
                  {terminalHistory.map((entry, index) => (
                    <div key={index} className="terminal-entry">
                      {entry.command && (
                        <div className="terminal-command">
                          <span className="terminal-prompt">user@net2077:~$ </span>
                          <span>{entry.command}</span>
                        </div>
                      )}
                      {entry.output && (
                        <div className={`terminal-output ${entry.success ? 'success' : 'error'}`}>
                          {entry.output}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {isQuestionSolved(currentQuestion._id) && (
                  <div className="terminal-question-completed">
                    <CheckCircle size={16} /> Question completed! Great job!
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="terminal-no-questions">
            <TerminalIcon size={64} />
            <h3>No questions match your filters</h3>
            <p>Try adjusting your difficulty or unsolved filters.</p>
          </div>
        )}
      </div>

      {showConfirmModal && (
        <div className="terminal-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="terminal-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="terminal-modal-header">
              <h3><Lock size={20} /> Reveal Solution</h3>
              <button className="terminal-modal-close" onClick={() => setShowConfirmModal(false)}><X size={20} /></button>
            </div>
            <div className="terminal-modal-body">
              <p>Are you sure you want to see the accepted commands?</p>
              <div className="terminal-confirm-buttons">
                <button className="terminal-btn-cancel" onClick={() => setShowConfirmModal(false)}>Cancel</button>
                <button className="terminal-btn-confirm" onClick={() => { setShowConfirmModal(false); setShowAnswersModal(true); }}>
                  <Unlock size={16} /> Show Solution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAnswersModal && currentQuestion && (
        <div className="terminal-modal-overlay" onClick={() => setShowAnswersModal(false)}>
          <div
            className="terminal-modal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleModalKeyDown}
            onContextMenu={handleModalContextMenu}
            onSelectStart={handleModalSelectStart}
            onDragStart={handleModalDragStart}
            tabIndex={-1}
          >
            <div className="terminal-modal-header">
              <h3><TerminalIcon size={20} /> Accepted Commands: {currentQuestion.title}</h3>
              <button className="terminal-modal-close" onClick={() => setShowAnswersModal(false)}><X size={20} /></button>
            </div>
            <div className="terminal-modal-body" onContextMenu={handleModalContextMenu} onSelectStart={handleModalSelectStart}>
              <div className="terminal-commands-list">
                {currentQuestion.acceptedCommands.map((cmd, i) => (
                  <div key={i} className="terminal-command-item" onContextMenu={handleModalContextMenu}>
                    <code>{cmd}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Terminal 2.0 ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// States: 'welcome' | 'category' | 'questions' | 'solving'
function Terminal2({ questions, userProgress, fetchUserProgress, updateUser }) {
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

  const isQuestionSolved = (questionId) =>
    userProgress.solved.some(s => s._id === questionId);

  const getFilteredQuestions = (cat, unsolved) => {
    let filtered = cat ? questions.filter(q => q.difficulty === cat) : [];
    if (unsolved) filtered = filtered.filter(q => !isQuestionSolved(q._id));
    return filtered;
  };

  const filteredQuestions = getFilteredQuestions(category, unsolvedOnly);

  // Scroll to bottom on new lines
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines]);

  // Show welcome message on mount
  useEffect(() => {
    showWelcome();
  }, []);

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

  const addServerLine = (content) => addLine(content, 'server');
  const addUserLine = (content) => addLine(content, 'user');
  const addSuccessLine = (content) => addLine(content, 'success');
  const addErrorLine = (content) => addLine(content, 'error');
  const addSeparator = () => addLine('', 'separator');

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
        return (
          <div key={line.id} className="t2-welcome-block">
            <div className="t2-welcome-title">
              <TerminalIcon size={16} />
              <span>net2077</span>
              <span className="t2-welcome-at">@</span>
              <span>terminal</span>
              <span className="t2-welcome-version">2.0</span>
            </div>
            <div className="t2-welcome-text">Welcome to Terminal 2.0</div>
            <div className="t2-welcome-text">Type <span className="t2-cmd-inline">start</span> to begin.</div>
          </div>
        );
      case 'server':
        return (
          <div key={line.id} className="t2-line t2-server">
            <span className="t2-sys-prefix">net2077@terminal:</span>
            <span className="t2-server-text"> {line.content}</span>
          </div>
        );
      case 'server-green-hint':
        return (
          <div key={line.id} className="t2-line t2-server t2-server-bold">
            <span className="t2-sys-prefix">net2077@terminal:</span>
            <span className="t2-server-text"> To start solve, type the number of the question you want to solve. </span>
            <span className="t2-green-word">Green</span>
            <span className="t2-server-text"> questions are solved.</span>
          </div>
        );
      case 'user':
        return (
          <div key={line.id} className="t2-line t2-user-line">
            <span className="t2-user-prefix">user@net2077:~$</span>
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
          <div className="t2-dots">
            <span className="t2-dot t2-dot-red" />
            <span className="t2-dot t2-dot-yellow" />
            <span className="t2-dot t2-dot-green" />
          </div>
          <span className="t2-topbar-title">user@net2077 | terminal 2.0</span>
          <div className="t2-topbar-right">
            <label className="t2-unsolved-check">
              <input
                type="checkbox"
                checked={unsolvedOnly}
                onChange={(e) => setUnsolvedOnly(e.target.checked)}
              />
              <span>Unsolved only</span>
            </label>
            <div className="t2-topbar-progress">
              {userProgress.totalSolved}/{userProgress.totalQuestions} solved
            </div>
            <button
              className="t2-fullscreen-btn"
              onClick={() => setIsFullscreen(f => !f)}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <X size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        <div className="t2-body" ref={bodyRef} onClick={() => inputRef.current?.focus()}>
          {lines.map(renderLine)}

          <form onSubmit={handleSubmit} className="t2-input-row">
            <span className="t2-user-prefix">user@net2077:~$</span>
            <input
              ref={inputRef}
              type="text"
              className="t2-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Terminal Page ───────────────────────────────────────────────────────

export default function Terminal() {
  const { user, updateUser } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [questions, setQuestions] = useState([]);
  const [userProgress, setUserProgress] = useState({ solved: [], totalSolved: 0, totalQuestions: 0 });
  const [loading, setLoading] = useState(true);
  const [activeVersion, setActiveVersion] = useState(
    searchParams.get('v') === '2' ? 'v2' : 'legacy'
  );

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
          <h1>Terminal Practice</h1>
          <p>Practice Linux commands in a simulated terminal environment</p>

          <div className="terminal-version-selector">
            <button
              className={`tv-btn tv-btn-legacy ${activeVersion === 'legacy' ? 'tv-active' : ''}`}
              onClick={() => setActiveVersion('legacy')}
            >
              <History size={16} />
              Legacy
            </button>
            <button
              className={`tv-btn tv-btn-v2 ${activeVersion === 'v2' ? 'tv-active' : ''}`}
              onClick={() => setActiveVersion('v2')}
            >
              <Zap size={16} />
              Terminal 2.0
            </button>
          </div>
        </div>

        {activeVersion === 'legacy' ? (
          <LegacyTerminal
            questions={questions}
            userProgress={userProgress}
            fetchUserProgress={fetchUserProgress}
            updateUser={updateUser}
          />
        ) : (
          <Terminal2
            questions={questions}
            userProgress={userProgress}
            fetchUserProgress={fetchUserProgress}
            updateUser={updateUser}
          />
        )}
      </div>
    </div>
  );
}
