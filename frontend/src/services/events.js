import { API_URL } from '../config';

export async function eventRequest(path = '', { method = 'GET', body, signal, keepalive = false } = {}) {
  const response = await fetch(`${API_URL}/events${path}`, { method, signal, keepalive, credentials: 'include',
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.message || 'Unable to load this event.'), { status: response.status });
  return data;
}
