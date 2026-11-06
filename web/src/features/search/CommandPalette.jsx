import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, House, Inbox, Package, Search, Settings } from 'lucide-react';
import { statusText } from '@shared/orderWorkflow.js';
import { api } from '@/lib/api';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const RESULT_LIMIT = 8;

// The same lists the home page and the admin queue already cache, so opening the palette
// costs no extra request when those pages were visited.
const ordersFor = (role) => role === 'admin'
  ? { queryKey: ['orders', 'admin', 'queue'], queryFn: () => api('/orders/admin/queue').then(result => result.data) }
  : { queryKey: ['orders', 'mine'], queryFn: () => api('/orders').then(result => result.data) };

const pagesFor = (role) => role === 'admin'
  ? [{ to: '/admin', label: 'คิวงานคำสั่งซื้อ', icon: Inbox }, { to: '/catalog', label: 'สินค้า', icon: Package }, { to: '/settings', label: 'ตั้งค่า', icon: Settings }]
  : [{ to: '/home', label: 'หน้าหลัก', icon: House }, { to: '/catalog', label: 'สินค้า', icon: Package }, { to: '/orders', label: 'คำสั่งซื้อของฉัน', icon: ClipboardList }];

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const paletteShortcut = isMac ? '⌘K' : 'Ctrl K';

/**
 * Ctrl+K (⌘K on Mac): jump to an order by number or shop name, search the catalog for a
 * name, SKU or barcode, or go to a page. The trigger button sits in the top bar.
 */
export function CommandPalette({ role }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const orders = useQuery({ ...ordersFor(role), enabled: open });

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(value => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function go(to, state) {
    setOpen(false);
    setText('');
    navigate(to, state ? { state } : undefined);
  }

  const term = text.trim().toLowerCase();
  const matches = term
    ? (orders.data || []).filter(order => order.orderNumber.toLowerCase().includes(term) || (role === 'admin' && order.customerName?.toLowerCase().includes(term))).slice(0, RESULT_LIMIT)
    : (orders.data || []).slice(0, 5);
  const pages = pagesFor(role).filter(page => !term || page.label.toLowerCase().includes(term));
  const orderPath = (order) => role === 'admin' ? `/admin/orders/${order.orderId}` : `/orders/${order.orderId}`;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={() => setOpen(true)} aria-label={`ค้นหาด่วน (${paletteShortcut})`} className="flex h-11 items-center gap-2 rounded-full border lg:h-10 border-line bg-sunken px-3 text-[15px] text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2 max-sm:size-11 max-sm:justify-center max-sm:border-0 max-sm:bg-transparent max-sm:px-0">
            <Search aria-hidden="true" className="size-5" />
            <span className="max-sm:hidden">ค้นหาคำสั่งซื้อหรือสินค้า</span>
            <kbd className="ml-6 rounded-md border border-line bg-panel px-1.5 font-sans text-[12px] font-semibold text-ink-3 max-md:hidden">{paletteShortcut}</kbd>
          </button>
        </TooltipTrigger>
        <TooltipContent>ค้นหาด่วน · {paletteShortcut}</TooltipContent>
      </Tooltip>

      <CommandDialog open={open} onOpenChange={value => { setOpen(value); if (!value) setText(''); }} title="ค้นหาด่วน">
        <CommandInput value={text} onValueChange={setText} placeholder={role === 'admin' ? 'เลขคำสั่งซื้อ ชื่อร้าน ชื่อสินค้า หรือ SKU' : 'เลขคำสั่งซื้อ ชื่อสินค้า หรือ SKU'} />
        <CommandList>
          {!term && !matches.length && !pages.length && <CommandEmpty>พิมพ์เพื่อค้นหา</CommandEmpty>}
          {/* An order that matches is the likelier target, so it comes first and takes Enter. */}
          {matches.length > 0 && (
            <CommandGroup heading={term ? 'คำสั่งซื้อที่ตรงกัน' : 'คำสั่งซื้อล่าสุด'}>
              {matches.map(order => (
                <CommandItem key={order.orderId} value={`order-${order.orderId}`} onSelect={() => go(orderPath(order))}>
                  <ClipboardList aria-hidden="true" />
                  <span className="num font-semibold">{order.orderNumber}</span>
                  {role === 'admin' && <span className="truncate text-ink-2">{order.customerName}</span>}
                  <CommandShortcut>{statusText[order.status]}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {term && (
            <CommandGroup heading="สินค้า">
              <CommandItem value={`catalog-${term}`} onSelect={() => go('/catalog', { search: text.trim() })}>
                <Package aria-hidden="true" />
                <span>ค้นหาสินค้า “<b className="font-semibold">{text.trim()}</b>”</span>
                {!matches.length && <CommandShortcut>Enter</CommandShortcut>}
              </CommandItem>
            </CommandGroup>
          )}
          {orders.isPending && open && <p className="px-3 py-2 text-[14px] text-ink-3" aria-busy="true">กำลังโหลดคำสั่งซื้อ…</p>}
          {term && !matches.length && !orders.isPending && <p className="px-3 py-2 text-[14px] text-ink-3">ไม่พบคำสั่งซื้อที่ตรงกับ “{text.trim()}”</p>}
          {pages.length > 0 && (
            <CommandGroup heading="ไปที่หน้า">
              {pages.map(({ to, label, icon: Icon }) => (
                <CommandItem key={to} value={`page-${to}`} onSelect={() => go(to)}>
                  <Icon aria-hidden="true" /> {label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
