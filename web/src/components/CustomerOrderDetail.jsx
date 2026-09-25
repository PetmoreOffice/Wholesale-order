import React, { useState } from 'react';
import { apiFetch, apiUrl } from '../api/client.js';
import { statusText } from '../lib/orderStatus.js';
import { OrderMessages } from './OrderMessages.jsx';
import { OrderProgress } from './OrderProgress.jsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

  return (
    <section className="customer-detail" aria-label="รายละเอียดคำสั่งซื้อ">
      <header className="detail-header">
        <div>
          <p className="eyebrow">ORDER WORKSPACE</p>
          <div className="detail-title-row"><h1>{order.orderNumber}</h1><Badge variant="secondary" className={`status ${order.status}`}>{statusText[order.status] || order.status}</Badge></div>
          <p>ตรวจรายการสินค้า ติดตามผู้รับผิดชอบ และดำเนินการขั้นถัดไปในที่เดียว</p>
        </div>
        <Button type="button" variant="outline" className="secondary" onClick={onClose} disabled={busy}>กลับไปคำสั่งซื้อ</Button>
      </header>

      <div className="detail-layout">
        <Card className="detail-main-card">
          <div className="detail-card-heading"><div><p className="eyebrow">ORDER ITEMS</p><h2>รายการสินค้า</h2></div><span>{order.items.length} รายการ</span></div>
          <fieldset disabled={busy} className="detail-form">
            <legend className="sr-only">แก้ไขรายการคำสั่งซื้อ</legend>
            <div className="draft-items">
              {order.items.map(item => (
                <article className="draft-item" key={item.goodsId}>
                  <div><b>{item.name}</b><small>{item.sku} · {item.unitName}</small></div>
                  {draft ? <div className="item-editor"><Label htmlFor={`quantity-${item.goodsId}`}>จำนวน</Label><Input id={`quantity-${item.goodsId}`} aria-label={`จำนวน ${item.name}`} type="number" step="1" min={item.minimumOrder || 1} max={Number(item.maximumOrder) > 0 ? item.maximumOrder : undefined} value={item.quantity} onChange={e => setOrder(value => ({ ...value, items: value.items.map(row => row.goodsId === item.goodsId ? { ...row, quantity: e.target.value } : row) }))}/><Button type="button" variant="link" className="text-button" onClick={() => setOrder(value => ({ ...value, items: value.items.filter(row => row.goodsId !== item.goodsId) }))}>ลบ</Button></div> : <strong className="item-quantity">{item.quantity} {item.unitName}</strong>}
                </article>
              ))}
            </div>
            <div className="detail-fields">
              <div><Label htmlFor="draft-delivery">รายละเอียดจัดส่ง</Label><Textarea id="draft-delivery" readOnly={!draft} value={order.deliveryDetails || ''} onChange={e => setOrder({ ...order, deliveryDetails: e.target.value })} placeholder="ยังไม่ได้ระบุรายละเอียดจัดส่ง" /></div>
              <div><Label htmlFor="draft-note">หมายเหตุ</Label><Textarea id="draft-note" readOnly={!draft} value={order.customerNote || ''} onChange={e => setOrder({ ...order, customerNote: e.target.value })} placeholder="ไม่มีหมายเหตุเพิ่มเติม" /></div>
            </div>
          </fieldset>
        </Card>

        <aside className="detail-sidebar">
          <Card className="detail-status-card"><OrderProgress order={order} /></Card>
          {order.status === 'need_information' && (
            <Card className="detail-action-card">
              <p className="eyebrow">NEXT ACTION</p>
              <h2>แอดมินต้องการข้อมูลเพิ่ม</h2>
              <p>อ่านคำถามด้านล่างแล้วตอบกลับ คำสั่งซื้อจะกลับเข้าคิวของแอดมินทันที</p>
              <form className="reply-form" onSubmit={sendReply}>
                <Label htmlFor="customer-reply">ข้อมูลที่ส่งให้แอดมิน</Label>
                <Textarea id="customer-reply" value={reply} onChange={e => setReply(e.target.value)} maxLength={4000} rows="4" disabled={busy} />
                <Button className="primary" disabled={busy || !reply.trim()}>{busy ? 'กำลังส่ง…' : 'ส่งข้อมูลให้แอดมิน'}</Button>
              </form>
            </Card>
          )}
          {order.messages?.length > 0 && <Card className="detail-status-card"><OrderMessages messages={order.messages} /></Card>}
          {draft && <Card className="detail-action-card"><p className="eyebrow">NEXT ACTION</p><h2>พร้อมส่งให้แอดมินหรือยัง?</h2><p>ตรวจจำนวนสินค้าและข้อมูลจัดส่งก่อนส่งคำสั่งซื้อเข้าสู่คิวงาน</p><div className="detail-actions"><Button type="button" variant="outline" className="secondary" disabled={busy || !order.items.length} onClick={() => save()}>บันทึกการแก้ไข</Button><Button type="button" className="primary" disabled={busy || !order.items.length} onClick={() => save(true)}>{busy ? 'กำลังบันทึก…' : 'ส่งให้แอดมินตรวจสอบ'}</Button></div></Card>}
          {error && <p role="alert" className="form-error">{error}</p>}
          {notice && <p role="status" className="form-notice">{notice}</p>}
        </aside>
      </div>
    </section>
  );
}
