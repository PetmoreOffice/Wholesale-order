// The order workflow, shared by the API (which enforces it) and the website (which explains it).
// Plain data and pure functions only: this file is loaded by Node and bundled by Vite.

export const statusText = {
  draft: 'ร่าง',
  submitted: 'รอรับงาน',
  need_information: 'ต้องการข้อมูลเพิ่ม',
  assigned: 'กำลังตรวจสอบ',
  approved: 'อนุมัติแล้ว',
  erp_entry: 'กำลังบันทึก ERP',
  preparing: 'กำลังเตรียมสินค้า',
  shipped: 'จัดส่งแล้ว',
  completed: 'เสร็จสมบูรณ์',
  rejected: 'ปฏิเสธ',
  cancelled: 'ยกเลิกแล้ว'
};

// Tone drives colour; every tone is always paired with an icon and the written label.
export const statusTone = {
  draft: 'neutral',
  submitted: 'info',
  assigned: 'progress',
  need_information: 'attention',
  approved: 'progress',
  erp_entry: 'progress',
  preparing: 'progress',
  shipped: 'progress',
  completed: 'success',
  rejected: 'danger',
  cancelled: 'neutral'
};

export const closedStatuses = ['completed', 'rejected', 'cancelled'];

// The main road an order travels. need_information, rejected and cancelled leave it as exits;
// preparing and shipped belong to older orders and sit between erp_entry and completed.
export const mainRoute = ['submitted', 'assigned', 'approved', 'erp_entry', 'completed'];
const legacyStops = { preparing: 'erp_entry', shipped: 'erp_entry' };

// Where an order stands on the main road: the index of its stop, or of the stop it left from.
export function routeIndex(status, history = []) {
  const direct = mainRoute.indexOf(legacyStops[status] || status);
  if (direct !== -1) return direct;
  // An exit (need_information, rejected, cancelled) is placed at the stop it left from, or
  // failing that at the last main stop the order reached.
  const exit = history.find((entry) => entry.toStatus === status);
  const left = mainRoute.indexOf(legacyStops[exit?.fromStatus] || exit?.fromStatus);
  if (left !== -1) return left;
  for (const entry of history) {
    const index = mainRoute.indexOf(legacyStops[entry.toStatus] || entry.toStatus);
    if (index !== -1) return index;
  }
  return 0;
}

export const adminTransitions = {
  submitted: [],
  assigned: ['need_information', 'approved', 'rejected'],
  need_information: ['approved', 'rejected'],
  approved: ['erp_entry'],
  erp_entry: ['completed'],
  // Legacy statuses remain readable for existing local JSON orders.
  preparing: ['shipped'],
  shipped: ['completed']
};

export function canAdminMove(fromStatus, toStatus) {
  return Boolean(adminTransitions[fromStatus]?.includes(toStatus));
}

// Statuses an admin may take an order in (or take over from another admin).
export const assignableStatuses = ['submitted', 'need_information', 'assigned', 'approved', 'erp_entry', 'preparing', 'shipped'];

export const adminActionText = {
  need_information: 'ขอข้อมูลเพิ่ม',
  approved: 'อนุมัติคำสั่งซื้อ',
  rejected: 'ปฏิเสธ',
  erp_entry: 'เริ่มบันทึกเข้า ERP',
  completed: 'ยืนยันว่าบันทึก ERP เสร็จแล้ว',
  shipped: 'บันทึกว่าจัดส่งแล้ว'
};

// Customers must know what to fix or why the order stopped.
export const messageRequired = ['need_information', 'rejected'];

// A customer may withdraw an order until an admin approves it.
export const customerCancellable = ['submitted', 'assigned', 'need_information'];

// Who holds the next step, in the customer's words.
export const customerNextStep = {
  draft: { owner: 'customer', text: 'ตรวจรายการแล้วส่งให้แอดมิน' },
  submitted: { owner: 'admin', text: 'รอแอดมินรับงานตรวจสอบ' },
  assigned: { owner: 'admin', text: 'แอดมินกำลังตรวจสอบคำสั่งซื้อ' },
  need_information: { owner: 'customer', text: 'ตอบคำถามจากแอดมิน' },
  approved: { owner: 'admin', text: 'รอบันทึกเข้าระบบ ERP' },
  erp_entry: { owner: 'admin', text: 'กำลังบันทึกเข้าระบบ ERP' },
  preparing: { owner: 'admin', text: 'กำลังเตรียมสินค้า' },
  shipped: { owner: 'admin', text: 'สินค้าอยู่ระหว่างจัดส่ง' },
  completed: { owner: null, text: 'คำสั่งซื้อเสร็จสมบูรณ์' },
  rejected: { owner: 'customer', text: 'อ่านเหตุผล แล้วสร้างคำสั่งซื้อใหม่หรือติดต่อแอดมิน' },
  cancelled: { owner: null, text: 'คุณยกเลิกคำสั่งซื้อนี้แล้ว' }
};
