import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function Cart({ items, onChange, onReview }) {
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <Card className="cart" aria-label="ตะกร้าสินค้า">
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
                <small>{item.unitName} · ขั้นต่ำ {item.minimumOrder || 1}</small>
                <Button type="button" variant="link" size="sm" className="cart-remove" onClick={() => onChange(item.goodsId, 0)} aria-label={`ลบ ${item.name}`}>ลบรายการ</Button>
              </div>
              <div className="quantity">
                <Button type="button" variant="outline" size="icon-xs" onClick={() => onChange(item.goodsId, Math.max(item.minimumOrder, item.quantity - 1))} aria-label={`ลดจำนวน ${item.name}`}>−</Button>
                <span>{item.quantity}</span>
                <Button type="button" variant="outline" size="icon-xs" onClick={() => onChange(item.goodsId, item.quantity + 1)} aria-label={`เพิ่มจำนวน ${item.name}`}>+</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" className="primary full" disabled={!items.length} onClick={onReview}>ตรวจสอบคำสั่งซื้อ <span>→</span></Button>
    </Card>
  );
}
