import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { connectDatabase } from './config/db.js';
import { requireAuth } from './middleware/auth.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';

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
    next(error);
  }
});

app.use('/api/products', requireAuth, productsRouter);
app.use('/api/orders', ordersRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
});

app.listen(port, () => console.log(`Wholesale API listening on http://localhost:${port}`));
