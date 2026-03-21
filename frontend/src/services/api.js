import { API_URL } from '../config';

export const getStats = async () => {
  const res = await fetch(`${API_URL}/stats`);
  return res.json();
};

export const getQuestions = async (type) => {
  const url = type ? `${API_URL}/questions?type=${type}` : `${API_URL}/questions`;
  const res = await fetch(url);
  return res.json();
};

export const getUnsolvedQuestions = async () => {
  const res = await fetch(`${API_URL}/questions/unsolved`, { 
    credentials: 'include'
  });
  return res.json();
};

export const getRandom50 = async () => {
  const res = await fetch(`${API_URL}/questions/random50`);
  return res.json();
};

export const getResources = async () => {
  const res = await fetch(`${API_URL}/resources/predefined`);
  return res.json();
};

export const getRoadmaps = async () => {
  const res = await fetch(`${API_URL}/resources/roadmaps`);
  return res.json();
};

export const createRoadmap = async (data) => {
  const res = await fetch(`${API_URL}/resources/roadmaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateRoadmap = async (roadmapId, data) => {
  const res = await fetch(`${API_URL}/resources/roadmaps/${roadmapId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteRoadmap = async (roadmapId) => {
  const res = await fetch(`${API_URL}/resources/roadmaps/${roadmapId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
};

export const getUserProgress = async () => {
  const res = await fetch(`${API_URL}/progress/user`, { 
    credentials: 'include'
  });
  return res.json();
};

export const login = async (email, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });
  return res.json();
};

export const register = async (username, email, password) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, email, password })
  });
  return res.json();
};
export const getDailyLinux = async () => {
  const res = await fetch(`${API_URL}/questions/dailyLinux`);
  return res.json();
};

export const getDailyChallengeStatus = async () => {
  const res = await fetch(`${API_URL}/questions/dailyChallengeStatus`, { 
    credentials: 'include'
  });
  return res.json();
};

export const getLeaderboard = async () => {
  const res = await fetch(`${API_URL}/leaderboard`);
  return res.json();
};

export const checkPendingRewards = async () => {
  const res = await fetch(`${API_URL}/progress/pending-rewards`, { 
    credentials: 'include'
  });
  return res.json();
};

export const claimLevelRewards = async () => {
  const res = await fetch(`${API_URL}/progress/claim-rewards`, {
    method: 'POST',
    credentials: 'include'
  });
  return res.json();
};

// ── Learn API ─────────────────────────────────────────────────────────────────

export const getChapters = async (roadmapId) => {
  const res = await fetch(`${API_URL}/learn/roadmaps/${roadmapId}/chapters`, { credentials: 'include' });
  return res.json();
};

export const createChapter = async (roadmapId, title) => {
  const res = await fetch(`${API_URL}/learn/roadmaps/${roadmapId}/chapters`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    credentials: 'include', body: JSON.stringify({ title }),
  });
  return res.json();
};

export const updateChapter = async (chapterId, data) => {
  const res = await fetch(`${API_URL}/learn/chapters/${chapterId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    credentials: 'include', body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteChapter = async (chapterId) => {
  const res = await fetch(`${API_URL}/learn/chapters/${chapterId}`, {
    method: 'DELETE', credentials: 'include',
  });
  return res.json();
};

export const getLessons = async (chapterId) => {
  const res = await fetch(`${API_URL}/learn/chapters/${chapterId}/lessons`, { credentials: 'include' });
  return res.json();
};

export const createLesson = async (chapterId, title, roadmapId) => {
  const res = await fetch(`${API_URL}/learn/chapters/${chapterId}/lessons`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    credentials: 'include', body: JSON.stringify({ title, roadmapId }),
  });
  return res.json();
};

export const getLesson = async (lessonId) => {
  const res = await fetch(`${API_URL}/learn/lessons/${lessonId}`, { credentials: 'include' });
  return res.json();
};

export const getLessonForEdit = async (lessonId) => {
  const res = await fetch(`${API_URL}/learn/lessons/${lessonId}/edit`, { credentials: 'include' });
  return res.json();
};

export const updateLesson = async (lessonId, data) => {
  const res = await fetch(`${API_URL}/learn/lessons/${lessonId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    credentials: 'include', body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteLesson = async (lessonId) => {
  const res = await fetch(`${API_URL}/learn/lessons/${lessonId}`, {
    method: 'DELETE', credentials: 'include',
  });
  return res.json();
};

export const checkAnswer = async (lessonId, itemId, answer) => {
  const res = await fetch(`${API_URL}/learn/lessons/${lessonId}/items/${itemId}/check`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    credentials: 'include', body: JSON.stringify({ answer }),
  });
  return res.json();
};

export const getRoadmapProgress = async (roadmapId) => {
  const res = await fetch(`${API_URL}/learn/roadmaps/${roadmapId}/progress`, { credentials: 'include' });
  return res.json();
};

export const getLessonProgress = async (lessonId) => {
  const res = await fetch(`${API_URL}/learn/lessons/${lessonId}/progress`, { credentials: 'include' });
  return res.json();
};
