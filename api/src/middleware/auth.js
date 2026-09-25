import { firebaseAuth } from '../config/firebase.js';

export async function requireAuth(req, res, next) {
  const token = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  try {
    const decoded = await firebaseAuth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      name: decoded.name || decoded.email || 'ผู้ใช้งาน',
      role: decoded.role === 'admin' ? 'admin' : 'customer'
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'INVALID_AUTH_TOKEN', message: 'Session หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้' });
    }
    return next();
  };
}
