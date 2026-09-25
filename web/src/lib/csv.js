// CSV for keying an order into the ERP. The byte-order mark makes Excel read Thai text
// as UTF-8; every cell is quoted so commas, quotes and line breaks survive.
const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export function orderCsv(order) {
  const header = ['เลขที่คำสั่งซื้อ', 'ลูกค้า', 'รหัสสินค้า', 'SKU', 'ชื่อสินค้า', 'จำนวน', 'หน่วย', 'บรรจุต่อหน่วย', 'รายละเอียดจัดส่ง', 'หมายเหตุลูกค้า'];
  const rows = order.items.map((item) => [
    order.orderNumber, order.customerName, item.goodsCode, item.sku, item.name,
    item.quantity, item.unitName, item.unitQuantity, order.deliveryDetails, order.customerNote
  ]);
  return '﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function downloadFile(name, content, type) {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
