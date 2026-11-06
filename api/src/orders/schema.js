const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Missing optional collections belong to older versions. Invalid existing collections
// are corruption, never an instruction to replace business data with empty arrays.
export function normalizeStore(store) {
  if (!isObject(store) || !Array.isArray(store.orders) ||
      !Number.isSafeInteger(store.nextOrderId) || store.nextOrderId < 1) {
    throw new Error('Invalid order store structure');
  }
  const ids = new Set();
  for (const order of store.orders) {
    if (!isObject(order) || !Number.isSafeInteger(order.orderId) || order.orderId < 1 ||
        order.orderId >= store.nextOrderId || ids.has(order.orderId) ||
        typeof order.customerId !== 'string' || !order.customerId ||
        typeof order.status !== 'string' || !order.status ||
        !Array.isArray(order.items) || !order.items.length ||
        !Array.isArray(order.history) || !Array.isArray(order.messages)) {
      throw new Error('Invalid order or duplicate order ID');
    }
    ids.add(order.orderId);
    if (order.items.some(item => !isObject(item) || !Number.isSafeInteger(item.goodsId) ||
        item.goodsId < 1 || !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
      throw new Error('Invalid order items');
    }
  }
  for (const field of ['notificationReads', 'customers', 'creationRequests']) {
    if (store[field] !== undefined && !isObject(store[field])) throw new Error(`Invalid ${field}`);
  }
  if (store.activity !== undefined && !Array.isArray(store.activity)) throw new Error('Invalid activity');
  // creationRequests: one record per order-creating request, so a retried request returns the
  // order it already made instead of a second one (see POST /orders/drafts).
  for (const record of Object.values(store.creationRequests ?? {})) {
    if (!isObject(record) || !Number.isSafeInteger(record.orderId) || record.orderId < 1 || typeof record.hash !== 'string') throw new Error('Invalid creation request');
  }
  return { ...store, creationRequests: store.creationRequests ?? {}, notificationReads: store.notificationReads ?? {}, customers: store.customers ?? {}, activity: store.activity ?? [] };
}

// An archive file must hold well-formed orders before anything reads from or appends to it:
// a broken file fails closed instead of being overwritten.
export function validateArchive(value) {
  if (!isObject(value) || !Array.isArray(value.orders)) throw new Error('Invalid archive structure');
  const maxId = value.orders.reduce((max, order) => Math.max(max, order?.orderId || 0), 0);
  normalizeStore({ nextOrderId: maxId + 1, orders: value.orders });
  return value.orders;
}
