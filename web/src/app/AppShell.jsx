import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { signOut } from 'firebase/auth';
import { ClipboardList, House, Inbox, LogOut, Package, PawPrint, Settings, ShoppingCart } from 'lucide-react';
import { RailMeadow } from '@/components/meadow/RailMeadow';
import { SkyBackdrop } from '@/components/meadow/SkyBackdrop';
import { auth } from '@/firebase';
import { demoMode } from '@/lib/api';
import { readCart } from '@/lib/cart';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { CommandPalette } from '@/features/search/CommandPalette';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** The brand mark: a paw print on a kibble-orange disc. */
export function BrandMark({ className }) {
  return (
    <span aria-hidden="true" className={cn('grid size-9 shrink-0 place-items-center rounded-full bg-kibble text-ink', className)}><PawPrint className="size-[60%]" strokeWidth={2.4} /></span>
  );
}

function useCartCount(uid) {
  const [count, setCount] = useState(() => readCart(uid).length);
  useEffect(() => {
    const update = () => setCount(readCart(uid).length);
    window.addEventListener('wholesale-cart', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('wholesale-cart', update); window.removeEventListener('storage', update); };
  }, [uid]);
  return count;
}

export function AppShell({ session, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const area = location.pathname.split('/')[1];
  const cartCount = useCartCount(session.uid);
  const customer = session.role === 'customer';
  const links = customer
    ? [
        { to: '/home', label: 'หน้าหลัก', icon: House },
        { to: '/catalog', label: 'สินค้า', icon: Package, count: cartCount, countLabel: 'รายการในตะกร้า' },
        { to: '/orders', label: 'คำสั่งซื้อ', icon: ClipboardList }
      ]
    : [
        { to: '/admin', label: 'คิวงาน', icon: Inbox },
        { to: '/catalog', label: 'สินค้า', icon: Package, count: cartCount, countLabel: 'รายการในตะกร้า' },
        { to: '/settings', label: 'ตั้งค่า', icon: Settings }
      ];

  async function logOut() {
    // Start the next account at its own home page instead of this account's last URL.
    navigate('/', { replace: true });
    if (auth) await signOut(auth);
  }

  return (
    // isolate keeps the sky's negative z-index above the page background.
    <div className="relative isolate min-h-dvh w-full lg:grid lg:grid-cols-[232px_1fr]">
      {/* The morning sky behind the work area: slowly turning sun rays and hazy hills. */}
      <SkyBackdrop className="fixed inset-0 -z-10 lg:left-[232px]" />
      <a href="#content" className="sr-only z-50 rounded-md bg-panel px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">ข้ามไปเนื้อหา</a>

      {/* Desktop: the teal rail, with the sign-in meadow carried on at its foot. */}
      <nav aria-label="เมนูหลัก" className="sticky top-0 hidden h-dvh flex-col gap-1 overflow-hidden bg-[linear-gradient(180deg,#0E5E5A_0%,#0E5E5A_50%,#14735F_100%)] px-3 py-5 text-white lg:flex">
        <RailMeadow />
        <Link to="/" className="mb-6 flex items-center gap-2.5 px-2 font-display text-lg font-medium"><BrandMark />Wholesale Order</Link>
        {links.map(({ to, label, icon: Icon, count, countLabel }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn('flex items-center gap-3 rounded-full px-4 py-2.5 text-[16px] font-semibold transition-colors', isActive ? 'bg-panel text-brand' : 'text-brand-soft hover:bg-brand-deep hover:text-white')}>
            <Icon aria-hidden="true" className="size-5" />
            <span className="flex-1">{label}</span>
            {count > 0 && <span className="num rounded-full bg-turn px-2 text-sm font-bold text-ink"><span className="sr-only">{countLabel} </span>{count}</span>}
          </NavLink>
        ))}
        <div className="relative mt-auto mb-[132px] border-t border-white/20 px-2 pt-4">
          <p className="truncate font-bold">{session.name}</p>
          {/* The rail lightens toward its foot, so brand-soft falls under 4.5:1 here; a whiter tint keeps it legible. */}
          <p className="text-sm text-white/90">{session.role === 'admin' ? 'แอดมิน' : 'ลูกค้าขายส่ง'}{demoMode && ' · โหมดจำลอง'}</p>
          <button type="button" onClick={logOut} className="mt-3 -ml-2 inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-[15px] font-semibold text-white/90 hover:bg-brand-deep hover:text-white">
            <LogOut aria-hidden="true" className="size-4" /> ออกจากระบบ
          </button>
        </div>
      </nav>

      <div className="flex min-w-0 flex-col pb-[76px] lg:pb-0">
        {/* Top bar: brand on phones, notifications and account everywhere. */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-white/70 bg-white/85 px-4 lg:h-16 lg:px-8">
          <Link to="/" aria-label="Wholesale Order หน้าแรก" className="flex min-h-11 items-center gap-2 font-display font-medium whitespace-nowrap text-brand lg:hidden"><BrandMark className="size-8 text-xs" /><span className="max-[400px]:hidden">Wholesale Order</span></Link>
          <div className="ml-auto flex items-center gap-1 lg:ml-0 lg:w-full">
            <CommandPalette role={session.role} />
            <span className="flex-1 max-lg:hidden" />
            {customer && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/catalog#cart" className="relative grid size-11 place-items-center rounded-full text-ink-2 hover:bg-brand-tint hover:text-brand-deep lg:hidden" aria-label={`ตะกร้า ${cartCount} รายการ`}>
                    <ShoppingCart aria-hidden="true" className="size-5" />
                    {cartCount > 0 && <span aria-hidden="true" className="num absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-brand px-1 text-center text-xs leading-5 font-bold text-white ring-2 ring-panel">{cartCount}</span>}
                  </Link>
                </TooltipTrigger>
                <TooltipContent>ตะกร้า</TooltipContent>
              </Tooltip>
            )}
            <NotificationBell role={session.role} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" onClick={logOut} aria-label="ออกจากระบบ" className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-brand-tint hover:text-brand-deep lg:hidden">
                  <LogOut aria-hidden="true" className="size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>ออกจากระบบ</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <main id="content" className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {/* Each area sprouts up once when it opens (keyed by area, so picking an order in the
              admin queue does not remount it). A CSS animation on transform and opacity: the
              compositor runs it, and it leaves no transform behind to trap fixed bars and sheets. */}
          <div key={area} className="page-enter">
            {children}
          </div>
        </main>
      </div>

      {/* Phones: the same destinations as a bottom bar within thumb reach. */}
      <nav aria-label="เมนูหลัก" className="fixed inset-x-0 bottom-0 z-30 grid border-t border-brand-deep bg-brand pb-[env(safe-area-inset-bottom)] lg:hidden" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
        {/* A fringe of grass along the top edge, like the foot of the desktop rail. */}
        <svg aria-hidden="true" viewBox="0 0 400 12" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -top-[11px] h-[12px] w-full"><path d="M0 12 L2 8 L4 12 L6 3 L8 12 L10 6 L12 12 L14 1 L16 12 L18 4 L20 12 L22 7 L24 12 L26 2 L28 12 L30 5 L32 12 L34 8 L36 12 L38 3 L40 12 L42 6 L44 12 L46 1 L48 12 L50 4 L52 12 L54 7 L56 12 L58 2 L60 12 L62 5 L64 12 L66 8 L68 12 L70 3 L72 12 L74 6 L76 12 L78 1 L80 12 L82 4 L84 12 L86 7 L88 12 L90 2 L92 12 L94 5 L96 12 L98 8 L100 12 L102 3 L104 12 L106 6 L108 12 L110 1 L112 12 L114 4 L116 12 L118 7 L120 12 L122 2 L124 12 L126 5 L128 12 L130 8 L132 12 L134 3 L136 12 L138 6 L140 12 L142 1 L144 12 L146 4 L148 12 L150 7 L152 12 L154 2 L156 12 L158 5 L160 12 L162 8 L164 12 L166 3 L168 12 L170 6 L172 12 L174 1 L176 12 L178 4 L180 12 L182 7 L184 12 L186 2 L188 12 L190 5 L192 12 L194 8 L196 12 L198 3 L200 12 L202 6 L204 12 L206 1 L208 12 L210 4 L212 12 L214 7 L216 12 L218 2 L220 12 L222 5 L224 12 L226 8 L228 12 L230 3 L232 12 L234 6 L236 12 L238 1 L240 12 L242 4 L244 12 L246 7 L248 12 L250 2 L252 12 L254 5 L256 12 L258 8 L260 12 L262 3 L264 12 L266 6 L268 12 L270 1 L272 12 L274 4 L276 12 L278 7 L280 12 L282 2 L284 12 L286 5 L288 12 L290 8 L292 12 L294 3 L296 12 L298 6 L300 12 L302 1 L304 12 L306 4 L308 12 L310 7 L312 12 L314 2 L316 12 L318 5 L320 12 L322 8 L324 12 L326 3 L328 12 L330 6 L332 12 L334 1 L336 12 L338 4 L340 12 L342 7 L344 12 L346 2 L348 12 L350 5 L352 12 L354 8 L356 12 L358 3 L360 12 L362 6 L364 12 L366 1 L368 12 L370 4 L372 12 L374 7 L376 12 L378 2 L380 12 L382 5 L384 12 L386 8 L388 12 L390 3 L392 12 L394 6 L396 12 L398 1 L400 12 Z" fill="#0E5E5A" /></svg>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2.5 text-[13px] font-semibold', isActive ? 'text-white' : 'text-brand-soft')}>
            {({ isActive }) => (
              <>
                <span className={cn('grid h-7 w-12 place-items-center rounded-full', isActive && 'bg-panel text-brand')}><Icon aria-hidden="true" className="size-5" /></span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
