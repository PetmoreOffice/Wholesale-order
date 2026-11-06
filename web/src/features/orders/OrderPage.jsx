import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Ban, RotateCcw, Send, ShoppingCart, Trash2 } from 'lucide-react';
import { closedStatuses, customerCancellable } from '@shared/orderWorkflow.js';
import { api } from '@/lib/api';
import { reorderIntoCart } from '@/lib/cart';
import { count, dateTime, timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { PageHeader, StateBlock } from '@/components/PageHeader';
import { PawRoute } from '@/components/route/PawRoute';
import { NextStepTag } from '@/components/route/NextStepTag';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { orderQuery } from './queries.js';
import { MessageList, OrderHistory } from './OrderThread.jsx';

const panel = 'rounded-xl border border-line bg-panel px-4 py-4 sm:px-5';
const sectionTitle = 'text-[17px] font-bold text-ink';
const field = 'bg-panel text-[15px] md:text-[15px]';
// The phone bottom nav is 76px tall; sticky actions sit right above it.
const aboveNav = { bottom: 'calc(76px + env(safe-area-inset-bottom))' };

const editable = (order) => ({
  items: order.items.map(item => ({ ...item })),
  deliveryDetails: order.deliveryDetails || '',
  customerNote: order.customerNote || ''
});

/** Why a draft quantity cannot be saved, or nothing when it is within the product's limits. */
function quantityProblem(item) {
  const quantity = Number(item.quantity);
  const minimum = Number(item.minimumOrder) || 1;
  const maximum = Number(item.maximumOrder) > 0 ? Number(item.maximumOrder) : null;
  if (item.quantity === '' || !Number.isInteger(quantity)) return 'กรุณาใส่จำนวนเต็ม';
  if (quantity < minimum) return `สั่งขั้นต่ำ ${count.format(minimum)} ${item.unitName}`;
  if (maximum && quantity > maximum) return `สั่งได้สูงสุด ${count.format(maximum)} ${item.unitName}`;
  return null;
}

function limitsText(item) {
  const minimum = Number(item.minimumOrder) || 1;
  const maximum = Number(item.maximumOrder) > 0 ? Number(item.maximumOrder) : null;
  return maximum ? `ขั้นต่ำ ${count.format(minimum)} · สูงสุด ${count.format(maximum)}` : `ขั้นต่ำ ${count.format(minimum)}`;
}

function StickyAction({ children }) {
  return (
    <div style={aboveNav} className="fixed inset-x-0 z-20 border-t border-line bg-panel px-4 py-3 shadow-lift lg:hidden">
      <div className="mx-auto grid max-w-[720px]">{children}</div>
    </div>
  );
}

/** Items in the order; editable quantities while it is still a draft. */
function ItemsPanel({ order, draft, edits, setEdits, busy }) {
  const items = draft ? edits.items : order.items;
  const update = (change) => setEdits(value => ({ ...value, items: change(value.items) }));
  return (
    <section aria-labelledby="items-title" className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2 id="items-title" className={sectionTitle}>รายการสินค้า</h2>
        <span className="text-[15px] text-ink-2"><span className="num font-bold text-ink">{count.format(items.length)}</span> รายการ</span>
      </div>
      {items.length === 0 ? (
        <StateBlock title="ร่างนี้ไม่มีสินค้า" action={<Button asChild variant="outline"><Link to="/catalog">ไปเลือกสินค้า</Link></Button>}>ร่างต้องมีสินค้าอย่างน้อย 1 รายการจึงจะส่งได้</StateBlock>
      ) : (
        <ul>
          {items.map(item => {
            const problem = draft ? quantityProblem(item) : null;
            return (
              <li key={item.goodsId} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 border-b border-line px-4 py-3.5 last:border-0 sm:px-5">
                <div className="min-w-0">
                  <p className="text-[15px] leading-snug font-semibold text-ink">{item.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[13px] text-ink-3">
                    <span className="sku">{item.sku}</span>
                    {item.unitQuantity > 1 && <span>บรรจุ <span className="num">{count.format(item.unitQuantity)}</span> ต่อ{item.unitName}</span>}
                  </p>
                </div>
                {draft ? (
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`quantity-${item.goodsId}`} className="sr-only">จำนวน {item.name}</Label>
                    <Input
                      id={`quantity-${item.goodsId}`}
                      className={cn('num h-11 w-20 text-right sm:h-10', field)}
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min={Number(item.minimumOrder) || 1}
                      max={Number(item.maximumOrder) > 0 ? item.maximumOrder : undefined}
                      value={item.quantity}
                      disabled={busy}
                      aria-invalid={problem ? true : undefined}
                      aria-describedby={`limits-${item.goodsId}`}
                      onChange={event => update(rows => rows.map(row => row.goodsId === item.goodsId ? { ...row, quantity: event.target.value } : row))}
                    />
                    <span className="w-9 text-[15px] text-ink-2">{item.unitName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      disabled={busy}
                      aria-label={`ลบ ${item.name}`}
                      className="text-danger hover:bg-danger-soft hover:text-danger"
                      onClick={() => update(rows => rows.filter(row => row.goodsId !== item.goodsId))}
                    >
                      <Trash2 aria-hidden="true" className="size-5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-right text-[15px] whitespace-nowrap text-ink-2"><span className="num text-[17px] font-bold text-ink">{count.format(item.quantity)}</span> {item.unitName}</p>
                )}
                {draft && (
                  <p id={`limits-${item.goodsId}`} className={cn('col-span-2 text-[13px]', problem ? 'font-semibold text-danger' : 'text-ink-3')}>
                    {problem || <span className="num">{limitsText(item)}</span>}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Delivery details, note and who handles the order; the two texts are editable on a draft. */
function FactsPanel({ order, draft, edits, setEdits, busy }) {
  const facts = [
    ['สร้างเมื่อ', <span className="num">{dateTime(order.createdAt)}</span>],
    ['อัปเดตล่าสุด', <span className="num">{dateTime(order.updatedAt)}</span>],
    order.assignedAdminName && ['ผู้รับผิดชอบ', order.assignedAdminName],
    order.createdByRole === 'admin' && ['สั่งแทนโดย', `${order.createdByName} · ${order.orderSource === 'phone' ? 'ลูกค้าโทรมาสั่ง' : 'ลูกค้าฝากสั่ง'}`]
  ].filter(Boolean);
  return (
    <section aria-labelledby="facts-title" className={cn(panel, 'grid gap-4')}>
      <h2 id="facts-title" className={sectionTitle}>การจัดส่งและข้อมูลคำสั่งซื้อ</h2>
      {draft ? (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="draft-delivery" className="text-[15px] font-semibold">รายละเอียดจัดส่ง</Label>
            <Textarea id="draft-delivery" className={cn('min-h-20', field)} disabled={busy} value={edits.deliveryDetails} onChange={event => setEdits(value => ({ ...value, deliveryDetails: event.target.value }))} placeholder="ที่อยู่ จุดรับสินค้า หรือผู้ติดต่อ" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="draft-note" className="text-[15px] font-semibold">หมายเหตุถึงแอดมิน</Label>
            <Textarea id="draft-note" className={cn('min-h-20', field)} disabled={busy} value={edits.customerNote} onChange={event => setEdits(value => ({ ...value, customerNote: event.target.value }))} placeholder="เช่น วันที่ต้องการรับสินค้า" />
          </div>
        </>
      ) : (
        <dl className="grid gap-3">
          <div>
            <dt className="text-[13px] font-semibold text-ink-3">รายละเอียดจัดส่ง</dt>
            <dd className={cn('text-[15px] whitespace-pre-line', order.deliveryDetails ? 'text-ink' : 'text-ink-3')}>{order.deliveryDetails || 'ไม่ได้ระบุ'}</dd>
          </div>
          <div>
            <dt className="text-[13px] font-semibold text-ink-3">หมายเหตุถึงแอดมิน</dt>
            <dd className={cn('text-[15px] whitespace-pre-line', order.customerNote ? 'text-ink' : 'text-ink-3')}>{order.customerNote || 'ไม่มีหมายเหตุ'}</dd>
          </div>
        </dl>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line pt-4 text-[15px]">
        {facts.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt className="text-ink-3">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </React.Fragment>
        ))}
      </dl>
    </section>
  );
}

function OrderView({ order }) {
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState('');
  // null while the customer has not touched the draft: the saved order is shown as is.
  const [changes, setChanges] = useState(null);
  // 'delete' | 'cancel' while an inline confirmation is open.
  const [confirming, setConfirming] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const draft = order.status === 'draft';
  const closed = closedStatuses.includes(order.status);
  const edits = changes ?? editable(order);
  const setEdits = (change) => setChanges(value => change(value ?? editable(order)));
  const problems = draft ? edits.items.filter(quantityProblem) : [];
  const detailKey = orderQuery(order.orderId).queryKey;

  const mutation = useMutation({
    mutationFn: ({ run }) => run(),
    onMutate: () => setError(''),
    onSuccess: (result, { done }) => done?.(result),
    onError: (err) => setError(err.message || 'ทำรายการไม่สำเร็จ'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['orders'] })
  });
  const busy = mutation.isPending;
  const act = (run, done) => mutation.mutate({ run, done });

  function saveDraft(submit) {
    if (!edits.items.length) { setError('ร่างต้องมีสินค้าอย่างน้อย 1 รายการ'); return; }
    if (problems.length) { setError('กรุณาแก้จำนวนสินค้าที่ไม่อยู่ในช่วงที่สั่งได้'); return; }
    act(async () => {
      const saved = await api(`/orders/${order.orderId}/draft`, {
        method: 'PATCH',
        body: {
          items: edits.items.map(item => ({ goodsId: item.goodsId, quantity: Number(item.quantity) })),
          deliveryDetails: edits.deliveryDetails,
          customerNote: edits.customerNote
        }
      });
      if (saved?.data) queryClient.setQueryData(detailKey, saved.data);
      if (submit) await api(`/orders/${order.orderId}/submit`, { method: 'POST' });
    }, () => {
      setChanges(null);
      toast.success(submit ? 'ส่งคำสั่งซื้อให้แอดมินตรวจสอบแล้ว' : 'บันทึกการแก้ไขแล้ว');
    });
  }

  function sendReply(event) {
    event.preventDefault();
    if (!reply.trim()) { setReplyError('กรุณาพิมพ์ข้อมูลที่ต้องการส่งให้แอดมิน'); return; }
    setReplyError('');
    act(() => api(`/orders/${order.orderId}/reply`, { body: { message: reply } }), (result) => {
      if (result?.data) queryClient.setQueryData(detailKey, result.data);
      setReply('');
      toast.success('ส่งข้อมูลให้แอดมินแล้ว คำสั่งซื้อกลับเข้าคิวของแอดมิน');
    });
  }

  function cancelOrder() {
    act(() => api(`/orders/${order.orderId}/cancel`, { body: { reason: cancelReason } }), (result) => {
      if (result?.data) queryClient.setQueryData(detailKey, result.data);
      setConfirming(null);
      setCancelReason('');
      toast.success('ยกเลิกคำสั่งซื้อแล้ว แอดมินจะได้รับแจ้ง');
    });
  }

  function removeDraft() {
    act(() => api(`/orders/${order.orderId}`, { method: 'DELETE' }), () => {
      queryClient.removeQueries({ queryKey: detailKey });
      toast.success('ลบร่างคำสั่งซื้อแล้ว');
      navigate('/orders', { replace: true });
    });
  }

  function reorder() {
    act(() => reorderIntoCart(session.uid, order.orderId), (summary) => navigate('/catalog', { state: { notice: summary } }));
  }

  // Adding or swapping products happens in the catalog: the draft's lines go back into the
  // cart (checked against today's catalog) and the draft itself is removed.
  function moveToCart() {
    act(async () => {
      const summary = await reorderIntoCart(session.uid, order.orderId);
      await api(`/orders/${order.orderId}`, { method: 'DELETE' });
      return summary.replace(/^เพิ่ม/, 'ย้ายร่าง: เพิ่ม');
    }, (summary) => {
      queryClient.removeQueries({ queryKey: detailKey });
      navigate('/catalog', { state: { notice: summary } });
    });
  }

  const adminMessages = (order.messages || []).filter(entry => entry.senderRole === 'admin');
  const exitEntry = order.history?.find(entry => entry.toStatus === order.status);
  const closingReason = order.status === 'rejected' ? (adminMessages.at(-1)?.messageBody || exitEntry?.message) : order.status === 'cancelled' ? exitEntry?.message : null;
  const sticky = draft || order.status === 'need_information' || closed;

  // Successes are toasts; a failure stays here, next to what the customer was doing.
  const feedback = error && (
    <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-[15px] font-semibold text-danger">
      {error}
    </p>
  );

  return (
    <div className={cn(sticky && 'max-lg:pb-20')}>
      <Link to="/orders" className="mb-2 inline-flex items-center gap-1.5 rounded-md text-[15px] font-semibold text-brand hover:underline max-sm:min-h-11">
        <ArrowLeft aria-hidden="true" className="size-4" /> คำสั่งซื้อของฉัน
      </Link>
      <PageHeader
        title={<span className="num">{order.orderNumber}</span>}
        description={<><span className="num">{count.format(order.items.length)}</span> รายการ · อัปเดตล่าสุด <span className="num">{timeAgo(order.updatedAt)}</span></>}
        actions={!draft && (
          <Button type="button" size="lg" variant={closed ? 'default' : 'outline'} className="max-lg:hidden" disabled={busy} onClick={reorder}>
            <RotateCcw aria-hidden="true" /> สั่งซ้ำ
          </Button>
        )}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)]">
        <div className="grid gap-5">
          <div className="grid gap-4">
            <NextStepTag order={order} role="customer" />
            <PawRoute order={order} className="px-1" />
          </div>

          {feedback}

          {order.status === 'need_information' && (
            <section aria-labelledby="reply-title" className={cn(panel, 'grid gap-4')}>
              <h2 id="reply-title" className={sectionTitle}>ตอบคำถามจากแอดมิน</h2>
              {order.messages?.length > 0 && <MessageList messages={order.messages} />}
              <form id="reply-form" onSubmit={sendReply} noValidate className="grid gap-2">
                <Label htmlFor="customer-reply" className="text-[15px] font-semibold">คำตอบของคุณ</Label>
                <Textarea
                  id="customer-reply"
                  className={cn('min-h-28', field)}
                  value={reply}
                  onChange={event => { setReply(event.target.value); if (replyError) setReplyError(''); }}
                  maxLength={4000}
                  required
                  disabled={busy}
                  aria-invalid={replyError ? true : undefined}
                  aria-describedby="reply-hint"
                />
                <p id="reply-hint" className={cn('text-[13px]', replyError ? 'font-semibold text-danger' : 'text-ink-3')}>
                  {replyError || 'เมื่อส่งแล้ว คำสั่งซื้อจะกลับเข้าคิวของแอดมินทันที'}
                </p>
                <Button type="submit" size="lg" disabled={busy} className="justify-self-start max-lg:hidden">
                  <Send aria-hidden="true" /> {busy ? 'กำลังส่ง…' : 'ส่งคำตอบให้แอดมิน'}
                </Button>
              </form>
            </section>
          )}

          {draft && (
            <section aria-labelledby="submit-title" className={cn(panel, 'grid gap-3')}>
              <h2 id="submit-title" className={sectionTitle}>พร้อมส่งให้แอดมินหรือยัง?</h2>
              <p className="text-[15px] text-ink-2">ตรวจจำนวนและรายละเอียดจัดส่งก่อนส่ง หลังส่งแล้วจะแก้ไขรายการไม่ได้</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="lg" className="max-lg:hidden" disabled={busy || !edits.items.length || problems.length > 0} onClick={() => saveDraft(true)}>
                  <Send aria-hidden="true" /> {busy ? 'กำลังบันทึก…' : 'ส่งให้แอดมินตรวจสอบ'}
                </Button>
                <Button type="button" size="lg" variant="outline" disabled={busy || !changes || !edits.items.length || problems.length > 0} onClick={() => saveDraft(false)}>บันทึกการแก้ไข</Button>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-1 border-t border-line pt-3">
                <Button type="button" variant="ghost" disabled={busy} onClick={moveToCart}><ShoppingCart aria-hidden="true" /> เพิ่มหรือเปลี่ยนสินค้าในตะกร้า</Button>
                <Button type="button" variant="ghost" disabled={busy} aria-expanded={confirming === 'delete'} className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setConfirming(value => value === 'delete' ? null : 'delete')}>
                  <Trash2 aria-hidden="true" /> ลบร่าง
                </Button>
              </div>
              {confirming === 'delete' && (
                <div role="group" aria-labelledby="delete-title" className="grid gap-3 rounded-lg bg-danger-soft px-4 py-3">
                  <p id="delete-title" className="text-[15px] font-bold text-danger">ลบร่าง <span className="num">{order.orderNumber}</span>?</p>
                  <p className="text-[15px] text-ink">ร่างนี้ยังไม่ได้ส่งให้แอดมิน เมื่อลบแล้วจะกู้คืนไม่ได้</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="destructive" disabled={busy} onClick={removeDraft}>{busy ? 'กำลังลบ…' : 'ลบร่าง'}</Button>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirming(null)}>เก็บไว้</Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* A rejection's reason is on the sign itself; only a cancellation needs this panel. */}
          {closingReason && order.status === 'cancelled' && (
            <section aria-labelledby="reason-title" className={cn(panel, 'grid gap-1.5')}>
              <h2 id="reason-title" className={sectionTitle}>{order.status === 'rejected' ? 'เหตุผลจากแอดมิน' : 'เหตุผลที่ยกเลิก'}</h2>
              <p className="text-[15px] whitespace-pre-line text-ink">{closingReason}</p>
              {order.status === 'rejected' && <p className="text-[15px] text-ink-2">สั่งซ้ำเพื่อสร้างคำสั่งซื้อใหม่จากรายการเดิม หรือติดต่อแอดมิน</p>}
            </section>
          )}

          <section aria-labelledby="route-title" className={cn(panel, 'grid gap-5')}>
            <h2 id="route-title" className="sr-only">ประวัติคำสั่งซื้อ</h2>
            <OrderHistory history={order.history} />
          </section>

          {order.status !== 'need_information' && order.messages?.length > 0 && (
            <section aria-labelledby="messages-title" className={cn(panel, 'grid gap-4')}>
              <h2 id="messages-title" className={sectionTitle}>ข้อความ</h2>
              <MessageList messages={order.messages} />
            </section>
          )}
        </div>

        <div className="grid gap-5">
          <ItemsPanel order={order} draft={draft} edits={edits} setEdits={setEdits} busy={busy} />
          <FactsPanel order={order} draft={draft} edits={edits} setEdits={setEdits} busy={busy} />

          {customerCancellable.includes(order.status) && (
            <section aria-labelledby="cancel-title" className={cn(panel, 'grid gap-3')}>
              <h2 id="cancel-title" className={sectionTitle}>ต้องการยกเลิก?</h2>
              <p className="text-[15px] text-ink-2">ยกเลิกได้จนกว่าแอดมินจะอนุมัติ หลังอนุมัติแล้วกรุณาติดต่อแอดมิน</p>
              {confirming === 'cancel' ? (
                <div className="grid gap-3 rounded-lg bg-danger-soft px-4 py-3">
                  <p className="text-[15px] text-ink">แอดมินจะได้รับแจ้งทันที และคำสั่งซื้อนี้จะดำเนินการต่อไม่ได้ หากต้องการสั่งใหม่ใช้ “สั่งซ้ำ” ได้</p>
                  <div className="grid gap-1.5">
                    <Label htmlFor="cancel-reason" className="text-[15px] font-semibold">เหตุผล (ไม่บังคับ)</Label>
                    <Textarea id="cancel-reason" className={cn('min-h-20', field)} value={cancelReason} onChange={event => setCancelReason(event.target.value)} maxLength={4000} placeholder="เช่น สั่งผิดรายการ หรือไม่ต้องการสินค้าแล้ว" disabled={busy} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="destructive" disabled={busy} onClick={cancelOrder}>{busy ? 'กำลังยกเลิก…' : 'ยืนยันยกเลิกคำสั่งซื้อ'}</Button>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirming(null)}>ไม่ยกเลิก</Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" className="justify-self-start border-danger/40 text-danger hover:bg-danger-soft hover:text-danger" disabled={busy} onClick={() => setConfirming('cancel')}>
                  <Ban aria-hidden="true" /> ยกเลิกคำสั่งซื้อ
                </Button>
              )}
            </section>
          )}

          {!draft && !closed && (
            <Button type="button" size="lg" variant="outline" className="lg:hidden" disabled={busy} onClick={reorder}>
              <RotateCcw aria-hidden="true" /> สั่งซ้ำ
            </Button>
          )}
        </div>
      </div>

      {draft && (
        <StickyAction>
          <Button type="button" size="lg" disabled={busy || !edits.items.length || problems.length > 0} onClick={() => saveDraft(true)}>
            <Send aria-hidden="true" /> {busy ? 'กำลังบันทึก…' : 'ส่งให้แอดมินตรวจสอบ'}
          </Button>
        </StickyAction>
      )}
      {order.status === 'need_information' && (
        <StickyAction>
          <Button type="submit" form="reply-form" size="lg" disabled={busy}>
            <Send aria-hidden="true" /> {busy ? 'กำลังส่ง…' : 'ส่งคำตอบให้แอดมิน'}
          </Button>
        </StickyAction>
      )}
      {closed && (
        <StickyAction>
          <Button type="button" size="lg" disabled={busy} onClick={reorder}><RotateCcw aria-hidden="true" /> สั่งซ้ำ</Button>
        </StickyAction>
      )}
    </div>
  );
}

export default function OrderPage() {
  const { orderId } = useParams();
  const { data: order, error, isPending, refetch } = useQuery(orderQuery(orderId));

  if (isPending) {
    return (
      <div aria-busy="true" className="grid gap-5">
        <Skeleton className="h-16 w-72 rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)]">
          <div className="grid gap-5"><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-line bg-panel">
        <StateBlock
          tone="danger"
          title="เปิดคำสั่งซื้อไม่ได้"
          action={(
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => refetch()}>ลองใหม่</Button>
              <Button asChild variant="ghost"><Link to="/orders">กลับไปคำสั่งซื้อ</Link></Button>
            </div>
          )}
        >
          {error.message}
        </StateBlock>
      </div>
    );
  }
  return <OrderView key={order.orderId} order={order} />;
}
