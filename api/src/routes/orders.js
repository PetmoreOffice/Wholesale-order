import { randomUUID } from 'node:crypto';
import { firebaseAuth } from '../config/firebase.js';
import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { orderItemFields, orderItemJoins, sellableOnly } from '../catalog/sql.js';
import { addHistory, changeStore, findOrder, orderSummary, readStore } from '../orders/store.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const adminTransitions = {
  submitted: [],
  need_information: ['approved', 'rejected'],
  assigned: ['approved', 'rejected'],
  approved: ['erp_entry'],
  erp_entry: ['completed'],
  // Legacy statuses remain readable for existing local JSON orders.
  preparing: ['shipped'],
  shipped: ['completed']
};

function badRequest(res, message) {
  return res.status(400).json({ error: 'INVALID_ORDER_REQUEST', message });
}

async function resolveItems(items) {
  const resolved = [];
  for (const item of items) {
    const goodsId = Number.parseInt(item.goodsId, 10);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(goodsId) || !Number.isFinite(quantity) || quantity <= 0) {
      const error = new Error('รายการสินค้าไม่ถูกต้อง');
      error.code = 'INVALID_ITEM';
      throw error;
    }
    const rows = await query('SELECT ' + orderItemFields + ' ' + orderItemJoins + ' WHERE ' + sellableOnly + ' AND g.GOODS_KEY = @goodsId', { goodsId });
    const product = rows[0];
    if (!product) {
      const error = new Error('ไม่พบสินค้าที่พร้อมสั่งซื้อ: ' + goodsId);
      error.code = 'PRODUCT_NOT_FOUND';
      throw error;
    }
    if (quantity < Number(product.minimumOrder || 1)) {
      const error = new Error(product.name + ' ต้องสั่งอย่างน้อย ' + (product.minimumOrder || 1));
      error.code = 'MOQ_NOT_MET';
      throw error;
    }
    resolved.push({ itemId: randomUUID(), ...product, quantity });
  }
  return resolved;
}

ordersRouter.get('/admin/customer', requireRole('admin'), async (req, res, next) => {
  const email = String(req.query.email || '').trim();
  if (!email || email.length > 254) return badRequest(res, 'กรอกอีเมลลูกค้า');
  try {
    const user = await firebaseAuth().getUserByEmail(email);
    if (user.disabled || user.customClaims?.role === 'admin') return badRequest(res, 'บัญชีนี้ไม่ใช่บัญชีลูกค้าที่ใช้งานได้');
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
      if (customer.disabled || customer.customClaims?.role === 'admin') return badRequest(res, 'บัญชีลูกค้าไม่พร้อมใช้งาน');
      customerId = customer.uid;
      customerName = customer.displayName || customer.email || customer.uid;
      if (!['phone', 'assisted'].includes(req.body.orderSource)) return badRequest(res, 'ระบุช่องทางรับคำสั่งซื้อ');
    }
    const initialStatus = assisted || req.body.submit === true ? 'submitted' : 'draft';
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!customerName) return badRequest(res, 'กรุณาระบุชื่อลูกค้าหรือบริษัท');
    if (!items.length) return badRequest(res, 'คำสั่งซื้อต้องมีสินค้าอย่างน้อยหนึ่งรายการ');
    const products = await resolveItems(items);
    const order = await changeStore((store) => {
      const orderId = store.nextOrderId++;
      const now = new Date().toISOString();
      const orderNumber = 'WO-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-' + String(orderId).padStart(6, '0');
      const created = {
        orderId,
        orderNumber,
        customerId,
        customerName,
        createdById: req.user.uid,
        createdByName: req.user.name,
        createdByRole: req.user.role,
        orderSource: assisted ? req.body.orderSource : 'self',
        submittedAt: initialStatus === 'submitted' ? now : null,
        deliveryDetails: req.body.deliveryDetails || null,
        customerNote: req.body.customerNote || null,
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
    return res.status(201).json({ data: order });
  } catch (error) {
    if (['auth/user-not-found', 'auth/invalid-uid'].includes(error.code)) return badRequest(res, 'ไม่พบบัญชีลูกค้าที่เลือก');
    if (['INVALID_ITEM', 'PRODUCT_NOT_FOUND', 'MOQ_NOT_MET'].includes(error.code)) return badRequest(res, error.message);
    return next(error);
  }
});

ordersRouter.post('/:orderId/submit', requireRole('customer'), async (req, res, next) => {
  try {
    const orderId = Number.parseInt(req.params.orderId, 10);
    const customerName = req.user.name;
    if (!Number.isInteger(orderId)) return badRequest(res, 'orderId ต้องเป็นตัวเลข');
    const result = await changeStore((store) => {
      const order = findOrder(store, orderId);
      if (!order) { const error = new Error('ไม่พบคำสั่งซื้อ'); error.code = 'NOT_FOUND'; throw error; }
      if (order.customerId !== req.user.uid) { const error = new Error('คุณไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้'); error.code = 'FORBIDDEN'; throw error; }
      if (order.status !== 'draft') { const error = new Error('ส่งคำสั่งซื้อนี้ไปแล้วหรือไม่สามารถส่งได้'); error.code = 'INVALID_STATUS'; throw error; }
      order.status = 'submitted';
      order.submittedAt = new Date().toISOString();
      order.updatedAt = order.submittedAt;
      addHistory(order, { fromStatus: 'draft', toStatus: 'submitted', actorRole: 'customer', actorName: customerName, message: 'ส่งคำสั่งซื้อเพื่อรอตรวจสอบ' });
      return { orderId, status: order.status };
    });
    return res.json({ data: result });
  } catch (error) {
    if (error.code === 'NOT_FOUND') return res.status(404).json({ error: 'ORDER_NOT_FOUND', message: error.message });
    if (error.code === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN', message: error.message });
    if (error.code === 'INVALID_STATUS') return res.status(409).json({ error: 'INVALID_ORDER_STATUS', message: error.message });
    return next(error);
  }
});

ordersRouter.patch('/:orderId/draft', requireRole('customer'), async (req, res, next) => {
  try {
    const result = await changeStore(store => {
      const order = findOrder(store, Number(req.params.orderId));
      if (!order || order.customerId !== req.user.uid || order.status !== 'draft') throw new Error('แก้ไขได้เฉพาะร่างของบัญชีนี้');
      const items = req.body.items;
      if (!Array.isArray(items) || !items.length) throw new Error('ต้องมีสินค้าอย่างน้อยหนึ่งรายการ');
      const seen = new Set();
      const updated = items.map(item => {
        const original = order.items.find(row => row.goodsId === item.goodsId);
        const quantity = Number(item.quantity);
        if (!original || seen.has(item.goodsId) || !Number.isFinite(quantity) || quantity < Number(original.minimumOrder || 1)) throw new Error('จำนวนหรือรายการสินค้าไม่ถูกต้อง');
        seen.add(item.goodsId);
        return { ...original, quantity };
      });
      order.items = updated;
      order.deliveryDetails = String(req.body.deliveryDetails || '').slice(0, 4000);
      order.customerNote = String(req.body.customerNote || '').slice(0, 4000);
      order.updatedAt = new Date().toISOString();
      addHistory(order, { fromStatus: 'draft', toStatus: 'draft', actorId: req.user.uid, actorName: req.user.name, actorRole: 'customer', message: 'แก้ไขร่างคำสั่งซื้อ' });
      return order;
    });
    res.json({ data: result });
  } catch (error) { return badRequest(res, error.message); }
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
    const orderId = Number.parseInt(req.params.orderId, 10);
    const adminName = req.user.name;
    const adminId = req.user.uid;
    const note = String(req.body.note || '').trim() || null;
    if (!Number.isInteger(orderId) || !adminName) return badRequest(res, 'ระบุ orderId และชื่อแอดมิน');
      const result = await changeStore((store) => {
      const order = findOrder(store, orderId);
      if (!order) { const error = new Error('ไม่พบคำสั่งซื้อ'); error.code = 'NOT_FOUND'; throw error; }
      const action = order.assignedAdminName ? 'reassigned' : 'assigned';
      if (!['submitted', 'need_information', 'assigned', 'approved', 'erp_entry', 'preparing', 'shipped'].includes(order.status)) {
        const error = new Error('คำสั่งซื้อนี้ยังไม่อยู่ในขั้นตอนรับ Order');
        error.code = 'INVALID_STATUS';
        throw error;
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
  } catch (error) {
    if (error.code === 'NOT_FOUND') return res.status(404).json({ error: 'ORDER_NOT_FOUND', message: error.message });
    if (error.code === 'INVALID_STATUS') return res.status(409).json({ error: 'INVALID_ORDER_STATUS', message: error.message });
    return next(error);
  }
});

ordersRouter.post('/:orderId/status', requireRole('admin'), async (req, res, next) => {
  try {
    const orderId = Number.parseInt(req.params.orderId, 10);
    const toStatus = String(req.body.status || '').trim();
    const actorName = req.user.name;
    const message = String(req.body.message || '').trim() || null;
    if (!Number.isInteger(orderId) || !toStatus) return badRequest(res, 'ข้อมูลคำขอไม่ถูกต้อง');
    const result = await changeStore((store) => {
      const order = findOrder(store, orderId);
      if (!order) { const error = new Error('ไม่พบคำสั่งซื้อ'); error.code = 'NOT_FOUND'; throw error; }
      const fromStatus = order.status;
      if (!adminTransitions[fromStatus]?.includes(toStatus)) {
        const error = new Error('ไม่สามารถเปลี่ยนจาก ' + fromStatus + ' เป็น ' + toStatus);
        error.code = 'INVALID_TRANSITION';
        throw error;
      }
      if (!order.assignedAdminId || order.assignedAdminId !== req.user.uid) {
        const error = new Error('กรุณารับช่วง Order ก่อนเปลี่ยนสถานะ');
        error.code = 'INVALID_TRANSITION';
        throw error;
      }
      const now = new Date().toISOString();
      order.status = toStatus;
      order.updatedAt = now;
      if (toStatus === 'approved') order.approvedAt = now;
      if (toStatus === 'completed') order.completedAt = now;
      addHistory(order, { fromStatus, toStatus, actorRole: 'admin', actorId: req.user.uid, actorName, message });
      if (toStatus === 'need_information' && message) {
        order.messages.push({ messageId: randomUUID(), senderRole: 'admin', senderName: actorName, messageBody: message, createdAt: now, visibleToCustomer: true });
      }
      return { orderId, fromStatus, status: toStatus };
    });
    return res.json({ data: result });
  } catch (error) {
    if (error.code === 'NOT_FOUND') return res.status(404).json({ error: 'ORDER_NOT_FOUND', message: error.message });
    if (error.code === 'INVALID_TRANSITION') return res.status(409).json({ error: 'INVALID_STATUS_TRANSITION', message: error.message });
    return next(error);
  }
});

ordersRouter.get('/:orderId', async (req, res, next) => {
  try {
    const orderId = Number.parseInt(req.params.orderId, 10);
    if (!Number.isInteger(orderId)) return badRequest(res, 'orderId ต้องเป็นตัวเลข');
    const order = findOrder(await readStore(), orderId);
    if (!order) return res.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'ไม่พบคำสั่งซื้อ' });
    if (req.user.role !== 'admin' && order.customerId !== req.user.uid) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'คุณไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้' });
    }
    return res.json({ data: order });
  } catch (error) { return next(error); }
});
