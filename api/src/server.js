import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { connectDatabase } from './config/db.js';
import { requireAuth } from './middleware/auth.js';
import { notificationsRouter } from './routes/notifications.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';
import { profileRouter, usersRouter } from './routes/users.js';

const app = express();
const port = Number(process.env.PORT || 3001);

const allowedOrigins = new Set((process.env.CLIENT_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean));
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://127.0.0.1:5173');
}
app.use(cors({ origin(origin, callback) { callback(null, !origin || allowedOrigins.has(origin)); } }));
app.use(express.json());

app.get('/', (_req, res) => {
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
app.use('/api/profile', profileRouter);

// Details stay in the server log; SQL and Firebase internals never reach the browser.
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'INVALID_JSON', message: 'รูปแบบข้อมูลไม่ถูกต้อง' });
  return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ' });
});

app.listen(port, () => console.log(`Wholesale API listening on http://localhost:${port}`));
