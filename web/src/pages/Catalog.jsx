import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { ScanBarcode, Search, X } from 'lucide-react';
import { apiFetch, apiUrl } from '../api/client.js';
import { readCart, writeCart } from '../lib/cart.js';
import { count } from '../lib/format.js';
import { Cart } from '../components/catalog/Cart.jsx';
import { CategoryNav } from '../components/catalog/CategoryNav.jsx';
import { OrderReview } from '../components/catalog/OrderReview.jsx';
import { ProductRow, ProductRowSkeleton } from '../components/catalog/ProductRow.jsx';
import { Scanner } from '../components/catalog/Scanner.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { AnimatedContent } from '../components/react-bits/AnimatedContent.jsx';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';

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
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [retry, setRetry] = useState(0);
  async function catalogData(response) {
    if (response.status === 401) throw new Error('Session ไม่ถูกต้อง กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่');
    if (response.status === 403) throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าถึงสินค้า');
    if (!response.ok) throw new Error(`API โหลดสินค้าไม่สำเร็จ (HTTP ${response.status}) กรุณาตรวจสอบ Terminal ของ API`);
    return response.json();
  }
  const [groups, setGroups] = useState([]);
  // The shelf lives in the URL (?g=&d=&s=) so refresh, back and shared links keep it.
  const [searchParams, setSearchParams] = useSearchParams();
  const category = { g: searchParams.get('g') || '', d: searchParams.get('d') || '', s: searchParams.get('s') || '' };
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const listRef = useRef(null);

  // Pagination buttons sit under the list: bring the new page's first product into view.
  function goToPage(nextPage) {
    setPage(nextPage);
    const list = listRef.current;
    if (list && list.getBoundingClientRect().top < 0) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      list.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
    }
  }
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [cart, setCart] = useState(() => readCart(session.uid));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanner, setScanner] = useState(false);
  const [review, setReview] = useState(false);
  // A repeat order from another page arrives with a summary to show once.
  const [scanNotice, setScanNotice] = useState(location.state?.notice || '');

  useEffect(() => {
    if (location.state?.notice) navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
  }, []);

  useEffect(() => {
    apiFetch(`${apiUrl}/products/departments`)
      .then(catalogData)
      .then(data => setGroups(data.data))
      .catch(() => setError('ไม่สามารถโหลดประเภทสินค้าได้'));
  }, []);

  async function loadProducts() {
    const params = new URLSearchParams({ q: submittedQuery, limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
    if (page === 1) params.set('includeTotal', 'true');
    if (category.s || category.d) params.set('departmentId', category.s || category.d);
    else if (category.g) params.set('groupId', category.g);
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
  }, [submittedQuery, category.g, category.d, category.s, retry, page]);

  useEffect(() => {
    writeCart(session.uid, cart);
  }, [cart, session.uid]);

  function add(product) {
    setCart(current => {
      const found = current.find(item => item.goodsId === product.goodsId);
      const maximum = Number(product.maximumOrder) || Infinity;
      return found
        ? current.map(item => item.goodsId === product.goodsId ? { ...item, quantity: Math.min(maximum, item.quantity + 1) } : item)
        : [...current, { ...product, quantity: Number(product.minimumOrder) || 1 }];
    });
  }

  function updateCart(goodsId, quantity) {
    setCart(items => quantity === 0 ? items.filter(item => item.goodsId !== goodsId) : items.map(item => item.goodsId === goodsId ? { ...item, quantity } : item));
  }

  function chooseCategory(next) {
    setPage(1);
    const params = new URLSearchParams();
    for (const key of ['g', 'd', 's']) if (next[key]) params.set(key, next[key]);
    setSearchParams(params);
  }

  function clearSearch() {
    setQuery(''); setPage(1); setSubmittedQuery('');
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

  const inCart = new Map(cart.map(item => [item.goodsId, item.quantity]));

  return (
    <>
      <div className="page catalog-layout">
        <AnimatedContent className="catalog-content" distance={12}>
          <PageHeader
            title="สินค้า"
            description="ค้นหาด้วยชื่อ, SKU หรือบาร์โค้ด แล้วเลือกหน่วยขายก่อนเพิ่มลงตะกร้า"
            actions={<Button type="button" variant="outline" size="lg" onClick={() => setScanner(true)}><ScanBarcode aria-hidden="true" /> สแกนบาร์โค้ด</Button>}
          />
          <form className="search-bar" role="search" onSubmit={e => { e.preventDefault(); setPage(1); setSubmittedQuery(query.trim()); }}>
            <label className="sr-only" htmlFor="search">ค้นหาสินค้า</label>
            <InputGroup className="search-field h-10 bg-card">
              <InputGroupInput id="search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="ชื่อสินค้า, SKU หรือบาร์โค้ด" autoComplete="off" />
              <InputGroupAddon align="inline-start"><Search aria-hidden="true" /></InputGroupAddon>
            </InputGroup>
            <Button size="lg">ค้นหา</Button>
          </form>
          <nav aria-label="หมวดหมู่สินค้า">
            <CategoryNav groups={groups} value={category} onChange={chooseCategory} />
          </nav>
          {scanNotice && (
            <div className="notice" role="status">
              <span>{scanNotice}</span>
              <button type="button" className="icon-button" onClick={() => setScanNotice('')} aria-label="ปิดข้อความ"><X aria-hidden="true" /></button>
            </div>
          )}
          <section ref={listRef} className="panel catalog" aria-live="polite" aria-busy={loading}>
            <div className="catalog-head">
              <span>
                {loading ? 'กำลังโหลดสินค้า…' : totalProducts ? <><b className="num">{count.format(totalProducts)}</b> รายการ{submittedQuery && <> ที่ตรงกับ “{submittedQuery}”</>} · หน้า <span className="num">{page}</span>/<span className="num">{totalPages}</span></> : 'ไม่พบสินค้า'}
              </span>
              {submittedQuery && <button type="button" className="link-button" onClick={clearSearch}>ล้างการค้นหา</button>}
            </div>
            <div className="catalog-columns" aria-hidden="true"><span>สินค้า</span><span>ขั้นต่ำ</span><span>ราคาอ้างอิง</span><span /></div>
            {error ? (
              <div className="state" data-tone="danger">
                <b>โหลดสินค้าไม่สำเร็จ</b>
                <p>{error}</p>
                <Button type="button" variant="outline" onClick={() => setRetry(value => value + 1)}>ลองใหม่</Button>
              </div>
            ) : loading ? (
              Array.from({ length: 6 }, (_, index) => <ProductRowSkeleton key={index} />)
            ) : products.length ? (
              <>
                {products.map(product => <ProductRow key={`${product.goodsId}-${product.unitId || ''}`} product={product} inCart={inCart.get(product.goodsId) || 0} onAdd={add} />)}
                {totalPages > 1 && (
                  <nav className="catalog-pagination" aria-label="เปลี่ยนหน้าสินค้า">
                    <Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => goToPage(page - 1)}>ก่อนหน้า</Button>
                    <div className="pagination-pages">
                      {visiblePages(page, totalPages).map(value => typeof value === 'string'
                        ? <span key={value} aria-hidden="true">…</span>
                        : <Button type="button" key={value} variant={value === page ? 'default' : 'ghost'} size="sm" className="num" aria-current={value === page ? 'page' : undefined} onClick={() => goToPage(value)}>{value}</Button>)}
                    </div>
                    <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>ถัดไป</Button>
                  </nav>
                )}
              </>
            ) : (
              <div className="state">
                <b>ไม่พบสินค้า{submittedQuery ? ` “${submittedQuery}”` : ''}</b>
                <p>ลองค้นหาด้วย SKU, บาร์โค้ด หรือชื่อสินค้าที่สั้นลง</p>
                {submittedQuery && <Button type="button" variant="outline" onClick={clearSearch}>ล้างการค้นหา</Button>}
              </div>
            )}
          </section>
          <p className="catalog-footnote">ซ่อนสินค้าที่เลิกผลิตแล้ว · ราคาสุทธิยืนยันโดยแอดมินหลังส่งคำสั่งซื้อ</p>
        </AnimatedContent>
        <AnimatedContent className="catalog-cart" distance={12} direction="horizontal" reverse delay={0.06}>
          <Cart items={cart} onChange={updateCart} onReview={() => setReview(true)} />
        </AnimatedContent>
      </div>
      {scanner && <Scanner onResult={scan} onClose={() => setScanner(false)} />}
      {review && <OrderReview items={cart} accountName={session.name} role={session.role} onSaved={() => setCart([])} onClose={() => setReview(false)} />}
    </>
  );
}
