import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { connectDatabase } from './config/db.js';
import { requireAuth } from './middleware/auth.js';
import { archiveOldOrders } from './orders/store.js';
import { dataRouter } from './routes/data.js';
import { notificationsRouter } from './routes/notifications.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';
import { profileRouter, usersRouter } from './routes/users.js';

const app = express();
const port = Number(process.env.PORT || 3001);
// Behind IIS set HOST=127.0.0.1 so the Node port is reachable only through the proxy.
const host = process.env.HOST || undefined;

// In production the API also serves the built website (web/dist), so one Windows service
// runs the whole app. Override the folder with WEB_DIST; without a build, only the API runs.
const webDist = path.resolve(process.env.WEB_DIST || path.join(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist'));
const serveWeb = existsSync(path.join(webDist, 'index.html'));

const allowedOrigins = new Set((process.env.CLIENT_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean));
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://127.0.0.1:5173');
}
app.use(cors({ origin(origin, callback) { callback(null, !origin || allowedOrigins.has(origin)); } }));
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  next();
});
app.use(express.json());

if (!serveWeb) app.get('/', (_req, res) => {
  res.json({
    service: 'Wholesale Order API',
    health: '/api/health',
    products: '/api/products?q=SKU-or-name'
  });
});

app.get('/api/health', async (_req, res, next) => {
  try {
    await connectDatabase();
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error(error);
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.use('/api/products', requireAuth, productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin/users', usersRouter);
app.use('/api/admin/data', dataRouter);
app.use('/api/profile', profileRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'NOT_FOUND', message: 'ไม่พบ API นี้' }));

if (serveWeb) {
  // Hashed build assets never change, so browsers may keep them; index.html is always re-checked.
  app.use(express.static(webDist, {
    index: false,
    setHeaders(res, file) {
      res.set('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
    }
  }));
  // Routes such as /settings or /orders/5 live in the browser: answer them with the app.
  app.get('*', (_req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

// Details stay in the server log; SQL and Firebase internals never reach the browser.
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'INVALID_JSON', message: 'รูปแบบข้อมูลไม่ถูกต้อง' });
  return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ' });
});

app.listen(port, host, () => console.log(`Wholesale ${serveWeb ? 'app' : 'API'} listening on http://${host || 'localhost'}:${port}${serveWeb ? ` (website from ${webDist})` : ''}`));

// Closed orders untouched for ORDER_ARCHIVE_DAYS (default 365, 0 turns it off) move to
// data/archive once at start-up and then daily, keeping data/orders.json small.
const archiveDays = Number(process.env.ORDER_ARCHIVE_DAYS ?? 365);
if (archiveDays > 0) {
  const archive = () => archiveOldOrders(archiveDays)
    .then((count) => { if (count) console.log(`Archived ${count} closed orders older than ${archiveDays} days.`); })
    .catch((error) => console.error('Order archive failed:', error));
  archive();
  setInterval(archive, 24 * 60 * 60 * 1000).unref();
}
