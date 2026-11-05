import { randomUUID } from 'node:crypto';
import { firebaseAuth } from '../config/firebase.js';
import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { catalogFields, orderItemFields, orderItemJoins, productJoins, sellableOnly } from '../catalog/sql.js';
import { addHistory, changeStore, findArchivedOrder, findOrder, orderSummary, readStore } from '../orders/store.js';
import {
  assignToAdmin, cancelByCustomer, checkDeletable, checkDraft, checkItemList, checkOwner, checkQuantity, checkStatusRequest,
  cleanText, customerView, editDraft, moveByAdmin, orderError, orderNumber, ownOrder, parseOrderId, replyByCustomer, submitDraft
} from '../orders/workflow.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const errorStatus = {
  BAD_REQUEST: [400, 'INVALID_ORDER_REQUEST'],
  FORBIDDEN: [403, 'FORBIDDEN'],
  NOT_FOUND: [404, 'ORDER_NOT_FOUND'],
  INVALID_STATUS: [409, 'INVALID_ORDER_STATUS']
};

function handleOrderError(res, next, error) {
  if (['auth/user-not-found', 'auth/invalid-uid'].includes(error.code)) return badRequest(res, 'ไม่พบบัญชีลูกค้าที่เลือก');
  const mapped = errorStatus[error.code];
  if (!mapped) return next(error);
  return res.status(mapped[0]).json({ error: mapped[1], message: error.message });
}

function badRequest(res, message) {
  return res.status(400).json({ error: 'INVALID_ORDER_REQUEST', message });
}

// Looks in the live store first, then in the yearly archive files.
async function loadOrder(orderId) {
  return findOrder(await readStore(), orderId) || await findArchivedOrder(orderId);
}

// One SELECT for all lines (bound parameters, at most MAX_ITEMS) instead of one per line:
// submission runs inside the store's write queue, so this keeps every other save waiting
// for a single round trip only. Returns sellable rows keyed by goodsId.
async function sellableProducts(goodsIds, fields, joins) {
  if (!goodsIds.length) return new Map();
  const params = Object.fromEntries(goodsIds.map((goodsId, index) => ['goods' + index, goodsId]));
  const placeholders = goodsIds.map((_, index) => '@goods' + index).join(', ');
  const rows = await query(`SELECT ${fields} ${joins} WHERE ${sellableOnly} AND g.GOODS_KEY IN (${placeholders})`, params);
  const products = new Map();
  for (const row of rows) if (!products.has(Number(row.goodsId))) products.set(Number(row.goodsId), row);
  return products;
}

async function resolveItems(items) {
  const lines = checkItemList(items);
  const products = await sellableProducts(lines.map((line) => line.goodsId), orderItemFields, orderItemJoins);
  return lines.map(({ goodsId, quantity }) => {
    const product = products.get(goodsId);
    if (!product) throw orderError('BAD_REQUEST', 'ไม่พบสินค้าที่พร้อมสั่งซื้อ: ' + goodsId);
    checkQuantity(product, quantity);
    return { itemId: randomUUID(), ...product, quantity };
  });
}

ordersRouter.get('/admin/customer', requireRole('admin'), async (req, res, next) => {
  const email = String(req.query.email || '').trim();
  if (!email || email.length > 254) return badRequest(res, 'กรอกอีเมลลูกค้า');
  try {
    const user = await firebaseAuth().getUserByEmail(email);
    if (user.disabled || user.customClaims?.role !== 'customer') return badRequest(res, 'บัญชีนี้ไม่ใช่บัญชีลูกค้าที่ใช้งานได้');
    // The shop name lives in the local customer profile (Settings → Users), not in Firebase.
    // The internal note stays on the server.
    const profile = (await readStore()).customers[user.uid] || {};
    return res.json({ data: {
      uid: user.uid,
      name: user.displayName || null,
      companyName: profile.companyName || null,
      phone: profile.phone || null,
      address: profile.address || null,
      email: user.email
    } });
  } catch (error) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') return res.status(404).json({ message: 'ไม่พบบัญชีลูกค้า กรุณาตรวจสอบอีเมล' });
    return next(error);
  }
});

ordersRouter.post('/drafts', requireRole('customer', 'admin'), async (req, res, next) => {
  try {
    const assisted = req.user.role === 'admin';
    let customerId = req.user.uid;
    let customerName = req.user.name;
    if (assisted) {
      if (typeof req.body.customerId !== 'string' || !req.body.customerId) return badRequest(res, 'เลือกลูกค้าก่อนยืนยันสั่งซื้อ');
      const customer = await firebaseAuth().getUser(req.body.customerId);
      if (customer.disabled || customer.customClaims?.role !== 'customer') return badRequest(res, 'บัญชีลูกค้าไม่พร้อมใช้งาน');
      customerId = customer.uid;
      customerName = customer.displayName || customer.email || customer.uid;
      if (!['phone', 'assisted'].includes(req.body.orderSource)) return badRequest(res, 'ระบุช่องทางรับคำสั่งซื้อ');
    }
    const initialStatus = assisted || req.body.submit === true ? 'submitted' : 'draft';
    if (!customerName) return badRequest(res, 'กรุณาระบุชื่อลูกค้าหรือบริษัท');
    const products = await resolveItems(req.body.items);
    const order = await changeStore((store) => {
      const orderId = store.nextOrderId++;
      const now = new Date().toISOString();
      const created = {
        orderId,
        orderNumber: orderNumber(orderId),
        customerId,
        // The shop name from the customer profile reads better in the queue than an email.
        customerName: store.customers[customerId]?.companyName || customerName,
        createdById: req.user.uid,
        createdByName: req.user.name,
        createdByRole: req.user.role,
        orderSource: assisted ? req.body.orderSource : 'self',
        submittedAt: initialStatus === 'submitted' ? now : null,
        deliveryDetails: cleanText(req.body.deliveryDetails),
        customerNote: cleanText(req.body.customerNote),
        status: initialStatus,
        priceStatus: 'pending',
        createdAt: now,
        updatedAt: now,
        items: products,
        history: [],
        messages: [],
        assignmentLog: []
      };
      addHistory(created, { fromStatus: null, toStatus: initialStatus, actorRole: req.user.role, actorId: req.user.uid, actorName: req.user.name, message: assisted ? 'สร้างคำสั่งซื้อแทนลูกค้า' : initialStatus === 'submitted' ? 'ยืนยันสั่งซื้อ' : 'บันทึกร่างคำสั่งซื้อ' });
      store.orders.unshift(created);
      return created;
    });
    return res.status(201).json({ data: assisted ? order : customerView(order) });
  } catch (error) { return handleOrderError(res, next, error); }
});

ordersRouter.post('/:orderId/submit', requireRole('customer'), async (req, res, next) => {
  try {
    const orderId = parseOrderId(req.params.orderId);
    const result = await changeStore(async (store) => {
      const order = ownOrder(store, orderId, req.user);
      checkDraft(order);
      // Keep validation and submission in the same queue as draft edits/deletion.
      // A failed catalog lookup leaves the persisted draft unchanged.
      submitDraft(order, req.user, await resolveItems(order.items));
      return { orderId, status: order.status };
    });
    return res.json({ data: result });
  } catch (error) { return handleOrderError(res, next, error); }
});

ordersRouter.patch('/:orderId/draft', requireRole('customer'), async (req, res, next) => {
  try {
    const orderId = parseOrderId(req.params.orderId);
    const requested = checkItemList(req.body.items);
    const result = await changeStore((store) => {
      const order = ownOrder(store, orderId, req.user);
      editDraft(order, req.user, requested, req.body);
      return customerView(order);
    });
    return res.json({ data: result });
  } catch (error) { return handleOrderError(res, next, error); }
});

// Drafts were never sent, so the customer may throw one away entirely.
ordersRouter.delete('/:orderId', requireRole('customer'), async (req, res, next) => {
  try {
    const orderId = parseOrderId(req.params.orderId);
    await changeStore((store) => {
      checkDeletable(ownOrder(store, orderId, req.user));
      store.orders = store.orders.filter((row) => row.orderId !== orderId);
    });
    return res.json({ data: { orderId, deleted: true } });
  } catch (error) { return handleOrderError(res, next, error); }
});

ordersRouter.post('/:orderId/cancel', requireRole('customer'), async (req, res, next) => {
  try {
    const orderId = parseOrderId(req.params.orderId);
    const reason = cleanText(req.body.reason);
    const result = await changeStore((store) => {
      const order = ownOrder(store, orderId, req.user);
      cancelByCustomer(order, req.user, reason);
      return customerView(order);
    });
    return res.json({ data: result });
  } catch (error) { return handleOrderError(res, next, error); }
});

ordersRouter.post('/:orderId/reply', requireRole('customer'), async (req, res, next) => {
  try {
    const orderId = parseOrderId(req.params.orderId);
    const messageBody = cleanText(req.body.message);
    if (!messageBody) return badRequest(res, 'กรุณาพิมพ์ข้อมูลที่ต้องการส่งให้แอดมิน');
    const result = await changeStore((store) => {
      const order = ownOrder(store, orderId, req.user);
      replyByCustomer(order, req.user, messageBody);
      return customerView(order);
    });
    return res.json({ data: result });
  } catch (error) { return handleOrderError(res, next, error); }
});

// Repeat order: read-only. Looks up each line in the live catalog (SELECT only) and returns
// cart-ready products; nothing is written to SQL or to the order store.
ordersRouter.get('/:orderId/reorder-items', requireRole('customer'), async (req, res, next) => {
  try {
    const orderId = parseOrderId(req.params.orderId);
    const order = checkOwner(await loadOrder(orderId), req.user);
    const items = [];
    const unavailable = [];
    const adjusted = [];
    const products = await sellableProducts(order.items.map((line) => line.goodsId), catalogFields, productJoins);
    for (const line of order.items) {
      const product = products.get(line.goodsId);
      if (!product) {
        unavailable.push({ goodsId: line.goodsId, name: line.name });
        continue;
      }
      const minimum = Number(product.minimumOrder) || 1;
      const maximum = Number(product.maximumOrder) || 0;
      let quantity = Math.max(minimum, Number.parseInt(line.quantity, 10) || minimum);
      if (maximum > 0) quantity = Math.min(maximum, quantity);
      if (quantity !== Number(line.quantity)) adjusted.push({ goodsId: line.goodsId, name: product.name, from: Number(line.quantity), to: quantity });
      // Customers never receive prices, including on a repeat order.
      const { basePrice, ...sellable } = product;
      items.push({ ...sellable, quantity });
    }
    return res.json({ data: { orderId, orderNumber: order.orderNumber, items, unavailable, adjusted } });
  } catch (error) { return handleOrderError(res, next, error); }
});

ordersRouter.get('/', requireRole('customer'), async (req, res, next) => {
  try {
    const store = await readStore();
    return res.json({ data: store.orders.filter((order) => order.customerId === req.user.uid).map(orderSummary) });
  } catch (error) { return next(error); }
});

ordersRouter.get('/admin/queue', requireRole('admin'), async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim();
    const store = await readStore();
    const data = store.orders
      .filter((order) => order.status !== 'draft' && (!status || order.status === status))
      .sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt))
      .map(orderSummary);
    return res.json({ data });
  } catch (error) { return next(error); }
});

ordersRouter.post('/:orderId/assign', requireRole('admin'), async (req, res, next) => {
  try {
    const orderId = parseOrderId(req.params.orderId);
    const note = cleanText(req.body.note);
    const result = await changeStore((store) => {
      const order = findOrder(store, orderId);
      const action = assignToAdmin(order, req.user, note);
      return { orderId, assignedAdminId: req.user.uid, assignedAdminName: req.user.name, action, status: order.status };
    });
    return res.json({ data: result });
  } catch (error) { return handleOrderError(res, next, error); }
});

ordersRouter.post('/:orderId/status', requireRole('admin'), async (req, res, next) => {
  try {
    const orderId = parseOrderId(req.params.orderId);
    const toStatus = String(req.body.status || '').trim();
    const message = cleanText(req.body.message);
    checkStatusRequest(toStatus, message);
    const result = await changeStore((store) => {
      const fromStatus = moveByAdmin(findOrder(store, orderId), req.user, toStatus, message);
      return { orderId, fromStatus, status: toStatus };
    });
    return res.json({ data: result });
  } catch (error) { return handleOrderError(res, next, error); }
});

ordersRouter.get('/:orderId', async (req, res, next) => {
  try {
    const orderId = parseOrderId(req.params.orderId);
    const order = await loadOrder(orderId);
    if (!order) throw orderError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');
    if (req.user.role === 'admin') return res.json({ data: order });
    return res.json({ data: customerView(checkOwner(order, req.user)) });
  } catch (error) { return handleOrderError(res, next, error); }
});
