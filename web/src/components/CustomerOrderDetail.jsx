import React, { useState } from 'react';
import { apiFetch, apiUrl } from '../api/client.js';
import { statusText } from '../lib/orderStatus.js';
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
  const draft = order.status === 'draft';

  async function save(submit = false) {
    setBusy(true); setError(''); setNotice('');
    try {
      let response = await apiFetch(`${apiUrl}/orders/${order.orderId}/draft`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
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
                  {draft ? <div className="item-editor"><Label htmlFor={`quantity-${item.goodsId}`}>จำนวน</Label><Input id={`quantity-${item.goodsId}`} aria-label={`จำนวน ${item.name}`} type="number" min={item.minimumOrder || 1} value={item.quantity} onChange={e => setOrder(value => ({ ...value, items: value.items.map(row => row.goodsId === item.goodsId ? { ...row, quantity: e.target.value } : row) }))}/><Button type="button" variant="link" className="text-button" onClick={() => setOrder(value => ({ ...value, items: value.items.filter(row => row.goodsId !== item.goodsId) }))}>ลบ</Button></div> : <strong className="item-quantity">{item.quantity} {item.unitName}</strong>}
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
          {draft && <Card className="detail-action-card"><p className="eyebrow">NEXT ACTION</p><h2>พร้อมส่งให้แอดมินหรือยัง?</h2><p>ตรวจจำนวนสินค้าและข้อมูลจัดส่งก่อนส่งคำสั่งซื้อเข้าสู่คิวงาน</p><div className="detail-actions"><Button type="button" variant="outline" className="secondary" disabled={busy || !order.items.length} onClick={() => save()}>บันทึกการแก้ไข</Button><Button type="button" className="primary" disabled={busy || !order.items.length} onClick={() => save(true)}>{busy ? 'กำลังบันทึก…' : 'ส่งให้แอดมินตรวจสอบ'}</Button></div></Card>}
          {error && <p role="alert" className="form-error">{error}</p>}
          {notice && <p role="status" className="form-notice">{notice}</p>}
        </aside>
      </div>
    </section>
  );
}
