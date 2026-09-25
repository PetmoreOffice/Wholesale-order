import React from 'react';

export function Cart({ items, onChange, onReview }) {
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <aside className="cart" aria-label="ตะกร้าสินค้า">
      <div className="cart-head">
        <div>
          <p className="eyebrow">ORDER DRAFT</p>
          <h2>ตะกร้าของคุณ</h2>
        </div>
        <strong>{total}</strong>
      </div>
      {items.length === 0 ? (
        <p className="empty-copy">ยังไม่มีสินค้าในตะกร้า<br />ค้นหาหรือสแกนบาร์โค้ดเพื่อเริ่มคำสั่งซื้อ</p>
      ) : (
        <ul className="cart-list">
          {items.map(item => (
            <li key={item.goodsId}>
              <div>
                <b>{item.name}</b>
                <small>{item.unitName} · ขั้นต่ำ {item.minimumOrder}</small>
              </div>
              <div className="quantity">
                <button onClick={() => onChange(item.goodsId, Math.max(item.minimumOrder, item.quantity - 1))} aria-label={`ลดจำนวน ${item.name}`}>−</button>
                <span>{item.quantity}</span>
                <button onClick={() => onChange(item.goodsId, item.quantity + 1)} aria-label={`เพิ่มจำนวน ${item.name}`}>+</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button className="primary full" disabled={!items.length} onClick={onReview}>ตรวจสอบคำสั่งซื้อ <span>→</span></button>
    </aside>
  );
}
