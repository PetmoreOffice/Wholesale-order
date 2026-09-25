import { randomUUID } from 'node:crypto';
import { firebaseAuth } from '../config/firebase.js';
import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { catalogFields, orderItemFields, orderItemJoins, productJoins, sellableOnly } from '../catalog/sql.js';
import { addHistory, changeStore, findArchivedOrder, findOrder, orderSummary, readStore } from '../orders/store.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const MAX_ITEMS = 200;
const MAX_TEXT = 4000;

const adminTransitions = {
  submitted: [],
  assigned: ['need_information', 'approved', 'rejected'],
  need_information: ['approved', 'rejected'],
  approved: ['erp_entry'],
  erp_entry: ['completed'],
  // Legacy statuses remain readable for existing local JSON orders.
  preparing: ['shipped'],
  shipped: ['completed']
};

// Customers must know what to fix or why the order stopped.
const messageRequired = new Set(['need_information', 'rejected']);

// A customer may withdraw an order until an admin approves it.
const customerCancellable = new Set(['submitted', 'assigned', 'need_information']);

const errorStatus = {
  BAD_REQUEST: [400, 'INVALID_ORDER_REQUEST'],
  FORBIDDEN: [403, 'FORBIDDEN'],
  NOT_FOUND: [404, 'ORDER_NOT_FOUND'],
  INVALID_STATUS: [409, 'INVALID_ORDER_STATUS']
};

function orderError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function handleOrderError(res, next, error) {
  if (['auth/user-not-found', 'auth/invalid-uid'].includes(error.code)) return badRequest(res, 'ไม่พบบัญชีลูกค้าที่เลือก');
  const mapped = errorStatus[error.code];
  if (!mapped) return next(error);
  return res.status(mapped[0]).json({ error: mapped[1], message: error.message });
}

function badRequest(res, message) {
  return res.status(400).json({ error: 'INVALID_ORDER_REQUEST', message });
}

function cleanText(value) {
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, MAX_TEXT) || null;
}

function parseOrderId(value) {
  const orderId = Number.parseInt(value, 10);
  if (!Number.isInteger(orderId)) throw orderError('BAD_REQUEST', 'orderId ต้องเป็นตัวเลข');
  return orderId;
}

function ownOrder(store, orderId, user) {
  const order = findOrder(store, orderId);
  if (!order) throw orderError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');
  if (order.customerId !== user.uid) throw orderError('FORBIDDEN', 'คุณไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้');
  return order;
}

// Looks in the live store first, then in the yearly archive files.
async function loadOrder(orderId) {
  return findOrder(await readStore(), orderId) || await findArchivedOrder(orderId);
}

async function ownOrderAnywhere(orderId, user) {
  const order = await loadOrder(orderId);
  if (!order) throw orderError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');
  if (order.customerId !== user.uid) throw orderError('FORBIDDEN', 'คุณไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้');
  return order;
}

function checkQuantity(product, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw orderError('BAD_REQUEST', 'จำนวนของ ' + product.name + ' ต้องเป็นจำนวนเต็มมากกว่า 0');
  const minimum = Number(product.minimumOrder) || 1;
  const maximum = Number(product.maximumOrder) || 0;
  if (quantity < minimum) throw orderError('BAD_REQUEST', product.name + ' ต้องสั่งอย่างน้อย ' + minimum);
  if (maximum > 0 && quantity > maximum) throw orderError('BAD_REQUEST', product.name + ' สั่งได้ไม่เกิน ' + maximum);
}

function checkItemList(items) {
  if (!Array.isArray(items) || !items.length) throw orderError('BAD_REQUEST', 'คำสั่งซื้อต้องมีสินค้าอย่างน้อยหนึ่งรายการ');
  if (items.length > MAX_ITEMS) throw orderError('BAD_REQUEST', 'คำสั่งซื้อมีสินค้าได้ไม่เกิน ' + MAX_ITEMS + ' รายการ');
  const seen = new Set();
  return items.map((item) => {
    const goodsId = Number.parseInt(item?.goodsId, 10);
    if (!Number.isInteger(goodsId)) throw orderError('BAD_REQUEST', 'รายการสินค้าไม่ถูกต้อง');
    if (seen.has(goodsId)) throw orderError('BAD_REQUEST', 'มีสินค้าซ้ำในคำสั่งซื้อ กรุณารวมเป็นรายการเดียว');
    seen.add(goodsId);
    return { goodsId, quantity: Number(item.quantity) };
  });
}

async function resolveItems(items) {
  const resolved = [];
  for (const { goodsId, quantity } of checkItemList(items)) {
    const rows = await query('SELECT ' + orderItemFields + ' ' + orderItemJoins + ' WHERE ' + sellableOnly + ' AND g.GOODS_KEY = @goodsId', { goodsId });
    const product = rows[0];
    if (!product) throw orderError('BAD_REQUEST', 'ไม่พบสินค้าที่พร้อมสั่งซื้อ: ' + goodsId);
    checkQuantity(product, quantity);
    resolved.push({ itemId: randomUUID(), ...product, quantity });
  }
  return resolved;
}

// Customers see only their own workflow; admin-internal fields stay on the server.
function customerView(order) {
  const { assignmentLog, assignedAdminId, createdById, ...visible } = order;
  return {
    ...visible,
    history: (order.history || []).filter((entry) => entry.visibleToCustomer !== false),
    messages: (order.messages || []).filter((entry) => entry.visibleToCustomer !== false)
  };
}

ordersRouter.get('/admin/customer', requireRole('admin'), async (req, res, next) => {
  const email = String(req.query.email || '').trim();
  if (!email || email.length > 254) return badRequest(res, 'กรอกอีเมลลูกค้า');
  try {
    const user = await firebaseAuth().getUserByEmail(email);
    if (user.disabled || user.customClaims?.role !== 'customer') return badRequest(res, 'บัญชีนี้ไม่ใช่บัญชีลูกค้าที่ใช้งานได้');
    return res.json({ data: { uid: user.uid, name: user.displayName || user.email, email: user.email } });
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
      const orderNumber = 'WO-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-' + String(orderId).padStart(6, '0');
      const created = {
        orderId,
        orderNumber,
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
    const result = await changeStore((store) => {
      const order = ownOrder(store, orderId, req.user);
      if (order.status !== 'draft') throw orderError('INVALID_STATUS', 'ส่งคำสั่งซื้อนี้ไปแล้วหรือไม่สามารถส่งได้');
      order.status = 'submitted';
      order.submittedAt = new Date().toISOString();
      order.updatedAt = order.submittedAt;
      addHistory(order, { fromStatus: 'draft', toStatus: 'submitted', actorRole: 'customer', actorId: req.user.uid, actorName: req.user.name, message: 'ส่งคำสั่งซื้อเพื่อรอตรวจสอบ' });
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
      if (order.status !== 'draft') throw orderError('INVALID_STATUS', 'แก้ไขได้เฉพาะคำสั่งซื้อที่ยังเป็นร่าง');
      order.items = requested.map(({ goodsId, quantity }) => {
        const original = order.items.find((row) => row.goodsId === goodsId);
        if (!original) throw orderError('BAD_REQUEST', 'ไม่พบสินค้านี้ในร่างคำสั่งซื้อ');
        checkQuantity(original, quantity);
        return { ...original, quantity };
      });
      order.deliveryDetails = cleanText(req.body.deliveryDetails);
      order.customerNote = cleanText(req.body.customerNote);
      order.updatedAt = new Date().toISOString();
      addHistory(order, { fromStatus: 'draft', toStatus: 'draft', actorId: req.user.uid, actorName: req.user.name, actorRole: 'customer', message: 'แก้ไขร่างคำสั่งซื้อ' });
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
      const order = ownOrder(store, orderId, req.user);
      if (order.status !== 'draft') throw orderError('INVALID_STATUS', 'ลบได้เฉพาะร่างคำสั่งซื้อ คำสั่งซื้อที่ส่งแล้วให้ใช้การยกเลิก');
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
      if (!customerCancellable.has(order.status)) throw orderError('INVALID_STATUS', 'คำสั่งซื้อนี้ยกเลิกเองไม่ได้แล้ว กรุณาติดต่อแอดมิน');
      const fromStatus = order.status;
      const now = new Date().toISOString();
      order.status = 'cancelled';
      order.cancelledAt = now;
      order.updatedAt = now;
      addHistory(order, { fromStatus, toStatus: 'cancelled', actorRole: 'customer', actorId: req.user.uid, actorName: req.user.name, message: reason ? 'ยกเลิกคำสั่งซื้อ: ' + reason : 'ยกเลิกคำสั่งซื้อ' });
      if (reason) order.messages.push({ messageId: randomUUID(), senderRole: 'customer', senderName: req.user.name, messageBody: reason, createdAt: now, visibleToCustomer: true });
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
      if (order.status !== 'need_information') throw orderError('INVALID_STATUS', 'คำสั่งซื้อนี้ไม่ได้รอข้อมูลเพิ่มเติม');
      const now = new Date().toISOString();
      order.messages.push({ messageId: randomUUID(), senderRole: 'customer', senderName: req.user.name, messageBody, createdAt: now, visibleToCustomer: true });
      // Back to the assigned admin's queue for review.
      order.status = 'assigned';
      order.updatedAt = now;
      addHistory(order, { fromStatus: 'need_information', toStatus: 'assigned', actorRole: 'customer', actorId: req.user.uid, actorName: req.user.name, message: 'ส่งข้อมูลเพิ่มเติมแล้ว' });
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
    const order = await ownOrderAnywhere(orderId, req.user);
    const items = [];
    const unavailable = [];
    const adjusted = [];
    for (const line of order.items) {
      const rows = await query(`SELECT ${catalogFields} ${productJoins} WHERE ${sellableOnly} AND g.GOODS_KEY = @goodsId`, { goodsId: line.goodsId });
      const product = rows[0];
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
    const adminName = req.user.name;
    const adminId = req.user.uid;
    const note = cleanText(req.body.note);
    const result = await changeStore((store) => {
      const order = findOrder(store, orderId);
      if (!order) throw orderError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');
      const action = order.assignedAdminName ? 'reassigned' : 'assigned';
      if (!['submitted', 'need_information', 'assigned', 'approved', 'erp_entry', 'preparing', 'shipped'].includes(order.status)) {
        throw orderError('INVALID_STATUS', 'คำสั่งซื้อนี้ยังไม่อยู่ในขั้นตอนรับ Order');
      }
      const now = new Date().toISOString();
      order.assignedAdminId = adminId;
      order.assignedAdminName = adminName;
      order.assignedAt = now;
      order.updatedAt = now;
      order.assignmentLog.unshift({ assignmentId: randomUUID(), adminId, adminName, action, note, createdAt: now });
      const fromStatus = order.status;
      if (fromStatus === 'submitted') order.status = 'assigned';
      addHistory(order, { fromStatus, toStatus: order.status, actorRole: 'admin', actorId: adminId, actorName: adminName, message: (action === 'assigned' ? 'รับ' : 'โอน') + 'งานคำสั่งซื้อนี้' });
      return { orderId, assignedAdminId: adminId, assignedAdminName: adminName, action, status: order.status };
    });
    return res.json({ data: result });
  } catch (error) { return handleOrderError(res, next, error); }
});

ordersRouter.post('/:orderId/status', requireRole('admin'), async (req, res, next) => {
  try {
    const orderId = parseOrderId(req.params.orderId);
    const toStatus = String(req.body.status || '').trim();
    const actorName = req.user.name;
    const message = cleanText(req.body.message);
    if (!toStatus) return badRequest(res, 'ข้อมูลคำขอไม่ถูกต้อง');
    if (messageRequired.has(toStatus) && !message) return badRequest(res, 'กรุณาระบุเหตุผลหรือข้อมูลที่ต้องการจากลูกค้า');
    const result = await changeStore((store) => {
      const order = findOrder(store, orderId);
      if (!order) throw orderError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');
      const fromStatus = order.status;
      if (!adminTransitions[fromStatus]?.includes(toStatus)) throw orderError('INVALID_STATUS', 'ไม่สามารถเปลี่ยนจาก ' + fromStatus + ' เป็น ' + toStatus);
      if (order.assignedAdminId !== req.user.uid) throw orderError('INVALID_STATUS', 'กรุณารับช่วง Order ก่อนเปลี่ยนสถานะ');
      const now = new Date().toISOString();
      order.status = toStatus;
      order.updatedAt = now;
      if (toStatus === 'approved') order.approvedAt = now;
      if (toStatus === 'completed') order.completedAt = now;
      if (toStatus === 'rejected') order.rejectedAt = now;
      addHistory(order, { fromStatus, toStatus, actorRole: 'admin', actorId: req.user.uid, actorName, message });
      if (messageRequired.has(toStatus)) {
        order.messages.push({ messageId: randomUUID(), senderRole: 'admin', senderName: actorName, messageBody: message, createdAt: now, visibleToCustomer: true });
      }
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
    if (order.customerId !== req.user.uid) throw orderError('FORBIDDEN', 'คุณไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้');
    return res.json({ data: customerView(order) });
  } catch (error) { return handleOrderError(res, next, error); }
});
