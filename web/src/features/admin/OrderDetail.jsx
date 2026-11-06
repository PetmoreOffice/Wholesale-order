import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileDown, UserCheck, X } from 'lucide-react';
import { adminActionText, adminTransitions, assignableStatuses, messageRequired, statusText } from '@shared/orderWorkflow.js';
import { api } from '@/lib/api';
import { downloadFile, orderCsv } from '@/lib/csv';
import { count, dateTime, money, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StateBlock } from '@/components/PageHeader';
import { PawRoute } from '@/components/route/PawRoute';
import { NextStepTag } from '@/components/route/NextStepTag';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { orderQuery } from '@/features/orders/queries.js';
import { POLL_MS, sourceText, usersQuery } from './queue.js';

const sectionClass = 'grid gap-3 border-t border-line px-4 py-5 sm:px-5';
const sectionTitle = 'text-[17px] font-semibold text-ink';

// The reference price is the GOODSMASTER price, read through the existing product lookup
// (SELECT only; admins receive basePrice, customers never do). Order lines do not store it.
const referencePriceQuery = (item) => ({
  queryKey: ['products', 'reference-price', item.goodsId],
  queryFn: () => api(`/products/barcode/${encodeURIComponent(item.goodsCode)}`)
    .then(result => result.data.find(product => Number(product.goodsId) === Number(item.goodsId))?.basePrice ?? null)
    .catch(error => { if (error.status === 404) return null; throw error; }),
  staleTime: 10 * 60_000,
  retry: false,
  enabled: Boolean(item.goodsCode)
});

function Items({ items }) {
  const prices = useQueries({ queries: items.map(referencePriceQuery) });
  const known = prices.every(price => price.isSuccess && Number(price.data) > 0);
  const total = known ? items.reduce((sum, item, index) => sum + Number(prices[index].data) * Number(item.quantity), 0) : null;
  return (
    <section aria-labelledby="detail-items" className={sectionClass}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="detail-items" className={sectionTitle}>รายการสินค้า</h3>
        <span className="num text-[15px] text-ink-3">{count.format(items.length)} รายการ</span>
      </div>
      <ul className="-mx-4 sm:-mx-5">
        {items.map((item, index) => {
          const price = prices[index];
          const unitPrice = Number(price.data);
          return (
            <li key={item.itemId} className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-line px-4 py-3 last:border-0 sm:px-5">
              <div className="min-w-0">
                <p className="text-[15px] leading-snug font-semibold text-ink">{item.name}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-3"><span className="sku">{item.sku}</span>{item.unitQuantity > 1 && <span className="num text-sm text-ink-3">บรรจุ {count.format(item.unitQuantity)}</span>}</p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-bold text-ink"><span className="num">{count.format(item.quantity)}</span> {item.unitName}</p>
                <p className="num text-sm text-ink-3">
                  {price.isPending && item.goodsCode ? <span className="inline-block h-3.5 w-20 animate-pulse rounded bg-brand-tint/70 align-middle" aria-label="กำลังโหลดราคาอ้างอิง" />
                    : unitPrice > 0 ? <>{money.format(unitPrice)} / {item.unitName}</>
                    : price.isError ? 'โหลดราคาไม่ได้' : 'ไม่มีราคาอ้างอิง'}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="flex items-baseline justify-between gap-3 text-[15px] text-ink-2">
        <span>ราคาอ้างอิงรวม <span className="text-ink-3">(ไม่แสดงให้ลูกค้าเห็น)</span></span>
        <b className="num text-ink">{total !== null ? money.format(total) : 'ไม่ครบทุกรายการ'}</b>
      </p>
    </section>
  );
}

function Fact({ label, children }) {
  if (!children) return null;
  return (
    <div className="grid gap-x-4 sm:grid-cols-[120px_1fr]">
      <dt className="text-[15px] text-ink-3">{label}</dt>
      <dd className="text-[15px] whitespace-pre-line text-ink">{children}</dd>
    </div>
  );
}

function Customer({ order }) {
  const { data: users } = useQuery(usersQuery);
  const profile = users?.find(user => user.uid === order.customerId)?.profile || {};
  const source = sourceText[order.orderSource] || sourceText.self;
  return (
    <section aria-labelledby="detail-customer" className={sectionClass}>
      <h3 id="detail-customer" className={sectionTitle}>ลูกค้า</h3>
      <dl className="grid gap-2">
        <Fact label="ชื่อ">{order.customerName}</Fact>
        <Fact label="ช่องทาง">{order.createdByRole === 'admin' ? `${source} · บันทึกโดย ${order.createdByName}` : source}</Fact>
        <Fact label="ส่งเมื่อ">{order.submittedAt && <span className="num">{dateTime(order.submittedAt)}</span>}</Fact>
        <Fact label="เบอร์โทร">{profile.phone && <a className="num font-semibold text-brand hover:underline" href={`tel:${profile.phone}`}>{profile.phone}</a>}</Fact>
        <Fact label="จัดส่ง">{order.deliveryDetails || profile.address}</Fact>
        <Fact label="หมายเหตุลูกค้า">{order.customerNote}</Fact>
        <Fact label="หมายเหตุภายใน">{profile.note}</Fact>
      </dl>
    </section>
  );
}

function Messages({ messages }) {
  return (
    <section aria-labelledby="detail-messages" className={sectionClass}>
      <h3 id="detail-messages" className={sectionTitle}>ข้อความ</h3>
      {messages?.length ? (
        <ol className="grid gap-2.5">
          {messages.map(entry => (
            <li key={entry.messageId} className={cn('rounded-lg px-4 py-3', entry.senderRole === 'admin' ? 'bg-sunken' : 'bg-info-soft')}>
              <p className="text-sm text-ink-3"><b className="font-bold text-ink">{entry.senderRole === 'admin' ? 'แอดมิน' : 'ลูกค้า'}</b> · {entry.senderName} · <span className="num">{dateTime(entry.createdAt)}</span></p>
              <p className="mt-1 text-[15px] whitespace-pre-line text-ink">{entry.messageBody}</p>
            </li>
          ))}
        </ol>
      ) : <p className="text-[15px] text-ink-3">ยังไม่มีข้อความกับลูกค้า</p>}
    </section>
  );
}

function History({ order }) {
  const history = order.history || [];
  const assignments = order.assignmentLog || [];
  return (
    <section aria-labelledby="detail-history" className={sectionClass}>
      <h3 id="detail-history" className={sectionTitle}>ประวัติ</h3>
      <details className="group">
        <summary className="text-[15px] font-semibold text-brand">ประวัติการดำเนินการ (<span className="num">{count.format(history.length)}</span>)</summary>
        <ol className="mt-3 grid gap-3">
          {history.map(entry => (
            <li key={entry.historyId} className="text-[15px]">
              <p><b className="font-bold">{statusText[entry.toStatus] || entry.toStatus}</b> · {entry.actorName}</p>
              <p className="text-sm text-ink-3"><span className="num">{dateTime(entry.createdAt)}</span>{entry.message ? ` · ${entry.message}` : ''}</p>
            </li>
          ))}
        </ol>
      </details>
      {assignments.length > 0 && (
        <details>
          <summary className="text-[15px] font-semibold text-brand">ประวัติผู้รับงาน (<span className="num">{count.format(assignments.length)}</span>)</summary>
          <ol className="mt-3 grid gap-3">
            {assignments.map(log => (
              <li key={log.assignmentId} className="text-[15px]">
                <p><b className="font-bold">{log.adminName}</b> · {log.action === 'reassigned' ? 'รับช่วงงาน' : 'รับงาน'}</p>
                <p className="num text-sm text-ink-3">{dateTime(log.createdAt)}</p>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

/** Take or transfer the order, then move it along the road. Only the assigned admin may move it. */
function Actions({ order, adminId }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [invalid, setInvalid] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['orders'] });
  const assign = useMutation({
    mutationFn: () => api(`/orders/${order.orderId}/assign`, { body: {} }),
    onSuccess: (result) => { toast.success(result?.data?.action === 'reassigned' ? `รับช่วง ${order.orderNumber} แล้ว` : `รับงาน ${order.orderNumber} แล้ว`); return refresh(); }
  });
  const move = useMutation({
    mutationFn: (status) => api(`/orders/${order.orderId}/status`, { body: { status, message } }),
    onSuccess: (_result, status) => { setMessage(''); toast.success(`${order.orderNumber}: ${statusText[status] || status}`); return refresh(); }
  });
  const busy = assign.isPending || move.isPending;
  const mine = order.assignedAdminId === adminId;
  const claimable = assignableStatuses.includes(order.status) && !mine;
  const moves = adminTransitions[order.status] || [];
  const needsMessage = moves.some(status => messageRequired.includes(status));
  const error = invalid || assign.error?.message || move.error?.message;

  function claim() {
    setInvalid(''); move.reset();
    assign.mutate();
  }

  // A message typed before a forward move (approve, ERP, complete) is only a note on that move.
  // It is easy to type a question and press the main button, so ask once which was meant.
  const [noteFor, setNoteFor] = useState(null);

  function go(status, { confirmed = false } = {}) {
    assign.reset(); move.reset();
    if (messageRequired.includes(status) && !message.trim()) {
      setInvalid(status === 'rejected' ? 'ระบุเหตุผลที่ปฏิเสธและแนวทางให้ลูกค้าก่อน' : 'ระบุข้อมูลที่ต้องการจากลูกค้าก่อน');
      document.getElementById('admin-message')?.focus();
      return;
    }
    if (!confirmed && message.trim() && !messageRequired.includes(status)) {
      setNoteFor(status);
      return;
    }
    setInvalid('');
    setNoteFor(null);
    move.mutate(status);
  }

  return (
    <section aria-label="ดำเนินการ" className="grid gap-3 px-4 pb-5 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-[15px] text-ink-2">
          {order.assignedAdminName ? <>ผู้รับผิดชอบ: <b className="font-bold text-ink">{mine ? 'คุณ' : order.assignedAdminName}</b></> : 'ยังไม่มีผู้รับงาน'}
        </p>
        {claimable && (
          <Button type="button" size="lg" variant={order.assignedAdminName ? 'outline' : 'default'} disabled={busy} onClick={claim} className="max-sm:w-full">
            <UserCheck aria-hidden="true" /> {assign.isPending ? 'กำลังรับงาน…' : order.assignedAdminName ? 'รับช่วงงาน' : 'รับงานนี้'}
          </Button>
        )}
      </div>

      {moves.length > 0 && (mine ? (
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="admin-message" className="text-[15px] font-semibold text-ink">
              ข้อความถึงลูกค้า{needsMessage && <span className="font-normal text-ink-3"> (จำเป็นเมื่อขอข้อมูลเพิ่มหรือปฏิเสธ)</span>}
            </Label>
            <Textarea
              id="admin-message" rows={3} value={message} disabled={busy} aria-invalid={Boolean(invalid) || undefined}
              onChange={event => { setMessage(event.target.value); setInvalid(''); setNoteFor(null); }}
              placeholder="อธิบายการดำเนินการ หรือข้อมูลที่ต้องการจากลูกค้า" className="bg-panel text-[15px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {moves.map(status => (
              <Button
                key={status} type="button" size="lg" disabled={busy} onClick={() => go(status)}
                variant={status === 'rejected' || status === 'need_information' ? 'outline' : 'default'}
                className={cn('max-sm:flex-1', status === 'rejected' && 'border-danger/40 text-danger hover:bg-danger-soft hover:text-danger')}
              >
                {move.isPending && move.variables === status ? 'กำลังบันทึก…' : adminActionText[status]}
              </Button>
            ))}
          </div>
          {noteFor && (
            <div role="alertdialog" aria-labelledby="note-question" className="grid gap-3 rounded-lg bg-kibble-soft px-4 py-3">
              <p id="note-question" className="text-[15px] text-ink">
                <b className="font-bold">ข้อความนี้จะไม่ถูกส่งเป็นคำถาม</b> จะบันทึกเป็นหมายเหตุของ “{adminActionText[noteFor]}” เท่านั้น ลูกค้าไม่ต้องตอบ
              </p>
              <div className="flex flex-wrap gap-2">
                {moves.includes('need_information') && (
                  <Button type="button" disabled={busy} onClick={() => go('need_information', { confirmed: true })}>ส่งเป็นคำถาม (ขอข้อมูลเพิ่ม)</Button>
                )}
                <Button type="button" variant="outline" disabled={busy} onClick={() => go(noteFor, { confirmed: true })}>{adminActionText[noteFor]} พร้อมหมายเหตุ</Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => setNoteFor(null)}>ยกเลิก</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-lg bg-sunken px-4 py-3 text-[15px] text-ink-2">รับงานนี้ก่อน จึงจะอนุมัติ ขอข้อมูลเพิ่ม หรือปฏิเสธได้</p>
      ))}

      {error && <p role="alert" className="text-[15px] font-semibold text-danger">{error}</p>}

      <div>
        <Button type="button" variant="outline" onClick={() => downloadFile(`${order.orderNumber}.csv`, orderCsv(order), 'text/csv;charset=utf-8')} title="ไฟล์ CSV สำหรับคีย์เข้า ERP (เปิดใน Excel ได้)">
          <FileDown aria-hidden="true" /> CSV สำหรับ ERP
        </Button>
      </div>
    </section>
  );
}

/**
 * One order for the admin: the sign and the road first, the buttons right under them, then
 * items, customer, messages and history. `inline` draws its own header (desktop side panel);
 * in a sheet the sheet's header carries the order number.
 */
export function OrderDetail({ orderId, summary, adminId, inline, onClose }) {
  const { data: order, error, isPending, refetch } = useQuery({ ...orderQuery(orderId), refetchInterval: POLL_MS });
  const shown = order || summary;

  return (
    <article aria-label="รายละเอียดคำสั่งซื้อ" className={cn('bg-panel', inline ? 'overflow-hidden rounded-xl border border-line' : 'min-h-full')}>
      {inline && (
        <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="num text-[22px] leading-tight font-semibold text-ink">{shown?.orderNumber || 'คำสั่งซื้อ'}</h2>
            {shown && <p className="truncate text-[15px] text-ink-2">{shown.customerName} · <span className="num">{timeAgo(shown.updatedAt)}</span></p>}
          </div>
          <button type="button" onClick={onClose} aria-label="ปิดรายละเอียด" className="-mr-2 grid size-11 shrink-0 sm:size-10 place-items-center rounded-md text-ink-2 hover:bg-brand-tint hover:text-brand-deep">
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
      )}

      {error ? (
        <StateBlock tone="danger" title="โหลดรายละเอียดไม่สำเร็จ" action={<Button variant="outline" onClick={() => refetch()}>ลองใหม่</Button>}>{error.message}</StateBlock>
      ) : isPending ? (
        <div aria-busy="true" className="grid gap-4 px-4 py-4 sm:px-5">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      ) : (
        <>
          <div className={cn('grid gap-5 px-4 pb-5 sm:px-5', !inline && 'pt-4')}>
            <NextStepTag order={order} role="admin" />
            <PawRoute order={order} role="admin" />
          </div>
          <Actions key={order.orderId} order={order} adminId={adminId} />
          <Items items={order.items} />
          <Customer order={order} />
          <Messages messages={order.messages} />
          <History order={order} />
        </>
      )}
    </article>
  );
}
