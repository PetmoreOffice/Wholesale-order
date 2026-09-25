import React, { useEffect, useState } from 'react';
import { apiFetch, apiUrl } from '../api/client.js';
import { Cart } from '../components/catalog/Cart.jsx';
import { OrderReview } from '../components/catalog/OrderReview.jsx';
import { ProductRow } from '../components/catalog/ProductRow.jsx';
import { Scanner } from '../components/catalog/Scanner.jsx';
import { AnimatedContent } from '../components/react-bits/AnimatedContent.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 50;

function visiblePages(currentPage, totalPages) {
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

export function Catalog({ session }) {
  const cartKey = `wholesale-cart:${session.uid}`;
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [retry, setRetry] = useState(0);
  async function catalogData(response) {
    if (response.status === 401) throw new Error('Session ไม่ถูกต้อง กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่');
    if (response.status === 403) throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าถึงสินค้า');
    if (!response.ok) throw new Error(`API โหลดสินค้าไม่สำเร็จ (HTTP ${response.status}) กรุณาตรวจสอบ Terminal ของ API`);
    return response.json();
  }
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState('');
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [cart, setCart] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(cartKey)); return Array.isArray(saved) ? saved : []; } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanner, setScanner] = useState(false);
  const [review, setReview] = useState(false);
  const [scanNotice, setScanNotice] = useState('');

  useEffect(() => {
    apiFetch(`${apiUrl}/products/departments`)
      .then(catalogData)
      .then(data => setDepartments(data.data))
      .catch(() => setError('ไม่สามารถโหลดประเภทสินค้าได้'));
  }, []);

  async function loadProducts() {
    const params = new URLSearchParams({ q: submittedQuery, limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
    if (page === 1) params.set('includeTotal', 'true');
    if (department) params.set('departmentId', department);
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`${apiUrl}/products?${params}`).then(catalogData);
      const items = data.data || [];
      setProducts(items);
      if (Number.isInteger(data.pagination?.totalPages)) setTotalPages(data.pagination.totalPages);
      if (Number.isInteger(data.pagination?.total)) setTotalProducts(data.pagination.total);
    } catch (err) {
      setError(err instanceof TypeError ? 'เชื่อมต่อ API ไม่สำเร็จ กรุณาตรวจสอบว่า API เปิดอยู่และอนุญาต URL ของหน้าเว็บนี้' : err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, [submittedQuery, department, retry, page]);

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, cartKey]);

  function add(product) {
    setCart(current => {
      const found = current.find(item => item.goodsId === product.goodsId);
      return found
        ? current.map(item => item.goodsId === product.goodsId ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...product, quantity: Number(product.minimumOrder) || 1 }];
    });
  }

  function updateCart(goodsId, quantity) {
    setCart(items => quantity === 0 ? items.filter(item => item.goodsId !== goodsId) : items.map(item => item.goodsId === goodsId ? { ...item, quantity } : item));
  }

  async function scan(barcode) {
    setScanner(false);
    setScanNotice('กำลังค้นหารหัส…');
    try {
      const response = await apiFetch(`${apiUrl}/products/barcode/${encodeURIComponent(barcode)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      if (data.requiresUnitSelection) {
        setScanNotice(`พบ ${data.data.length} หน่วยขาย — เลือกหน่วยก่อนเพิ่มลงตะกร้า`);
      } else {
        add(data.data[0]);
        setScanNotice(`เพิ่ม ${data.data[0].name} ลงตะกร้าแล้ว`);
      }
      setProducts(data.data);
      setPage(1); setTotalPages(1); setTotalProducts(data.data.length);
    } catch (err) {
      setScanNotice(err.message || 'ไม่พบสินค้านี้');
    }
  }

  return (
    <>
      <section className="catalog-layout" id="catalog">
        <AnimatedContent className="catalog-content" distance={16}>
          <p className="eyebrow">CUSTOMER PORTAL / CATALOG</p>
          <div className="title-row">
            <div>
              <h1>ค้นหาสินค้า</h1>
              <p>เลือกสินค้าและหน่วยขายที่ต้องการก่อนเพิ่มลงตะกร้า</p>
            </div>
            <Button type="button" variant="outline" className="scan-button" onClick={() => setScanner(true)}>⌁ <span>สแกนบาร์โค้ด</span></Button>
          </div>
          <form className="search-bar" onSubmit={e => { e.preventDefault(); setPage(1); setSubmittedQuery(query); }}>
            <label className="sr-only" htmlFor="search">ค้นหาสินค้า</label>
            <Input id="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาชื่อสินค้า, SKU หรือบาร์โค้ด" />
            <Button className="primary">ค้นหา</Button>
          </form>
          <nav className="type-tabs" aria-label="ประเภทสินค้า">
            <Button type="button" variant={!department ? 'default' : 'ghost'} className={!department ? 'type-tab active' : 'type-tab'} onClick={() => { setPage(1); setDepartment(''); }}>ทั้งหมด</Button>
            {departments.map(item => (
              <Button type="button" key={item.id} variant={String(item.id) === department ? 'default' : 'ghost'} className={String(item.id) === department ? 'type-tab active' : 'type-tab'} onClick={() => { setPage(1); setDepartment(String(item.id)); }}>{item.name}</Button>
            ))}
          </nav>
          {scanNotice && (
            <div className="notice" role="status">
              {scanNotice}
              <button onClick={() => setScanNotice('')} aria-label="ปิด">×</button>
            </div>
          )}
          <section className="catalog" aria-live="polite">
            <div className="catalog-head">
              <span>{loading ? 'กำลังโหลดสินค้า…' : totalProducts ? `รวม ${totalProducts.toLocaleString('th-TH')} รายการ · หน้า ${page} จาก ${totalPages}` : 'ไม่พบสินค้า'}</span>
              <span>สินค้าเลิกผลิตถูกซ่อนไว้แล้ว</span>
            </div>
            {error ? (
              <div className="state error">
                <b>โหลดสินค้าไม่สำเร็จ</b>
                <p>{error}</p>
                <Button type="button" variant="outline" className="secondary" onClick={() => setRetry(value => value + 1)}>ลองใหม่</Button>
              </div>
            ) : loading ? (
              <div className="state">กำลังดึงข้อมูลจากคลังสินค้า…</div>
            ) : products.length ? (
              <>
                {products.map(product => <ProductRow key={`${product.goodsId}-${product.unitId || ''}`} product={product} onAdd={add} />)}
                <div className="catalog-pagination" aria-label="เปลี่ยนหน้าสินค้า">
                  <Button type="button" variant="outline" size="sm" className="pagination-control" disabled={page === 1} onClick={() => setPage(current => current - 1)}>ก่อนหน้า</Button>
                  <div className="pagination-pages">
                    {visiblePages(page, totalPages).map(value => typeof value === 'string'
                      ? <span key={value} aria-hidden="true">…</span>
                      : <Button type="button" key={value} variant={value === page ? 'default' : 'outline'} size="sm" className="pagination-page" aria-current={value === page ? 'page' : undefined} onClick={() => setPage(value)}>{value}</Button>)}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="pagination-control" disabled={page >= totalPages} onClick={() => setPage(current => current + 1)}>ถัดไป</Button>
                </div>
              </>
            ) : (
              <div className="state">
                <b>ไม่พบสินค้า</b>
                <p>ลองค้นหาด้วย SKU หรือชื่อสินค้าอื่น</p>
              </div>
            )}
          </section>
        </AnimatedContent>
        <AnimatedContent className="catalog-cart-motion" distance={14} direction="horizontal" reverse delay={0.08}>
          <Cart items={cart} onChange={updateCart} onReview={() => setReview(true)} />
        </AnimatedContent>
      </section>
      {scanner && <Scanner onResult={scan} onClose={() => setScanner(false)} />}
      {review && <OrderReview items={cart} accountName={session.name} role={session.role} onSaved={() => setCart([])} onClose={() => setReview(false)} />}
    </>
  );
}
