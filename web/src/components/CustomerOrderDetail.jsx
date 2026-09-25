import React, { useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { apiFetch, apiUrl } from '../api/client.js';
import { count, dateTime } from '../lib/format.js';
import { customerNextStep } from '../lib/orderStatus.js';
import { OrderMessages } from './OrderMessages.jsx';
import { OrderProgress } from './OrderProgress.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function CustomerOrderDetail({ initialOrder, onChanged, onClose }) {
  const [order, setOrder] = useState(initialOrder);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reply, setReply] = useState('');
  const draft = order.status === 'draft';
  const next = customerNextStep[order.status];

  async function save(submit = false) {
    setBusy(true); setError(''); setNotice('');
    try {
      const changes = {
        items: order.items.map(item => ({ goodsId: item.goodsId, quantity: Number(item.quantity) })),
        deliveryDetails: order.deliveryDetails || '',
        customerNote: order.customerNote || ''
      };
      let response = await apiFetch(`${apiUrl}/orders/${order.orderId}/draft`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
      let data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setOrder(data.data);
      if (submit) {
        response = await apiFetch(`${apiUrl}/orders/${order.orderId}/submit`, { method: 'POST' });
        data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setOrder(value => ({ ...value, ...data.data }));
      }
      setNotice(submit ? 'ส่งคำสั่งซื้อให้แอดมินตรวจสอบแล้ว' : 'บันทึกการแก้ไขแล้ว');
      onChanged();
    } catch (err) { setError(err.message || 'บันทึกไม่สำเร็จ'); } finally { setBusy(false); }
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!reply.trim()) {
      setError('กรุณาพิมพ์ข้อมูลที่ต้องการส่งให้แอดมิน');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await apiFetch(`${apiUrl}/orders/${order.orderId}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: reply }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setOrder(data.data);
      setReply('');
      setNotice('ส่งข้อมูลให้แอดมินแล้ว');
      onChanged();
    } catch (err) { setError(err.message || 'ส่งข้อมูลไม่สำเร็จ'); } finally { setBusy(false); }
  }

  function setQuantity(goodsId, quantity) {
    setOrder(value => ({ ...value, items: value.items.map(row => row.goodsId === goodsId ? { ...row, quantity } : row) }));
  }

  return (
    <section className="order-detail" aria-label="รายละเอียดคำสั่งซื้อ">
      <button type="button" className="back-link" onClick={onClose} disabled={busy}><ArrowLeft aria-hidden="true" /> คำสั่งซื้อของฉัน</button>
      <header className="detail-header">
        <div className="detail-title-row"><h1 className="num">{order.orderNumber}</h1><StatusBadge status={order.status} /></div>
        <p>สร้างเมื่อ {dateTime(order.createdAt)} · อัปเดตล่าสุด {dateTime(order.updatedAt)}</p>
      </header>

      {next && (
        <div className="next-step" data-owner={next.owner || 'none'} role="status">
          <span>{next.owner === 'customer' ? 'ถึงตาคุณ' : next.owner === 'admin' ? 'ถึงตาแอดมิน' : 'สถานะ'}</span>
          <b>{next.text}</b>
        </div>
      )}

      <div className="detail-layout">
        <div className="panel detail-main">
          <div className="panel-heading"><h2>รายการสินค้า</h2><span className="pill"><span className="num">{count.format(order.items.length)}</span> รายการ</span></div>
          <fieldset disabled={busy} className="detail-form">
            <legend className="sr-only">แก้ไขรายการคำสั่งซื้อ</legend>
            <ul className="line-items">
              {order.items.map(item => (
                <li key={item.goodsId}>
                  <div className="line-item-text"><b>{item.name}</b><small className="sku">{item.sku}</small></div>
                  {draft ? (
                    <div className="item-editor">
                      <Label htmlFor={`quantity-${item.goodsId}`} className="sr-only">จำนวน {item.name}</Label>
                      <Input id={`quantity-${item.goodsId}`} className="num w-21 text-right" type="number" inputMode="numeric" step="1" min={item.minimumOrder || 1} max={Number(item.maximumOrder) > 0 ? item.maximumOrder : undefined} value={item.quantity} onChange={e => setQuantity(item.goodsId, e.target.value)} />
                      <span>{item.unitName}</span>
                      <button type="button" className="icon-button" data-tone="danger" aria-label={`ลบ ${item.name}`} onClick={() => setOrder(value => ({ ...value, items: value.items.filter(row => row.goodsId !== item.goodsId) }))}><Trash2 aria-hidden="true" /></button>
                    </div>
                  ) : <strong className="item-quantity"><span className="num">{count.format(item.quantity)}</span> {item.unitName}</strong>}
                </li>
              ))}
            </ul>
            <div className="detail-fields">
              <div><Label htmlFor="draft-delivery">รายละเอียดจัดส่ง</Label><Textarea id="draft-delivery" className="min-h-24 bg-card" readOnly={!draft} value={order.deliveryDetails || ''} onChange={e => setOrder({ ...order, deliveryDetails: e.target.value })} placeholder={draft ? 'ที่อยู่ จุดรับสินค้า หรือผู้ติดต่อ' : 'ไม่ได้ระบุ'} /></div>
              <div><Label htmlFor="draft-note">หมายเหตุถึงแอดมิน</Label><Textarea id="draft-note" className="min-h-24 bg-card" readOnly={!draft} value={order.customerNote || ''} onChange={e => setOrder({ ...order, customerNote: e.target.value })} placeholder={draft ? 'เช่น วันที่ต้องการรับสินค้า' : 'ไม่มีหมายเหตุ'} /></div>
            </div>
          </fieldset>
        </div>

        <aside className="detail-sidebar">
          {order.status === 'need_information' && (
            <div className="panel action-panel">
              <h2>ตอบคำถามจากแอดมิน</h2>
              <OrderMessages messages={order.messages} />
              <form className="reply-form" onSubmit={sendReply}>
                <Label htmlFor="customer-reply">คำตอบของคุณ</Label>
                <Textarea id="customer-reply" value={reply} onChange={e => setReply(e.target.value)} maxLength={4000} rows="4" disabled={busy} />
                <Button disabled={busy || !reply.trim()}>{busy ? 'กำลังส่ง…' : 'ส่งคำตอบให้แอดมิน'}</Button>
                <small>เมื่อส่งแล้ว คำสั่งซื้อจะกลับเข้าคิวของแอดมินทันที</small>
              </form>
            </div>
          )}
          {draft && (
            <div className="panel action-panel">
              <h2>พร้อมส่งให้แอดมินหรือยัง?</h2>
              <p>ตรวจจำนวนและรายละเอียดจัดส่งก่อนส่ง หลังส่งแล้วจะแก้ไขรายการไม่ได้</p>
              <div className="action-buttons">
                <Button type="button" disabled={busy || !order.items.length} onClick={() => save(true)}>{busy ? 'กำลังบันทึก…' : 'ส่งให้แอดมินตรวจสอบ'}</Button>
                <Button type="button" variant="outline" disabled={busy || !order.items.length} onClick={() => save()}>บันทึกการแก้ไข</Button>
              </div>
            </div>
          )}
          {error && <p role="alert" className="form-error">{error}</p>}
          {notice && <p role="status" className="form-notice">{notice}</p>}
          <div className="panel"><OrderProgress order={order} /></div>
          {order.status !== 'need_information' && order.messages?.length > 0 && <div className="panel"><OrderMessages messages={order.messages} /></div>}
        </aside>
      </div>
    </section>
  );
}
