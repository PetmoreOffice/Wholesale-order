import React from 'react';
import { Check, Plus } from 'lucide-react';
import { count, money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { maximumOf, minimumOf, unitLabel, unitsOf } from './catalogData.js';

const productKey = (product) => `${product.goodsId}-${product.unitId ?? ''}`;

/** The cart lines for a listed product, one per unit already added. */
const linesIn = (product, inCart) => unitsOf(product).map(unit => ({ unit, quantity: inCart.get(unit.goodsId) || 0 })).filter(line => line.quantity > 0);

/**
 * One unit: adds it straight away (or one more). Several units: opens the unit picker, so the
 * shopper chooses the small unit, the dozen or the case before anything goes in the cart.
 */
function AddButton({ product, lines, onAdd, className }) {
  const several = unitsOf(product).length > 1;
  const inCart = lines.reduce((sum, line) => sum + line.quantity, 0);
  const atMaximum = !several && maximumOf(product) > 0 && inCart >= maximumOf(product);
  const label = several
    ? `เพิ่ม ${product.name} — เลือกหน่วยก่อน`
    : inCart ? `เพิ่ม ${product.name} อีก 1 (ในตะกร้า ${inCart})` : `เพิ่ม ${product.name} ลงตะกร้า`;
  return (
    <Button
      type="button"
      variant={inCart ? 'secondary' : 'outline'}
      disabled={atMaximum}
      onClick={() => onAdd(product)}
      aria-label={label}
      aria-haspopup={several ? 'dialog' : undefined}
      className={cn('h-9 min-w-[6.75rem] text-[15px] font-bold', inCart && 'border border-brand/30', className)}
    >
      {inCart && !several ? <><Check aria-hidden="true" /> <span className="num">{count.format(inCart)}</span> ในตะกร้า</> : <><Plus aria-hidden="true" /> เพิ่ม</>}
    </Button>
  );
}

/** "โหล, ลัง × 24": the larger units the picker offers, under the small one the list shows. */
function MoreUnits({ product }) {
  const larger = unitsOf(product).slice(1);
  if (!larger.length) return null;
  return <span className="block text-[13px] text-ink-3">หรือ {larger.map(unitLabel).join(', ')}</span>;
}

/** "ในตะกร้า 2 โหล · 5 ชิ้น", shown only when a multi-unit product has lines in the cart. */
function InCart({ product, lines }) {
  if (unitsOf(product).length < 2 || !lines.length) return null;
  return (
    <p className="mt-0.5 inline-flex flex-wrap items-center gap-x-1 text-[13px] font-semibold text-brand-deep">
      <Check aria-hidden="true" className="size-3.5" />ในตะกร้า
      {lines.map((line, index) => <span key={line.unit.goodsId}>{index > 0 && '· '}<span className="num">{count.format(line.quantity)}</span> {line.unit.unitName}</span>)}
    </p>
  );
}

function Maximum({ product }) {
  return maximumOf(product) ? <span className="num">{count.format(maximumOf(product))}</span> : <span className="text-ink-3">ไม่จำกัด</span>;
}

function Price({ product }) {
  return Number(product.basePrice) > 0 ? <span className="num">{money.format(product.basePrice)}</span> : <span className="text-ink-3">ไม่มีราคา</span>;
}

/**
 * Desktop: one dense table at a single 15px size, ranked by weight. Phones: stacked rows.
 * `showPrice` is admin-only; the API never sends prices to customers either.
 */
export function ProductList({ products, inCart, onAdd, showPrice }) {
  return (
    <>
      <table className="hidden w-full border-collapse text-[15px] md:table">
        <thead>
          <tr className="border-b border-line text-left whitespace-nowrap text-ink-2">
            <th scope="col" className="py-2.5 pr-3 pl-5 font-semibold">SKU</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">สินค้า</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">หน่วย</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">ขั้นต่ำ</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">สูงสุด</th>
            {showPrice && <th scope="col" className="px-3 py-2.5 text-right font-semibold">ราคาอ้างอิง</th>}
            <th scope="col" className="py-2.5 pr-5 pl-3"><span className="sr-only">ตะกร้า</span></th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => {
            const lines = linesIn(product, inCart);
            return (
              <tr key={productKey(product)} className={cn('border-b border-line last:border-0 hover:bg-sunken', lines.length > 0 && 'bg-brand-tint/50')}>
                <td className="py-2 pr-3 pl-5 align-middle whitespace-nowrap"><span className="sku">{product.sku}</span></td>
                <td className="px-3 py-2 align-middle font-semibold text-ink">{product.name}<InCart product={product} lines={lines} /></td>
                <td className="px-3 py-2 align-middle text-ink-2"><span className="whitespace-nowrap">{unitLabel(product)}</span><MoreUnits product={product} /></td>
                <td className="num px-3 py-2 text-right align-middle font-semibold">{count.format(minimumOf(product))}</td>
                <td className="px-3 py-2 text-right align-middle whitespace-nowrap"><Maximum product={product} /></td>
                {showPrice && <td className="px-3 py-2 text-right align-middle whitespace-nowrap"><Price product={product} /></td>}
                <td className="py-2 pr-5 pl-3 text-right align-middle"><AddButton product={product} lines={lines} onAdd={onAdd} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="md:hidden">
        {products.map(product => {
          const lines = linesIn(product, inCart);
          return (
            <li key={productKey(product)} className={cn('grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-b border-line px-4 py-3.5 last:border-0', lines.length > 0 && 'bg-brand-tint/50')}>
              <div className="min-w-0">
                <span className="sku block">{product.sku}</span>
                <p className="text-[15px] leading-snug font-semibold text-ink">{product.name}</p>
                <p className="mt-0.5 text-[14px] text-ink-2">
                  {unitLabel(product)} · ขั้นต่ำ <span className="num">{count.format(minimumOf(product))}</span>
                  {maximumOf(product) > 0 && <> · สูงสุด <span className="num">{count.format(maximumOf(product))}</span></>}
                  {showPrice && <> · <Price product={product} /></>}
                </p>
                <MoreUnits product={product} />
                <InCart product={product} lines={lines} />
              </div>
              <AddButton product={product} lines={lines} onAdd={onAdd} className="h-10 min-w-0 px-3" />
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function ProductListSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-px">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-0 sm:px-5">
          <span className="h-4 w-24 animate-pulse rounded bg-brand-tint/70" />
          <span className="h-4 flex-1 animate-pulse rounded bg-brand-tint/70" />
          <span className="h-10 w-28 animate-pulse rounded-md bg-brand-tint/70" />
        </div>
      ))}
    </div>
  );
}
