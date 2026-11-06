import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { statusText } from '@shared/orderWorkflow.js';
import { dateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Messages between the customer and the admin, oldest first like a chat. */
export function MessageList({ messages }) {
  return (
    <ol className="grid gap-3">
      {messages.map(entry => {
        const mine = entry.senderRole !== 'admin';
        return (
          <li key={entry.messageId} className={cn('max-w-[92%] rounded-lg px-4 py-3', mine ? 'justify-self-end bg-brand-tint' : 'justify-self-start bg-sunken')}>
            <p className="text-[13px] text-ink-3">
              <b className="font-bold text-ink-2">{mine ? 'คุณ' : 'แอดมิน'}</b> · {entry.senderName} · <span className="num">{dateTime(entry.createdAt)}</span>
            </p>
            <p className="mt-1 text-[15px] whitespace-pre-line text-ink">{entry.messageBody}</p>
          </li>
        );
      })}
    </ol>
  );
}

const SHOWN = 4;

/**
 * Stops the order has passed, newest first, each with who moved it and when. Older stops
 * fold away so the road ahead keeps the attention.
 */
export function OrderHistory({ history }) {
  const [all, setAll] = useState(false);
  if (!history?.length) return null;
  const entries = [...history].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const shown = all ? entries : entries.slice(0, SHOWN);
  return (
    <div>
      <h3 className="mb-3 text-[15px] font-semibold text-ink-2">ประวัติการดำเนินการ</h3>
      <ol className="relative grid gap-4 pl-6">
        <span aria-hidden="true" className="absolute top-2 bottom-2 left-[5px] w-[2px] rounded-full bg-line" />
        {shown.map((entry, index) => (
          <li key={entry.historyId} className="relative">
            <span aria-hidden="true" className={cn('absolute top-[7px] -left-6 size-3 rounded-[3px] border-2', ['rejected', 'cancelled'].includes(entry.toStatus) ? 'border-danger bg-danger' : index === 0 ? 'border-brand bg-brand' : 'border-line-strong bg-panel')} />
            <p className="text-[15px]">
              <b className="font-bold text-ink">{statusText[entry.toStatus] || entry.toStatus}</b>
              <span className="text-ink-2"> · {entry.actorName}</span>
            </p>
            <p className="num text-[13px] text-ink-3">{dateTime(entry.createdAt)}</p>
            {entry.message && <p className="mt-0.5 text-[15px] whitespace-pre-line text-ink-2">{entry.message}</p>}
          </li>
        ))}
      </ol>
      {entries.length > SHOWN && (
        <button type="button" onClick={() => setAll(value => !value)} aria-expanded={all} className="mt-3 inline-flex items-center gap-1 rounded-md text-[15px] font-semibold text-brand hover:underline">
          <ChevronDown aria-hidden="true" className={cn('size-4 transition-transform', all && 'rotate-180')} />
          {all ? 'ย่อประวัติ' : <>ดูทั้งหมด (<span className="num">{entries.length}</span>)</>}
        </button>
      )}
    </div>
  );
}
