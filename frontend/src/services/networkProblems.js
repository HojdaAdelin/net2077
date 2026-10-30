import { API_URL } from '../config';

export async function networkRequest(path = '', { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${API_URL}/network-problems${path}`, {
    method, signal, credentials: 'include',
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.message || 'Unable to complete this request.'), { status: response.status });
  return data;
}
