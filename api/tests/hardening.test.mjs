import assert from 'node:assert/strict';
import { test } from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRateLimiter } from '../src/middleware/rate-limit.js';
import { observeSession } from '../../web/src/lib/observeSession.js';
import { creationRequest } from '../../web/src/lib/creationRequest.js';

test('invalid archive fails closed without modifying live or archived orders', async () => {
  // The copy keeps the repo layout (api/ beside shared/) so store.js finds the shared workflow.
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'wholesale-archive-test-'));
  const root = path.join(sandbox, 'api');
  try {
    await fs.mkdir(path.join(sandbox, 'shared'), { recursive: true });
    await fs.copyFile(new URL('../../shared/orderWorkflow.js', import.meta.url), path.join(sandbox, 'shared/orderWorkflow.js'));
    await fs.writeFile(path.join(sandbox, 'package.json'), '{"type":"module"}');
    await fs.mkdir(path.join(root, 'src/orders'), { recursive: true });
    await fs.mkdir(path.join(root, 'data/archive'), { recursive: true });
    await fs.writeFile(path.join(root, 'package.json'), '{"type":"module"}');
    for (const name of ['store.js', 'schema.js']) await fs.copyFile(new URL('../src/orders/' + name, import.meta.url), path.join(root, 'src/orders', name));
    const order = { orderId: 1, customerId: 'test', status: 'completed', updatedAt: '2020-01-01T00:00:00Z', items: [{ goodsId: 1, quantity: 1 }], history: [], messages: [] };
    const live = JSON.stringify({ nextOrderId: 2, orders: [order] });
    const archiveFile = path.join(root, 'data/archive/orders-2020.json');
    await fs.writeFile(path.join(root, 'data/orders.json'), live);
    const isolated = await import(pathToFileURL(path.join(root, 'src/orders/store.js')));
    for (const broken of ['{"orders":{}}', '{"wrongKey":[]}', '{"orders":[{"orderId":2}]}']) {
      await fs.writeFile(archiveFile, broken);
      await assert.rejects(isolated.archiveOldOrders(365));
      assert.equal(await fs.readFile(archiveFile, 'utf8'), broken);
      assert.equal(await fs.readFile(path.join(root, 'data/orders.json'), 'utf8'), live);
    }
    await fs.writeFile(archiveFile, '{"orders":[]}');
    assert.equal(await isolated.archiveOldOrders(365), 1);
    assert.equal((await isolated.findArchivedOrder(1)).customerId, 'test');
  } finally {
    const resolved = path.resolve(sandbox);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('wholesale-archive-test-')) throw new Error('Unexpected test cleanup path');
    await fs.rm(resolved, { recursive: true, force: true });
  }
});

test('rate limit separates accounts and resets after the window', () => {
  let clock = 0; let passed = 0;
  const middleware = createRateLimiter({ limit: 2, windowMs: 1000, now: () => clock });
  const response = { set(name, value) { this[name] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  const run = uid => middleware({ user: { uid } }, response, () => passed++);
  run('a'); run('a'); run('a');
  assert.equal(passed, 2); assert.equal(response.code, 429); assert.equal(response['Retry-After'], '1');
  run('b'); assert.equal(passed, 3);
  clock = 1000; run('a'); assert.equal(passed, 4);
});

test('session failure ends loading; old reads cannot restore a signed-out session', async () => {
  let callback; let currentSession; let loading; let error;
  const stop = observeSession(cb => { callback = cb; return () => {}; }, {
    session: value => currentSession = value, loading: value => loading = value, error: value => error = value
  });
  await callback({ getIdTokenResult: async () => { throw new Error('offline'); } });
  assert.equal(loading, false); assert.ok(error); assert.equal(currentSession, null);
  let resolve;
  const pending = callback({ uid: 'old', getIdTokenResult: () => new Promise(done => resolve = done) });
  await callback(null);
  resolve({ claims: { role: 'admin' } }); await pending;
  assert.equal(currentSession, null); assert.equal(loading, false);
  stop();
});

test('creation request survives remount and isolates account and payload', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const values = new Map();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)
  } });
  try {
    const payload = { items: [{ goodsId: 1, quantity: 2 }] };
    const first = await creationRequest('a', payload);
    assert.equal((await creationRequest('a', payload)).id, first.id);
    assert.notEqual((await creationRequest('b', payload)).id, first.id);
    assert.notEqual((await creationRequest('a', { items: [] })).id, first.id);
    first.clear(); assert.notEqual((await creationRequest('a', payload)).id, first.id);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous);
    else delete globalThis.sessionStorage;
  }
});
