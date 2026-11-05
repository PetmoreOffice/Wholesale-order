import { randomUUID } from 'node:crypto';
import { assignableStatuses, canAdminMove, customerCancellable, messageRequired } from '../../../shared/orderWorkflow.js';
import { addHistory, findOrder } from './store.js';

// Order rules that change an order. Routes parse the request and pick the store; everything
// here works on an order object inside changeStore(), so each change is one queued write.

export const MAX_ITEMS = 200;
export const MAX_TEXT = 4000;

export function orderError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function cleanText(value) {
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, MAX_TEXT) || null;
}

export function parseOrderId(value) {
  const orderId = Number.parseInt(value, 10);
  if (!Number.isInteger(orderId)) throw orderError('BAD_REQUEST', 'orderId ต้องเป็นตัวเลข');
  return orderId;
}

export function checkOwner(order, user) {
  if (!order) throw orderError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');
  if (order.customerId !== user.uid) throw orderError('FORBIDDEN', 'คุณไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้');
  return order;
}

export function ownOrder(store, orderId, user) {
  return checkOwner(findOrder(store, orderId), user);
}

export function checkQuantity(product, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw orderError('BAD_REQUEST', 'จำนวนของ ' + product.name + ' ต้องเป็นจำนวนเต็มมากกว่า 0');
  const minimum = Number(product.minimumOrder) || 1;
  const maximum = Number(product.maximumOrder) || 0;
  if (quantity < minimum) throw orderError('BAD_REQUEST', product.name + ' ต้องสั่งอย่างน้อย ' + minimum);
  if (maximum > 0 && quantity > maximum) throw orderError('BAD_REQUEST', product.name + ' สั่งได้ไม่เกิน ' + maximum);
}

export function checkItemList(items) {
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

// Order numbers carry the month in Thai time, so an order at 01:00 on the 1st is not
// numbered with the previous month.
const thaiMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' });

export function orderNumber(orderId, date = new Date()) {
  return 'WO-' + thaiMonth.format(date).replace('-', '') + '-' + String(orderId).padStart(6, '0');
}

// Customers see only their own workflow; admin-internal fields stay on the server.
export function customerView(order) {
  const { assignmentLog, assignedAdminId, createdById, ...visible } = order;
  return {
    ...visible,
    // Admin account ids stay on the server; the name is enough for the customer.
    history: (order.history || []).filter((entry) => entry.visibleToCustomer !== false).map(({ actorId, ...entry }) => entry),
    messages: (order.messages || []).filter((entry) => entry.visibleToCustomer !== false)
  };
}

function addMessage(order, senderRole, senderName, messageBody, createdAt) {
  order.messages.push({ messageId: randomUUID(), senderRole, senderName, messageBody, createdAt, visibleToCustomer: true });
}

// ─── Customer moves ─────────────────────────────────────────────

export function submitDraft(order, user, items) {
  if (order.status !== 'draft') throw orderError('INVALID_STATUS', 'ส่งคำสั่งซื้อนี้ไปแล้วหรือไม่สามารถส่งได้');
  order.items = items.map((item) => ({ ...item, itemId: order.items.find((old) => old.goodsId === item.goodsId)?.itemId || item.itemId }));
  order.status = 'submitted';
  order.submittedAt = new Date().toISOString();
  order.updatedAt = order.submittedAt;
  addHistory(order, { fromStatus: 'draft', toStatus: 'submitted', actorRole: 'customer', actorId: user.uid, actorName: user.name, message: 'ส่งคำสั่งซื้อเพื่อรอตรวจสอบ' });
}

export function checkDraft(order) {
  if (order.status !== 'draft') throw orderError('INVALID_STATUS', 'ส่งคำสั่งซื้อนี้ไปแล้วหรือไม่สามารถส่งได้');
}

export function editDraft(order, user, requested, { deliveryDetails, customerNote }) {
  if (order.status !== 'draft') throw orderError('INVALID_STATUS', 'แก้ไขได้เฉพาะคำสั่งซื้อที่ยังเป็นร่าง');
  order.items = requested.map(({ goodsId, quantity }) => {
    const original = order.items.find((row) => row.goodsId === goodsId);
    if (!original) throw orderError('BAD_REQUEST', 'ไม่พบสินค้านี้ในร่างคำสั่งซื้อ');
    checkQuantity(original, quantity);
    return { ...original, quantity };
  });
  order.deliveryDetails = cleanText(deliveryDetails);
  order.customerNote = cleanText(customerNote);
  order.updatedAt = new Date().toISOString();
  addHistory(order, { fromStatus: 'draft', toStatus: 'draft', actorId: user.uid, actorName: user.name, actorRole: 'customer', message: 'แก้ไขร่างคำสั่งซื้อ' });
}

export function checkDeletable(order) {
  if (order.status !== 'draft') throw orderError('INVALID_STATUS', 'ลบได้เฉพาะร่างคำสั่งซื้อ คำสั่งซื้อที่ส่งแล้วให้ใช้การยกเลิก');
}

export function cancelByCustomer(order, user, reason) {
  if (!customerCancellable.includes(order.status)) throw orderError('INVALID_STATUS', 'คำสั่งซื้อนี้ยกเลิกเองไม่ได้แล้ว กรุณาติดต่อแอดมิน');
  const fromStatus = order.status;
  const now = new Date().toISOString();
  order.status = 'cancelled';
  order.cancelledAt = now;
  order.updatedAt = now;
  addHistory(order, { fromStatus, toStatus: 'cancelled', actorRole: 'customer', actorId: user.uid, actorName: user.name, message: reason ? 'ยกเลิกคำสั่งซื้อ: ' + reason : 'ยกเลิกคำสั่งซื้อ' });
  if (reason) addMessage(order, 'customer', user.name, reason, now);
}

export function replyByCustomer(order, user, messageBody) {
  if (order.status !== 'need_information') throw orderError('INVALID_STATUS', 'คำสั่งซื้อนี้ไม่ได้รอข้อมูลเพิ่มเติม');
  const now = new Date().toISOString();
  addMessage(order, 'customer', user.name, messageBody, now);
  // Back to the assigned admin's queue for review.
  order.status = 'assigned';
  order.updatedAt = now;
  addHistory(order, { fromStatus: 'need_information', toStatus: 'assigned', actorRole: 'customer', actorId: user.uid, actorName: user.name, message: 'ส่งข้อมูลเพิ่มเติมแล้ว' });
}

// ─── Admin moves ────────────────────────────────────────────────

export function assignToAdmin(order, admin, note) {
  if (!order) throw orderError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');
  if (!assignableStatuses.includes(order.status)) throw orderError('INVALID_STATUS', 'คำสั่งซื้อนี้ยังไม่อยู่ในขั้นตอนรับ Order');
  const action = order.assignedAdminName ? 'reassigned' : 'assigned';
  const now = new Date().toISOString();
  order.assignedAdminId = admin.uid;
  order.assignedAdminName = admin.name;
  order.assignedAt = now;
  order.updatedAt = now;
  order.assignmentLog.unshift({ assignmentId: randomUUID(), adminId: admin.uid, adminName: admin.name, action, note, createdAt: now });
  const fromStatus = order.status;
  if (fromStatus === 'submitted') order.status = 'assigned';
  addHistory(order, { fromStatus, toStatus: order.status, actorRole: 'admin', actorId: admin.uid, actorName: admin.name, message: (action === 'assigned' ? 'รับ' : 'โอน') + 'งานคำสั่งซื้อนี้' });
  return action;
}

export function checkStatusRequest(toStatus, message) {
  if (!toStatus) throw orderError('BAD_REQUEST', 'ข้อมูลคำขอไม่ถูกต้อง');
  if (messageRequired.includes(toStatus) && !message) throw orderError('BAD_REQUEST', 'กรุณาระบุเหตุผลหรือข้อมูลที่ต้องการจากลูกค้า');
}

export function moveByAdmin(order, admin, toStatus, message) {
  if (!order) throw orderError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');
  const fromStatus = order.status;
  if (!canAdminMove(fromStatus, toStatus)) throw orderError('INVALID_STATUS', 'ไม่สามารถเปลี่ยนจาก ' + fromStatus + ' เป็น ' + toStatus);
  if (order.assignedAdminId !== admin.uid) throw orderError('INVALID_STATUS', 'กรุณารับช่วง Order ก่อนเปลี่ยนสถานะ');
  const now = new Date().toISOString();
  order.status = toStatus;
  order.updatedAt = now;
  if (toStatus === 'approved') order.approvedAt = now;
  if (toStatus === 'completed') order.completedAt = now;
  if (toStatus === 'rejected') order.rejectedAt = now;
  addHistory(order, { fromStatus, toStatus, actorRole: 'admin', actorId: admin.uid, actorName: admin.name, message });
  if (messageRequired.includes(toStatus)) addMessage(order, 'admin', admin.name, message, now);
  return fromStatus;
}
