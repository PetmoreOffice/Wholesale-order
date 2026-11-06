import React from 'react';
import { CircleX, PawPrint } from 'lucide-react';
import { customerNextStep, mainRoute, routeIndex, statusText } from '@shared/orderWorkflow.js';
import { cn } from '@/lib/utils';

const stopText = {
  submitted: 'ส่งแล้ว',
  assigned: 'ตรวจสอบ',
  approved: 'อนุมัติ',
  erp_entry: 'บันทึก ERP',
  completed: 'เสร็จสิ้น'
};
// Statuses that leave the main path; shown under the stop they left from.
const exits = { need_information: 'แวะรอ: ข้อมูลจากลูกค้า', rejected: 'หยุด: ปฏิเสธ', cancelled: 'หยุด: ยกเลิก' };

/**
 * The order's progress as a trail of paw prints. Passed stops are filled teal, the current
 * one is a larger orange paw; passed stops lose their labels so the steps ahead keep the room
 * (a finished order keeps every label).
 */
export function PawRoute({ order, role = 'customer', className }) {
  if (order.status === 'draft') return null;
  const current = routeIndex(order.status, order.history);
  const done = order.status === 'completed';
  const exit = exits[order.status];
  const stopped = order.status === 'rejected' || order.status === 'cancelled';
  // Orange only when the step waits on the viewer, matching the tag above it.
  const yours = role === 'admin' ? order.status === 'submitted' : customerNextStep[order.status]?.owner === 'customer' && !stopped;
  const fill = (Math.min(done ? mainRoute.length - 1 : current, mainRoute.length - 1) / (mainRoute.length - 1)) * 80;
  return (
    <div className={className}>
      <ol aria-label="ขั้นตอนคำสั่งซื้อ" className="relative grid" style={{ gridTemplateColumns: `repeat(${mainRoute.length}, minmax(0, 1fr))` }}>
        <span aria-hidden="true" className="absolute top-[17px] right-[10%] left-[10%] border-t-[3px] border-dashed border-line-strong" />
        <span aria-hidden="true" className="absolute top-[17px] left-[10%] border-t-[3px] border-brand transition-[width] duration-700 ease-out" style={{ width: `${fill}%` }} />
        {mainRoute.map((status, index) => {
          const passed = index < current || done;
          const here = index === current && !done;
          const halt = here && stopped;
          return (
            <li key={status} aria-current={here && !halt ? 'step' : undefined} className="relative z-[1] flex flex-col items-center gap-1.5 text-center">
              <span
                aria-hidden="true"
                className={cn(
                  'grid place-items-center rounded-full border-2 transition-transform',
                  passed ? 'size-9 border-brand bg-brand text-white'
                    : halt ? 'size-11 -mt-1 border-danger bg-danger-soft text-danger'
                      : here ? cn('size-11 -mt-1 shadow-lift', yours ? 'border-kibble bg-kibble text-ink' : 'border-brand bg-brand-tint text-brand-deep')
                        : 'size-9 border-line-strong bg-panel text-ink-3'
                )}
              >
                {halt ? <CircleX className="size-6" strokeWidth={2.2} /> : <PawPrint className={here ? 'size-6' : 'size-5'} strokeWidth={2.2} />}
              </span>
              <span className={cn('text-[13px] leading-tight', halt ? 'font-bold text-danger' : here ? 'font-bold text-ink' : 'font-semibold text-ink-3', passed && !done && 'sr-only')}>
                {stopText[status]}
                <span className="sr-only">{passed ? ' (ผ่านแล้ว)' : halt ? ' (หยุดที่นี่)' : here ? ' (ตอนนี้)' : ''}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {exit && (
        <p className={cn('mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold', order.status === 'need_information' ? 'bg-kibble-soft text-ink' : 'bg-danger-soft text-danger')}>
          {exit}
          <span className="sr-only">สถานะ {statusText[order.status]}</span>
        </p>
      )}
    </div>
  );
}
