import React from 'react';
import { money } from '../../lib/format.js';
import { Button } from '@/components/ui/button';

export function ProductRow({ product, onAdd }) {
  const hasPrice = Number(product.basePrice) > 0;
  return (
    <article className="product-row">
      <div className="product-main">
        <span className="sku">{product.sku}</span>
        <h3>{product.name}</h3>
        <p>{product.departmentName ? `ประเภท: ${product.departmentName}` : product.categoryName || 'ไม่ระบุกลุ่ม'} · {product.unitName || 'ไม่ระบุหน่วย'}{product.unitQuantity > 1 ? ` × ${product.unitQuantity}` : ''}</p>
      </div>
      <div className="product-meta"><span>MOQ</span><b>{product.minimumOrder || 1}</b></div>
      <div className="product-meta price">
        <span>{hasPrice ? 'ราคาอ้างอิง' : 'ราคา'}</span>
        <b>{hasPrice ? money.format(product.basePrice) : 'รอการยืนยัน'}</b>
      </div>
      <Button type="button" variant="outline" className="add" onClick={() => onAdd(product)}>เพิ่ม <span>+</span></Button>
    </article>
  );
}
