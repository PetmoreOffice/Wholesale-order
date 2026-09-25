import React from 'react';
import { statusText } from '../lib/orderStatus.js';

const steps = ['submitted', 'assigned', 'approved', 'erp_entry', 'completed'];
// Side states pause the rail at the step where the order was when it left the main path.
const railPosition = { need_information: 'assigned' };

export function OrderProgress({ order }) {
  const current = steps.indexOf(railPosition[order.status] || order.status);
  const latestAdminMessage = [...(order.messages || [])].reverse().find(entry => entry.senderRole === 'admin');
  return <section className="order-progress" aria-label="ความคืบหน้าคำสั่งซื้อ">
    <h3>สถานะ: {statusText[order.status] || order.status}</h3>
    <ol>{steps.map((step, index) => <li key={step} aria-current={index === current ? 'step' : undefined} className={index <= current ? 'reached' : ''}>{statusText[step]}</li>)}</ol>
    {order.status === 'draft' && <p>บันทึกร่างแล้ว กรุณาตรวจรายการและส่งให้แอดมิน</p>}
    {order.status === 'need_information' && <p role="status">รอข้อมูลเพิ่มจากลูกค้า{latestAdminMessage ? `: ${latestAdminMessage.messageBody}` : ''}</p>}
    {order.status === 'rejected' && <p role="status">ไม่สามารถดำเนินการคำสั่งซื้อนี้ได้{latestAdminMessage ? ` — เหตุผล: ${latestAdminMessage.messageBody}` : ''}</p>}
    {order.createdByRole === 'admin' && <p>สั่งแทนโดย: {order.createdByName} · {order.orderSource === 'phone' ? 'ลูกค้าโทรมาสั่ง' : 'ลูกค้าฝากสั่ง'}</p>}
    {order.assignedAdminName && <p>ผู้รับผิดชอบ: {order.assignedAdminName}</p>}
    {order.history?.length > 0 && <details><summary>ประวัติการดำเนินการ</summary><ul>{order.history.map(entry => <li key={entry.historyId}>{statusText[entry.toStatus] || entry.toStatus} · {entry.actorName}<br/><small>{new Date(entry.createdAt).toLocaleString('th-TH')} · {entry.message}</small></li>)}</ul></details>}
  </section>;
}
