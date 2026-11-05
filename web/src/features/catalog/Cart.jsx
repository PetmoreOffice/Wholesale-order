import React, { forwardRef, useEffect, useState } from 'react';
import { ArrowRight, ChevronUp, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { count } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { maximumOf, minimumOf, unitLabel } from './catalogData.js';
import { Overlay } from './Overlay.jsx';

const stepClass = 'grid size-10 place-items-center rounded-md text-ink-2 hover:bg-brand-tint hover:text-brand-deep disabled:opacity-40 disabled:hover:bg-transparent';

/** Typed quantity, kept inside the product's minimum and maximum when the field is left. */
function QuantityField({ item, onChange }) {
  const [text, setText] = useState(String(item.quantity));
  useEffect(() => setText(String(item.quantity)), [item.quantity]);
  function commit() {
    const typed = Number.parseInt(text, 10);
    if (!Number.isInteger(typed) || typed < 1) { setText(String(item.quantity)); return; }
    const maximum = maximumOf(item) || Infinity;
    const next = Math.min(maximum, Math.max(minimumOf(item), typed));
    setText(String(next));
    if (next !== item.quantity) onChange(item.goodsId, next);
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={`จำนวน ${item.name}`}
      value={text}
      onChange={event => setText(event.target.value.replace(/[^\d]/g, ''))}
      onBlur={commit}
      onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      className="num h-10 w-14 rounded-md border border-line-strong bg-panel text-center text-[15px] font-bold text-ink"
    />
  );
}

function CartLines({ items, onChange }) {
  if (!items.length) return <p className="px-4 py-6 text-[15px] text-ink-2 sm:px-5">ค้นหาหรือสแกนบาร์โค้ด แล้วกด “เพิ่ม” เพื่อเริ่มคำสั่งซื้อ</p>;
  return (
    <ul>
      {items.map(item => {
        const minimum = minimumOf(item);
        const maximum = maximumOf(item);
        return (
          <li key={item.goodsId} className="grid gap-2 border-b border-line px-4 py-3 last:border-0 sm:px-5">
            <div className="min-w-0">
              <p className="text-[15px] leading-snug font-semibold">{item.name}</p>
              <p className="text-[14px] text-ink-2"><span className="sku">{item.sku}</span> · {unitLabel(item)} · ขั้นต่ำ <span className="num">{count.format(minimum)}</span></p>
            </div>
            <div className="flex items-center gap-1">
              {item.quantity <= minimum ? (
                <button type="button" className={stepClass} onClick={() => onChange(item.goodsId, 0)} aria-label={`ลบ ${item.name}`}><Trash2 aria-hidden="true" className="size-[18px]" /></button>
              ) : (
                <button type="button" className={stepClass} onClick={() => onChange(item.goodsId, item.quantity - 1)} aria-label={`ลดจำนวน ${item.name}`}><Minus aria-hidden="true" className="size-[18px]" /></button>
              )}
              <QuantityField item={item} onChange={onChange} />
              <button type="button" className={stepClass} disabled={maximum > 0 && item.quantity >= maximum} onClick={() => onChange(item.goodsId, item.quantity + 1)} aria-label={`เพิ่มจำนวน ${item.name}`}><Plus aria-hidden="true" className="size-[18px]" /></button>
              <span className="ml-1 text-[14px] text-ink-2">{item.unitName}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const itemCount = (items) => items.length ? <><span className="num">{count.format(items.length)}</span> รายการ</> : 'ว่าง';

/** Desktop: the cart column beside the catalog, sticky under the top bar. */
export const CartPanel = forwardRef(function CartPanel({ items, onChange, onReview }, ref) {
  return (
    <section ref={ref} id="cart" tabIndex={-1} aria-labelledby="cart-title" className="sticky top-[88px] flex max-h-[calc(100dvh-112px)] flex-col overflow-hidden rounded-xl border border-line bg-panel outline-none">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3 sm:px-5">
        <ShoppingCart aria-hidden="true" className="size-5 text-brand" />
        <h2 id="cart-title" className="text-[17px] font-bold">ตะกร้า</h2>
        <span className="ml-auto text-[15px] text-ink-2">{itemCount(items)}</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <CartLines items={items} onChange={onChange} />
      </div>
      <div className="border-t border-line p-4 sm:px-5">
        <Button type="button" size="lg" className="h-11 w-full text-[16px] font-bold" disabled={!items.length} onClick={onReview}>ตรวจสอบคำสั่งซื้อ <ArrowRight aria-hidden="true" /></Button>
      </div>
    </section>
  );
});

/** Phones: a summary bar above the 76px bottom nav that opens the cart as a sheet. */
export function CartBar({ items, onChange, onReview, open, onOpenChange }) {
  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 border-t border-line bg-panel px-4 py-2.5 shadow-lift lg:hidden">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => onOpenChange(true)} aria-haspopup="dialog" className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 text-left">
            <ShoppingCart aria-hidden="true" className="size-5 shrink-0 text-brand" />
            <span className="text-[16px] font-bold">ตะกร้า</span>
            <span className="text-[15px] text-ink-2">{itemCount(items)}</span>
            <ChevronUp aria-hidden="true" className="ml-auto size-5 text-ink-3" />
          </button>
          <Button type="button" className="h-10 px-4 text-[15px] font-bold" disabled={!items.length} onClick={onReview}>ตรวจสอบ <ArrowRight aria-hidden="true" /></Button>
        </div>
      </div>
      {open && (
        <Overlay
          title="ตะกร้า"
          description={items.length ? `${count.format(items.length)} รายการ` : undefined}
          onClose={() => onOpenChange(false)}
          closeLabel="ปิดตะกร้า"
          footer={<Button type="button" size="lg" className="h-11 text-[16px] font-bold" disabled={!items.length} onClick={() => { onOpenChange(false); onReview(); }}>ตรวจสอบคำสั่งซื้อ <ArrowRight aria-hidden="true" /></Button>}
        >
          <div className="-mx-4 -my-4 sm:-mx-6 sm:-my-5"><CartLines items={items} onChange={onChange} /></div>
        </Overlay>
      )}
    </>
  );
}
