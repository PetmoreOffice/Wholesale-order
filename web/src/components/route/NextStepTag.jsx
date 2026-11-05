import React from 'react';
import { CircleCheckBig, CircleX, Hand, MessageSquareReply, PawPrint, Send } from 'lucide-react';
import { adminActionText, adminTransitions, closedStatuses, customerNextStep, mainRoute, routeIndex } from '@shared/orderWorkflow.js';
import { cn } from '@/lib/utils';

// The signature of the Kibble Bag world: one hang tag per order view, like the tag on a bag of
// pet food, naming the next step and who does it. Teal is "we are on it", kibble orange means
// the viewer must act, red means the order is closed.
// Never repeat it in lists; lists carry a StatusBadge or the orange "ถึงตาคุณ" chip instead.
const surface = {
  road: 'bg-brand text-white',
  yours: 'bg-kibble text-ink',
  closed: 'bg-danger text-white',
  done: 'bg-brand-deep text-white'
};

function adminNext(order) {
  if (order.status === 'submitted') return { text: 'รอแอดมินรับงาน', note: 'กดรับงานเพื่อเริ่มตรวจสอบ', yours: true };
  if (order.status === 'need_information') return { text: 'รอลูกค้าตอบ', note: 'ลูกค้าต้องส่งข้อมูลเพิ่มก่อนอนุมัติ', yours: false };
  const moves = adminTransitions[order.status] || [];
  const text = moves.map((status) => adminActionText[status]).filter(Boolean).join(' หรือ ');
  return { text: text || 'ไม่มีขั้นถัดไป', note: order.assignedAdminName ? `ผู้รับผิดชอบ: ${order.assignedAdminName}` : 'ยังไม่มีผู้รับผิดชอบ', yours: true };
}

// The admin's message on the rejecting move is the reason; customers read it on the tag.
function rejectionReason(order) {
  const entry = (order.history || []).find(item => item.toStatus === 'rejected');
  return entry?.message ? `เหตุผล: ${entry.message}` : 'ติดต่อแอดมินหากต้องการรายละเอียด';
}

function TagBody({ variant, text, note, distance, Icon }) {
  return (
    // A hang tag: the eyelet end is chamfered, the other end rounded.
    <div
      className={cn('relative grid w-full grid-cols-[1fr_auto] items-center gap-x-4 rounded-r-[20px] py-4 pr-4 pl-12 text-left sm:py-5 sm:pr-6 sm:pl-16', surface[variant])}
      style={{ clipPath: 'polygon(28px 0, 100% 0, 100% 100%, 28px 100%, 0 calc(100% - 28px), 0 28px)' }}
    >
      {/* The punched eyelet: a darker reinforcement ring, the ground showing through the hole. */}
      <span aria-hidden="true" className="absolute top-1/2 left-4 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-black/25 sm:left-5 sm:size-7">
        <span className="size-3 rounded-full bg-ground shadow-[inset_0_2px_3px_rgb(0_0_0/0.35)] sm:size-3.5" />
      </span>
      <p className="font-display text-xl leading-snug font-medium sm:text-2xl">{text}</p>
      <span className="row-span-2 flex flex-col items-center gap-0.5">
        <Icon aria-hidden="true" strokeWidth={2.4} className="size-10 sm:size-12" />
        {distance && <span className="num text-sm font-bold whitespace-nowrap">{distance}</span>}
      </span>
      {note && <p className="mt-0.5 text-[15px] font-medium">{note}</p>}
    </div>
  );
}

export function NextStepTag({ order, role, className }) {
  const closed = closedStatuses.includes(order.status);
  const step = Math.min(routeIndex(order.status, order.history) + 1, mainRoute.length);
  const remaining = mainRoute.length - step;
  let variant = 'road';
  let text;
  let note;

  if (role === 'admin' && !closed) {
    const next = adminNext(order);
    text = next.text;
    note = `ขั้น ${step} จาก ${mainRoute.length} · ${next.note}`;
    if (next.yours && order.status === 'submitted') variant = 'yours';
  } else {
    const next = customerNextStep[order.status] || { owner: null, text: '' };
    text = next.text;
    if (order.status === 'completed') { variant = 'done'; note = 'ส่งถึงปลายทางแล้ว สั่งซ้ำได้จากปุ่มด้านล่าง'; }
    else if (order.status === 'rejected') { variant = 'closed'; text = 'คำสั่งซื้อนี้ถูกปฏิเสธ'; note = rejectionReason(order); }
    else if (order.status === 'cancelled') { variant = 'closed'; note = null; }
    else if (next.owner === 'customer') { variant = 'yours'; note = order.status === 'draft' ? 'ถึงตาคุณ · ยังไม่ได้ส่งให้แอดมิน' : 'ถึงตาคุณ · แอดมินรอคำตอบจากคุณ'; }
    else { note = `ขั้น ${step} จาก ${mainRoute.length} · คุณไม่ต้องทำอะไร เราจะแจ้งเมื่อมีความคืบหน้า`; }
  }
  const distance = !closed && variant !== 'yours' && remaining > 0 ? `อีก ${remaining} ขั้น` : null;
  const Icon = variant === 'closed' ? CircleX : variant === 'done' ? CircleCheckBig : variant === 'yours' ? (order.status === 'draft' ? Send : order.status === 'submitted' ? Hand : MessageSquareReply) : PawPrint;
  const body = <TagBody variant={variant} text={text} note={note} distance={distance} Icon={Icon} />;

  return (
    <section aria-label="ขั้นตอนถัดไป" className={cn('drop-shadow-[0_10px_18px_rgb(14_60_58/0.22)]', className)}>
      {body}
    </section>
  );
}
