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

export const getDictionary = async () => {
  const res = await fetch(`${API_URL}/resources/dictionary`);
  return res.json();
};

export const getResources = async () => {
  const res = await fetch(`${API_URL}/resources/predefined`);
  return res.json();
};

export const getRoadmap = async (title) => {
  const res = await fetch(`${API_URL}/resources/roadmap/${title}`);
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
export const getMe = async () => {
  const res = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    credentials: 'include'
  });
  return res.json();
};

export const logout = async () => {
  const res = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  return res.json();
};

export const markQuestionSolved = async (questionId) => {
  const res = await fetch(`${API_URL}/progress/mark-solved`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ questionId })
  });
  return res.json();
};

export const addSimulation = async (simulationData) => {
  const res = await fetch(`${API_URL}/progress/simulation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(simulationData)
  });
  return res.json();
};

export const sendContactMessage = async (contactData) => {
  const res = await fetch(`${API_URL}/contact/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contactData)
  });
  return res.json();
};