import { Router } from 'express';
import { firebaseAuth } from '../config/firebase.js';
import { forgetAccountStatus, requireAuth, requireRole, roles } from '../middleware/auth.js';
import { changeStore, readStore } from '../orders/store.js';
import { forget, presenceOf } from '../users/presence.js';

// Admin user management. Sign-in accounts live in this project's own Firebase Auth; the
// customer profile is kept in the local JSON store. Nothing here touches SQL.
export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole('admin'));

// Customers read their own profile to prefill an order.
export const profileRouter = Router();
profileRouter.use(requireAuth);

const MAX_USERS = 1000;
const profileFields = { companyName: 200, phone: 50, address: 1000, taxId: 20, note: 2000 };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function badRequest(res, message) {
  return res.status(400).json({ error: 'INVALID_USER_REQUEST', message });
}

function cleanProfile(input = {}) {
  const profile = {};
  for (const [field, limit] of Object.entries(profileFields)) {
    const value = typeof input[field] === 'string' ? input[field].trim().slice(0, limit) : '';
    if (value) profile[field] = value;
  }
  return profile;
}

function cleanName(value) {
  return typeof value === 'string' ? value.trim().slice(0, 120) : '';
}

function userView(user, profile) {
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    role: roles.includes(user.customClaims?.role) ? user.customClaims.role : null,
    disabled: user.disabled,
    createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : null,
    lastSignInAt: user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toISOString() : null,
    // Firebase refreshes a signed-in session roughly hourly, so this doubles as "last active".
    lastActiveAt: user.metadata.lastRefreshTime ? new Date(user.metadata.lastRefreshTime).toISOString() : null,
    ...presenceOf(user.uid),
    profile: profile || {}
  };
}

async function allUsers() {
  const users = [];
  let pageToken;
  do {
    const page = await firebaseAuth().listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken && users.length < MAX_USERS);
  return users;
}

// Keeps at least one working admin so nobody can lock the team out of this page.
async function assertOtherAdmin(uid) {
  const others = (await allUsers()).filter((user) => user.uid !== uid && !user.disabled && user.customClaims?.role === 'admin');
  if (!others.length) {
    const error = new Error('ต้องมีแอดมินที่ใช้งานได้อย่างน้อย 1 คน');
    error.status = 409;
    throw error;
  }
}

function handleUserError(res, next, error) {
  if (error.status) return res.status(error.status).json({ error: 'USER_CONFLICT', message: error.message });
  if (error.code === 'auth/user-not-found') return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'ไม่พบบัญชีผู้ใช้' });
  if (error.code === 'auth/email-already-exists') return res.status(409).json({ error: 'EMAIL_EXISTS', message: 'อีเมลนี้มีบัญชีอยู่แล้ว' });
  if (error.code === 'auth/invalid-email') return badRequest(res, 'รูปแบบอีเมลไม่ถูกต้อง');
  return next(error);
}

usersRouter.get('/', async (_req, res, next) => {
  try {
    const [users, store] = await Promise.all([allUsers(), readStore()]);
    const data = users
      .map((user) => userView(user, store.customers[user.uid]))
      .sort((a, b) => Number(b.online) - Number(a.online) || String(b.lastActiveAt || '').localeCompare(String(a.lastActiveAt || '')));
    return res.json({ data });
  } catch (error) { return next(error); }
});

// Creates the account without a password; the browser then sends Firebase's reset email so
// the user picks their own password and the admin never knows it.
usersRouter.post('/', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const displayName = cleanName(req.body.displayName);
    const role = req.body.role;
    if (!emailPattern.test(email) || email.length > 254) return badRequest(res, 'กรอกอีเมลให้ถูกต้อง');
    if (!displayName) return badRequest(res, 'กรอกชื่อผู้ใช้หรือชื่อร้าน');
    if (!roles.includes(role)) return badRequest(res, 'เลือกบทบาทของผู้ใช้');
    const profile = cleanProfile(req.body.profile);
    const user = await firebaseAuth().createUser({ email, displayName, emailVerified: false, disabled: false });
    try {
      await firebaseAuth().setCustomUserClaims(user.uid, { role });
    } catch (error) {
      // A roleless account is useless and would linger; remove it so the admin can retry.
      await firebaseAuth().deleteUser(user.uid).catch(() => undefined);
      throw error;
    }
    await changeStore((store) => {
      store.customers[user.uid] = { ...profile, createdAt: new Date().toISOString(), createdBy: req.user.uid };
    });
    const created = await firebaseAuth().getUser(user.uid);
    const store = await readStore();
    return res.status(201).json({ data: userView(created, store.customers[user.uid]) });
  } catch (error) { return handleUserError(res, next, error); }
});

usersRouter.patch('/:uid', async (req, res, next) => {
  try {
    const { uid } = req.params;
    const current = await firebaseAuth().getUser(uid);
    const updates = {};
    if (req.body.displayName !== undefined) {
      const displayName = cleanName(req.body.displayName);
      if (!displayName) return badRequest(res, 'กรอกชื่อผู้ใช้หรือชื่อร้าน');
      updates.displayName = displayName;
    }
    const currentRole = current.customClaims?.role;
    const roleChanged = req.body.role !== undefined && req.body.role !== currentRole;
    if (roleChanged) {
      if (!roles.includes(req.body.role)) return badRequest(res, 'เลือกบทบาทของผู้ใช้');
      if (uid === req.user.uid) return badRequest(res, 'เปลี่ยนบทบาทของบัญชีตัวเองไม่ได้');
      if (currentRole === 'admin') await assertOtherAdmin(uid);
    }
    if (Object.keys(updates).length) await firebaseAuth().updateUser(uid, updates);
    if (roleChanged) {
      await firebaseAuth().setCustomUserClaims(uid, { ...(current.customClaims || {}), role: req.body.role });
      // The new role is in the next token only; sign the user out so it applies right away.
      await firebaseAuth().revokeRefreshTokens(uid);
      forgetAccountStatus(uid);
      forget(uid);
    }
    if (req.body.profile !== undefined) {
      const profile = cleanProfile(req.body.profile);
      await changeStore((store) => {
        const { createdAt, createdBy } = store.customers[uid] || {};
        store.customers[uid] = { ...profile, createdAt, createdBy, updatedAt: new Date().toISOString(), updatedBy: req.user.uid };
      });
    }
    const [user, store] = await Promise.all([firebaseAuth().getUser(uid), readStore()]);
    return res.json({ data: userView(user, store.customers[uid]) });
  } catch (error) { return handleUserError(res, next, error); }
});

usersRouter.patch('/:uid/status', async (req, res, next) => {
  try {
    const { uid } = req.params;
    if (typeof req.body.disabled !== 'boolean') return badRequest(res, 'ระบุสถานะการใช้งาน');
    const disabled = req.body.disabled;
    if (disabled && uid === req.user.uid) return badRequest(res, 'ปิดใช้งานบัญชีตัวเองไม่ได้');
    const current = await firebaseAuth().getUser(uid);
    if (disabled && current.customClaims?.role === 'admin') await assertOtherAdmin(uid);
    await firebaseAuth().updateUser(uid, { disabled });
    // Sign the account out everywhere now instead of when its token expires.
    if (disabled) await firebaseAuth().revokeRefreshTokens(uid);
    forgetAccountStatus(uid);
    if (disabled) forget(uid);
    const [user, store] = await Promise.all([firebaseAuth().getUser(uid), readStore()]);
    return res.json({ data: userView(user, store.customers[uid]) });
  } catch (error) { return handleUserError(res, next, error); }
});

profileRouter.get('/', async (req, res, next) => {
  try {
    const store = await readStore();
    const { companyName, phone, address, taxId } = store.customers[req.user.uid] || {};
    return res.json({ data: { companyName: companyName || null, phone: phone || null, address: address || null, taxId: taxId || null } });
  } catch (error) { return next(error); }
});
