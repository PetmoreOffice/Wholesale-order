import React from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { customerNextStep, statusText } from '@shared/orderWorkflow.js';
import { count, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StatusIcon } from '@/components/route/StatusBadge';

/** The customer holds the next step (a rejected order is closed, so it does not count). */
export const yours = (order) => customerNextStep[order.status]?.owner === 'customer' && order.status !== 'rejected';

const rowClass = 'grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-b border-line px-4 py-3.5 text-left transition-colors hover:bg-sunken sm:grid-cols-[150px_1fr_auto] sm:px-5';

/**
 * One order in a list: number, the next step in the customer's words, item count and age,
 * then an orange "ถึงตาคุณ" chip or the status badge. Pass `to` for a link, `onSelect` for a button.
 */
export function OrderRow({ order, to, selected, onSelect, chevronClassName = 'lg:hidden' }) {
  const next = customerNextStep[order.status];
  const content = (
    <>
      <span className="num text-[15px] font-bold text-ink">{order.orderNumber}</span>
      <span className="col-start-1 min-w-0 sm:col-start-2 sm:row-start-1">
        <span className="block truncate text-[15px] text-ink-2">{next?.text}</span>
        <span className="num block text-[13px] text-ink-3">{count.format(order.itemCount)} รายการ · {timeAgo(order.updatedAt)}</span>
      </span>
      <span className="col-start-2 row-span-2 row-start-1 flex items-center gap-1 sm:col-start-3">
        {yours(order)
          ? <span className="rounded-md bg-turn px-2.5 py-1 text-sm font-bold whitespace-nowrap text-ink">ถึงตาคุณ</span>
          : <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap', order.status === 'rejected' ? 'text-danger' : 'text-ink-3')}><StatusIcon status={order.status} className="size-4" />{statusText[order.status]}</span>}
        <ChevronRight aria-hidden="true" className={cn('size-4 text-ink-3', chevronClassName)} />
      </span>
    </>
  );
  return (
    <li className="border-line [&:last-child>*]:border-0">
      {to ? (
        <Link to={to} className={rowClass}>{content}</Link>
      ) : (
        <button type="button" onClick={() => onSelect(order.orderId)} aria-current={selected ? 'true' : undefined} className={cn(rowClass, selected && 'bg-brand-tint hover:bg-brand-tint')}>
          {content}
        </button>
      )}
    </li>
  );
}
