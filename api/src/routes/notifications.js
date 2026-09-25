import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { changeStore, readStore } from '../orders/store.js';

// In-app notifications are derived from each order's history, so every stage change the
// timeline already records is announced without a second copy of the data. Only the time
// each user last opened the feed is stored (in the local JSON order store, never in SQL).
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

const FEED_LIMIT = 30;

function relevant(entry, order, user) {
  if (entry.actorId && entry.actorId === user.uid) return false;
  if (user.role === 'admin') return entry.actorRole === 'customer' && entry.toStatus !== 'draft';
  return order.customerId === user.uid && entry.actorRole === 'admin' && entry.visibleToCustomer !== false;
}

export function notificationFeed(store, user) {
  const lastSeen = Date.parse(store.notificationReads?.[user.uid] || 0) || 0;
  const events = [];
  for (const order of store.orders) {
    if (user.role !== 'admin' && order.customerId !== user.uid) continue;
    for (const entry of order.history || []) {
      if (!relevant(entry, order, user)) continue;
      events.push({
        id: entry.historyId,
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        customerName: user.role === 'admin' ? order.customerName : undefined,
        fromStatus: entry.fromStatus ?? null,
        toStatus: entry.toStatus,
        actorName: entry.actorName,
        message: entry.message || null,
        createdAt: entry.createdAt,
        unread: Date.parse(entry.createdAt) > lastSeen
      });
    }
  }
  events.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return { data: events.slice(0, FEED_LIMIT), unreadCount: events.filter((event) => event.unread).length };
}

notificationsRouter.get('/', async (req, res, next) => {
  try {
    return res.json(notificationFeed(await readStore(), req.user));
  } catch (error) { return next(error); }
});

notificationsRouter.post('/read', async (req, res, next) => {
  try {
    const readAt = new Date().toISOString();
    await changeStore((store) => { store.notificationReads[req.user.uid] = readAt; });
    return res.json({ data: { readAt } });
  } catch (error) { return next(error); }
});
