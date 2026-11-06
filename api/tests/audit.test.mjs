import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { normalizeStore } from '../src/orders/schema.js';
import { orderXlsx } from '../../web/src/lib/xlsx.js';
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

// Reads the stored (uncompressed) entries back out of the zip the exporter writes.
function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = {};
  for (let at = 0; view.getUint32(at, true) === 0x04034b50;) {
    const size = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 30, at + 30 + nameLength));
    files[name] = new TextDecoder().decode(bytes.subarray(at + 30 + nameLength, at + 30 + nameLength + size));
    at += 30 + nameLength + size;
  }
  return files;
}

test('Excel export keeps every cell as text in Text-formatted columns', () => {
  const files = unzip(orderXlsx({ orderNumber: 'WO-202611-000003', customerName: 'ร้าน "ไทย" & <ลูก>',
    customerNote: '=1+1', deliveryDetails: 'บรรทัด 1\nบรรทัด 2',
    items: [{ goodsCode: '8859798725747', sku: '00123', name: 'กระบะทราย', quantity: 2, unitName: 'PC', unitQuantity: 1 }] }));
  assert.deepEqual(Object.keys(files).sort(), ['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels',
    'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml']);
  const sheet = files['xl/worksheets/sheet1.xml'];
  assert.match(files['xl/styles.xml'], /numFmtId="49"/);
  assert.equal((sheet.match(/<col /g) || []).length, 10);
  assert.ok(!/<c [^>]*t="(?!inlineStr)/.test(sheet) && !sheet.includes('<f>'));
  for (const text of ['8859798725747', '00123', '=1+1', 'ร้าน &quot;ไทย&quot; &amp; &lt;ลูก&gt;', 'บรรทัด 1\nบรรทัด 2']) {
    assert.ok(sheet.includes(`>${text}</t>`), text);
  }
  assert.match(sheet, /<c r="F2" s="1" t="inlineStr"><is><t xml:space="preserve">2<\/t>/);
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
  findArchivedOrder: async () => null,
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

test('concurrent creation and retry after a lost response return one persisted order', async () => {
  resetStore();
  catalogRows = [{ goodsId: 1, name: 'Test', minimumOrder: 1 }];
  const request = { user: { uid: 'customer', name: 'Test', role: 'customer' },
    body: { requestId: 'retry-request-000001', submit: true, items: [{ goodsId: 1, quantity: 2 }] } };
  const create = req => call(ordersRouter, '/drafts', req);
  const [first, second] = await Promise.all([create(request), create(request)]);
  assert.equal(first.statusCode, 201);
  assert.equal(second.body.data.orderId, first.body.data.orderId);
  assert.equal(store.orders.length, 2); // one existing draft + one new order
  assert.equal(store.nextOrderId, 3);
  // A retry must not revalidate a product that changed after the original commit.
  catalogRows = [];
  assert.equal((await create(request)).body.data.orderId, first.body.data.orderId);
  const changed = structuredClone(request); changed.body.items[0].quantity = 3;
  assert.equal((await create(changed)).statusCode, 409);
  const missing = structuredClone(request); delete missing.body.requestId;
  assert.equal((await create(missing)).statusCode, 400);
  catalogRows = [{ goodsId: 1, name: 'Test', minimumOrder: 1 }];
  const other = structuredClone(request); other.user.uid = 'another-customer';
  assert.notEqual((await create(other)).body.data.orderId, first.body.data.orderId);
  // A deleted draft must not let its request quietly create the order again.
  store.orders = store.orders.filter(order => order.orderId !== first.body.data.orderId);
  assert.equal((await create(request)).statusCode, 409);
});
