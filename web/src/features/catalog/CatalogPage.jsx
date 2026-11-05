import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardPaste, Info, ScanBarcode, Search, X } from 'lucide-react';
import { mergeIntoCart, readCart, writeCart } from '@/lib/cart';
import { count } from '@/lib/format';
import { useSession } from '@/lib/session';
import { PageHeader, StateBlock } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { CartBar, CartPanel } from './Cart.jsx';
import { CategoryShelf } from './CategoryShelf.jsx';
import { OrderReview } from './OrderReview.jsx';
import { ProductList, ProductListSkeleton } from './ProductList.jsx';
import { QuickOrder } from './QuickOrder.jsx';
import { Scanner } from './Scanner.jsx';
import { departmentsQuery, lookupCode, maximumOf, minimumOf, productsQuery, visiblePages } from './catalogData.js';

const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="เปลี่ยนหน้าสินค้า" className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 sm:px-5">
      <Button type="button" variant="outline" disabled={page === 1} onClick={() => onPage(page - 1)}>ก่อนหน้า</Button>
      <ol className="flex flex-wrap items-center gap-1">
        {visiblePages(page, totalPages).map(value => typeof value === 'string'
          ? <li key={value} aria-hidden="true" className="px-1 text-ink-3">…</li>
          : (
            <li key={value}>
              <Button type="button" variant={value === page ? 'default' : 'ghost'} size="icon" className="num text-[15px] font-bold" aria-current={value === page ? 'page' : undefined} aria-label={`หน้า ${value}`} onClick={() => onPage(value)}>{value}</Button>
            </li>
          ))}
      </ol>
      <Button type="button" variant="outline" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>ถัดไป</Button>
    </nav>
  );
}

export default function CatalogPage() {
  const session = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  // The shelf lives in the URL (?g=&d=&s=) so refresh, back and shared links keep it.
  const [searchParams, setSearchParams] = useSearchParams();
  const category = { g: searchParams.get('g') || '', d: searchParams.get('d') || '', s: searchParams.get('s') || '' };
  // The Ctrl+K search can open the catalog with a term (location.state.search).
  const [query, setQuery] = useState(() => location.state?.search || '');
  const [submittedQuery, setSubmittedQuery] = useState(() => location.state?.search || '');
  useEffect(() => {
    const search = location.state?.search;
    if (search) { setQuery(search); setSubmittedQuery(search); setScan(null); }
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const filterKey = JSON.stringify([submittedQuery, category.g, category.d, category.s]);
  // A new search or shelf starts at page 1 without an effect: the page belongs to its filter.
  const [paging, setPaging] = useState({ key: filterKey, page: 1 });
  const page = paging.key === filterKey ? paging.page : 1;
  // A scan result replaces the list until the shopper searches, pages or changes shelf.
  const [scan, setScan] = useState(null);
  const scanShown = scan && scan.key === filterKey ? scan : null;

  const [cart, setCart] = useState(() => readCart(session.uid));
  const [scannerOpen, setScannerOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  // A repeat order from another page arrives with a summary to show once.
  const [notice, setNotice] = useState(location.state?.notice || '');
  const listRef = useRef(null);
  const cartRef = useRef(null);
  const totalsRef = useRef(new Map());

  const departments = useQuery(departmentsQuery);
  const products = useQuery({ ...productsQuery({ q: submittedQuery, ...category, page }), enabled: !scanShown });

  // The total arrives with page 1 only; remember it for the other pages of the same filter.
  if (Number.isInteger(products.data?.pagination?.total)) {
    totalsRef.current.set(filterKey, { total: products.data.pagination.total, totalPages: products.data.pagination.totalPages });
  }
  const totals = scanShown ? { total: scanShown.items.length, totalPages: 1 } : totalsRef.current.get(filterKey) || { total: 0, totalPages: 0 };
  const rows = scanShown ? scanShown.items : products.data?.data || [];
  const loading = !scanShown && products.isPending;

  useEffect(() => {
    if (location.state?.notice) navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { writeCart(session.uid, cart); }, [cart, session.uid]);

  // The shell's phone cart button links to /catalog#cart: open the cart (sheet on phones).
  useEffect(() => {
    if (location.hash !== '#cart') return;
    if (isDesktop()) {
      cartRef.current?.scrollIntoView({ block: 'start' });
      cartRef.current?.focus({ preventScroll: true });
    } else {
      setCartSheetOpen(true);
    }
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  function add(product) {
    setCart(current => {
      const found = current.find(item => item.goodsId === product.goodsId);
      const maximum = maximumOf(product) || Infinity;
      return found
        ? current.map(item => item.goodsId === product.goodsId ? { ...item, quantity: Math.min(maximum, item.quantity + 1) } : item)
        : [...current, { ...product, quantity: minimumOf(product) }];
    });
  }

  function updateCart(goodsId, quantity) {
    setCart(items => quantity === 0 ? items.filter(item => item.goodsId !== goodsId) : items.map(item => item.goodsId === goodsId ? { ...item, quantity } : item));
  }

  function chooseCategory(next) {
    setScan(null);
    const params = new URLSearchParams();
    for (const key of ['g', 'd', 's']) if (next[key]) params.set(key, next[key]);
    setSearchParams(params);
  }

  // Pagination sits under the list: bring the new page's first product into view.
  function goToPage(nextPage) {
    setScan(null);
    setPaging({ key: filterKey, page: nextPage });
    const list = listRef.current;
    if (list && list.getBoundingClientRect().top < 0) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      list.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
    }
  }

  function clearSearch() {
    setQuery(''); setSubmittedQuery(''); setScan(null);
  }

  // Confirmations are toasts: they say what happened without pushing the list down.
  const viewCart = { label: 'ดูตะกร้า', onClick: () => isDesktop() ? cartRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) : setCartSheetOpen(true) };

  function addAndTell(product) {
    add(product);
    toast.success(`เพิ่ม ${product.name} ลงตะกร้าแล้ว`, { id: `cart-${product.goodsId}`, action: viewCart });
  }

  async function lookUp(code) {
    setScannerOpen(false);
    toast.loading('กำลังค้นหารหัส…', { id: 'scan' });
    try {
      const data = await lookupCode(code);
      setScan({ key: filterKey, code, items: data.data });
      if (data.requiresUnitSelection) {
        toast.info(`พบ ${data.data.length} หน่วยขาย — เลือกหน่วยก่อนเพิ่มลงตะกร้า`, { id: 'scan' });
      } else {
        add(data.data[0]);
        toast.success(`เพิ่ม ${data.data[0].name} ลงตะกร้าแล้ว`, { id: 'scan', action: viewCart });
      }
    } catch (err) {
      toast.error(err.message || 'ไม่พบสินค้านี้', { id: 'scan' });
    }
  }

  function addPasted(items) {
    setCart(current => mergeIntoCart(current, items));
    setQuickOpen(false);
    toast.success(`เพิ่ม ${count.format(items.length)} รายการลงตะกร้าแล้ว`, { action: viewCart });
  }

  const inCart = new Map(cart.map(item => [item.goodsId, item.quantity]));
  // Prices are admin-only; the API does not send them to customers either.
  const showPrice = session.role === 'admin';
  const firstSku = rows[0]?.sku;
  const lastSku = rows.at(-1)?.sku;

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title="สินค้า"
        description="ค้นหาด้วยชื่อ, SKU หรือบาร์โค้ด แล้วเลือกหน่วยขายก่อนเพิ่มลงตะกร้า"
        actions={(
          <>
            <Button type="button" variant="outline" size="lg" aria-expanded={quickOpen} onClick={() => setQuickOpen(open => !open)}><ClipboardPaste aria-hidden="true" /> วางรายการ SKU</Button>
            <Button type="button" variant="outline" size="lg" onClick={() => setScannerOpen(true)}><ScanBarcode aria-hidden="true" /> สแกนบาร์โค้ด</Button>
          </>
        )}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {quickOpen && <QuickOrder onAdd={addPasted} onClose={() => setQuickOpen(false)} />}

          <form role="search" className="mb-3 flex gap-2" onSubmit={event => { event.preventDefault(); setScan(null); setSubmittedQuery(query.trim()); }}>
            <label className="sr-only" htmlFor="search">ค้นหาสินค้า</label>
            <InputGroup className="h-11 bg-panel">
              <InputGroupInput id="search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="ชื่อสินค้า, SKU หรือบาร์โค้ด" autoComplete="off" className="text-[16px] md:text-[16px]" />
              <InputGroupAddon align="inline-start"><Search aria-hidden="true" className="size-5" /></InputGroupAddon>
            </InputGroup>
            <Button size="lg" className="h-11 px-5 text-[15px] font-bold">ค้นหา</Button>
          </form>

          <div className="mb-4">
            <CategoryShelf groups={departments.data || []} error={departments.error} value={category} onChange={chooseCategory} />
          </div>

          {notice && (
            <div role="status" className="mb-4 flex items-start gap-3 rounded-lg bg-info-soft px-4 py-3 text-[15px] text-info">
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <span className="flex-1 text-ink">{notice}</span>
              <button type="button" onClick={() => setNotice('')} aria-label="ปิดข้อความ" className="-my-1.5 -mr-2 grid size-9 place-items-center rounded-md text-info hover:bg-white/60"><X aria-hidden="true" className="size-4" /></button>
            </div>
          )}

          <section ref={listRef} aria-labelledby="catalog-head" aria-busy={loading} className="scroll-mt-20 overflow-hidden rounded-xl border border-line bg-panel">
            {/* The head names the stretch of shelf on screen, like a dictionary's guide words. */}
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line px-4 py-3 sm:px-5">
              <h2 id="catalog-head" className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-[17px] font-bold">
                {loading ? 'กำลังโหลดสินค้า…' : rows.length ? (
                  <>
                    {scanShown ? <span>ผลค้นหารหัส <span className="sku text-[15px]">{scanShown.code}</span></span> : (
                      <span className="sku text-[15px] font-bold">{firstSku}{lastSku !== firstSku && <> <span className="font-sans text-ink-3">ถึง</span> {lastSku}</>}</span>
                    )}
                  </>
                ) : 'รายการสินค้า'}
              </h2>
              {!loading && totals.total > 0 && (
                <p className="text-[15px] text-ink-2">
                  <b className="num text-ink">{count.format(totals.total)}</b> รายการ{submittedQuery && !scanShown && <> ที่ตรงกับ “{submittedQuery}”</>}
                  {totals.totalPages > 1 && <> · หน้า <span className="num">{page}</span>/<span className="num">{totals.totalPages}</span></>}
                </p>
              )}
              {(submittedQuery || scanShown) && (
                <button type="button" onClick={scanShown ? () => setScan(null) : clearSearch} className="ml-auto text-[15px] font-semibold text-brand hover:underline">{scanShown ? 'กลับไปรายการสินค้า' : 'ล้างการค้นหา'}</button>
              )}
            </div>

            {!scanShown && products.error ? (
              <StateBlock tone="danger" title="โหลดสินค้าไม่สำเร็จ" action={<Button type="button" variant="outline" onClick={() => products.refetch()}>ลองใหม่</Button>}>{products.error.message}</StateBlock>
            ) : loading ? (
              <ProductListSkeleton />
            ) : rows.length ? (
              <>
                <ProductList products={rows} inCart={inCart} onAdd={addAndTell} showPrice={showPrice} />
                {!scanShown && <Pagination page={page} totalPages={totals.totalPages} onPage={goToPage} />}
              </>
            ) : (
              <StateBlock
                title={`ไม่พบสินค้า${submittedQuery ? ` “${submittedQuery}”` : ''}`}
                action={submittedQuery && <Button type="button" variant="outline" onClick={clearSearch}>ล้างการค้นหา</Button>}
              >
                ลองค้นหาด้วย SKU, บาร์โค้ด หรือชื่อสินค้าที่สั้นลง
              </StateBlock>
            )}
          </section>
          <p className="mt-3 text-[14px] text-ink-3">ซ่อนสินค้าที่เลิกผลิตแล้ว{showPrice ? ' · ราคาอ้างอิงจาก GOODSMASTER แสดงเฉพาะแอดมิน' : ' · แอดมินจะติดต่อยืนยันรายละเอียดหลังตรวจคำสั่งซื้อ'}</p>
        </div>

        <aside aria-label="ตะกร้าสินค้า" className="hidden lg:block">
          <CartPanel ref={cartRef} items={cart} onChange={updateCart} onReview={() => setReviewOpen(true)} />
        </aside>
      </div>

      <CartBar items={cart} onChange={updateCart} onReview={() => setReviewOpen(true)} open={cartSheetOpen} onOpenChange={setCartSheetOpen} />

      {scannerOpen && <Scanner onResult={lookUp} onClose={() => setScannerOpen(false)} />}
      {reviewOpen && <OrderReview items={cart} accountName={session.name} role={session.role} onSaved={() => setCart([])} onClose={() => setReviewOpen(false)} />}
    </div>
  );
}
