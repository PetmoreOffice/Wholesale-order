import { api } from '@/lib/api';
import { count } from '@/lib/format';

export const PAGE_SIZE = 50;

// The shelf tree changes rarely; one load per visit is enough.
export const departmentsQuery = {
  queryKey: ['products', 'departments'],
  queryFn: () => api('/products/departments').then(result => result.data || []),
  staleTime: 10 * 60_000
};

/** One page of the catalog. The total only comes with page 1 (it costs a COUNT on the server). */
export function productsQuery({ q, g, d, s, page }) {
  const params = new URLSearchParams({ q, limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
  if (page === 1) params.set('includeTotal', 'true');
  if (s || d) params.set('departmentId', s || d);
  else if (g) params.set('groupId', g);
  return {
    queryKey: ['products', 'list', q, g, d, s, page],
    queryFn: () => api(`/products?${params}`)
  };
}

/** SELECT-only lookup that matches a barcode, SKU code or goods code. */
export function lookupCode(code) {
  return api(`/products/barcode/${encodeURIComponent(code)}`);
}

export function visiblePages(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, 'end-gap', totalPages];
  if (currentPage >= totalPages - 3) return [1, 'start-gap', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) pages.push('start-gap');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push('end-gap');
  pages.push(totalPages);
  return pages;
}

// value: { g, d, s } = group id, department id, sub-department id (strings, '' when unset).
export function findCategory(groups, { g, d, s }) {
  const group = groups.find(item => item.id === g) || null;
  const pool = group ? group.departments : groups.flatMap(item => item.departments);
  const department = pool.find(item => String(item.id) === d) || null;
  const sub = department?.children.find(item => String(item.id) === s) || null;
  return { group: group || (department ? groups.find(item => item.departments.includes(department)) : null), department, sub };
}

export const minimumOf = (product) => Number(product.minimumOrder) || 1;
export const maximumOf = (product) => Number(product.maximumOrder) || 0;

export function unitLabel(product) {
  return `${product.unitName || 'ไม่ระบุหน่วย'}${product.unitQuantity > 1 ? ` × ${count.format(product.unitQuantity)}` : ''}`;
}

/** Keeps a quantity inside a product's minimum and maximum; says what changed, if anything. */
export function clampQuantity(product, requested) {
  const minimum = minimumOf(product);
  const maximum = maximumOf(product);
  if (requested === null) return { quantity: minimum, note: '' };
  if (requested < minimum) return { quantity: minimum, note: `ปรับเป็นขั้นต่ำ ${count.format(minimum)}` };
  if (maximum && requested > maximum) return { quantity: maximum, note: `ปรับเป็นสูงสุด ${count.format(maximum)}` };
  return { quantity: requested, note: '' };
}

export const MAX_PASTE_LINES = 100;

/**
 * Reads pasted lines: code first, then an optional quantity, separated by spaces, commas,
 * semicolons or tabs (a copied Excel range). Blank lines are skipped.
 */
export function parsePastedLines(text) {
  return text.split(/\r?\n/).map((raw, index) => ({ raw: raw.trim(), lineNumber: index + 1 }))
    .filter(line => line.raw)
    .map(({ raw, lineNumber }) => {
      // Excel keeps "1,000" in one cell, so a tab-separated line splits on tabs only.
      const parts = raw.includes('\t') ? raw.split('\t') : raw.split(/[,;]|\s+/);
      const [code = '', quantityText] = parts.map(part => part.trim()).filter(Boolean);
      const parsed = quantityText === undefined ? null : Number(quantityText.replace(/,/g, ''));
      const valid = parsed === null || (Number.isInteger(parsed) && parsed > 0);
      return { raw, lineNumber, code, requested: valid ? parsed : null, badQuantity: !valid };
    });
}

/** Runs `worker` over `items` with at most `limit` in flight; results keep the input order. */
export async function mapLimited(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}
