import { apiFetch, apiUrl } from '../api/client.js';

// The cart is a per-account convenience kept in this browser only; the API re-validates
// every line when the order is saved.
const cartKey = (uid) => `wholesale-cart:${uid}`;

export function readCart(uid) {
  try {
    const saved = JSON.parse(localStorage.getItem(cartKey(uid)));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function writeCart(uid, items) {
  try { localStorage.setItem(cartKey(uid), JSON.stringify(items)); } catch { /* storage full or blocked: the cart still works in memory */ }
}

// Adds reordered lines to what is already in the cart, never above a product's maximum.
export function mergeIntoCart(cart, items) {
  const merged = cart.map(item => ({ ...item }));
  for (const item of items) {
    const existing = merged.find(row => row.goodsId === item.goodsId);
    const maximum = Number(item.maximumOrder) || Infinity;
    if (existing) existing.quantity = Math.min(maximum, existing.quantity + item.quantity);
    else merged.push({ ...item });
  }
  return merged;
}

/**
 * Repeat order: asks the API for the order's lines as they are sold today (read-only),
 * puts them in this account's cart and returns a Thai summary for the catalog notice.
 */
export async function reorderIntoCart(uid, orderId) {
  const response = await apiFetch(`${apiUrl}/orders/${orderId}/reorder-items`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'สั่งซ้ำไม่สำเร็จ');
  const { orderNumber, items, unavailable, adjusted } = data.data;
  if (!items.length) throw new Error(`สินค้าใน ${orderNumber} ไม่พร้อมขายแล้วทั้งหมด`);
  writeCart(uid, mergeIntoCart(readCart(uid), items));
  const parts = [`เพิ่ม ${items.length} รายการจาก ${orderNumber} ลงตะกร้าแล้ว`];
  if (adjusted.length) parts.push(`ปรับจำนวน ${adjusted.length} รายการตามขั้นต่ำ/สูงสุดปัจจุบัน`);
  if (unavailable.length) parts.push(`ไม่พร้อมขายแล้ว: ${unavailable.map(item => item.name).join(', ')}`);
  return parts.join(' · ');
}
