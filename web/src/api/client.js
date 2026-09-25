import { auth } from '../firebase.js';

// Development talks to the API on its own port; a production build is served by the API
// itself (same origin), so it uses /api unless VITE_API_URL says otherwise.
export const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

export async function apiFetch(url, options = {}) {
  const token = await auth?.currentUser?.getIdToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', 'Bearer ' + token);
  return fetch(url, { ...options, headers });
}
