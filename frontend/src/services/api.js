const API_URL = '/api';

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
