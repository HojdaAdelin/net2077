import { API_URL } from '../config';

export const getStats = async () => {
  const res = await fetch(`${API_URL}/api/stats`);
  return res.json();
};

export const getQuestions = async (type) => {
  const url = type ? `${API_URL}/api/questions?type=${type}` : `${API_URL}/api/questions`;
  const res = await fetch(url);
  return res.json();
};

export const getUnsolvedQuestions = async () => {
  const res = await fetch(`${API_URL}/api/questions/unsolved`, { 
    credentials: 'include'
  });
  return res.json();
};

export const getRandom50 = async () => {
  const res = await fetch(`${API_URL}/api/questions/random50`);
  return res.json();
};

export const getDictionary = async () => {
  const res = await fetch(`${API_URL}/api/resources/dictionary`);
  return res.json();
};

export const getResources = async () => {
  const res = await fetch(`${API_URL}/api/resources/predefined`);
  return res.json();
};

export const getRoadmap = async (title) => {
  const res = await fetch(`${API_URL}/resources/roadmap/${title}`);
  return res.json();
};

export const getUserProgress = async () => {
  const res = await fetch(`${API_URL}/api/progress/user`, { 
    credentials: 'include'
  });
  return res.json();
};

export const login = async (email, password) => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });
  return res.json();
};

export const register = async (username, email, password) => {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, email, password })
  });
  return res.json();
};
