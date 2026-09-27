import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { normalizeStore } from '../src/orders/schema.js';
import { orderCsv } from '../../web/src/lib/csv.js';
import * as realStore from '../src/orders/store.js';

const draft = () => ({ orderId: 1, customerId: 'customer', status: 'draft',
  items: [{ goodsId: 1, quantity: 2, itemId: 'original' }], history: [], messages: [] });
test('invalid existing stores fail closed; legacy optional fields remain compatible', () => {
  const valid = { nextOrderId: 2, orders: [draft()] };
  assert.deepEqual(normalizeStore(valid).customers, {});
  for (const invalid of [{}, [], { ...valid, orders: {} }, { ...valid, nextOrderId: 1 },
    { ...valid, orders: [draft(), draft()] }, { ...valid, customers: [] },
    { ...valid, orders: [{ ...draft(), items: [{ goodsId: 1, quantity: -1 }] }] }]) {
    assert.throws(() => normalizeStore(invalid));
  }
});

test('CSV neutralizes formulas including whitespace prefixes and escapes Thai text', () => {
  for (const value of ['=1+1', '+1', '-1', '@SUM(A1)', '  =1', '\t=1', '\r=1']) {
    const csv = orderCsv({ items: [{}], customerNote: value });
    assert.ok(csv.includes(`"'${value}"`));
  }
  const csv = orderCsv({ items: [{ sku: '00123', quantity: 2 }], customerNote: 'ร้าน "ไทย",\nทดสอบ' });
  assert.ok(csv.startsWith('\ufeff'));
  assert.ok(csv.includes('"00123"'));
  assert.ok(csv.includes('"ร้าน ""ไทย"",\nทดสอบ"'));
});

let store;
let catalogRows;
let writes = Promise.resolve();
const users = new Map();
await mock.module('../src/config/db.js', { namedExports: { query: async () => catalogRows } });
await mock.module('../src/config/firebase.js', { namedExports: { firebaseAuth: () => ({
  getUser: async uid => structuredClone(users.get(uid)),
  listUsers: async () => ({ users: structuredClone([...users.values()]) }),
  updateUser: async (uid, update) => { await new Promise(resolve => setImmediate(resolve)); Object.assign(users.get(uid), update); },
  setCustomUserClaims: async (uid, claims) => { users.get(uid).customClaims = claims; },
  revokeRefreshTokens: async () => {}
}) } });
await mock.module('../src/middleware/auth.js', { namedExports: {
  requireAuth: (_req, _res, next) => next(), requireRole: () => (_req, _res, next) => next(),
  forgetAccountStatus: () => {}, roles: ['admin', 'customer']
} });
await mock.module('../src/orders/store.js', { namedExports: {
  ...realStore,
  readStore: async () => structuredClone(store),
  changeStore: callback => {
    const result = writes.then(async () => {
      const copy = structuredClone(store);
      const value = await callback(copy);
      store = copy;
      return value;
    });
    writes = result.catch(() => {});
    return result;
  }
} });
const { ordersRouter } = await import('../src/routes/orders.js');
const { usersRouter } = await import('../src/routes/users.js');
async function call(router, path, req) {
  const route = router.stack.find(layer => layer.route?.path === path).route;
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await route.stack.at(-1).handle(req, res, error => { throw error; });
  return res;
}
function resetStore() { store = { nextOrderId: 2, orders: [draft()], customers: {}, activity: [] }; }
const submit = () => call(ordersRouter, '/:orderId/submit', { params: { orderId: '1' }, user: { uid: 'customer', name: 'Test' } });

test('submission refuses withdrawn products and new minimums without changing draft', async () => {
  for (const rows of [[], [{ goodsId: 1, name: 'Test', minimumOrder: 5 }], [{ goodsId: 1, name: 'Test', maximumOrder: 1 }]]) {
    resetStore(); catalogRows = rows;
    const before = structuredClone(store);
    assert.equal((await submit()).statusCode, 400);
    assert.deepEqual(store, before);
  }
});
test('submission refreshes product snapshot and concurrent submission commits once', async () => {
  resetStore(); catalogRows = [{ goodsId: 1, name: 'Updated', minimumOrder: 1, maximumOrder: 10 }];
  const responses = await Promise.all([submit(), submit()]);
  assert.deepEqual(responses.map(res => res.statusCode), [200, 409]);
  assert.equal(store.orders[0].items[0].name, 'Updated');
  assert.equal(store.orders[0].items[0].itemId, 'original');
  assert.equal(store.orders[0].history.length, 1);
});
test('concurrent cross-disable and cross-demotion retain an active admin', async () => {
  for (const path of ['/:uid/status', '/:uid']) {
    resetStore(); users.clear();
    for (const uid of ['a', 'b']) users.set(uid, { uid, displayName: uid, disabled: false, customClaims: { role: 'admin' }, metadata: {} });
    const requests = [['a', 'b'], ['b', 'a']].map(([actor, target]) => call(usersRouter, path, {
      user: { uid: actor, name: actor }, params: { uid: target },
      body: path.endsWith('status') ? { disabled: true } : { role: 'customer' }
    }));
    assert.deepEqual((await Promise.all(requests)).map(res => res.statusCode), [200, 409]);
    assert.equal([...users.values()].filter(user => !user.disabled && user.customClaims.role === 'admin').length, 1);
  }
});
