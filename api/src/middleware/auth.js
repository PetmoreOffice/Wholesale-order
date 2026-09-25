import { firebaseAuth } from '../config/firebase.js';
import { markSeen } from '../users/presence.js';

export const roles = ['admin', 'customer'];

// An ID token stays valid for up to an hour, so a disabled or signed-out account is checked
// against Firebase as well. The lookup is cached briefly; disabling a user clears it at once.
const STATUS_MS = 60 * 1000;
const statusCache = new Map();

async function accountStatus(uid) {
  const cached = statusCache.get(uid);
  if (cached && Date.now() - cached.at < STATUS_MS) return cached;
  const user = await firebaseAuth().getUser(uid);
  const status = { at: Date.now(), disabled: user.disabled, validAfter: Date.parse(user.tokensValidAfterTime || 0) || 0 };
  statusCache.set(uid, status);
  return status;
}

export function forgetAccountStatus(uid) {
  statusCache.delete(uid);
}

export async function requireAuth(req, res, next) {
  const token = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  let decoded;
  try {
    decoded = await firebaseAuth().verifyIdToken(token);
    const status = await accountStatus(decoded.uid);
    if (status.disabled) return res.status(401).json({ error: 'ACCOUNT_DISABLED', message: 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
    if (decoded.auth_time * 1000 < status.validAfter) throw new Error('Token revoked');
  } catch (error) {
    return res.status(401).json({ error: 'INVALID_AUTH_TOKEN', message: 'Session หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
  }
  // Only accounts given a role by an admin may use the API; a bare sign-up gets nothing.
  if (!roles.includes(decoded.role)) {
    return res.status(403).json({ error: 'NO_ROLE', message: 'บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
  }
  req.user = {
    uid: decoded.uid,
    email: decoded.email || '',
    name: decoded.name || decoded.email || 'ผู้ใช้งาน',
    role: decoded.role
  };
  markSeen(decoded.uid);
  return next();
}

export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.user?.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้' });
    }
    return next();
  };
}
