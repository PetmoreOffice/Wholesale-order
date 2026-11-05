import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { api } from '@/lib/api';
import { count } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Overlay } from './Overlay.jsx';

const labelClass = 'text-[15px] font-bold text-ink';
const fieldClass = 'bg-panel text-[15px] md:text-[15px]';

/**
 * Review before saving. Customers add delivery details and a note, then save a draft or
 * submit. Admins place an assisted order for a customer found by account email.
 */
export function OrderReview({ items, accountName, role, onSaved, onClose }) {
  const assisted = role === 'admin';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [customer, setCustomer] = useState(null);
  const [source, setSource] = useState('phone');
  const [lookingUp, setLookingUp] = useState(false);
  const [delivery, setDelivery] = useState('');
  const [note, setNote] = useState('');
  const [order, setOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const busy = saving || lookingUp;

  // Start from the address an admin saved on the customer's profile; the customer can still edit it.
  useEffect(() => {
    if (assisted) return undefined;
    let active = true;
    api('/profile')
      .then(data => { if (active && data?.data?.address) setDelivery(current => current || data.data.address); })
      .catch(() => { /* the address stays empty and can be typed */ });
    return () => { active = false; };
  }, [assisted]);

  async function lookupCustomer(event) {
    event?.preventDefault();
    if (!email.trim() || lookingUp) return;
    setLookingUp(true); setCustomer(null); setSaveError('');
    try {
      const data = await api(`/orders/admin/customer?email=${encodeURIComponent(email.trim())}`);
      setCustomer(data.data);
    } catch (error) {
      setSaveError(error.message || 'ค้นหาลูกค้าไม่สำเร็จ');
    } finally {
      setLookingUp(false);
    }
  }

  async function save(submit) {
    if (saving || (assisted && !customer)) return;
    setSaving(true);
    setSaveError('');
    try {
      const data = await api('/orders/drafts', {
        body: {
          customerName: accountName,
          customerId: assisted ? customer.uid : undefined,
          orderSource: assisted ? source : undefined,
          submit,
          deliveryDetails: delivery,
          customerNote: note,
          items: items.map(item => ({ goodsId: item.goodsId, quantity: item.quantity }))
        }
      });
      setOrder(data.data);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onSaved?.();
    } catch (error) {
      setSaveError(error.message || 'บันทึกร่างไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function submitDraft() {
    if (!order || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const data = await api(`/orders/${order.orderId}/submit`, { body: { customerName: accountName } });
      setOrder(current => ({ ...current, ...data.data }));
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (error) {
      setSaveError(error.message || 'ส่งคำสั่งซื้อไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <>
      <Button type="button" variant="outline" size="lg" disabled={busy} onClick={order ? () => navigate(`${assisted ? '/admin/orders' : '/orders'}/${order.orderId}`) : onClose}>
        {order ? 'เปิดดูคำสั่งซื้อนี้' : 'กลับไปแก้ไข'}
      </Button>
      {!order && !assisted && <Button type="button" variant="outline" size="lg" disabled={saving} onClick={() => save(false)}>บันทึกร่าง</Button>}
      {!order && (
        <Button type="button" size="lg" className="font-bold" disabled={busy || (assisted && !customer)} onClick={() => save(true)}>
          {saving ? 'กำลังบันทึก…' : assisted ? 'ยืนยันสั่งซื้อแทนลูกค้า' : 'ยืนยันสั่งซื้อ'}
        </Button>
      )}
      {order?.status === 'draft' && <Button type="button" size="lg" className="font-bold" disabled={saving} onClick={submitDraft}>{saving ? 'กำลังส่ง…' : 'ส่งให้แอดมินตรวจสอบ'}</Button>}
    </>
  );

  const lines = order?.items || items;
  return (
    <Overlay
      wide
      title="ตรวจสอบคำสั่งซื้อ"
      description={assisted ? 'เลือกลูกค้าที่ฝากสั่งและตรวจรายการก่อนยืนยัน' : 'ตรวจรายการก่อนยืนยันสั่งซื้อ หรือบันทึกร่างไว้ทำต่อ'}
      onClose={onClose}
      locked={busy}
      closeLabel="ปิดหน้าตรวจสอบคำสั่งซื้อ"
      footer={footer}
    >
      <div className="grid gap-5">
        <section aria-labelledby="review-lines">
          <h3 id="review-lines" className="mb-2 text-[17px] font-bold">รายการสินค้า <span className="num text-[15px] font-semibold text-ink-2">{count.format(lines.length)} รายการ</span></h3>
          <ul className="max-h-64 overflow-y-auto rounded-lg border border-line">
            {lines.map(item => (
              <li key={item.goodsId} className="flex items-baseline justify-between gap-3 border-b border-line px-3.5 py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="text-[15px] leading-snug font-semibold">{item.name}</p>
                  <span className="sku">{item.sku}</span>
                </div>
                <p className="shrink-0 text-[15px]"><b className="num text-[17px] font-bold">{count.format(item.quantity)}</b> <span className="text-ink-2">{item.unitName}</span></p>
              </li>
            ))}
          </ul>
        </section>

        {assisted && (
          <fieldset disabled={busy || Boolean(order)} className="grid gap-3 rounded-lg bg-sunken p-4">
            <legend className="float-left mb-1 text-[17px] font-bold">สั่งซื้อแทนลูกค้า</legend>
            <form onSubmit={lookupCustomer} className="clear-both grid gap-1.5">
              <label htmlFor="assisted-email" className={labelClass}>อีเมลบัญชีลูกค้า</label>
              <div className="flex gap-2">
                <Input id="assisted-email" type="email" autoComplete="off" value={email} onChange={event => { setEmail(event.target.value); setCustomer(null); }} className={`h-11 ${fieldClass}`} />
                <Button type="submit" variant="outline" size="lg" className="h-11" disabled={!email.trim() || lookingUp}>{lookingUp ? 'กำลังค้นหา…' : 'ค้นหาลูกค้า'}</Button>
              </div>
            </form>
            {customer && <p role="status" className="rounded-md bg-brand-tint px-3 py-2 text-[15px] text-brand-deep">ลูกค้าที่เลือก: <b>{customer.name}</b> · {customer.email}</p>}
            <div className="grid gap-2">
              <span id="order-source" className={labelClass}>ช่องทางรับคำสั่งซื้อ</span>
              <RadioGroup aria-labelledby="order-source" value={source} onValueChange={setSource} className="flex flex-wrap gap-x-6 gap-y-2">
                {[['phone', 'ลูกค้าโทรมาสั่ง'], ['assisted', 'ลูกค้าฝากสั่ง']].map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-[15px]"><RadioGroupItem value={value} /> {label}</label>
                ))}
              </RadioGroup>
            </div>
          </fieldset>
        )}

        <div className="grid gap-1.5">
          <label htmlFor="customer-name" className={labelClass}>{assisted ? 'แอดมินผู้สั่งแทน' : 'บัญชีผู้สั่งซื้อ'}</label>
          <Input id="customer-name" value={accountName} readOnly className={`h-11 bg-sunken ${fieldClass}`} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="delivery" className={labelClass}>ที่อยู่หรือรายละเอียดการจัดส่ง</label>
          <Textarea id="delivery" rows={3} readOnly={Boolean(order) || saving} value={delivery} onChange={event => setDelivery(event.target.value)} placeholder="ระบุที่อยู่ จุดรับสินค้า หรือผู้ติดต่อ" className={fieldClass} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="note" className={labelClass}>หมายเหตุถึงแอดมิน</label>
          <Textarea id="note" rows={3} readOnly={Boolean(order) || saving} value={note} onChange={event => setNote(event.target.value)} placeholder="เช่น วันที่ต้องการรับสินค้า หรือคำขอเพิ่มเติม" className={fieldClass} />
        </div>

        <div className="flex gap-3 rounded-lg bg-info-soft px-4 py-3 text-info">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p className="text-[15px]"><b>แอดมินจะตรวจคำสั่งซื้อก่อนดำเนินการ</b><br /><span className="text-ink-2">หากต้องการข้อมูลเพิ่ม แอดมินจะแจ้งในหน้าคำสั่งซื้อนี้</span></p>
        </div>

        {order && (
          <p role="status" className="rounded-lg bg-brand-tint px-4 py-3 text-[15px] font-semibold text-brand-deep">
            {order.status === 'draft' ? 'บันทึกร่างแล้ว' : 'ส่งคำสั่งซื้อให้แอดมินตรวจสอบแล้ว'} · <span className="num">{order.orderNumber}</span>
          </p>
        )}
        {saveError && <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-[15px] text-danger">{saveError}</p>}
      </div>
    </Overlay>
  );
}
