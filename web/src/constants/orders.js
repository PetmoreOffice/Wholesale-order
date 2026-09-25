export const statusText = {
  draft: 'ร่าง',
  submitted: 'รอตรวจสอบ',
  need_information: 'ต้องการข้อมูลเพิ่ม',
  approved: 'อนุมัติแล้ว',
  preparing: 'กำลังเตรียมสินค้า',
  shipped: 'จัดส่งแล้ว',
  completed: 'เสร็จสมบูรณ์',
  rejected: 'ปฏิเสธ'
};

export const adminActions = {
  submitted: ['need_information', 'approved', 'rejected'],
  need_information: ['approved', 'rejected'],
  approved: ['preparing'],
  preparing: ['shipped'],
  shipped: ['completed']
};
