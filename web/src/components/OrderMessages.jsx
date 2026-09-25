import React from 'react';
import { dateTime } from '../lib/format.js';

export function OrderMessages({ messages, title = 'ข้อความ' }) {
  if (!messages?.length) return null;
  return (
    <section className="order-messages" aria-label="ข้อความในคำสั่งซื้อ">
      <h3>{title}</h3>
      <ol>
        {messages.map(entry => (
          <li key={entry.messageId} data-sender={entry.senderRole}>
            <small><b>{entry.senderRole === 'admin' ? 'แอดมิน' : 'ลูกค้า'}</b> · {entry.senderName} · {dateTime(entry.createdAt)}</small>
            <p>{entry.messageBody}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
