import React from 'react';

export function OrderMessages({ messages }) {
  if (!messages?.length) return null;
  return (
    <section className="order-messages" aria-label="ข้อความในคำสั่งซื้อ">
      <b>ข้อความ</b>
      <ol>
        {messages.map(entry => (
          <li key={entry.messageId} className={entry.senderRole === 'admin' ? 'from-admin' : 'from-customer'}>
            <small>{entry.senderRole === 'admin' ? 'แอดมิน' : 'ลูกค้า'} · {entry.senderName} · {new Date(entry.createdAt).toLocaleString('th-TH')}</small>
            <p>{entry.messageBody}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
