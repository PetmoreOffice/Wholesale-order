import React, { useEffect, useState } from 'react';
import { apiFetch, apiUrl } from '../api/client.js';
import { adminActions, messageRequired, statusText } from '../lib/orderStatus.js';
import { OrderMessages } from '../components/OrderMessages.jsx';
import { OrderProgress } from '../components/OrderProgress.jsx';
import { AnimatedContent } from '../components/react-bits/AnimatedContent.jsx';
import { Badge } from '@/components/ui/badge';

export function AdminQueue({ adminName, adminId }) {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const response = await apiFetch(`${apiUrl}/orders/admin/queue`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setOrders(data.data);
    } catch (err) {
      setError(err.message || 'โหลดคิวงานไม่สำเร็จ');
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 15000);
    return () => clearInterval(timer);
  }, []);

  async function choose(order) {
    setSelected(order);
    setDetail(null);
    setMessage('');
    try {
    const response = await apiFetch(`${apiUrl}/orders/${order.orderId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setDetail(data.data);
    setSelected(data.data);
    } catch (err) { setError(err.message || 'โหลดรายละเอียดไม่สำเร็จ'); }
  }

  async function claim() {
    if (busy) return;
    if (!selected || !adminName.trim()) {
      setError('กรุณาระบุชื่อแอดมินก่อนรับ Order');
      return;
    }
    setBusy(true); setError('');
    try {
      const response = await apiFetch(`${apiUrl}/orders/${selected.orderId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setSelected(current => ({ ...current, assignedAdminName: data.data.assignedAdminName, status: data.data.status }));
      await choose({ ...selected, assignedAdminName: data.data.assignedAdminName, status: data.data.status });
      await load();
    } catch (err) {
      setError(err.message || 'รับ Order ไม่สำเร็จ');
    } finally { setBusy(false); }
  }

  async function move(status) {
    if (busy) return;
    if (!selected) return;
    if (!selected.assignedAdminName) {
      setError('กรุณารับ Order ก่อนดำเนินการ');
      return;
    }
    if (messageRequired.includes(status) && !message.trim()) {
      setError(status === 'rejected' ? 'ระบุเหตุผลที่ปฏิเสธและแนวทางให้ลูกค้าก่อน' : 'ระบุข้อมูลที่ต้องการจากลูกค้าก่อน');
      return;
    }
    setBusy(true); setError('');
    try {
      const response = await apiFetch(`${apiUrl}/orders/${selected.orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, message })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setSelected(current => ({ ...current, status: data.data.status }));
      setMessage('');
      await choose({ ...selected, status: data.data.status });
      await load();
    } catch (err) {
      setError(err.message || 'อัปเดตสถานะไม่สำเร็จ');
    } finally { setBusy(false); }
  }

  return (
    <AnimatedContent className="workspace admin-workspace" distance={18}>
      <p className="eyebrow">ADMIN OPERATIONS / QUEUE</p>
      <h1>คิวงานคำสั่งซื้อ</h1>
      <p className="workspace-copy">รับงาน ตรวจสอบ และติดตามการกรอกข้อมูลใน ERP</p>
      <button className="secondary" disabled={busy} onClick={load}>รีเฟรชคิวงาน</button>
      {error && <p className="form-error">{error}</p>}
      <div className="queue-layout">
        <div className="queue-list">
          {orders.map(order => (
            <button disabled={busy} className={selected?.orderId === order.orderId ? 'queue-item selected' : 'queue-item'} key={order.orderId} onClick={() => choose(order)}>
              <Badge variant="secondary" className={`status ${order.status}`}>{statusText[order.status] || order.status}</Badge>
              <b>{order.orderNumber}</b>
              <small>{order.customerName} · {order.itemCount} รายการ {order.assignedAdminName ? `· รับงานโดย ${order.assignedAdminName}` : '· ยังไม่มีผู้รับงาน'}</small>
            </button>
          ))}
          {!orders.length && <div className="state">ยังไม่มีคำสั่งซื้อในคิว</div>}
        </div>
        <aside className="order-panel">
          {selected ? (
            <>
              <p className="eyebrow">ORDER DETAIL</p>
              <h2>{selected.orderNumber}</h2>
              <p>{selected.customerName}</p>
              <OrderProgress order={detail || selected}/>
              <label htmlFor="admin-name">บัญชีผู้ดำเนินการ</label>
              <div className="claim-row">
                <input id="admin-name" value={adminName} readOnly />
                {!['draft', 'completed', 'rejected'].includes(selected.status) && <button disabled={busy || !detail || (selected.assignedAdminId === adminId && selected.status !== 'submitted')} className="primary" onClick={claim}>{selected.assignedAdminId === adminId ? 'คุณรับผิดชอบงานนี้' : selected.assignedAdminName ? 'รับช่วง Order' : 'รับ Order'}</button>}
              </div>
              {selected.assignedAdminName && <p className="assignment">ผู้รับผิดชอบ: <b>{selected.assignedAdminName}</b></p>}
              <div className="panel-items">
                {detail?.items.map(item => (
                  <div key={item.itemId}>{item.name}<span>{item.quantity} {item.unitName}</span></div>
                ))}
              </div>
              <OrderMessages messages={detail?.messages} />
              {adminActions[selected.status]?.length ? (
                <>
                  <label htmlFor="admin-message">ข้อความถึงลูกค้า {adminActions[selected.status].some(status => messageRequired.includes(status)) ? '(จำเป็นเมื่อขอข้อมูลเพิ่มหรือปฏิเสธ)' : ''}</label>
                  <textarea id="admin-message" value={message} onChange={e => setMessage(e.target.value)} placeholder="อธิบายการดำเนินการหรือข้อมูลที่ต้องการ" rows="3" />
                  <div className="admin-actions">
                      {adminActions[selected.status].map(status => (
                        <button disabled={busy || !detail || selected.assignedAdminId !== adminId} className={status === 'rejected' ? 'danger' : 'secondary'} key={status} onClick={() => move(status)}>{status === 'erp_entry' ? 'เริ่มกรอกข้อมูลใน ERP' : status === 'completed' ? 'ยืนยันว่ากรอก ERP เสร็จแล้ว' : statusText[status]}</button>
                    ))}
                  </div>
                </>
              ) : (
                <p>{selected.status === 'submitted' ? 'รับ Order เพื่อเริ่มตรวจสอบ' : 'สิ้นสุดขั้นตอนสำหรับสถานะนี้'}</p>
              )}
              <div className="assignment-log">
                <b>ประวัติผู้รับงาน</b>
                {detail?.assignmentLog?.map(log => (
                  <small key={log.assignmentId}>{log.adminName} · {log.action} · {new Date(log.createdAt).toLocaleString('th-TH')}</small>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-copy">เลือกคำสั่งซื้อจากคิวเพื่อดูรายละเอียดและจัดการงาน</p>
          )}
        </aside>
      </div>
    </AnimatedContent>
  );
}
