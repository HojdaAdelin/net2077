import ExplanationViewer from '../components/ExplanationViewer';
import ExamReview from '../components/ExamReview';
import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import '../styles/Quiz.css';
import { API_URL as API_BASE } from '../config';
import { AuthContext } from '../context/AuthContext';
import { Share2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import SaveButton from '../components/SaveButton';
import QuestionTitle from '../components/QuestionTitle';
import { getSaved } from '../services/api';
const DEFAULT_EXAM_DURATION_MIN = 60;
const SIDEBAR_PAGE_SIZE = 50;
const getExamStorageKey = (examId) => `exam_state_${examId}`;

export default function Quiz({ isExam = false }) {
  const { type, mode, examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser } = useContext(AuthContext);
  const attemptRef = useRef(null);
  const loadRequestRef = useRef(0);
  const finishingRef = useRef(false);
  const checkingRef = useRef(false);
  const [verifiedResult, setVerifiedResult] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); 
  const [submittedAnswers, setSubmittedAnswers] = useState({}); 
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [examMeta, setExamMeta] = useState(null);
  const [error, setError] = useState(null);
  const [examStarted, setExamStarted] = useState(!isExam);
  const [timeLeft, setTimeLeft] = useState(null);
  const [finishReason, setFinishReason] = useState(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [lockedQuestions, setLockedQuestions] = useState({});
  const [showCopied, setShowCopied] = useState(false);
  const [retryMode, setRetryMode] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const tipsCardRef = useRef(null);
  const [savedItems, setSavedItems] = useState([]);

  useEffect(() => {
    if (showTips && tipsCardRef.current) {
      tipsCardRef.current.focus();
    }
  }, [showTips]);

  useEffect(() => {
    if (user) {
      getSaved().then(data => setSavedItems(data.saved || [])).catch(() => {});
    }
  }, [user]);
  const [sidebarPage, setSidebarPage] = useState(0);
  const [difficultyFilter, setDifficultyFilter] = useState(null); // null | 'easy' | 'medium' | 'hard'
  const [difficultyOpen, setDifficultyOpen] = useState(false);

  // Questions displayed in sidebar/navigation — filtered by difficulty for non-exam/non-daily/non-random
  const canFilterDifficulty = !isExam && type !== 'daily' && mode !== 'random';
  const displayedQuestions = canFilterDifficulty && difficultyFilter
    ? questions.filter(q => q.difficulty === difficultyFilter)
    : questions;

  // Keep currentIndex in bounds when filter changes
  useEffect(() => {
    if (currentIndex >= displayedQuestions.length && displayedQuestions.length > 0) {
      setCurrentIndex(0);
      setSidebarPage(0);
    }
  }, [difficultyFilter]);

  const handleShareQuestion = () => {
    const questionId = currentQuestion._id;
    const shareUrl = `${window.location.origin}/question/${questionId}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
        fallbackCopyToClipboard(shareUrl);
      });
    } else {
      fallbackCopyToClipboard(shareUrl);
    }
  };

  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Fallback: Failed to copy', err);
    }
    
    document.body.removeChild(textArea);
  };

  useEffect(() => {
    loadQuestions();
  }, [type, mode, examId, isExam, location.search]);

  useEffect(() => {
    if (isExam) {
      setExamStarted(false);
      setFinishReason(null);
      setTimeSpent(0);
      setLockedQuestions({});
    } else {
      setExamStarted(true);
    }
  }, [isExam, examId]);

  const examDurationMinutes = isExam ? (examMeta?.duration || DEFAULT_EXAM_DURATION_MIN) : null;
  const examDurationSeconds = examDurationMinutes ? examDurationMinutes * 60 : null;

  useEffect(() => {
    if (!isExam || !examMeta || !examDurationSeconds || !examStarted) return;
    if (timeLeft !== null) return;
    setTimeLeft(examDurationSeconds);
  }, [isExam, examMeta, examDurationSeconds, timeLeft, examStarted]);

  const handleFinishExam = useCallback(async (reason = 'manual') => {
    if (loading || showResults || finishingRef.current || checkingRef.current) return;
    finishingRef.current = true;
    setSubmissionError(null);
    try {
      if (attemptRef.current && !retryMode) {
        const endpoint = !user ? '/questions/attempts/finish' : isExam ? '/progress/addSimulation' :
          type === 'daily' ? '/questions/completeDailyChallenge' : '/questions/submitRandom50';
        const response = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ attemptId: attemptRef.current, answers: selectedAnswers })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to save quiz results. Please try again.');
        const corrections = new Map(result.corrections.map(q => [String(q._id), q]));
        setQuestions(previous => previous.map(q => ({ ...q, ...(corrections.get(q._id) || {}) })));
        setSelectedAnswers(result.selectedAnswers);
        setVerifiedResult(result);
        if (user && result.streak) updateUser({ streak: result.streak });
      }
      if (isExam) {
        setFinishReason(reason);
        setExamStarted(false);
        const duration = examDurationSeconds ?? 0;
        setTimeSpent(Math.max(0, duration - (timeLeft ?? duration)));
      }
      setShowResults(true);
    } catch (error) {
      setSubmissionError(error.message);
    } finally {
      finishingRef.current = false;
    }
  }, [examDurationSeconds, isExam, showResults, timeLeft, type, selectedAnswers, user, updateUser, retryMode, loading]);

  useEffect(() => {
    if (!isExam || !examStarted || showResults) return;

    if (timeLeft === 0) {
      handleFinishExam('time');
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(interval);
          handleFinishExam('time');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [handleFinishExam, isExam, examStarted, showResults, timeLeft]);

  useEffect(() => {
    if (loading || !isExam || !examId || !questions.length || !attemptRef.current) return;
    const payload = {
      attemptId: attemptRef.current,
      examStarted,
      timeLeft,
      selectedAnswers,
      submittedAnswers,
      lockedQuestions,
      currentIndex,
      showResults,
      finishReason,
      timeSpent,
      lastSavedAt: Date.now()
    };
    localStorage.setItem(getExamStorageKey(examId), JSON.stringify(payload));
  }, [
    isExam,
    examId,
    questions.length,
    loading,
    examStarted,
    timeLeft,
    selectedAnswers,
    submittedAnswers,
    lockedQuestions,
    currentIndex,
    showResults,
    finishReason,
    timeSpent
  ]);

  const loadQuestions = async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError(null);
    setSubmissionError(null);
    setVerifiedResult(null);
    setRetryMode(false);
    setCurrentIndex(0);
    setSidebarPage(0);
    setShowResults(false);
    attemptRef.current = null;
    setSelectedAnswers({});
    setSubmittedAnswers({});
    let fetchedExamMeta = null;
    try {
      const urlParams = new URLSearchParams(location.search);
      const tagsParam = urlParams.get('tags');
      const chaptersParam = urlParams.get('chapters');
      const board = urlParams.get('board');
      const queryType = urlParams.get('type') || type;

      const sessionKind = isExam ? 'exam' : type === 'daily' && ['challenge', 'network', 'arduino'].includes(mode) ? 'daily' :
        mode === 'random' ? 'random' : null;
      let data = [];
      let tagsFilter = tagsParam;

      if (isExam) {
        if (!examId) {
          throw new Error('Missing exam identifier');
        }

        const examResponse = await fetch(`${API_BASE}/exams/${examId}`);
        if (!examResponse.ok) {
          throw new Error('Exam not found or unavailable');
        }

        const examData = await examResponse.json();
        if (requestId !== loadRequestRef.current) return;
        fetchedExamMeta = examData;
        setExamMeta(examData);

        if (examData.tag) {
          tagsFilter = examData.tag;
        }

      } else {
        setExamMeta(null);
        if (!sessionKind) {
          const endpoint = mode === 'unsolved' ? '/questions/unsolved' : '/questions';
          const response = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });
          if (!response.ok) throw new Error('Unable to load questions');
          data = await response.json();
        }
      }

      let filtered = data;
      
     
      if (!isExam && !(mode === 'challenge' && type === 'daily')) {
        if (queryType === 'basic') {
          filtered = filtered.filter(q => q.type === 'basic');
        } else if (queryType === 'all') {
          filtered = filtered.filter(q => q.type === 'all');
        } else if (queryType === 'acadnet') {
          filtered = filtered.filter(q => q.type === 'acadnet');
        }
      }

  
      if (!isExam && tagsFilter && !(mode === 'challenge' && type === 'daily')) {
        filtered = filtered.filter(q => q.tags && q.tags.includes(tagsFilter));
      } else if (isExam && tagsFilter) {
        filtered = filtered.filter(q => q.tags && q.tags.includes(tagsFilter));
      }

      if (chaptersParam && !isExam) {
        const selectedChapters = chaptersParam.split(',');
        filtered = filtered.filter(q => 
          q.tags && q.tags.some(tag => selectedChapters.includes(tag))
        );
      }

      if (!isExam && board === 'esp32') {
        filtered = filtered.filter(question => ['ARDUINO', 'ESP32'].every(tag => question.tags?.includes(tag)));
      }

      let sessionData = null;
      let savedSession = null;
      if (isExam) {
        try { savedSession = JSON.parse(localStorage.getItem(getExamStorageKey(examId)) || 'null'); } catch { /* discard invalid state */ }
      }
      if (sessionKind) {
        const start = async (attemptId) => {
          const response = await fetch(`${API_BASE}/questions/attempts/start`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ kind: sessionKind, examId, attemptId,
              category: mode === 'network' ? 'NETWORK' : mode === 'arduino' ? 'ARDUINO' : 'LINUX', includeAcadnet: urlParams.get('acadnet') === '1',
              type: queryType, tags: tagsParam, chapters: chaptersParam, board })
          });
          const result = await response.json();
          if (!response.ok) throw Object.assign(new Error(result.message || 'Unable to start quiz'), { status: response.status });
          return result;
        };
        try { sessionData = await start(savedSession?.attemptId); }
        catch (error) {
          if (!savedSession?.attemptId || error.status !== 404) throw error;
          savedSession = null;
          localStorage.removeItem(getExamStorageKey(examId));
          sessionData = await start();
        }
        if (requestId !== loadRequestRef.current) return;
        // A finish request may have saved the result before its response was received.
        // Replaying it safely recovers a pending reward and the authoritative result.
        if (sessionData.result) {
          const response = await fetch(`${API_BASE}${user ? '/progress/addSimulation' : '/questions/attempts/finish'}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ attemptId: sessionData.attemptId, answers: {} })
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || 'Unable to restore exam results');
          sessionData.result = result;
          sessionData.checked = result.selectedAnswers;
          sessionData.corrections = result.corrections;
          if (user && result.streak) updateUser({ streak: result.streak });
        }
        if (requestId !== loadRequestRef.current) return;
        attemptRef.current = sessionData.attemptId;
        filtered = sessionData.questions;
      }

      if (requestId !== loadRequestRef.current) return;
      let restoredState = null;
      if (isExam && examId) {
        const stored = localStorage.getItem(getExamStorageKey(examId));
        if (stored) {
          try {
            restoredState = savedSession?.attemptId === sessionData?.attemptId ? savedSession : null;
          } catch (err) {
            console.warn('Unable to parse stored exam state', err);
          }
        }
      }

      if (isExam) {
        const currentMeta = fetchedExamMeta || examMeta;
        const durationMinutes = currentMeta?.duration || DEFAULT_EXAM_DURATION_MIN;
        const durationSeconds = durationMinutes * 60;

        const validIds = new Set(filtered.map(q => q._id));
        const sanitizeMap = (map = {}) => Object.fromEntries(
          Object.entries(map || {}).filter(([id]) => validIds.has(id))
        );

        let initialSelected = sanitizeMap(restoredState?.selectedAnswers || {});
        let initialSubmitted = sanitizeMap(restoredState?.submittedAnswers || {});
        let initialLocked = sanitizeMap(restoredState?.lockedQuestions || {});
        for (const correction of sessionData?.corrections || []) {
          const question = filtered.find(q => q._id === correction._id);
          if (question) { question.correctAnswers = correction.correctAnswers; if (correction.explanation) question.explanation = correction.explanation; }
        }
        for (const [id, answers] of Object.entries(sessionData?.checked || {})) {
          const question = filtered.find(q => q._id === id);
          if (!question) continue;
          initialSelected[id] = answers;
          initialSubmitted[id] = answers.length === question.correctAnswers?.length && answers.every(a => question.correctAnswers.includes(a));
          initialLocked[id] = !initialSubmitted[id];
        }
        if (sessionData?.result) setVerifiedResult(sessionData.result);
        let initialCurrentIndex = restoredState?.currentIndex || 0;
        if (!filtered[initialCurrentIndex]) {
          initialCurrentIndex = 0;
        }

        let adjustedTimeLeft = restoredState?.timeLeft ?? durationSeconds;
        if (
          restoredState?.lastSavedAt &&
          restoredState?.timeLeft !== null &&
          restoredState?.timeLeft !== undefined
        ) {
          const elapsed = Math.floor((Date.now() - restoredState.lastSavedAt) / 1000);
          adjustedTimeLeft = Math.max(0, restoredState.timeLeft - elapsed);
        }

        const autoFinished = restoredState?.examStarted && !restoredState?.showResults && adjustedTimeLeft === 0;
        const wasExamStarted = restoredState?.examStarted || false;

        setExamStarted(sessionData?.result ? false : wasExamStarted);
        setSelectedAnswers(initialSelected);
        setSubmittedAnswers(initialSubmitted);
        setLockedQuestions(initialLocked);
        setCurrentIndex(initialCurrentIndex);
        
        if (wasExamStarted || autoFinished) {
          setTimeLeft(adjustedTimeLeft);
        }
        setShowResults(Boolean(sessionData?.result));
        setFinishReason(autoFinished ? 'time' : (restoredState?.finishReason || null));
        setTimeSpent(autoFinished ? durationSeconds : (restoredState?.timeSpent || 0));

        setExamMeta(prev => {
          const base = prev || currentMeta || {};
          return { ...base, questionCount: filtered.length };
        });
      } else if (mode !== 'random' && type !== 'daily') {
      
        let prefilledSelected = {};
        let prefilledSubmitted = {};
        try {
          const progressRes = await fetch(`${API_BASE}/progress/user`, {
            credentials: 'include'
          });

          if (progressRes.ok) {
            const progressData = await progressRes.json();
            const solvedSet = new Set(
              (progressData.solvedQuestions || []).map(entry =>
                typeof entry === 'string' ? entry : entry.id
              )
            );

            const solvedDetails = new Map((progressData.solvedQuestions || []).map(entry => [entry.id, entry]));
            filtered.forEach(question => {
              if (solvedSet.has(question._id)) {
                question.correctAnswers = solvedDetails.get(question._id)?.correctAnswers || [];
                prefilledSubmitted[question._id] = true;
                const correctAnswers = question.correctAnswers && question.correctAnswers.length > 0
                  ? [...question.correctAnswers]
                  : (question.correctIndex !== undefined ? [question.correctIndex] : []);

                if (correctAnswers.length > 0) {
                  prefilledSelected[question._id] = correctAnswers;
                }
              }
            });
          }
        } catch (progressError) {
          console.warn('Unable to preload solved questions:', progressError);
        }

        if (requestId !== loadRequestRef.current) return;
        setSelectedAnswers(prefilledSelected);
        setSubmittedAnswers(prefilledSubmitted);
      }

      console.log('Filtered questions:', {
        total: data.length,
        filtered: filtered.length,
        type: queryType,
        tags: tagsFilter
      });

      if (requestId !== loadRequestRef.current) return;
      setQuestions(filtered);
    } catch (error) {
      if (requestId !== loadRequestRef.current) return;
      console.error('Error loading questions:', error);
      setError(error.message || 'An unexpected error occurred while loading questions.');
    }
    if (requestId === loadRequestRef.current) setLoading(false);
  };

  const clearStoredExamState = useCallback(() => {
    if (isExam && examId) {
      localStorage.removeItem(getExamStorageKey(examId));
    }
  }, [isExam, examId]);

  const handleStartExam = () => {
    if (!isExam) return;
    setExamStarted(true);
    setShowResults(false);
    setFinishReason(null);
    setTimeSpent(0);
    setLockedQuestions({});
    setSelectedAnswers({});
    setSubmittedAnswers({});
    setCurrentIndex(0);
    setTimeLeft(examDurationSeconds || DEFAULT_EXAM_DURATION_MIN * 60);
  };

  const handleRestartExam = () => {
    if (!isExam) {
      window.location.reload();
      return;
    }
    clearStoredExamState();
    setExamStarted(false);
    setShowResults(false);
    setFinishReason(null);
    setTimeSpent(0);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setSubmittedAnswers({});
    setLockedQuestions({});
    setTimeLeft(examDurationSeconds || DEFAULT_EXAM_DURATION_MIN * 60);
    loadQuestions();
  };

  const handleExitExam = () => {
    if (isExam) {
      clearStoredExamState();
      navigate('/exam-selection');
    } else {
      navigate('/grile');
    }
  };

  // Wrong questions = submitted and incorrect, only for non-exam quiz
  const wrongQuestions = !isExam
    ? displayedQuestions.filter(q => submittedAnswers[q._id] === false)
    : [];

  const handleRetryWrong = () => {
    if (wrongQuestions.length === 0) return;
    setRetryMode(true);
    setQuestions(wrongQuestions);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setSubmittedAnswers({});
    setShowResults(false);
  };

  const handleAnswerSelect = (questionId, answerIndex, isMultiple) => {
    if (isExam && !examStarted) return;

    if (isMultiple) {

      const current = selectedAnswers[questionId] || [];
      const newAnswers = current.includes(answerIndex)
        ? current.filter(idx => idx !== answerIndex)
        : [...current, answerIndex];
      
      setSelectedAnswers({
        ...selectedAnswers,
        [questionId]: newAnswers
      });
    } else {
  
      setSelectedAnswers({
        ...selectedAnswers,
        [questionId]: [answerIndex]
      });
    }
  };

  const handleNext = () => {
    if (isExam && !examStarted) return;
    if (currentIndex < displayedQuestions.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setSidebarPage(Math.floor(next / SIDEBAR_PAGE_SIZE));
    }
  };

  const handlePrevious = () => {
    if (isExam && !examStarted) return;
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      setSidebarPage(Math.floor(prev / SIDEBAR_PAGE_SIZE));
    }
  };

  const handleSubmitQuestion = async () => {
    if (checkingRef.current || finishingRef.current || (isExam && !examStarted)) return;
    const currentQuestion = displayedQuestions[currentIndex];
    if (!currentQuestion) return;
    checkingRef.current = true;
    setSubmissionError(null);
    try {
      const answers = selectedAnswers[currentQuestion._id] || [];
      const sessionId = retryMode ? null : attemptRef.current;
      const practiceReward = user && !isExam && type !== 'daily';
      const endpoint = practiceReward && !sessionId ? '/questions/markSolved' : '/questions/attempts/check';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ questionId: currentQuestion._id, answers, attemptId: sessionId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to check answer. Please try again.');
      const isCorrect = result.correct;
      setQuestions(previous => previous.map(q => q._id === currentQuestion._id ? { ...q, correctAnswers: result.correctAnswers, ...(result.explanation ? { explanation: result.explanation } : {}) } : q));
      setSelectedAnswers(previous => ({ ...previous, [currentQuestion._id]: result.selectedAnswers || answers }));
      setSubmittedAnswers(previous => ({ ...previous, [currentQuestion._id]: isCorrect }));
      if (isExam && !isCorrect) setLockedQuestions(previous => ({ ...previous, [currentQuestion._id]: true }));
      if (result.streak) updateUser({ streak: result.streak });
      // Random mode already awarded first-time question solves before this change.
      if (practiceReward && sessionId && isCorrect) {
        const rewardResponse = await fetch(`${API_BASE}/questions/markSolved`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ questionId: currentQuestion._id, answers: result.selectedAnswers || answers })
        });
        const reward = await rewardResponse.json();
        if (!rewardResponse.ok) throw new Error(reward.message || 'Unable to save progress');
        if (reward.streak) updateUser({ streak: reward.streak });
      }
      if (isCorrect && (isExam || type !== 'daily')) {
        setTimeout(() => {
          if (currentIndex < displayedQuestions.length - 1) {
            const next = currentIndex + 1;
            setCurrentIndex(next);
            setSidebarPage(Math.floor(next / SIDEBAR_PAGE_SIZE));
          }
        }, 500);
      }
    } catch (error) { setSubmissionError(error.message); }
    finally { checkingRef.current = false; }
  };

  // Keyboard navigation
  useEffect(() => {
    if (showResults) return;
    if (isExam && !examStarted) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (currentIndex < displayedQuestions.length - 1) {
          const next = currentIndex + 1;
          if (isExam && lockedQuestions[displayedQuestions[next]?._id]) return;
          setCurrentIndex(next);
          setSidebarPage(Math.floor(next / SIDEBAR_PAGE_SIZE));
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (currentIndex > 0) {
          const prev = currentIndex - 1;
          if (isExam && lockedQuestions[displayedQuestions[prev]?._id]) return;
          setCurrentIndex(prev);
          setSidebarPage(Math.floor(prev / SIDEBAR_PAGE_SIZE));
        }
      } else if (e.key === 'Enter') {
        const currentQuestion = displayedQuestions[currentIndex];
        if (!currentQuestion) return;
        const userAnswers = selectedAnswers[currentQuestion._id] || [];
        const alreadySubmitted = submittedAnswers[currentQuestion._id] !== undefined;
        if (userAnswers.length > 0 && !alreadySubmitted) {
          handleSubmitQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExam, examStarted, showResults, currentIndex, questions, selectedAnswers, submittedAnswers, lockedQuestions, handleSubmitQuestion]);

  const handleSubmitAll = () => {
    handleFinishExam('manual');
  };

  const calculateScore = () => {
    if (verifiedResult && !retryMode) return { totalPoints: verifiedResult.score, maxPoints: verifiedResult.totalPoints };
    let totalPoints = 0;
    let maxPoints = 0;

    questions.forEach((q) => {
      maxPoints += q.points || 1;
      const userAnswers = selectedAnswers[q._id] || [];
      const correctAnswers = q.correctAnswers || [];


      if (
        correctAnswers.length > 0 && userAnswers.length === correctAnswers.length &&
        userAnswers.every(ans => correctAnswers.includes(ans))
      ) {
        totalPoints += q.points || 1;
      }
    });

    return { totalPoints, maxPoints };
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (loading) {
    return (
      <div className="container quiz-page">
        <div className="loading">Loading questions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container quiz-page">
        <div className="empty-quiz">
          <h2>{error}</h2>
          <button onClick={isExam ? handleExitExam : () => navigate('/grile')} className="btn btn-primary">
            {isExam ? 'Back to Exams' : 'Back to Questions'}
          </button>
        </div>
      </div>
    );
  }

  if (displayedQuestions.length === 0 && !loading && questions.length > 0) {
    // Difficulty filter returned no results — stay on page, show inline message
    const currentQuestion = null;
    const { totalPoints, maxPoints } = calculateScore();
    const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
    const totalExamQuestions = examMeta?.questionCount || questions.length;

    return (
      <div className="quiz-page">
        <div className="quiz-container">
          <div className="quiz-sidebar">
            <div className="quiz-progress">
              <h3>Progress</h3>
              <div className="progress-info">
                <span>0 questions</span>
              </div>
            </div>
            {canFilterDifficulty && (
              <div className="adv-filter-wrap">
                <button
                  className={`adv-filter-toggle ${difficultyOpen ? 'open' : ''}`}
                  onClick={() => setDifficultyOpen(v => !v)}
                >
                  <span>Advanced filtering</span>
                  <ChevronRight size={14} className="adv-filter-chevron" />
                </button>
                {difficultyOpen && (
                  <div className="adv-filter-options">
                    {['easy', 'medium', 'hard'].map(d => (
                      <button
                        key={d}
                        className={`adv-filter-btn adv-filter-${d} ${difficultyFilter === d ? 'active' : ''}`}
                        onClick={() => {
                          setDifficultyFilter(prev => prev === d ? null : d);
                          setCurrentIndex(0);
                          setSidebarPage(0);
                        }}
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="quiz-content">
            <div className="empty-quiz-inline">
              <h2>No questions available</h2>
              <p>No questions match the selected difficulty. Try a different filter.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="container quiz-page">
        <div className="empty-quiz">
          <h2>No questions available</h2>
          <button onClick={isExam ? handleExitExam : () => navigate('/grile')} className="btn btn-primary">
            {isExam ? 'Back to Exams' : 'Back to Questions'}
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = displayedQuestions[currentIndex];
  const { totalPoints, maxPoints } = calculateScore();
  const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
  const totalExamQuestions = examMeta?.questionCount || questions.length;
  const answeredCount = Object.keys(submittedAnswers).length;

  if (showResults) {
    return (
      <div className="container quiz-page">
        <div className="quiz-results">
          <h1>{isExam ? 'Exam Complete!' : 'Quiz Complete!'}</h1>
          <div className="results-score">
            <div className="score-circle">
              <span className="score-value">{percentage}%</span>
            </div>
            <div className="score-details">
              <p>{totalPoints} / {maxPoints} points</p>
            </div>
          </div>
          {isExam && (
            <ExamReview questions={questions} selectedAnswers={verifiedResult?.selectedAnswers || selectedAnswers} />
          )}
          {isExam && (
            <div className="exam-results-meta">
              <div className="exam-results-item">
                <span className="meta-label">Time spent</span>
                <span className="meta-value">{formatTime(timeSpent)}</span>
              </div>
              <div className="exam-results-item">
                <span className="meta-label">Completion</span>
                <span className="meta-value">
                  {finishReason === 'time' ? 'Time expired' : 'Completed'}
                </span>
              </div>
              <div className="exam-results-item">
                <span className="meta-label">Questions answered</span>
                <span className="meta-value">{answeredCount} / {questions.length}</span>
              </div>
            </div>
          )}
          <div className="results-actions">
            <button onClick={handleExitExam} className="btn btn-secondary">
              {isExam ? 'Back to Exams' : 'Back to Questions'}
            </button>
            <button onClick={handleRestartExam} className="btn btn-primary">
              {isExam ? 'Restart Exam' : 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <div className="quiz-container">
        <div className="quiz-sidebar">
          {isExam && (
            <div className="exam-timer">
              <p>Time Remaining</p>
              <span className={`timer-value ${timeLeft !== null && timeLeft <= 60 ? 'danger' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
          <div className="quiz-progress">
            <h3>Progress</h3>
            <div className="progress-info">
              <span>Question {currentIndex + 1} of {displayedQuestions.length}</span>
              <span>{Object.keys(selectedAnswers).length} answered</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentIndex + 1) / displayedQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          {canFilterDifficulty && (
            <div className="adv-filter-wrap">
              <button
                className={`adv-filter-toggle ${difficultyOpen ? 'open' : ''}`}
                onClick={() => setDifficultyOpen(v => !v)}
              >
                <span>Advanced filtering</span>
                <ChevronRight size={14} className="adv-filter-chevron" />
              </button>
              {difficultyOpen && (
                <div className="adv-filter-options">
                  {['easy', 'medium', 'hard'].map(d => (
                    <button
                      key={d}
                      className={`adv-filter-btn adv-filter-${d} ${difficultyFilter === d ? 'active' : ''}`}
                      onClick={() => {
                        setDifficultyFilter(prev => prev === d ? null : d);
                        setCurrentIndex(0);
                        setSidebarPage(0);
                      }}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="question-list">
            {displayedQuestions
              .slice(sidebarPage * SIDEBAR_PAGE_SIZE, (sidebarPage + 1) * SIDEBAR_PAGE_SIZE)
              .map((q, pageIdx) => {
                const idx = sidebarPage * SIDEBAR_PAGE_SIZE + pageIdx;
                const isAnswered = selectedAnswers[q._id] !== undefined;
                const isSubmitted = submittedAnswers[q._id] !== undefined;
                const isCorrect = submittedAnswers[q._id] === true;
                const isLocked = lockedQuestions[q._id];
                const disabledNav = isExam && (!examStarted || (isLocked && idx !== currentIndex));

                let btnClass = 'question-nav-btn';
                if (idx === currentIndex) btnClass += ' active';
                if (isSubmitted && isCorrect) btnClass += ' correct';
                if (isSubmitted && !isCorrect) btnClass += ' incorrect';
                if (isAnswered && !isSubmitted) btnClass += ' answered';
                if (disabledNav) btnClass += ' disabled';

                return (
                  <button
                    key={q._id}
                    className={btnClass}
                    disabled={disabledNav}
                    onClick={() => {
                      if (!disabledNav) {
                        setCurrentIndex(idx);
                        setSidebarPage(Math.floor(idx / SIDEBAR_PAGE_SIZE));
                      }
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
          </div>

          {displayedQuestions.length > SIDEBAR_PAGE_SIZE && (
            <div className="sidebar-pagination">
              <button
                className="sidebar-page-btn"
                onClick={() => setSidebarPage(p => Math.max(0, p - 1))}
                disabled={sidebarPage === 0}
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="sidebar-page-info">
                {sidebarPage * SIDEBAR_PAGE_SIZE + 1}–{Math.min((sidebarPage + 1) * SIDEBAR_PAGE_SIZE, displayedQuestions.length)}
                <span className="sidebar-page-total"> / {displayedQuestions.length}</span>
              </span>
              <button
                className="sidebar-page-btn"
                onClick={() => setSidebarPage(p => Math.min(Math.ceil(displayedQuestions.length / SIDEBAR_PAGE_SIZE) - 1, p + 1))}
                disabled={(sidebarPage + 1) * SIDEBAR_PAGE_SIZE >= displayedQuestions.length}
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <button 
            onClick={handleSubmitAll} 
            className="btn btn-primary"
            style={{ marginTop: '16px', width: '100%' }}
            disabled={isExam && !examStarted}
          >
            {isExam ? 'Submit Exam' : 'Finish Quiz'}
          </button>

          {!isExam && type !== 'daily' && wrongQuestions.length > 0 && (
            <div className="retry-wrong-section">
              <div className="retry-wrong-label">
                <span className="retry-wrong-count">{wrongQuestions.length}</span>
                wrong {wrongQuestions.length === 1 ? 'answer' : 'answers'}
              </div>
              <button
                className="retry-wrong-btn"
                onClick={handleRetryWrong}
              >
                Retry wrong answers
              </button>
            </div>
          )}
        </div>

        <div className="quiz-content">
          {submissionError && <p role="alert" className="answer-feedback incorrect">{submissionError}</p>}
          {isExam && examMeta && (
            <div className="exam-banner">
              <div className="exam-banner-header">
                <div>
                  <h2>{examMeta.title}</h2>
                  <p className="exam-banner-description">{examMeta.description}</p>
                  <p className="exam-banner-phase">{examMeta.phase} phase</p>
                </div>
              </div>
              <div className="exam-banner-meta">
                <div className="exam-meta-item">
                  <span className="meta-label">Duration</span>
                  <span className="meta-value">{examDurationMinutes} min</span>
                </div>
                <div className="exam-meta-item">
                  <span className="meta-label">Points</span>
                  <span className="meta-value">{examMeta.totalPoints}</span>
                </div>
                <div className="exam-meta-item">
                  <span className="meta-label">Questions</span>
                  <span className="meta-value">{totalExamQuestions}</span>
                </div>
              </div>
            </div>
          )}

          {isExam && !examStarted ? (
            <div className="exam-prep">
              <h2>Ready to start the test?</h2>
              <p>
                You will have {examDurationMinutes} minutes to solve {totalExamQuestions} questions. 
                Once you submit an answer it is locked, and incorrect answers cannot be revisited.
              </p>
              <ul className="exam-prep-list">
                <li>The timer starts as soon as you press Start Test</li>
                <li>Navigate forward carefully—wrong answers are locked</li>
                <li>The test ends when you submit all answers or time runs out</li>
              </ul>
              <button 
                onClick={handleStartExam}
                className="btn btn-primary"
              >
                Start Test
              </button>
            </div>
          ) : (
            <div className="question-card">
              {showTips && (
                <div className="tips-overlay" onClick={() => setShowTips(false)}>
                  <div className="tips-card" onClick={e => e.stopPropagation()} ref={tipsCardRef} tabIndex={-1} onKeyDown={e => e.key === 'Escape' && setShowTips(false)} style={{ outline: 'none' }}>
                    <div className="tips-card-header">
                      <span>Keyboard Shortcuts</span>
                      <button className="tips-close" onClick={() => setShowTips(false)}>✕</button>
                    </div>
                    <div className="tips-card-body">
                      <div className="tips-row">
                        <div className="tips-keys">
                          <kbd>→</kbd><span>or</span><kbd>D</kbd>
                        </div>
                        <span className="tips-desc">Next question</span>
                      </div>
                      <div className="tips-row">
                        <div className="tips-keys">
                          <kbd>←</kbd><span>or</span><kbd>A</kbd>
                        </div>
                        <span className="tips-desc">Previous question</span>
                      </div>
                      <div className="tips-row">
                        <div className="tips-keys">
                          <kbd>Enter</kbd>
                        </div>
                        <span className="tips-desc">Submit answer</span>
                      </div>
                    </div>
                    <p className="tips-note">Navigation keys are disabled while typing in a text field.</p>
                  </div>
                </div>
              )}
              <div className="question-header">
                <span className="question-number">Question {currentIndex + 1}</span>
                <div className="question-meta">
                  <button 
                    className="share-question-btn"
                    onClick={handleShareQuestion}
                    title="Share this question"
                  >
                    {showCopied ? <Check size={18} /> : <Share2 size={18} />}
                    {showCopied && <span className="copied-text">Copied!</span>}
                  </button>
                  <SaveButton
                    itemId={currentQuestion._id}
                    type="question"
                    title={currentQuestion.title}
                    savedItems={savedItems}
                    onToggle={setSavedItems}
                  />
                  <button
                    className="share-question-btn tips-btn"
                    onClick={() => setShowTips(v => !v)}
                    title="Tips"
                  >
                    <span className="tips-icon">?</span>
                    <span className="tips-label">Tips</span>
                  </button>
                  <span className="question-type">{currentQuestion.type}</span>
                  <span className="question-points">{currentQuestion.points || 1} {currentQuestion.points === 1 ? 'point' : 'points'}</span>
                </div>
              </div>

              
              {currentQuestion.tags && currentQuestion.tags.length > 0 && (
                <div className="question-tags">
                  {currentQuestion.tags.map((tag, idx) => (
                    <span key={idx} className="question-tag">{tag}</span>
                  ))}
                </div>
              )}

              <h2 className="question-title"><QuestionTitle title={currentQuestion.title} /></h2>

              {currentQuestion.multipleCorrect && (
                <div className="question-hint">
                  Select all correct answers
                </div>
              )}

              <div className="answers-list">
                {currentQuestion.answers.map((answer, idx) => {
                  const userAnswers = selectedAnswers[currentQuestion._id] || [];
                  const isSelected = userAnswers.includes(idx);
                  const isSubmitted = submittedAnswers[currentQuestion._id] !== undefined;
                  const correctAnswers = currentQuestion.correctAnswers || [];
                  const isCorrectAnswer = correctAnswers.includes(idx);
                  
                  let answerClass = 'answer-option';
                  if (isSelected) answerClass += ' selected';
                  if (currentQuestion.multipleCorrect) answerClass += ' multiple';
                  if (isSubmitted) {
                    if (isCorrectAnswer) answerClass += ' correct';
                    if (isSelected && !isCorrectAnswer) answerClass += ' incorrect';
                  }
                  
                  return (
                    <button
                      key={idx}
                      className={answerClass}
                      onClick={() => !isSubmitted && handleAnswerSelect(currentQuestion._id, idx, currentQuestion.multipleCorrect)}
                      disabled={isSubmitted || (isExam && !examStarted)}
                    >
                      <span className="answer-letter">{String.fromCharCode(65 + idx)}</span>
                      <span className="answer-text">{answer}</span>
                      {currentQuestion.multipleCorrect && (
                        <span className="answer-checkbox">
                          {isSelected && '✓'}
                        </span>
                      )}
                      {isSubmitted && isCorrectAnswer && (
                        <span className="answer-indicator">✓</span>
                      )}
                      {isSubmitted && isSelected && !isCorrectAnswer && (
                        <span className="answer-indicator">✗</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {submittedAnswers[currentQuestion._id] === undefined && (
                <button 
                  onClick={handleSubmitQuestion}
                  className="btn btn-primary"
                  disabled={
                    !selectedAnswers[currentQuestion._id] || 
                    selectedAnswers[currentQuestion._id].length === 0 ||
                    (isExam && !examStarted)
                  }
                  style={{ marginTop: '24px', width: '100%' }}
                >
                  Submit Answer
                </button>
              )}

              {!isExam && type !== 'daily' && submittedAnswers[currentQuestion._id] !== undefined &&
                <ExplanationViewer content={currentQuestion.explanation} />}

              <div className="quiz-actions">
                <button 
                  onClick={handlePrevious} 
                  disabled={currentIndex === 0}
                  className="btn btn-secondary"
                >
                  Previous
                </button>
                <button onClick={handleNext} className="btn btn-secondary" disabled={currentIndex === questions.length - 1}>
                  Next
                </button>
              </div>

              {submittedAnswers[currentQuestion._id] !== undefined && (() => {
                const correctAnswers = currentQuestion.correctAnswers || [];
                const correctTexts = correctAnswers.map(i => currentQuestion.answers[i]).filter(Boolean).join(', ');
                const query = encodeURIComponent(`${currentQuestion.title} (${correctTexts})`);
                const isCorrect = submittedAnswers[currentQuestion._id];
                return (
                  <div className="feedback-wrap">
                    <div className={`answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
                      {isCorrect ? (
                        <><span className="feedback-icon">✓</span><span className="feedback-text">Correct! +{currentQuestion.points || 1} points</span></>
                      ) : (
                        <><span className="feedback-icon">✗</span><span className="feedback-text">Incorrect. Try the next question!</span></>
                      )}
                    </div>
                    {!isExam && !(type === 'daily') && !currentQuestion.explanation?.trim() && (
                      <a
                        href={`https://www.google.com/search?q=${query}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explain-answer-btn"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        Explain answer
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
