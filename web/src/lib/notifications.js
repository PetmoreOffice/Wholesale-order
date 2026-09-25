import { apiFetch, apiUrl } from '../api/client.js';

const customerText = {
  submitted: 'แอดมินสร้างคำสั่งซื้อให้คุณ',
  assigned: 'แอดมินรับงานคำสั่งซื้อแล้ว',
  need_information: 'แอดมินต้องการข้อมูลเพิ่ม',
  approved: 'คำสั่งซื้อได้รับการอนุมัติ',
  erp_entry: 'กำลังบันทึกเข้าระบบ ERP',
  completed: 'คำสั่งซื้อเสร็จสมบูรณ์',
  rejected: 'คำสั่งซื้อถูกปฏิเสธ',
  preparing: 'กำลังเตรียมสินค้า',
  shipped: 'จัดส่งสินค้าแล้ว'
};

export function notificationTitle(event, role) {
  if (role === 'admin') {
    if (event.fromStatus === 'need_information') return `${event.customerName} ตอบข้อมูลเพิ่มแล้ว`;
    return `คำสั่งซื้อใหม่จาก ${event.customerName}`;
  }
  return customerText[event.toStatus] || 'คำสั่งซื้อมีความคืบหน้า';
}

export function notificationLink(event, role) {
  return role === 'admin' ? `/admin/orders/${event.orderId}` : `/orders/${event.orderId}`;
}

export async function fetchNotifications() {
  const response = await apiFetch(`${apiUrl}/notifications`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'โหลดการแจ้งเตือนไม่สำเร็จ');
  return data;
}

export async function markNotificationsRead() {
  await apiFetch(`${apiUrl}/notifications/read`, { method: 'POST' });
}
