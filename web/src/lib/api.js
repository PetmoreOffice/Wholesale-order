import { QueryClient } from '@tanstack/react-query';
import { auth } from '../firebase.js';

// Development talks to the API on its own port; a production build is served by the API
// itself (same origin), so it uses /api unless VITE_API_URL says otherwise.
export const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

// Demo mode (development only, `npm run dev:demo`): answers from labelled synthetic data so
// screens can be checked without SQL or Firebase. Production builds never include it.
export const demoMode = import.meta.env.DEV && import.meta.env.MODE === 'demo';

export async function apiFetch(path, options = {}) {
  if (demoMode) {
    const { demoFetch } = await import('../demo/demoApi.js');
    return demoFetch(path, options);
  }
  const token = await auth?.currentUser?.getIdToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', 'Bearer ' + token);
  return fetch(apiUrl + path, { ...options, headers });
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const statusMessages = {
  401: 'เซสชันหมดอายุ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่',
  403: 'บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้',
  503: 'ระบบฐานข้อมูลไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง'
};

/** JSON request that throws ApiError with the API's Thai message. `body` objects are sent as JSON. */
export async function api(path, { body, method, ...options } = {}) {
  const init = { ...options, method: method || (body === undefined ? 'GET' : 'POST') };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json', ...options.headers };
    init.body = JSON.stringify(body);
  }
  let response;
  try {
    response = await apiFetch(path, init);
  } catch {
    throw new ApiError('เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', 0, 'NETWORK');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.message || statusMessages[response.status] || `ทำรายการไม่สำเร็จ (HTTP ${response.status})`, response.status, data.error);
  return data;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      // A refused or missing record will not appear by asking again.
      retry: (failures, error) => failures < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500)
    }
  }
});
