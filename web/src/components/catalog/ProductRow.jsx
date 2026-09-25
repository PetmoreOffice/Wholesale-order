import React from 'react';
import { Check, Plus } from 'lucide-react';
import { count, money } from '../../lib/format.js';
import { Button } from '@/components/ui/button';

export function ProductRow({ product, inCart = 0, onAdd }) {
  const hasPrice = Number(product.basePrice) > 0;
  // categoryName comes from ICCAT, which holds suppliers, not product groups.
  const group = product.departmentName || 'ไม่ระบุหมวด';
  const unit = `${product.unitName || 'ไม่ระบุหน่วย'}${product.unitQuantity > 1 ? ` × ${count.format(product.unitQuantity)}` : ''}`;
  const atMaximum = Number(product.maximumOrder) > 0 && inCart >= Number(product.maximumOrder);
  return (
    <article className="product-row">
      <div className="product-main">
        <span className="sku">{product.sku}</span>
        <h3>{product.name}</h3>
        <p>{group} · {unit}</p>
      </div>
      <div className="product-meta">
        <span className="meta-label">ขั้นต่ำ</span>
        <b className="num">{count.format(product.minimumOrder || 1)}</b>
      </div>
      <div className="product-meta">
        <span className="meta-label">ราคาอ้างอิง</span>
        {hasPrice ? <b className="num">{money.format(product.basePrice)}</b> : <span className="price-pending-text">รอยืนยัน</span>}
      </div>
      <Button type="button" variant={inCart ? 'secondary' : 'outline'} className="add-button" disabled={atMaximum} onClick={() => onAdd(product)} aria-label={inCart ? `เพิ่ม ${product.name} อีก 1 (ในตะกร้า ${inCart})` : `เพิ่ม ${product.name} ลงตะกร้า`}>
        {inCart ? <><Check aria-hidden="true" /> <span className="num">{count.format(inCart)}</span> ในตะกร้า</> : <><Plus aria-hidden="true" /> เพิ่ม</>}
      </Button>
    </article>
  );
}

export function ProductRowSkeleton() {
  return (
    <div className="product-row" aria-hidden="true">
      <div className="product-main"><span className="skeleton" style={{ width: '5rem' }} /><span className="skeleton" style={{ width: '70%', height: '1.1rem' }} /><span className="skeleton" style={{ width: '40%' }} /></div>
      <div className="product-meta"><span className="skeleton" style={{ width: '2.5rem' }} /></div>
      <div className="product-meta"><span className="skeleton" style={{ width: '4.5rem' }} /></div>
      <span className="skeleton" style={{ width: '4.5rem', height: '2.25rem' }} />
    </div>
  );
}
