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
  for (const field of ['notificationReads', 'customers']) {
    if (store[field] !== undefined && !isObject(store[field])) throw new Error(`Invalid ${field}`);
  }
  if (store.activity !== undefined && !Array.isArray(store.activity)) throw new Error('Invalid activity');
  return { ...store, notificationReads: store.notificationReads ?? {}, customers: store.customers ?? {}, activity: store.activity ?? [] };
}
