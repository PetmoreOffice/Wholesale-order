import React, { useId, useState } from 'react';
import { CircleAlert, CircleCheck, ListChecks, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { count } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MAX_PASTE_LINES, clampQuantity, lookupCode, mapLimited, parsePastedLines, unitLabel } from './catalogData.js';

const LOOKUP_CONCURRENCY = 4;

/** Turns one parsed line plus its lookup into a result row. Only products the API returned are used. */
function toRow(line, lookup) {
  if (lookup.error) return { ...line, status: lookup.notFound ? 'missing' : 'error', message: lookup.notFound ? `ไม่พบ SKU หรือบาร์โค้ด “${line.code}” ในสินค้าที่เปิดขาย` : lookup.error, products: [] };
  const products = lookup.products;
  const chosen = products.length === 1 ? products[0] : null;
  return { ...line, status: chosen ? 'found' : 'units', products, chosenId: chosen?.goodsId ?? null, ...(chosen ? clampQuantity(chosen, line.requested) : { quantity: null, note: '' }) };
}

const chosenProduct = (row) => row.products.find(product => product.goodsId === row.chosenId) || null;

function StatusCell({ row }) {
  if (row.status === 'found' || (row.status === 'units' && row.chosenId !== null)) {
    return <span className="inline-flex items-center gap-1.5 font-semibold text-brand"><CircleCheck aria-hidden="true" className="size-4" />พบสินค้า</span>;
  }
  if (row.status === 'units') return <span className="inline-flex items-center gap-1.5 rounded-md bg-turn px-2 py-0.5 font-bold text-ink"><CircleAlert aria-hidden="true" className="size-4" />เลือกหน่วย</span>;
  return <span className="inline-flex items-center gap-1.5 font-semibold text-danger"><X aria-hidden="true" className="size-4" />{row.status === 'missing' ? 'ไม่พบ' : 'ตรวจไม่สำเร็จ'}</span>;
}

/**
 * "วางรายการ SKU": paste lines of code + quantity (spaces, commas or Excel tabs), check each
 * code against the catalog, then add what was found to the cart. Nothing is guessed: a code
 * the catalog does not return stays "ไม่พบ" and is never added.
 */
export function QuickOrder({ onAdd, onClose }) {
  const inputId = useId();
  const [text, setText] = useState('');
  const [rows, setRows] = useState(null);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function check() {
    const lines = parsePastedLines(text);
    if (!lines.length) { setError('วางรหัสสินค้าอย่างน้อย 1 บรรทัด'); return; }
    if (lines.length > MAX_PASTE_LINES) { setError(`ตรวจได้ครั้งละไม่เกิน ${MAX_PASTE_LINES} บรรทัด (วางมา ${count.format(lines.length)} บรรทัด)`); return; }
    setError(''); setChecking(true); setProgress(0); setRows(null);
    // The same code pasted twice is looked up once.
    const codes = [...new Set(lines.map(line => line.code))];
    const found = await mapLimited(codes, LOOKUP_CONCURRENCY, async (code) => {
      try {
        const data = await lookupCode(code);
        return { products: data.data || [] };
      } catch (err) {
        return { error: err.message, notFound: err instanceof ApiError && err.status === 404 };
      } finally {
        setProgress(done => done + 1);
      }
    });
    const byCode = new Map(codes.map((code, index) => [code, found[index]]));
    setRows(lines.map(line => toRow(line, byCode.get(line.code))));
    setChecking(false);
  }

  function chooseUnit(lineNumber, goodsId) {
    setRows(current => current.map(row => {
      if (row.lineNumber !== lineNumber) return row;
      const product = row.products.find(item => String(item.goodsId) === goodsId);
      return product ? { ...row, chosenId: product.goodsId, ...clampQuantity(product, row.requested) } : { ...row, chosenId: null, quantity: null, note: '' };
    }));
  }

  const ready = (rows || []).filter(row => chosenProduct(row));
  const waiting = (rows || []).filter(row => row.status === 'units' && !chosenProduct(row)).length;
  const failed = (rows || []).filter(row => row.status === 'missing' || row.status === 'error').length;

  function addToCart() {
    onAdd(ready.map(row => ({ ...chosenProduct(row), quantity: row.quantity })));
    setRows(null); setText('');
  }

  return (
    <section aria-labelledby="quick-order-title" className="mb-5 overflow-hidden rounded-xl border border-line bg-panel">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div>
          <h2 id="quick-order-title" className="text-[17px] font-semibold">วางรายการ SKU</h2>
          <p className="text-[15px] text-ink-2">หนึ่งบรรทัดต่อหนึ่งสินค้า: รหัส SKU หรือบาร์โค้ด ตามด้วยจำนวน (ไม่ใส่จำนวน = ขั้นต่ำ) คัดลอกจาก Excel ได้</p>
        </div>
        <button type="button" onClick={onClose} aria-label="ปิดวางรายการ SKU" className="-mr-2 grid size-11 shrink-0 sm:size-10 place-items-center rounded-md text-ink-2 hover:bg-brand-tint hover:text-brand-deep"><X aria-hidden="true" className="size-5" /></button>
      </header>

      <div className="grid gap-3 px-4 py-4 sm:px-5">
        <label htmlFor={inputId} className="sr-only">รายการรหัสสินค้าและจำนวน</label>
        <Textarea
          id={inputId}
          value={text}
          onChange={event => { setText(event.target.value); setError(''); }}
          rows={5}
          spellCheck={false}
          disabled={checking}
          placeholder={'SKU-880107 10\n8851000000007, 5\nSKU-880114'}
          className="sku min-h-32 bg-panel text-[15px] leading-relaxed md:text-[15px]"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="lg" variant={rows ? 'outline' : 'default'} className="font-bold" disabled={checking || !text.trim()} onClick={check}>
            <ListChecks aria-hidden="true" /> {checking ? 'กำลังตรวจ…' : 'ตรวจรายการ'}
          </Button>
          <span className="num text-[15px] text-ink-2" role="status">
            {checking ? `ตรวจแล้ว ${count.format(progress)} รหัส` : `สูงสุด ${MAX_PASTE_LINES} บรรทัดต่อครั้ง`}
          </span>
        </div>
        {error && <p role="alert" className="text-[15px] text-danger">{error}</p>}
      </div>

      {rows && (
        <div className="border-t border-line">
          <p className="px-4 py-3 text-[15px] sm:px-5" role="status">
            พร้อมเพิ่ม <b className="num">{count.format(ready.length)}</b> รายการ
            {waiting > 0 && <> · รอเลือกหน่วย <b className="num">{count.format(waiting)}</b></>}
            {failed > 0 && <> · ไม่พบ <b className="num text-danger">{count.format(failed)}</b></>}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[15px]">
              <thead>
                <tr className="border-y border-line text-left text-ink-2">
                  <th scope="col" className="py-2 pr-3 pl-4 font-semibold sm:pl-5">บรรทัด</th>
                  <th scope="col" className="px-3 py-2 font-semibold">ผล</th>
                  <th scope="col" className="px-3 py-2 font-semibold">สินค้า</th>
                  <th scope="col" className="px-3 py-2 font-semibold">หน่วย</th>
                  <th scope="col" className="py-2 pr-4 pl-3 text-right font-semibold sm:pr-5">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const product = chosenProduct(row);
                  const bad = row.status === 'missing' || row.status === 'error';
                  return (
                    <tr key={row.lineNumber} className={cn('border-b border-line last:border-0 align-top', bad && 'bg-danger-soft/60')}>
                      <td className="py-2.5 pr-3 pl-4 whitespace-nowrap sm:pl-5"><span className="num text-ink-3">{row.lineNumber}</span> <span className="sku inline-block max-w-[13rem] truncate align-bottom" title={row.code}>{row.code}</span></td>
                      <td className="px-3 py-2.5 whitespace-nowrap"><StatusCell row={row} /></td>
                      <td className="px-3 py-2.5">
                        {bad ? (
                          <span className="text-ink-2">{row.message} <span className="block text-ink-3">“{row.raw}”</span></span>
                        ) : (
                          <><span className="font-semibold">{(product || row.products[0]).name}</span> <span className="sku block">{(product || row.products[0]).sku}</span></>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {row.status === 'units' ? (
                          <select
                            aria-label={`เลือกหน่วยของบรรทัด ${row.lineNumber}`}
                            value={row.chosenId ?? ''}
                            onChange={event => chooseUnit(row.lineNumber, event.target.value)}
                            className={cn('h-11 rounded-md border bg-panel px-2 sm:h-10 text-[15px]', row.chosenId === null ? 'border-[#111] ring-2 ring-turn' : 'border-line-strong')}
                          >
                            <option value="">เลือกหน่วย…</option>
                            {row.products.map(item => <option key={item.goodsId} value={item.goodsId}>{unitLabel(item)}</option>)}
                          </select>
                        ) : product ? unitLabel(product) : <span className="text-ink-3">—</span>}
                      </td>
                      <td className="py-2.5 pr-4 pl-3 text-right sm:pr-5">
                        {product ? (
                          <>
                            <b className="num">{count.format(row.quantity)}</b>
                            {row.note && <span className="block text-[14px] whitespace-nowrap text-ink-2">{row.note}</span>}
                            {row.badQuantity && <span className="block text-[14px] text-ink-2">อ่านจำนวนไม่ได้ ใช้ขั้นต่ำ</span>}
                          </>
                        ) : <span className="text-ink-3">{row.requested ? count.format(row.requested) : '—'}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3 sm:px-5">
            {(waiting > 0 || failed > 0) && <p className="mr-auto text-[15px] text-ink-2">บรรทัดที่ไม่พบหรือยังไม่เลือกหน่วยจะไม่ถูกเพิ่ม</p>}
            <Button type="button" size="lg" className="font-bold max-sm:flex-1" disabled={!ready.length} onClick={addToCart}>
              เพิ่มลงตะกร้า <span className="num">{count.format(ready.length)}</span> รายการ
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
