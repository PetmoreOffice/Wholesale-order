import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { signOut } from 'firebase/auth';
import { ClipboardList, House, Inbox, LogOut, Package, PawPrint, Settings, ShoppingCart } from 'lucide-react';
import AnimatedContent from '@/components/react-bits/AnimatedContent';
import ClickSpark from '@/components/react-bits/ClickSpark';
import DotGrid from '@/components/react-bits/DotGrid';
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
  const [settled, setSettled] = useState(null);
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
    // Every click scatters a few kibble-orange sparks; nothing waits on them.
    <ClickSpark sparkColor="#F07A3A" sparkSize={10} sparkRadius={22} sparkCount={7} duration={420} className="!h-auto min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      {/* A field of kibble dots behind the work area that leans toward the pointer. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 lg:left-[232px]">
        <DotGrid dotSize={4} gap={26} baseColor="#CFE3DD" activeColor="#F07A3A" proximity={120} glow={0.3} opacity={0.9} clickShock={false} />
      </div>
      <a href="#content" className="sr-only z-50 rounded-md bg-panel px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">ข้ามไปเนื้อหา</a>

      {/* Desktop: the teal rail, like the panel of a pet-food bag. */}
      <nav aria-label="เมนูหลัก" className="sticky top-0 hidden h-dvh flex-col gap-1 bg-brand px-3 py-5 text-white lg:flex">
        <Link to="/" className="mb-6 flex items-center gap-2.5 px-2 font-display text-lg font-medium"><BrandMark />Wholesale Order</Link>
        {links.map(({ to, label, icon: Icon, count, countLabel }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn('flex items-center gap-3 rounded-full px-4 py-2.5 text-[16px] font-semibold transition-colors', isActive ? 'bg-panel text-brand' : 'text-brand-soft hover:bg-brand-deep hover:text-white')}>
            <Icon aria-hidden="true" className="size-5" />
            <span className="flex-1">{label}</span>
            {count > 0 && <span className="num rounded-full bg-turn px-2 text-sm font-bold text-ink"><span className="sr-only">{countLabel} </span>{count}</span>}
          </NavLink>
        ))}
        <div className="mt-auto border-t border-white/20 px-2 pt-4">
          <p className="truncate font-bold">{session.name}</p>
          <p className="text-sm text-brand-soft">{session.role === 'admin' ? 'แอดมิน' : 'ลูกค้าขายส่ง'}{demoMode && ' · โหมดจำลอง'}</p>
          <button type="button" onClick={logOut} className="mt-3 -ml-2 inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-[15px] font-semibold text-brand-soft hover:bg-brand-deep hover:text-white">
            <LogOut aria-hidden="true" className="size-4" /> ออกจากระบบ
          </button>
        </div>
      </nav>

      <div className="flex min-w-0 flex-col pb-[76px] lg:pb-0">
        {/* Top bar: brand on phones, notifications and account everywhere. */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-panel/95 px-4 backdrop-blur lg:h-16 lg:px-8">
          <Link to="/" aria-label="Wholesale Order หน้าแรก" className="flex items-center gap-2 font-display font-medium whitespace-nowrap text-brand lg:hidden"><BrandMark className="size-8 text-xs" /><span className="max-[400px]:hidden">Wholesale Order</span></Link>
          <div className="ml-auto flex items-center gap-1 lg:ml-0 lg:w-full">
            <CommandPalette role={session.role} />
            <span className="flex-1 max-lg:hidden" />
            {customer && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/catalog#cart" className="relative grid size-10 place-items-center rounded-full text-ink-2 hover:bg-brand-tint hover:text-brand-deep lg:hidden" aria-label={`ตะกร้า ${cartCount} รายการ`}>
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
                <button type="button" onClick={logOut} aria-label="ออกจากระบบ" className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-brand-tint hover:text-brand-deep lg:hidden">
                  <LogOut aria-hidden="true" className="size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>ออกจากระบบ</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <main id="content" className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {/* Each area rises in once when it opens (keyed by area, so picking an order in the
              admin queue does not remount it). Once settled, transform and filter are cleared:
              either would trap the fixed action bars and sheets inside the page. */}
          <div className={settled === area ? '[&>*]:![filter:none] [&>*]:![transform:none]' : undefined}>
            <AnimatedContent key={area} trigger="mount" distance={18} duration={0.5} ease="power3.out" onComplete={() => setSettled(area)}>
              {children}
            </AnimatedContent>
          </div>
        </main>
      </div>

      {/* Phones: the same destinations as a bottom bar within thumb reach. */}
      <nav aria-label="เมนูหลัก" className="fixed inset-x-0 bottom-0 z-30 grid border-t border-brand-deep bg-brand pb-[env(safe-area-inset-bottom)] lg:hidden" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
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
    </ClickSpark>
  );
}
