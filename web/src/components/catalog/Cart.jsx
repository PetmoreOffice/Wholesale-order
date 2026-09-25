import React from 'react';
import { ArrowRight, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { count } from '../../lib/format.js';
import { Button } from '@/components/ui/button';

export function Cart({ items, onChange, onReview }) {
  return (
    <section className="cart" aria-label="ตะกร้าสินค้า">
      <div className="cart-head">
        <ShoppingCart aria-hidden="true" />
        <h2>ตะกร้า</h2>
        <span className="cart-count">{items.length ? <><span className="num">{count.format(items.length)}</span> รายการ</> : 'ว่าง'}</span>
      </div>
      {items.length === 0 ? (
        <p className="cart-empty">ค้นหาหรือสแกนบาร์โค้ด แล้วกด “เพิ่ม” เพื่อเริ่มคำสั่งซื้อ</p>
      ) : (
        <ul className="cart-list">
          {items.map(item => {
            const minimum = Number(item.minimumOrder) || 1;
            const maximum = Number(item.maximumOrder) || 0;
            return (
              <li key={item.goodsId}>
                <div className="cart-item-text">
                  <b>{item.name}</b>
                  <small>{item.unitName} · ขั้นต่ำ <span className="num">{count.format(minimum)}</span></small>
                </div>
                <div className="quantity">
                  {item.quantity <= minimum ? (
                    <button type="button" className="icon-button" onClick={() => onChange(item.goodsId, 0)} aria-label={`ลบ ${item.name}`}><Trash2 aria-hidden="true" /></button>
                  ) : (
                    <button type="button" className="icon-button" onClick={() => onChange(item.goodsId, item.quantity - 1)} aria-label={`ลดจำนวน ${item.name}`}><Minus aria-hidden="true" /></button>
                  )}
                  <span className="num" aria-label={`จำนวน ${item.quantity}`}>{count.format(item.quantity)}</span>
                  <button type="button" className="icon-button" disabled={maximum > 0 && item.quantity >= maximum} onClick={() => onChange(item.goodsId, item.quantity + 1)} aria-label={`เพิ่มจำนวน ${item.name}`}><Plus aria-hidden="true" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Button type="button" size="lg" className="cart-submit w-full bg-lime text-green-950 hover:bg-lime/85" disabled={!items.length} onClick={onReview}>ตรวจสอบคำสั่งซื้อ <ArrowRight aria-hidden="true" /></Button>
    </section>
  );
}
