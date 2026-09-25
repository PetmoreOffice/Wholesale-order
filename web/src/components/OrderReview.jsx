import React, { useState } from 'react';
import { apiFetch, apiUrl } from '../api/client.js';

export function OrderReview({ items, onClose, accountName }) {
  const [saved, setSaved] = useState(false);
  const customerName = accountName;
  const [note, setNote] = useState('');
  const [delivery, setDelivery] = useState('');
  const [order, setOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function saveDraft() {
    setSaving(true);
    setSaveError('');
    try {
      const response = await apiFetch(`${apiUrl}/orders/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          deliveryDetails: delivery,
          customerNote: note,
          items: items.map(item => ({ goodsId: item.goodsId, quantity: item.quantity }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'บันทึกร่างไม่สำเร็จ');
      localStorage.setItem('wholesale-order-draft', JSON.stringify({ items, note, delivery, savedAt: new Date().toISOString() }));
      localStorage.setItem('wholesale-customer-name', customerName);
      setOrder(data.data);
      setSaved(true);
    } catch (error) {
      setSaveError(error.message || 'บันทึกร่างไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function submitOrder() {
    if (!order) return;
    setSaving(true);
    setSaveError('');
    try {
      const response = await apiFetch(`${apiUrl}/orders/${order.orderId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'ส่งคำสั่งซื้อไม่สำเร็จ');
      setOrder(current => ({ ...current, ...data.data }));
    } catch (error) {
      setSaveError(error.message || 'ส่งคำสั่งซื้อไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="review" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <button className="close" onClick={onClose} aria-label="ปิดหน้าตรวจสอบคำสั่งซื้อ">×</button>
        <p className="eyebrow">ORDER DRAFT</p>
        <h2 id="review-title">ตรวจสอบรายการ</h2>
        <p className="review-intro">ตรวจรายการและบันทึกร่างไว้ก่อนส่งคำสั่งซื้อ</p>
        <ul className="review-list">
          {items.map(item => (
            <li key={item.goodsId}>
              <div>
                <b>{item.name}</b>
                <small>{item.sku} · {item.unitName}</small>
              </div>
              <strong>{item.quantity}</strong>
            </li>
          ))}
        </ul>
        <label htmlFor="customer-name">บัญชีผู้สั่งซื้อ</label>
        <input id="customer-name" value={customerName} readOnly />
        <label htmlFor="delivery">ที่อยู่หรือรายละเอียดการจัดส่ง</label>
        <textarea id="delivery" value={delivery} onChange={event => setDelivery(event.target.value)} placeholder="ระบุที่อยู่ จุดรับสินค้า หรือผู้ติดต่อ" rows="3" />
        <label htmlFor="note">หมายเหตุถึงแอดมิน</label>
        <textarea id="note" value={note} onChange={event => setNote(event.target.value)} placeholder="เช่น วันที่ต้องการรับสินค้า หรือคำขอเพิ่มเติม" rows="3" />
        <div className="price-pending">
          <b>ราคาสุทธิจะยืนยันภายหลัง</b>
          <span>กำลังรอเชื่อมตารางราคาตามลูกค้า</span>
        </div>
        {saved && <p className="saved" role="status">บันทึกร่างแล้ว: {order.orderNumber}</p>}
        {order?.status === 'submitted' && <p className="saved" role="status">ส่งคำสั่งซื้อให้แอดมินตรวจสอบแล้ว</p>}
        {saveError && <p className="form-error" role="alert">{saveError}</p>}
        <div className="review-actions">
          <button className="secondary" onClick={onClose}>กลับไปแก้ไข</button>
          {!order && <button className="primary" onClick={saveDraft} disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกร่าง'}</button>}
          {order?.status === 'draft' && <button className="primary" onClick={submitOrder} disabled={saving}>{saving ? 'กำลังส่ง…' : 'ส่งให้แอดมินตรวจสอบ'}</button>}
        </div>
      </section>
    </div>
  );
}
