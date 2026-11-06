// Persist only a payload hash and ID, so retries/reloads in this tab reuse the request.
export async function creationRequest(uid, payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  const key = `wholesale-create:${uid}:${hash}`;
  let id;
  try { id = sessionStorage.getItem(key); } catch { /* in-memory retry still works */ }
  id ||= crypto.randomUUID();
  try { sessionStorage.setItem(key, id); } catch { /* blocked browser storage */ }
  return { id, clear() { try { sessionStorage.removeItem(key); } catch { /* blocked storage */ } } };
}
