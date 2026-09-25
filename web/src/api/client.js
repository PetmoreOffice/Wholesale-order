import { auth } from '../firebase.js';

export const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function apiFetch(url, options = {}) {
  const token = await auth?.currentUser?.getIdToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', 'Bearer ' + token);
  return fetch(url, { ...options, headers });
}
