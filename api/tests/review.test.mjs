import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import * as realStore from '../src/orders/store.js';

// Mock SQL, Firebase and the order store: no database, no Firebase, no files touched.
let store;
let queries = [];
let catalogRows = [];
await mock.module('../src/config/db.js', { namedExports: { query: async (sql, params) => { queries.push({ sql, params }); return catalogRows; } } });
await mock.module('../src/config/firebase.js', { namedExports: { firebaseAuth: () => ({}) } });
await mock.module('../src/middleware/auth.js', { namedExports: {
  requireAuth: (_req, _res, next) => next(), requireRole: () => (_req, _res, next) => next(),
  forgetAccountStatus: () => {}, roles: ['admin', 'customer']
} });
await mock.module('../src/orders/store.js', { namedExports: {
  ...realStore,
  readStore: async () => structuredClone(store),
  findArchivedOrder: async () => null,
  changeStore: async (callback) => {
    const copy = structuredClone(store);
    const value = await callback(copy);
    store = copy;
    return value;
  }
} });
const { ordersRouter } = await import('../src/routes/orders.js');
const { notificationsRouter } = await import('../src/routes/notifications.js');

async function call(router, method, path, req) {
  const route = router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]).route;
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await route.stack.at(-1).handle(req, res, (error) => { throw error; });
  return res;
}

const customer = { uid: 'customer', name: 'ร้านทดสอบ', role: 'customer' };
const line = (goodsId) => ({ goodsId, quantity: 2, name: 'Item ' + goodsId, itemId: 'i' + goodsId });

test('submitting a draft checks every line with one SELECT', async () => {
  store = { nextOrderId: 2, customers: {}, activity: [], orders: [{ orderId: 1, customerId: 'customer', status: 'draft', items: [line(1), line(2), line(3)], history: [], messages: [] }] };
  catalogRows = [1, 2, 3].map((goodsId) => ({ goodsId, name: 'Item ' + goodsId, minimumOrder: 1 }));
  queries = [];
  const res = await call(ordersRouter, 'post', '/:orderId/submit', { params: { orderId: '1' }, user: customer });
  assert.equal(res.statusCode, 200);
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /GOODS_KEY IN \(@goods0, @goods1, @goods2\)/);
  assert.deepEqual(queries[0].params, { goods0: 1, goods1: 2, goods2: 3 });
});

test('order numbers use the month in Thai time', async () => {
  store = { nextOrderId: 1, customers: {}, activity: [], orders: [] };
  catalogRows = [{ goodsId: 1, name: 'Item 1', minimumOrder: 1 }];
  mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-09-30T18:30:00Z') }); // 1 Oct 01:30 in Bangkok
  try {
    const res = await call(ordersRouter, 'post', '/drafts', { body: { items: [{ goodsId: 1, quantity: 1 }] }, user: customer });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.orderNumber, 'WO-202610-000001');
  } finally { mock.timers.reset(); }
});

test('customers do not receive admin account ids in the order history', async () => {
  store = { nextOrderId: 2, customers: {}, activity: [], orders: [{
    orderId: 1, customerId: 'customer', status: 'assigned', items: [line(1)], messages: [],
    history: [{ historyId: 'h1', toStatus: 'assigned', actorRole: 'admin', actorId: 'admin-uid', actorName: 'แอดมิน', createdAt: '2026-09-01T00:00:00Z' }]
  }] };
  const res = await call(ordersRouter, 'get', '/:orderId', { params: { orderId: '1' }, user: customer });
  assert.equal(res.body.data.history[0].actorName, 'แอดมิน');
  assert.equal('actorId' in res.body.data.history[0], false);
});

test('marking notifications read stops at the newest event shown', async () => {
  store = { nextOrderId: 1, orders: [], customers: {}, activity: [], notificationReads: {} };
  const until = '2026-09-01T10:00:00.000Z';
  await call(notificationsRouter, 'post', '/read', { body: { until }, user: customer });
  assert.equal(store.notificationReads.customer, until);
  // A future or missing time falls back to now.
  await call(notificationsRouter, 'post', '/read', { body: { until: '2999-01-01T00:00:00Z' }, user: customer });
  assert.ok(Date.parse(store.notificationReads.customer) <= Date.now());
});
