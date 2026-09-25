export const statusText = {
  draft: 'ร่าง',
  submitted: 'รอตรวจสอบ',
  need_information: 'ต้องการข้อมูลเพิ่ม',
  assigned: 'รับ Order แล้ว',
  approved: 'อนุมัติแล้ว',
  erp_entry: 'กรอกข้อมูลสินค้าใน ERP',
  preparing: 'กำลังเตรียมสินค้า',
  shipped: 'จัดส่งแล้ว',
  completed: 'เสร็จสมบูรณ์',
  rejected: 'ปฏิเสธ'
};

export const adminActions = {
  submitted: [],
  assigned: ['need_information', 'approved', 'rejected'],
  need_information: ['approved', 'rejected'],
  approved: ['erp_entry'],
  erp_entry: ['completed'],
  preparing: ['shipped'],
  shipped: ['completed']
};

// Must match the API: these moves always carry a message the customer can read.
export const messageRequired = ['need_information', 'rejected'];
