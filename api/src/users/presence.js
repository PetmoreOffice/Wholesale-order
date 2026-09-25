// "Online now" is kept in memory only: it is a live signal, not a record, so nothing is
// written to disk on every request. A restart simply clears it until users make requests again.
const ONLINE_MS = 5 * 60 * 1000;
const lastSeen = new Map();

export function markSeen(uid) {
  lastSeen.set(uid, Date.now());
}

export function forget(uid) {
  lastSeen.delete(uid);
}

export function presenceOf(uid) {
  const seen = lastSeen.get(uid);
  return { online: Boolean(seen && Date.now() - seen < ONLINE_MS), lastSeenAt: seen ? new Date(seen).toISOString() : null };
}
