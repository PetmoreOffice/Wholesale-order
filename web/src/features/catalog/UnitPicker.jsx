import React, { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { count, money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { QuantityField, stepClass } from './Cart.jsx';
import { maximumOf, minimumOf, unitLabel, unitsOf } from './catalogData.js';
import { Overlay } from './Overlay.jsx';

/**
 * Asks which unit to order before a product goes into the cart: the small unit the list
 * shows, or a larger one (dozen, case…). Each option says how many small units it holds,
 * its minimum and maximum, and how many are already in the cart.
 */
export function UnitPicker({ product, inCart, showPrice, onAdd, onClose }) {
  const units = unitsOf(product);
  const smallest = units[0];
  const [chosenId, setChosenId] = useState(smallest.goodsId);
  const chosen = units.find(unit => unit.goodsId === chosenId) || smallest;
  const [quantity, setQuantity] = useState(minimumOf(chosen));
  const minimum = minimumOf(chosen);
  const maximum = maximumOf(chosen);

  function choose(unit) {
    setChosenId(unit.goodsId);
    setQuantity(minimumOf(unit));
  }

  const perUnit = (unit) => (Number(unit.unitQuantity) || 1) / (Number(smallest.unitQuantity) || 1);
  const total = quantity * perUnit(chosen);

  return (
    <Overlay
      title="เลือกหน่วยก่อนเพิ่มลงตะกร้า"
      description={<><span className="font-semibold text-ink">{product.name}</span> · <span className="sku">{product.sku}</span></>}
      onClose={onClose}
      footer={(
        <>
          <Button type="button" variant="outline" size="lg" onClick={onClose}>ยกเลิก</Button>
          <Button type="button" size="lg" className="font-bold" onClick={() => onAdd(chosen, quantity)}>
            <Plus aria-hidden="true" /> เพิ่ม <span className="num">{count.format(quantity)}</span> {chosen.unitName}
          </Button>
        </>
      )}
    >
      <fieldset>
        <legend className="mb-2 text-[15px] font-semibold text-ink-2">หน่วยขาย</legend>
        <div className="grid gap-2">
          {units.map(unit => {
            const selected = unit.goodsId === chosen.goodsId;
            const already = inCart.get(unit.goodsId) || 0;
            return (
              <label
                key={unit.goodsId}
                className={cn(
                  'grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-x-3 rounded-xl border px-4 py-3 transition-colors',
                  selected ? 'border-brand bg-brand-tint/60 ring-1 ring-brand' : 'border-line-strong hover:bg-sunken'
                )}
              >
                <input type="radio" name="unit" checked={selected} onChange={() => choose(unit)} className="size-5 accent-[var(--brand)]" />
                <span className="min-w-0">
                  <span className="block text-[16px] font-bold text-ink">{unitLabel(unit)}</span>
                  <span className="block text-[14px] text-ink-2">
                    {perUnit(unit) > 1 ? <>บรรจุ <span className="num">{count.format(perUnit(unit))}</span> {smallest.unitName}</> : 'หน่วยเล็กที่สุด'}
                    {' · '}ขั้นต่ำ <span className="num">{count.format(minimumOf(unit))}</span>
                    {maximumOf(unit) > 0 && <> · สูงสุด <span className="num">{count.format(maximumOf(unit))}</span></>}
                    {showPrice && Number(unit.basePrice) > 0 && <> · <span className="num">{money.format(unit.basePrice)}</span></>}
                  </span>
                </span>
                {already > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-[13px] font-semibold text-brand-deep">
                    <Check aria-hidden="true" className="size-3.5" />ในตะกร้า <span className="num">{count.format(already)}</span>
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span id="unit-quantity" className="text-[15px] font-semibold text-ink-2">จำนวน</span>
        <div className="flex items-center gap-1" role="group" aria-labelledby="unit-quantity">
          <button type="button" className={stepClass} disabled={quantity <= minimum} onClick={() => setQuantity(value => Math.max(minimum, value - 1))} aria-label="ลดจำนวน"><Minus aria-hidden="true" className="size-[18px]" /></button>
          <QuantityField item={{ ...chosen, quantity }} onChange={(_, next) => setQuantity(next)} />
          <button type="button" className={stepClass} disabled={maximum > 0 && quantity >= maximum} onClick={() => setQuantity(value => value + 1)} aria-label="เพิ่มจำนวน"><Plus aria-hidden="true" className="size-[18px]" /></button>
          <span className="ml-1 text-[15px] text-ink-2">{chosen.unitName}</span>
        </div>
        {perUnit(chosen) > 1 && (
          <p className="text-[15px] text-ink-2">รวม <b className="num text-ink">{count.format(total)}</b> {smallest.unitName}</p>
        )}
      </div>
    </Overlay>
  );
}
