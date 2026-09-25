import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');
const dataFile = path.join(dataDir, 'orders.json');
const backupDir = path.join(dataDir, 'backups');
const archiveDir = path.join(dataDir, 'archive');
let writeQueue = Promise.resolve();

// Backups: a copy of orders.json is taken before a write when the last one is over an hour
// old, and on demand from the admin settings page. Copies older than 30 days are pruned,
// but the newest 10 are always kept.
const BACKUP_EVERY_MS = 60 * 60 * 1000;
const BACKUP_KEEP_DAYS = 30;
const BACKUP_KEEP_MIN = 10;
const backupName = /^orders-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z(?:-manual)?\.json$/;
let lastBackupAt = null;

const ACTIVITY_LIMIT = 500;
export const closedStatuses = ['completed', 'rejected', 'cancelled'];

export function findOrder(store, orderId) {
  return store.orders.find((order) => order.orderId === orderId);
}

export function addHistory(order, entry) {
  order.history.unshift({ historyId: randomUUID(), createdAt: new Date().toISOString(), visibleToCustomer: true, ...entry });
}

// Admin-side audit trail for actions that are not part of an order's own history
// (accounts created, disabled, role changes, backups, archiving).
export function logActivity(store, entry) {
  store.activity.unshift({ activityId: randomUUID(), createdAt: new Date().toISOString(), ...entry });
  store.activity.length = Math.min(store.activity.length, ACTIVITY_LIMIT);
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

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function normalize(store) {
  return {
    nextOrderId: Number(store.nextOrderId || 1),
    orders: Array.isArray(store.orders) ? store.orders : [],
    // uid -> ISO time the user last opened their notifications.
    notificationReads: isObject(store.notificationReads) ? store.notificationReads : {},
    // uid -> customer profile (shop name, phone, delivery address, …). The Firebase account
    // only holds sign-in data; everything about the business lives here, never in SQL.
    customers: isObject(store.customers) ? store.customers : {},
    activity: Array.isArray(store.activity) ? store.activity : []
  };
}

export async function readStore() {
  let content;
  try {
    content = await fs.readFile(dataFile, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return normalize({});
    throw new Error('ไม่สามารถอ่านไฟล์ Order ได้: ' + error.message);
  }
  try {
    return normalize(JSON.parse(content));
  } catch {
    // Never overwrite a damaged file automatically: say which copy to restore instead.
    const [latest] = await listBackups().catch(() => []);
    const hint = latest ? `คัดลอก data/backups/${latest.name} ทับ data/orders.json เพื่อกู้คืน` : 'ไม่พบไฟล์สำรอง';
    console.error(`orders.json is not valid JSON. ${latest ? `Restore from data/backups/${latest.name}.` : 'No backup found.'}`);
    const error = new Error('ไฟล์ข้อมูล Order เสียหาย ' + hint);
    error.code = 'STORE_CORRUPT';
    throw error;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporaryFile = file + '.tmp';
  await fs.writeFile(temporaryFile, JSON.stringify(value, null, 2) + '\n', 'utf8');
  await fs.rename(temporaryFile, file);
}

function stamp(date = new Date()) {
  return date.toISOString().slice(0, 19).replace(/:/g, '-') + 'Z';
}

export async function listBackups() {
  let names;
  try {
    names = await fs.readdir(backupDir);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const backups = await Promise.all(names.filter((name) => backupName.test(name)).map(async (name) => {
    const stats = await fs.stat(path.join(backupDir, name));
    // The time is in the name: copyFile keeps the source's modified time on Windows.
    const [, date, hours, minutes, seconds] = name.match(/^orders-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z/);
    return { name, size: stats.size, createdAt: new Date(`${date}T${hours}:${minutes}:${seconds}Z`).toISOString(), manual: name.endsWith('-manual.json') };
  }));
  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Returns the file path for a backup the admin asked for, or null for anything else.
export function backupFile(name) {
  return backupName.test(String(name)) ? path.join(backupDir, name) : null;
}

async function pruneBackups() {
  const cutoff = Date.now() - BACKUP_KEEP_DAYS * 24 * 60 * 60 * 1000;
  const backups = await listBackups();
  await Promise.all(backups.slice(BACKUP_KEEP_MIN)
    .filter((backup) => Date.parse(backup.createdAt) < cutoff)
    .map((backup) => fs.unlink(path.join(backupDir, backup.name)).catch(() => undefined)));
}

async function copyCurrent(manual) {
  const name = `orders-${stamp()}${manual ? '-manual' : ''}.json`;
  await fs.mkdir(backupDir, { recursive: true });
  try {
    await fs.copyFile(dataFile, path.join(backupDir, name));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  lastBackupAt = Date.now();
  await pruneBackups();
  return name;
}

async function backupIfDue() {
  if (lastBackupAt === null) {
    const [latest] = await listBackups();
    lastBackupAt = latest ? Date.parse(latest.createdAt) : 0;
  }
  if (Date.now() - lastBackupAt >= BACKUP_EVERY_MS) await copyCurrent(false);
}

export function createBackup() {
  // Queued with writes so the copy never catches a half-finished change.
  return queued(() => copyCurrent(true));
}

function queued(task) {
  const result = writeQueue.then(task, task);
  writeQueue = result.catch(() => undefined);
  return result;
}

export async function changeStore(change) {
  return queued(async () => {
    const store = await readStore();
    const result = await change(store);
    // A failed backup must not block orders; it is logged and retried on the next write.
    await backupIfDue().catch((error) => console.error('Order backup failed:', error));
    await writeJson(dataFile, store);
    return result;
  });
}

// ─── Archive ────────────────────────────────────────────────────
// Closed orders untouched for a long time move to data/archive/orders-<year>.json so the
// live file every request reads stays small. They stay readable through findArchivedOrder.

async function readArchive(file) {
  try {
    const content = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(content.orders) ? content.orders : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function listArchives() {
  let names;
  try {
    names = await fs.readdir(archiveDir);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const files = names.filter((name) => /^orders-\d{4}\.json$/.test(name)).sort().reverse();
  return Promise.all(files.map(async (name) => ({ name, orders: (await readArchive(path.join(archiveDir, name))).length })));
}

export async function findArchivedOrder(orderId) {
  for (const { name } of await listArchives()) {
    const order = (await readArchive(path.join(archiveDir, name))).find((row) => row.orderId === orderId);
    if (order) return order;
  }
  return null;
}

export function archiveOldOrders(olderThanDays) {
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  return changeStore(async (store) => {
    const old = store.orders.filter((order) => closedStatuses.includes(order.status) && Date.parse(order.updatedAt) < cutoff);
    if (!old.length) return 0;
    const byYear = new Map();
    for (const order of old) {
      const year = String(new Date(order.updatedAt).getUTCFullYear());
      byYear.set(year, [...(byYear.get(year) || []), order]);
    }
    // Archive files are written before the live file drops the orders, so a crash in
    // between leaves a duplicate rather than a loss; ids are de-duplicated on append.
    for (const [year, orders] of byYear) {
      const file = path.join(archiveDir, `orders-${year}.json`);
      const existing = await readArchive(file);
      const ids = new Set(orders.map((order) => order.orderId));
      await writeJson(file, { orders: [...existing.filter((order) => !ids.has(order.orderId)), ...orders] });
    }
    const moved = new Set(old.map((order) => order.orderId));
    store.orders = store.orders.filter((order) => !moved.has(order.orderId));
    logActivity(store, { action: 'orders.archived', actorName: 'ระบบ', detail: `ย้าย ${old.length} คำสั่งซื้อที่ปิดเกิน ${olderThanDays} วันไปเก็บถาวร` });
    return old.length;
  });
}

export async function dataStatus() {
  const [stats, store, backups, archives] = await Promise.all([
    fs.stat(dataFile).catch(() => null),
    readStore(),
    listBackups(),
    listArchives()
  ]);
  return {
    size: stats?.size || 0,
    updatedAt: stats ? stats.mtime.toISOString() : null,
    orders: store.orders.length,
    openOrders: store.orders.filter((order) => !closedStatuses.includes(order.status)).length,
    customers: Object.keys(store.customers).length,
    lastBackupAt: backups[0]?.createdAt || null,
    backups,
    archives
  };
}
