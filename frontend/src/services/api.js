const API_URL = '/api';

const getToken = () => localStorage.getItem('token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
});

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
  const res = await fetch(`${API_URL}/questions/unsolved`, { headers: authHeaders() });
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
  const res = await fetch(`${API_URL}/progress/user`, { headers: authHeaders() });
  return res.json();
};

export const login = async (email, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
};

export const register = async (username, email, password) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  return res.json();
};
