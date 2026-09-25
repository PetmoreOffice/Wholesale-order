import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/orders.json');
let writeQueue = Promise.resolve();

export function findOrder(store, orderId) {
  return store.orders.find((order) => order.orderId === orderId);
}

export function addHistory(order, entry) {
  order.history.unshift({ historyId: randomUUID(), createdAt: new Date().toISOString(), visibleToCustomer: true, ...entry });
}

export function orderSummary(order) {
  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    status: order.status,
    priceStatus: order.priceStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    itemCount: order.items.length,
    assignedAdminId: order.assignedAdminId || null,
    assignedAdminName: order.assignedAdminName || null,
    assignedAt: order.assignedAt || null
  };
}

export async function readStore() {
  try {
    const content = await fs.readFile(dataFile, 'utf8');
    const store = JSON.parse(content);
    return { nextOrderId: Number(store.nextOrderId || 1), orders: Array.isArray(store.orders) ? store.orders : [] };
  } catch (error) {
    if (error.code === 'ENOENT') return { nextOrderId: 1, orders: [] };
    throw new Error('ไม่สามารถอ่านไฟล์ Order ได้: ' + error.message);
  }
}

async function writeStore(store) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  const temporaryFile = dataFile + '.tmp';
  await fs.writeFile(temporaryFile, JSON.stringify(store, null, 2) + '\n', 'utf8');
  await fs.rename(temporaryFile, dataFile);
}

export async function changeStore(change) {
  const run = async () => {
    const store = await readStore();
    const result = await change(store);
    await writeStore(store);
    return result;
  };
  const result = writeQueue.then(run, run);
  writeQueue = result.catch(() => undefined);
  return result;
}
