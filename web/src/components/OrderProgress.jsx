import React from 'react';
import { Check } from 'lucide-react';
import { dateTime } from '../lib/format.js';
import { statusText } from '../lib/orderStatus.js';

const steps = [
  { status: 'submitted', label: 'ส่งคำสั่งซื้อ' },
  { status: 'assigned', label: 'แอดมินตรวจสอบ' },
  { status: 'approved', label: 'อนุมัติ' },
  { status: 'erp_entry', label: 'บันทึกเข้า ERP' },
  { status: 'completed', label: 'เสร็จสมบูรณ์' },
];
// Side states pause the rail at the step where the order was when it left the main path.
const railPosition = { need_information: 'assigned', preparing: 'erp_entry', shipped: 'erp_entry' };

// A rejected or cancelled order stops where it was when that happened.
function railStatus(order) {
  const status = ['rejected', 'cancelled'].includes(order.status)
    ? order.history?.find(entry => entry.toStatus === order.status)?.fromStatus || 'submitted'
    : order.status;
  return railPosition[status] || status;
}

export function OrderProgress({ order }) {
  const current = steps.findIndex(step => step.status === railStatus(order));
  const latestAdminMessage = [...(order.messages || [])].reverse().find(entry => entry.senderRole === 'admin');
  const paused = ['need_information', 'rejected', 'cancelled'].includes(order.status);
  return (
    <section className="order-progress" aria-label="ความคืบหน้าคำสั่งซื้อ">
      <h3>ความคืบหน้า</h3>
      <ol>
        {steps.map((step, index) => {
          const state = index < current || order.status === 'completed' ? 'done' : index === current ? (paused ? 'paused' : 'current') : 'todo';
          return (
            <li key={step.status} data-state={state} aria-current={index === current ? 'step' : undefined}>
              <span className="step-dot" aria-hidden="true">{state === 'done' ? <Check /> : index + 1}</span>
              <span>{step.label}{index === current && paused && <small> · {statusText[order.status]}</small>}</span>
            </li>
          );
        })}
      </ol>
      {order.status === 'draft' && <p className="progress-note">ยังไม่ได้ส่ง — ตรวจรายการแล้วส่งให้แอดมิน</p>}
      {order.status === 'cancelled' && <p className="progress-note">ลูกค้ายกเลิกคำสั่งซื้อนี้แล้ว{order.cancelledAt ? ` · ${dateTime(order.cancelledAt)}` : ''}</p>}
      {order.status === 'rejected' && <p className="progress-note" data-tone="danger">ไม่สามารถดำเนินการได้{latestAdminMessage ? ` — ${latestAdminMessage.messageBody}` : ''}</p>}
      <dl className="progress-facts">
        {order.assignedAdminName && <><dt>ผู้รับผิดชอบ</dt><dd>{order.assignedAdminName}</dd></>}
        {order.createdByRole === 'admin' && <><dt>สั่งแทนโดย</dt><dd>{order.createdByName} · {order.orderSource === 'phone' ? 'ลูกค้าโทรมาสั่ง' : 'ลูกค้าฝากสั่ง'}</dd></>}
      </dl>
      {order.history?.length > 0 && (
        <details className="history">
          <summary>ประวัติการดำเนินการ ({order.history.length})</summary>
          <ol>
            {order.history.map(entry => (
              <li key={entry.historyId}>
                <b>{statusText[entry.toStatus] || entry.toStatus}</b> · {entry.actorName}
                <small>{dateTime(entry.createdAt)}{entry.message ? ` · ${entry.message}` : ''}</small>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
