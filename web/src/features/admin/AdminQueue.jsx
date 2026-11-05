import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useLocation, useMatch, useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { count } from '@/lib/format';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { PageHeader, StateBlock } from '@/components/PageHeader';
import { statusText } from '@shared/orderWorkflow.js';
import { StatusIcon } from '@/components/route/StatusBadge';

// The queue reads like a timetable: one size, ranked by weight. Only work that waits on this
// admin gets the orange chip; everything else is the next stop and who drives it, in words.
const nextStopText = {
  submitted: 'รอรับงาน',
  assigned: 'ตรวจแล้วอนุมัติ',
  need_information: 'รอลูกค้าตอบ',
  approved: 'บันทึกเข้า ERP',
  erp_entry: 'ยืนยัน ERP เสร็จ',
  preparing: 'บันทึกว่าจัดส่ง',
  shipped: 'ปิดงาน'
};

function NextStop({ order, adminId }) {
  const text = nextStopText[order.status];
  const yours = order.status === 'submitted' || (order.assignedAdminId === adminId && text && order.status !== 'need_information');
  if (yours) return <span className="rounded-md bg-turn px-2 py-0.5 font-bold whitespace-nowrap text-ink">{text}</span>;
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', order.status === 'rejected' ? 'font-semibold text-danger' : text ? 'font-semibold text-ink' : 'text-ink-3')}>
      <StatusIcon status={order.status} className="size-4" />{text || statusText[order.status]}
    </span>
  );
}
import { Button } from '@/components/ui/button';
import { OrderDetail } from './OrderDetail.jsx';
import { SidePanel } from './Overlay.jsx';
import { CountBlocks } from '@/components/CountBlocks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isStale, queueQuery, queueTabs, STALE_HOURS, useWide, waitingMinutes, waitingText } from './queue.js';

/** The queue at a glance: large numerals; new work waiting to be taken is filled turn. */
function Counts({ blocks }) {
  return <CountBlocks blocks={blocks} className="mb-5 max-sm:!grid-cols-2" />;
}

const cell = 'px-3 py-3.5 align-middle first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5';

function Waiting({ order, now, closed }) {
  const minutes = waitingMinutes(order, now);
  const stale = isStale(order, now);
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      <span className={cn('num whitespace-nowrap', stale ? 'font-bold text-ink' : 'text-ink-2')}>{closed ? `${waitingText(minutes)}ก่อน` : waitingText(minutes)}</span>
      {stale && <span className="rounded-md bg-turn px-2 font-bold text-ink" title={`ไม่มีความเคลื่อนไหวเกิน ${STALE_HOURS} ชั่วโมง`}>ค้าง</span>}
    </span>
  );
}

function QueueTable({ orders, tab, adminId, selectedId, search, now }) {
  const navigate = useNavigate();
  const closed = tab.id === 'closed';
  const to = (order) => ({ pathname: `/admin/orders/${order.orderId}`, search });
  return (
    <table className="w-full border-collapse text-left text-[15px]">
      <caption className="sr-only">{tab.label}: เรียงจากรอนานที่สุด</caption>
      <thead className="border-b border-line bg-sunken text-ink-2">
        <tr>
          <th scope="col" className={cn(cell, 'py-2.5 font-semibold whitespace-nowrap')}>คำสั่งซื้อ</th>
          <th scope="col" className={cn(cell, 'py-2.5 font-semibold whitespace-nowrap max-sm:hidden')}>ลูกค้า</th>
          <th scope="col" className={cn(cell, 'py-2.5 font-semibold whitespace-nowrap max-sm:hidden')}>ขั้นถัดไป</th>
          <th scope="col" className={cn(cell, 'py-2.5 font-semibold whitespace-nowrap max-xl:hidden')}>ผู้รับผิดชอบ</th>
          <th scope="col" className={cn(cell, 'py-2.5 text-right font-semibold whitespace-nowrap max-md:hidden')}>รายการ</th>
          <th scope="col" className={cn(cell, 'py-2.5 text-right font-semibold whitespace-nowrap')}>{closed ? 'ปิดเมื่อ' : 'รอมาแล้ว'}</th>
        </tr>
      </thead>
      <tbody>
        {orders.map(order => {
          const selected = order.orderId === selectedId;
          const owner = order.assignedAdminId === adminId ? 'คุณ' : order.assignedAdminName;
          return (
            <tr
              key={order.orderId}
              onClick={(event) => { if (!event.target.closest('a')) navigate(to(order)); }}
              className={cn('cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-sunken', selected && 'bg-brand-tint hover:bg-brand-tint')}
            >
              <td className={cell}>
                <Link to={to(order)} aria-current={selected ? 'true' : undefined} className="num font-bold whitespace-nowrap text-ink hover:underline">{order.orderNumber}</Link>
                <span className="mt-0.5 block text-ink-2 sm:hidden">{order.customerName}</span>
                <span className="mt-0.5 block sm:hidden"><NextStop order={order} adminId={adminId} /></span>
              </td>
              <td className={cn(cell, 'font-semibold whitespace-nowrap text-ink max-sm:hidden')}>{order.customerName}</td>
              <td className={cn(cell, 'max-sm:hidden')}><NextStop order={order} adminId={adminId} /></td>
              <td className={cn(cell, 'max-xl:hidden', owner ? 'text-ink' : 'text-ink-3')}>{owner || 'ยังไม่มี'}</td>
              <td className={cn(cell, 'num text-right text-ink-2 max-md:hidden')}>{count.format(order.itemCount)}</td>
              <td className={cn(cell, 'text-right')}><Waiting order={order} now={now} closed={closed} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function AdminQueue() {
  const session = useSession();
  const adminId = session.uid;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const match = useMatch('/admin/orders/:orderId');
  const selectedId = match ? Number.parseInt(match.params.orderId, 10) : null;
  const wide = useWide();
  const { data: orders = [], error, isPending, isFetching, refetch, dataUpdatedAt } = useQuery(queueQuery);
  const now = dataUpdatedAt || Date.now();

  const tabs = queueTabs(adminId);
  const counts = Object.fromEntries(tabs.map(tab => [tab.id, orders.filter(tab.match).length]));
  // Default to new work when there is any; otherwise everything still open.
  const activeTab = tabs.find(tab => tab.id === searchParams.get('tab')) || (counts.unclaimed ? tabs[0] : tabs[3]);
  const visible = orders.filter(activeTab.match);
  // The API returns oldest change first; closed work reads better newest first.
  if (activeTab.id === 'closed') visible.reverse();
  const stale = orders.filter(order => isStale(order, now)).length;
  const summary = orders.find(order => order.orderId === selectedId);
  const closeDetail = () => navigate({ pathname: '/admin', search: location.search });

  const detail = selectedId && (
    <OrderDetail key={selectedId} orderId={selectedId} summary={summary} adminId={adminId} inline={wide} onClose={closeDetail} />
  );

  return (
    <>
      <PageHeader
        title="คิวงานคำสั่งซื้อ"
        description="รับงาน ตรวจสอบ และติดตามการบันทึกเข้า ERP · อัปเดตอัตโนมัติทุก 15 วินาที"
        actions={<Button type="button" variant="outline" size="lg" disabled={isFetching} onClick={() => refetch()}><RefreshCw aria-hidden="true" className={cn(isFetching && 'animate-spin')} /> รีเฟรช</Button>}
      />

      {error && !orders.length ? (
        <StateBlock tone="danger" title="โหลดคิวงานไม่สำเร็จ" action={<Button variant="outline" onClick={() => refetch()}>ลองใหม่</Button>}>{error.message}</StateBlock>
      ) : (
        <>
          {isPending ? <Skeleton aria-busy="true" className="mb-5 h-24 rounded-xl" /> : (
            <Counts blocks={[
              { label: 'รอรับงาน', value: counts.unclaimed, turn: true },
              { label: 'งานของฉัน', value: counts.mine },
              { label: 'รอลูกค้าตอบ', value: counts.waiting },
              { label: `ค้างเกิน ${STALE_HOURS} ชม.`, value: stale }
            ]} />
          )}
          {error && <p role="alert" className="mb-3 text-[15px] font-semibold text-danger">อัปเดตคิวงานล่าสุดไม่สำเร็จ: {error.message}</p>}

          {/* The table takes the full width until an order is chosen. */}
          <div className={cn('grid items-start gap-5', detail && 'min-[1025px]:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_460px]')}>
            <Tabs value={activeTab.id} onValueChange={id => setSearchParams({ tab: id }, { replace: true })} className="min-w-0 gap-0 overflow-hidden rounded-xl border border-line bg-panel">
              <TabsList variant="line" aria-label="กลุ่มงาน" className="flex w-full snap-x scroll-px-2 justify-start overflow-x-auto border-b border-line px-2 sm:px-3 [&>button]:snap-start">
                {tabs.map(tab => {
                  const active = tab.id === activeTab.id;
                  return (
                    <TabsTrigger key={tab.id} value={tab.id} ref={active ? node => node?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) : undefined}>
                      {tab.label}
                      <span className={cn('num min-w-6 rounded-full px-1.5 text-center text-sm font-bold', active ? 'bg-brand text-white' : 'bg-sunken text-ink-2')}>{count.format(counts[tab.id])}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <TabsContent value={activeTab.id} aria-busy={isPending}>
                {isPending ? (
                  <div className="grid gap-px">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-[52px] border-b border-line" />)}</div>
                ) : visible.length ? (
                  <div className="overflow-x-auto"><QueueTable orders={visible} tab={activeTab} adminId={adminId} selectedId={selectedId} search={location.search} now={now} /></div>
                ) : (
                  <StateBlock
                    title={`ไม่มีงานในกลุ่ม “${activeTab.label}”`}
                    action={activeTab.id !== 'open' && <Button variant="outline" onClick={() => setSearchParams({ tab: 'open' }, { replace: true })}>ดูงานที่เปิดอยู่ทั้งหมด</Button>}
                  >
                    {activeTab.id === 'unclaimed' ? 'คำสั่งซื้อใหม่จะแสดงที่นี่อัตโนมัติ' : 'ลองดูกลุ่มอื่นจากแท็บด้านบน'}
                  </StateBlock>
                )}
              </TabsContent>
            </Tabs>

            {wide ? (
              detail && (
                <aside aria-label="รายละเอียดคำสั่งซื้อ" className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-xl">
                  {detail}
                </aside>
              )
            ) : selectedId ? (
              <SidePanel
                title={<span className="num">{summary?.orderNumber || 'คำสั่งซื้อ'}</span>}
                description={summary?.customerName}
                onClose={closeDetail}
              >
                {detail}
              </SidePanel>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
