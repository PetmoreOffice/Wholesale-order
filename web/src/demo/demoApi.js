// Development-only stand-in for the API (`npm run dev:demo`). Every name, SKU and order here is
// SYNTHETIC, labelled "(จำลอง)", and exists only to check screens without SQL or Firebase.
// It is loaded through a dynamic import guarded by import.meta.env.DEV, so builds drop it.
import { messageRequired } from '@shared/orderWorkflow.js';

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();
let historySeq = 1;
const entry = (fromStatus, toStatus, actorRole, actorName, minutes, message = null) => ({
  historyId: 'h' + historySeq++, fromStatus, toStatus, actorRole, actorName, message, createdAt: minutesAgo(minutes), visibleToCustomer: true
});

export const demoRole = () => {
  try { return new URLSearchParams(location.search).get('role') || sessionStorage.getItem('demo-role') || 'customer'; } catch { return 'customer'; }
};
export function demoSession() {
  const role = demoRole();
  try { sessionStorage.setItem('demo-role', role); } catch { /* demo only */ }
  // ?role=guest shows the sign-in screen.
  if (role === 'guest') return null;
  return role === 'admin'
    ? { uid: 'demo-admin', name: 'แอดมินสมชาย (จำลอง)', email: 'admin@example.test', role: 'admin' }
    : { uid: 'demo-customer', name: 'ร้านตัวอย่างการค้า (จำลอง)', email: 'shop@example.test', role: 'customer' };
}

const departments = [
  { id: 'g1', name: 'อาหารสัตว์ (จำลอง)', products: 42, departments: [
    { id: 11, code: 'A1', name: 'อาหารสุนัข', products: 24, children: [{ id: 111, code: 'A11', name: 'อาหารเม็ด', fullName: 'อาหารสุนัข อาหารเม็ด', products: 16 }, { id: 112, code: 'A12', name: 'อาหารเปียก', fullName: 'อาหารสุนัข อาหารเปียก', products: 8 }] },
    { id: 12, code: 'A2', name: 'อาหารแมว', products: 18, children: [] }
  ] },
  { id: 'g2', name: 'อุปกรณ์ (จำลอง)', products: 18, departments: [{ id: 21, code: 'B1', name: 'ภาชนะ', products: 18, children: [] }] }
];

// Each demo SKU sells in a small unit; some also come by the dozen and by the case, like the
// real GOODSMASTER rows (one goods row per unit size).
const unitNames = ['ชิ้น', 'ถุง', 'ซอง', 'กระป๋อง'];
const products = Array.from({ length: 60 }, (_, index) => {
  const goodsId = 1001 + index;
  const department = index < 24 ? (index < 16 ? 111 : 112) : index < 42 ? 12 : 21;
  return {
    goodsId, goodsCode: 'G' + goodsId, skuId: 5000 + index, sku: 'SKU-' + String(880100 + index * 7),
    barcode: '885' + String(1000000000 + index * 7919).slice(0, 10),
    name: `สินค้าตัวอย่าง ${index + 1} (จำลอง)`, englishName: null,
    categoryId: 1, categoryName: 'หมวดจำลอง', departmentId: department, departmentName: 'แผนกจำลอง',
    unitId: index % 4, unitName: unitNames[index % 4], unitQuantity: 1,
    minimumOrder: index % 5 === 0 ? 2 : 1, maximumOrder: index % 7 === 0 ? 50 : 0,
    basePrice: 100 + index * 15
  };
});
const largerUnits = products.flatMap((product, index) => [
  ...(index % 3 === 0 ? [{ ...product, goodsId: product.goodsId + 1000, goodsCode: 'D' + product.goodsId, unitId: 10, unitName: 'โหล', unitQuantity: 12, minimumOrder: 1, basePrice: product.basePrice * 12 }] : []),
  ...(index % 2 === 0 ? [{ ...product, goodsId: product.goodsId + 2000, goodsCode: 'C' + product.goodsId, unitId: 11, unitName: 'ลัง x 24', unitQuantity: 24, minimumOrder: 1, maximumOrder: 0, basePrice: product.basePrice * 24 }] : [])
]);
const allGoods = [...products, ...largerUnits];
const unitsOf = (product) => allGoods.filter((goods) => goods.skuId === product.skuId).sort((a, b) => a.unitQuantity - b.unitQuantity);
const line = (product, quantity) => ({ itemId: 'i' + product.goodsId, goodsId: product.goodsId, goodsCode: product.goodsCode, skuId: product.skuId, sku: product.sku, name: product.name, unitName: product.unitName, unitQuantity: product.unitQuantity, minimumOrder: product.minimumOrder, maximumOrder: product.maximumOrder, quantity });

function order(orderId, status, minutes, items, history, extra = {}) {
  return {
    orderId, orderNumber: 'WO-202611-' + String(orderId).padStart(6, '0'),
    customerId: 'demo-customer', customerName: 'ร้านตัวอย่างการค้า (จำลอง)', orderSource: 'self',
    status, priceStatus: 'pending', createdAt: minutesAgo(minutes + 30), updatedAt: history[0]?.createdAt || minutesAgo(minutes),
    submittedAt: minutesAgo(minutes), deliveryDetails: 'ส่งหน้าร้าน ช่วงเช้า (จำลอง)', customerNote: null,
    items, history, messages: [], assignmentLog: [], ...extra
  };
}

const admin = 'แอดมินสมชาย (จำลอง)';
const shop = 'ร้านตัวอย่างการค้า (จำลอง)';
const orders = [
  order(131, 'need_information', 1500, [line(products[2], 10), line(products[5], 4), line(products[9], 6)], [
    entry('assigned', 'need_information', 'admin', admin, 300, 'สินค้าตัวอย่าง 6 ต้องการหน่วยลังหรือแพ็ค กรุณายืนยัน'),
    entry('submitted', 'assigned', 'admin', admin, 900, 'รับงานคำสั่งซื้อนี้'),
    entry(null, 'submitted', 'customer', shop, 1500, 'ยืนยันสั่งซื้อ')
  ], { assignedAdminId: 'demo-admin', assignedAdminName: admin, messages: [{ messageId: 'm1', senderRole: 'admin', senderName: admin, messageBody: 'สินค้าตัวอย่าง 6 ต้องการหน่วยลังหรือแพ็ค กรุณายืนยัน', createdAt: minutesAgo(300), visibleToCustomer: true }] }),
  order(128, 'erp_entry', 2900, products.slice(10, 22).map((product, index) => line(product, 2 + index)), [
    entry('approved', 'erp_entry', 'admin', admin, 120, null),
    entry('assigned', 'approved', 'admin', admin, 600, null),
    entry('submitted', 'assigned', 'admin', admin, 1800, 'รับงานคำสั่งซื้อนี้'),
    entry(null, 'submitted', 'customer', shop, 2900, 'ยืนยันสั่งซื้อ')
  ], { assignedAdminId: 'demo-admin', assignedAdminName: admin }),
  order(133, 'submitted', 45, products.slice(30, 35).map((product) => line(product, 3)), [entry(null, 'submitted', 'customer', shop, 45, 'ยืนยันสั่งซื้อ')]),
  order(119, 'completed', 9000, products.slice(40, 60).map((product) => line(product, 1)), [
    entry('erp_entry', 'completed', 'admin', admin, 8000, null),
    entry(null, 'submitted', 'customer', shop, 9000, 'ยืนยันสั่งซื้อ')
  ]),
  order(112, 'rejected', 15000, [line(products[0], 2)], [
    entry('assigned', 'rejected', 'admin', admin, 14000, 'สินค้าหยุดขายชั่วคราว (จำลอง)'),
    entry(null, 'submitted', 'customer', shop, 15000, 'ยืนยันสั่งซื้อ')
  ]),
  order(120, 'draft', 600, [line(products[3], 5)], [entry(null, 'draft', 'customer', shop, 600, 'บันทึกร่างคำสั่งซื้อ')], { submittedAt: null })
];
let nextOrderId = 140;

const summary = (row) => ({ orderId: row.orderId, orderNumber: row.orderNumber, customerName: row.customerName, status: row.status, priceStatus: row.priceStatus, createdAt: row.createdAt, updatedAt: row.updatedAt, itemCount: row.items.length, assignedAdminId: row.assignedAdminId || null, assignedAdminName: row.assignedAdminName || null, assignedAt: row.assignedAt || null });
const forRole = (rows) => demoRole() === 'admin' ? rows : rows.map(({ basePrice, units, ...row }) => (units ? { ...row, units: forRole(units) } : row));
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const find = (id) => orders.find((row) => row.orderId === Number(id));

function move(row, toStatus, actorRole, actorName, message) {
  row.history.unshift(entry(row.status, toStatus, actorRole, actorName, 0, message));
  if (message && (messageRequired.includes(toStatus) || actorRole === 'customer')) row.messages.push({ messageId: 'm' + historySeq, senderRole: actorRole, senderName: actorName, messageBody: message, createdAt: minutesAgo(0), visibleToCustomer: true });
  row.status = toStatus;
  row.updatedAt = minutesAgo(0);
}

export async function demoFetch(path, options = {}) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const url = new URL(path, 'http://demo');
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const session = demoSession();
  const parts = url.pathname.split('/').filter(Boolean);

  if (parts[0] === 'products') {
    if (parts[1] === 'departments') return json(200, { data: departments });
    if (parts[1] === 'barcode') {
      const code = decodeURIComponent(parts[2]);
      const rows = allGoods.filter((goods) => [goods.barcode, goods.sku].includes(code)).sort((a, b) => a.unitQuantity - b.unitQuantity);
      if (!rows.length) rows.push(...allGoods.filter((goods) => goods.goodsCode === code));
      return rows.length ? json(200, { data: forRole(rows), requiresUnitSelection: rows.length > 1 }) : json(404, { message: 'ไม่พบสินค้าจากบาร์โค้ดนี้ กรุณาค้นหาด้วย SKU หรือชื่อสินค้า' });
    }
    const term = (url.searchParams.get('q') || '').toLowerCase();
    const departmentId = Number(url.searchParams.get('departmentId')) || null;
    const groupId = url.searchParams.get('groupId');
    const groupDepartments = groupId ? departments.find((group) => group.id === groupId)?.departments.flatMap((department) => [department.id, ...department.children.map((child) => child.id)]) : null;
    const matching = products.filter((product) => (!term || [product.name, product.sku, product.barcode, product.goodsCode].some((value) => value.toLowerCase().includes(term)))
      && (!departmentId || product.departmentId === departmentId || Math.floor(product.departmentId / 10) === departmentId)
      && (!groupDepartments || groupDepartments.includes(product.departmentId) || groupDepartments.includes(Math.floor(product.departmentId / 10))));
    const limit = Number(url.searchParams.get('limit')) || 50;
    const offset = Number(url.searchParams.get('offset')) || 0;
    return json(200, { data: forRole(matching.slice(offset, offset + limit).map((product) => ({ ...product, units: unitsOf(product) }))), pagination: { limit, offset, hasMore: offset + limit < matching.length, total: matching.length, totalPages: Math.ceil(matching.length / limit) } });
  }

  if (parts[0] === 'notifications') {
    if (method === 'POST') return json(200, { data: { readAt: minutesAgo(0) } });
    const events = orders.flatMap((row) => row.history.filter((item) => session.role === 'admin' ? item.actorRole === 'customer' && item.toStatus !== 'draft' : item.actorRole === 'admin')
      .map((item) => ({ id: item.historyId, orderId: row.orderId, orderNumber: row.orderNumber, customerName: session.role === 'admin' ? row.customerName : undefined, fromStatus: item.fromStatus, toStatus: item.toStatus, actorName: item.actorName, message: item.message, createdAt: item.createdAt, unread: Date.now() - Date.parse(item.createdAt) < 600 * 60000 })))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return json(200, { data: events.slice(0, 30), unreadCount: events.filter((event) => event.unread).length });
  }

  if (parts[0] === 'profile') return json(200, { data: { companyName: 'ร้านตัวอย่างการค้า (จำลอง)', phone: '02-000-0000', address: '99 ถนนตัวอย่าง เขตจำลอง กรุงเทพฯ', taxId: null } });

  if (parts[0] === 'orders') {
    if (parts[1] === 'admin' && parts[2] === 'customer') {
      return url.searchParams.get('email') === 'shop@example.test'
        ? json(200, { data: { uid: 'demo-customer', name: 'คุณตัวอย่าง (จำลอง)', companyName: shop, phone: '02-000-0000', address: '99 ถนนตัวอย่าง เขตจำลอง กรุงเทพฯ', email: 'shop@example.test' } })
        : json(404, { message: 'ไม่พบบัญชีลูกค้า กรุณาตรวจสอบอีเมล (โหมดจำลอง: ใช้ shop@example.test)' });
    }
    if (parts[1] === 'admin' && parts[2] === 'queue') return json(200, { data: orders.filter((row) => row.status !== 'draft').sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt)).map(summary) });
    if (parts[1] === 'drafts' && method === 'POST') {
      const status = session.role === 'admin' || body.submit ? 'submitted' : 'draft';
      const items = body.items.map((item) => line(allGoods.find((product) => product.goodsId === Number(item.goodsId)), Number(item.quantity)));
      const created = order(nextOrderId++, status, 0, items, [entry(null, status, session.role, session.name, 0, status === 'submitted' ? 'ยืนยันสั่งซื้อ' : 'บันทึกร่างคำสั่งซื้อ')], { customerNote: body.customerNote || null, deliveryDetails: body.deliveryDetails || null });
      orders.unshift(created);
      return json(201, { data: created });
    }
    if (!parts[1]) return json(200, { data: orders.map(summary) });
    const row = find(parts[1]);
    if (!row) return json(404, { message: 'ไม่พบคำสั่งซื้อ' });
    const action = parts[2];
    if (!action && method === 'GET') return json(200, { data: row });
    if (!action && method === 'DELETE') { orders.splice(orders.indexOf(row), 1); return json(200, { data: { orderId: row.orderId, deleted: true } }); }
    if (action === 'reorder-items') return json(200, { data: { orderId: row.orderId, orderNumber: row.orderNumber, items: forRole(row.items.map((item) => ({ ...allGoods.find((product) => product.goodsId === item.goodsId), quantity: item.quantity }))), unavailable: [], adjusted: [] } });
    if (action === 'submit') { move(row, 'submitted', 'customer', session.name, 'ส่งคำสั่งซื้อเพื่อรอตรวจสอบ'); return json(200, { data: { orderId: row.orderId, status: row.status } }); }
    if (action === 'reply') { move(row, 'assigned', 'customer', session.name, body.message); return json(200, { data: row }); }
    if (action === 'cancel') { move(row, 'cancelled', 'customer', session.name, body.reason || null); return json(200, { data: row }); }
    if (action === 'assign') { Object.assign(row, { assignedAdminId: session.uid, assignedAdminName: session.name, assignedAt: minutesAgo(0) }); if (row.status === 'submitted') move(row, 'assigned', 'admin', session.name, 'รับงานคำสั่งซื้อนี้'); return json(200, { data: { orderId: row.orderId, status: row.status } }); }
    if (action === 'status') { const fromStatus = row.status; move(row, body.status, 'admin', session.name, body.message || null); return json(200, { data: { orderId: row.orderId, fromStatus, status: row.status } }); }
    if (action === 'draft') { row.items = body.items.map((item) => ({ ...row.items.find((old) => old.goodsId === item.goodsId), quantity: item.quantity })); return json(200, { data: row }); }
  }

  if (parts[0] === 'admin' && parts[1] === 'users') {
    return json(200, { data: [
      { uid: 'demo-admin', email: 'admin@example.test', displayName: admin, role: 'admin', disabled: false, online: true, lastActiveAt: minutesAgo(2), profile: {} },
      { uid: 'demo-customer', email: 'shop@example.test', displayName: shop, role: 'customer', disabled: false, online: false, lastActiveAt: minutesAgo(90), profile: { companyName: shop, phone: '02-000-0000' } },
      { uid: 'demo-customer-2', email: 'shop2@example.test', displayName: 'ร้านทดลองขายส่ง (จำลอง)', role: 'customer', disabled: true, online: false, lastActiveAt: minutesAgo(9000), profile: {} }
    ] });
  }
  if (parts[0] === 'admin' && parts[1] === 'data') {
    if (parts[2] === 'activity') return json(200, { data: [{ activityId: 'a1', createdAt: minutesAgo(60), actorName: admin, action: 'backup.created', detail: 'orders-2026-11-05T03-00-00Z-manual.json' }], total: 1 });
    return json(200, { data: { size: 48213, updatedAt: minutesAgo(5), orders: orders.length, openOrders: 3, customers: 2, lastBackupAt: minutesAgo(60), backups: [{ name: 'orders-2026-11-05T03-00-00Z-manual.json', size: 48000, createdAt: minutesAgo(60), manual: true }], archives: [] } });
  }
  return json(404, { error: 'NOT_FOUND', message: 'ไม่พบ API นี้ (โหมดจำลอง)' });
}
