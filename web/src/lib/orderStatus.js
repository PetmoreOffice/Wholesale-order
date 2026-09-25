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

// Tone drives color; every tone is always paired with an icon and the written label.
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

// Must match the API: a customer may withdraw an order until an admin approves it.
export const customerCancellable = ['submitted', 'assigned', 'need_information'];

export const adminActions = {
  submitted: [],
  assigned: ['need_information', 'approved', 'rejected'],
  need_information: ['approved', 'rejected'],
  approved: ['erp_entry'],
  erp_entry: ['completed'],
  preparing: ['shipped'],
  shipped: ['completed']
};

export const adminActionText = {
  need_information: 'ขอข้อมูลเพิ่ม',
  approved: 'อนุมัติคำสั่งซื้อ',
  rejected: 'ปฏิเสธ',
  erp_entry: 'เริ่มบันทึกเข้า ERP',
  completed: 'ยืนยันว่าบันทึก ERP เสร็จแล้ว',
  shipped: 'บันทึกว่าจัดส่งแล้ว'
};

// Must match the API: these moves always carry a message the customer can read.
export const messageRequired = ['need_information', 'rejected'];

// Who holds the next step, in the customer's words (UX-PLAN §2).
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
