import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Ban, RotateCcw, ShoppingCart, Trash2 } from 'lucide-react';
import { apiFetch, apiUrl } from '../api/client.js';
import { useSession } from '../context/session.js';
import { reorderIntoCart } from '../lib/cart.js';
import { count, dateTime } from '../lib/format.js';
import { customerCancellable, customerNextStep } from '../lib/orderStatus.js';
import { OrderMessages } from './OrderMessages.jsx';
import { OrderProgress } from './OrderProgress.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function CustomerOrderDetail({ initialOrder, onChanged, onClose }) {
  const [order, setOrder] = useState(initialOrder);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reply, setReply] = useState('');
  // 'delete' | 'cancel' while a confirmation is open.
  const [confirming, setConfirming] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const session = useSession();
  const navigate = useNavigate();
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

  async function reorder() {
    setBusy(true); setError(''); setNotice('');
    try {
      const summary = await reorderIntoCart(session.uid, order.orderId);
      navigate('/catalog', { state: { notice: summary } });
    } catch (err) { setError(err.message); setBusy(false); }
  }

  async function deleteDraft() {
    const response = await apiFetch(`${apiUrl}/orders/${order.orderId}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'ลบร่างไม่สำเร็จ');
  }

  async function removeDraft() {
    setBusy(true); setError(''); setNotice('');
    try {
      await deleteDraft();
      onChanged();
      navigate('/orders', { replace: true });
    } catch (err) { setError(err.message); setBusy(false); setConfirming(null); }
  }

  // Adding or swapping products happens in the catalog: the draft's lines go back into the
  // cart (checked against today's catalog) and the draft itself is removed.
  async function moveToCart() {
    setBusy(true); setError(''); setNotice('');
    try {
      const summary = await reorderIntoCart(session.uid, order.orderId);
      await deleteDraft();
      navigate('/catalog', { state: { notice: summary.replace(/^เพิ่ม/, 'ย้ายร่าง: เพิ่ม') } });
    } catch (err) { setError(err.message); setBusy(false); }
  }

  async function cancelOrder() {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await apiFetch(`${apiUrl}/orders/${order.orderId}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: cancelReason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'ยกเลิกไม่สำเร็จ');
      setOrder(data.data);
      setNotice('ยกเลิกคำสั่งซื้อแล้ว แอดมินจะได้รับแจ้ง');
      onChanged();
    } catch (err) { setError(err.message); } finally { setBusy(false); setConfirming(null); setCancelReason(''); }
  }

  function setQuantity(goodsId, quantity) {
    setOrder(value => ({ ...value, items: value.items.map(row => row.goodsId === goodsId ? { ...row, quantity } : row) }));
  }

  return (
    <section className="order-detail" aria-label="รายละเอียดคำสั่งซื้อ">
      <button type="button" className="back-link" onClick={onClose} disabled={busy}><ArrowLeft aria-hidden="true" /> คำสั่งซื้อของฉัน</button>
      <header className="detail-header">
        <div>
          <div className="detail-title-row"><h1 className="num">{order.orderNumber}</h1><StatusBadge status={order.status} /></div>
          <p>สร้างเมื่อ {dateTime(order.createdAt)} · อัปเดตล่าสุด {dateTime(order.updatedAt)}</p>
        </div>
        {!draft && <Button type="button" variant={['completed', 'rejected', 'cancelled'].includes(order.status) ? 'default' : 'outline'} disabled={busy} onClick={reorder}><RotateCcw aria-hidden="true" /> สั่งซ้ำ</Button>}
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
              <div className="secondary-actions">
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={moveToCart}><ShoppingCart aria-hidden="true" /> เพิ่มหรือเปลี่ยนสินค้าในตะกร้า</Button>
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => setConfirming('delete')}><Trash2 aria-hidden="true" /> ลบร่าง</Button>
              </div>
            </div>
          )}
          {customerCancellable.includes(order.status) && (
            <div className="panel quiet-panel">
              <h2>ต้องการยกเลิก?</h2>
              <p>ยกเลิกได้จนกว่าแอดมินจะอนุมัติ หลังอนุมัติแล้วกรุณาติดต่อแอดมิน</p>
              <Button type="button" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy} onClick={() => setConfirming('cancel')}><Ban aria-hidden="true" /> ยกเลิกคำสั่งซื้อ</Button>
            </div>
          )}
          {error && <p role="alert" className="form-error">{error}</p>}
          {notice && <p role="status" className="form-notice">{notice}</p>}
          <div className="panel"><OrderProgress order={order} /></div>
          {order.status !== 'need_information' && order.messages?.length > 0 && <div className="panel"><OrderMessages messages={order.messages} /></div>}
        </aside>
      </div>
      {confirming === 'delete' && (
        <Dialog className="review confirm-dialog" labelledBy="delete-title" locked={busy} onClose={() => setConfirming(null)}>
          <DialogTitle id="delete-title">ลบร่าง {order.orderNumber}?</DialogTitle>
          <p className="dialog-intro">ร่างนี้ยังไม่ได้ส่งให้แอดมิน เมื่อลบแล้วจะกู้คืนไม่ได้</p>
          <div className="review-actions">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirming(null)}>เก็บไว้</Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={removeDraft}>{busy ? 'กำลังลบ…' : 'ลบร่าง'}</Button>
          </div>
        </Dialog>
      )}
      {confirming === 'cancel' && (
        <Dialog className="review confirm-dialog" labelledBy="cancel-title" locked={busy} onClose={() => setConfirming(null)}>
          <DialogTitle id="cancel-title">ยกเลิกคำสั่งซื้อ {order.orderNumber}?</DialogTitle>
          <p className="dialog-intro">แอดมินจะได้รับแจ้งทันที และคำสั่งซื้อนี้จะดำเนินการต่อไม่ได้ หากต้องการสั่งใหม่ใช้ “สั่งซ้ำ” ได้</p>
          <Label htmlFor="cancel-reason">เหตุผล (ไม่บังคับ)</Label>
          <Textarea id="cancel-reason" value={cancelReason} onChange={event => setCancelReason(event.target.value)} maxLength={4000} rows="3" placeholder="เช่น สั่งผิดรายการ หรือไม่ต้องการสินค้าแล้ว" disabled={busy} />
          <div className="review-actions">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirming(null)}>ไม่ยกเลิก</Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={cancelOrder}>{busy ? 'กำลังยกเลิก…' : 'ยกเลิกคำสั่งซื้อ'}</Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
