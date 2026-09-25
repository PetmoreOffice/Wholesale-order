import React from 'react';
import { statusText } from '../lib/orderStatus.js';

export function OrderProgress({ order }) {
  const steps = ['submitted', 'assigned', 'approved', 'erp_entry', 'completed'];
  const current = steps.indexOf(order.status);
  return <section className="order-progress" aria-label="ความคืบหน้าคำสั่งซื้อ">
    <h3>สถานะ: {statusText[order.status] || order.status}</h3>
    <ol>{steps.map((step, index) => <li key={step} aria-current={step === order.status ? 'step' : undefined} className={index <= current ? 'reached' : ''}>{statusText[step]}</li>)}</ol>
    {order.status === 'draft' && <p>บันทึกร่างแล้ว กรุณาตรวจรายการและส่งให้แอดมิน</p>}
    {order.createdByRole === 'admin' && <p>สั่งแทนโดย: {order.createdByName} · {order.orderSource === 'phone' ? 'ลูกค้าโทรมาสั่ง' : 'ลูกค้าฝากสั่ง'}</p>}
    {order.assignedAdminName && <p>ผู้รับผิดชอบ: {order.assignedAdminName}</p>}
    {order.history?.length > 0 && <details><summary>ประวัติการดำเนินการ</summary><ul>{order.history.map(entry => <li key={entry.historyId}>{statusText[entry.toStatus] || entry.toStatus} · {entry.actorName}<br/><small>{new Date(entry.createdAt).toLocaleString('th-TH')} · {entry.message}</small></li>)}</ul></details>}
  </section>;
}
