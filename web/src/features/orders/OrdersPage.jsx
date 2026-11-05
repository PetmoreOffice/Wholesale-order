import React from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { closedStatuses } from '@shared/orderWorkflow.js';
import { count } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageHeader, StateBlock } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { customerOrdersQuery } from './queries.js';
import { OrderRow, yours } from './OrderRow.jsx';

const tabs = [
  { id: 'action', label: 'ต้องดำเนินการ', match: yours, empty: 'ไม่มีคำสั่งซื้อที่รอคุณดำเนินการ' },
  { id: 'open', label: 'กำลังดำเนินการ', match: order => !closedStatuses.includes(order.status) && !yours(order), empty: 'ไม่มีคำสั่งซื้อที่อยู่ระหว่างดำเนินการ' },
  { id: 'closed', label: 'ปิดแล้ว', match: order => closedStatuses.includes(order.status), empty: 'ยังไม่มีคำสั่งซื้อที่ปิดแล้ว' },
  { id: 'all', label: 'ทั้งหมด', match: () => true, empty: 'ยังไม่มีคำสั่งซื้อ' }
];

export default function OrdersPage() {
  const { data: orders = [], error, isPending, isFetching, refetch } = useQuery(customerOrdersQuery);
  const [searchParams, setSearchParams] = useSearchParams();

  const counts = Object.fromEntries(tabs.map(tab => [tab.id, orders.filter(tab.match).length]));
  // Land on the orders that need the customer first; fall back to everything in progress.
  const activeTab = tabs.find(tab => tab.id === searchParams.get('tab')) || (counts.action ? tabs[0] : tabs[1]);
  const visible = orders.filter(activeTab.match)
    .sort((a, b) => Number(yours(b)) - Number(yours(a)) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  // Radix Tabs brings arrow-key, Home and End navigation; the chosen tab lives in the URL.
  function choose(id) {
    setSearchParams(params => { params.set('tab', id); return params; }, { replace: true });
  }

  return (
    <>
      <PageHeader
        title="คำสั่งซื้อของฉัน"
        description="ดูว่าแต่ละคำสั่งซื้ออยู่ขั้นไหน และใครต้องทำอะไรต่อ"
        actions={(
          <>
            <Button type="button" variant="outline" size="lg" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw aria-hidden="true" className={cn(isFetching && 'animate-spin')} /> รีเฟรช
            </Button>
            <Button asChild size="lg"><Link to="/catalog"><Plus aria-hidden="true" /> สร้างคำสั่งซื้อ</Link></Button>
          </>
        )}
      />

      <Tabs value={activeTab.id} onValueChange={choose} className="gap-0 overflow-hidden rounded-xl border border-line bg-panel">
        <TabsList variant="line" aria-label="กรองคำสั่งซื้อ" className="flex w-full justify-start overflow-x-auto border-b border-line px-2 sm:px-3">
          {tabs.map(tab => {
            const active = tab.id === activeTab.id;
            const turn = tab.id === 'action' && counts.action > 0;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="sm:px-4">
                {tab.label}
                <span className={cn('num min-w-6 rounded-full px-1.5 text-center text-sm leading-6 font-bold', turn ? 'bg-turn text-ink' : active ? 'bg-brand-tint text-brand-deep' : 'bg-sunken text-ink-2')}>
                  {isPending ? '–' : count.format(counts[tab.id])}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab.id} aria-busy={isPending}>
          {error ? (
            <StateBlock tone="danger" title="โหลดคำสั่งซื้อไม่สำเร็จ" action={<Button variant="outline" onClick={() => refetch()}>ลองใหม่</Button>}>{error.message}</StateBlock>
          ) : isPending ? (
            <ul aria-hidden="true">
              {Array.from({ length: 4 }, (_, index) => (
                <li key={index} className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-0 sm:px-5">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </li>
              ))}
            </ul>
          ) : visible.length ? (
            <ul>{visible.map(order => <OrderRow key={order.orderId} order={order} to={`/orders/${order.orderId}`} chevronClassName="" />)}</ul>
          ) : (
            <StateBlock title={activeTab.empty} action={<Button asChild variant="outline"><Link to="/catalog">ไปที่หน้าสินค้า</Link></Button>}>
              สร้างคำสั่งซื้อใหม่ได้จากหน้าสินค้า
            </StateBlock>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
