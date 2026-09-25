import React, { useState } from 'react';
import { apiFetch, apiUrl } from '../../api/client.js';
import { count } from '../../lib/format.js';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function OrderReview({ items, onClose, accountName, onSaved, role = 'customer' }) {
  const assisted = role === 'admin';
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('phone');
  const [lookingUp, setLookingUp] = useState(false);
  const [saved, setSaved] = useState(false);
  const customerName = accountName;
  const [note, setNote] = useState('');
  const [delivery, setDelivery] = useState('');
  const [order, setOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function lookupCustomer() {
    setLookingUp(true); setCustomer(null); setSaveError('');
    try {
      const response = await apiFetch(`${apiUrl}/orders/admin/customer?email=${encodeURIComponent(email.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setCustomer(data.data);
    } catch (err) { setSaveError(err.message || 'ค้นหาลูกค้าไม่สำเร็จ'); }
    finally { setLookingUp(false); }
  }

  async function saveDraft(submit = false) {
    if (saving || (assisted && !customer)) return;
    setSaving(true);
    setSaveError('');
    try {
      const response = await apiFetch(`${apiUrl}/orders/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerId: assisted ? customer.uid : undefined,
          orderSource: assisted ? source : undefined,
          submit,
          deliveryDetails: delivery,
          customerNote: note,
          items: items.map(item => ({ goodsId: item.goodsId, quantity: item.quantity }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'บันทึกร่างไม่สำเร็จ');
      setOrder(data.data);
      setSaved(true);
      onSaved?.();
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
    <Dialog className="review" labelledBy="review-title" locked={saving || lookingUp} onClose={onClose}>
        <button type="button" className="icon-button close" disabled={saving || lookingUp} onClick={onClose} aria-label="ปิดหน้าตรวจสอบคำสั่งซื้อ"><X aria-hidden="true" /></button>
        <DialogTitle id="review-title">ตรวจสอบคำสั่งซื้อ</DialogTitle>
        <p className="dialog-intro">{assisted ? 'เลือกลูกค้าที่ฝากสั่งและตรวจรายการก่อนยืนยัน' : 'ตรวจรายการก่อนยืนยันสั่งซื้อ หรือบันทึกร่างไว้ทำต่อ'}</p>
        <ul className="review-list">
          {(order?.items || items).map(item => (
            <li key={item.goodsId}>
              <div>
                <b>{item.name}</b>
                <small className="sku">{item.sku}</small>
              </div>
              <strong className="num">{count.format(item.quantity)} <small>{item.unitName}</small></strong>
            </li>
          ))}
        </ul>
        {assisted && <fieldset disabled={saving || lookingUp || !!order} className="assisted-customer">
          <legend>สั่งซื้อแทนลูกค้า</legend>
          <Label htmlFor="assisted-email">อีเมลบัญชีลูกค้า</Label>
          <Input id="assisted-email" type="email" value={email} onChange={event => { setEmail(event.target.value); setCustomer(null); }} />
          <Button type="button" variant="outline" onClick={lookupCustomer} disabled={!email.trim() || lookingUp}>{lookingUp ? 'กำลังค้นหา…' : 'ค้นหาลูกค้า'}</Button>
          {customer && <p className="form-notice" role="status">ลูกค้าที่เลือก: <b>{customer.name}</b> · {customer.email}</p>}
          <Label htmlFor="order-source">ช่องทางรับคำสั่งซื้อ</Label>
          <select id="order-source" className="select" value={source} onChange={event => setSource(event.target.value)}><option value="phone">ลูกค้าโทรมาสั่ง</option><option value="assisted">ลูกค้าฝากสั่ง</option></select>
        </fieldset>}
        <Label htmlFor="customer-name">{assisted ? 'Admin ผู้สั่งแทน' : 'บัญชีผู้สั่งซื้อ'}</Label>
        <Input id="customer-name" value={customerName} readOnly />
        <Label htmlFor="delivery">ที่อยู่หรือรายละเอียดการจัดส่ง</Label>
        <Textarea id="delivery" readOnly={!!order || saving} value={delivery} onChange={event => setDelivery(event.target.value)} placeholder="ระบุที่อยู่ จุดรับสินค้า หรือผู้ติดต่อ" rows="3" />
        <Label htmlFor="note">หมายเหตุถึงแอดมิน</Label>
        <Textarea id="note" readOnly={!!order || saving} value={note} onChange={event => setNote(event.target.value)} placeholder="เช่น วันที่ต้องการรับสินค้า หรือคำขอเพิ่มเติม" rows="3" />
        <div className="callout" data-tone="attention">
          <b>ราคาสุทธิยืนยันภายหลัง</b>
          <span>แอดมินจะยืนยันราคาตามบัญชีของคุณหลังตรวจคำสั่งซื้อ</span>
        </div>
        {saved && <p className="form-notice" role="status">{order.status === 'draft' ? 'บันทึกร่างแล้ว' : 'ส่งคำสั่งซื้อให้แอดมินตรวจสอบแล้ว'} · <span className="num">{order.orderNumber}</span></p>}
        {saveError && <p className="form-error" role="alert">{saveError}</p>}
        <div className="review-actions">
          <Button type="button" variant="outline" disabled={saving || lookingUp} onClick={order ? () => navigate(`${assisted ? '/admin/orders' : '/orders'}/${order.orderId}`) : onClose}>{order ? 'เปิดดูคำสั่งซื้อนี้' : 'กลับไปแก้ไข'}</Button>
          {!order && !assisted && <Button type="button" variant="outline" onClick={() => saveDraft(false)} disabled={saving}>บันทึกร่าง</Button>}
          {!order && <Button type="button" onClick={() => saveDraft(true)} disabled={saving || lookingUp || (assisted && !customer)}>{saving ? 'กำลังบันทึก…' : assisted ? 'ยืนยันสั่งซื้อแทนลูกค้า' : 'ยืนยันสั่งซื้อ'}</Button>}
          {order?.status === 'draft' && <Button type="button" onClick={submitOrder} disabled={saving}>{saving ? 'กำลังส่ง…' : 'ส่งให้แอดมินตรวจสอบ'}</Button>}
        </div>
    </Dialog>
  );
}
