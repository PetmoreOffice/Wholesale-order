import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus, RotateCcw } from 'lucide-react';
import { closedStatuses } from '@shared/orderWorkflow.js';
import { reorderIntoCart } from '@/lib/cart';
import { count } from '@/lib/format';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { PageHeader, StateBlock } from '@/components/PageHeader';
import { CountBlocks } from '@/components/CountBlocks';
import { PawRoute } from '@/components/route/PawRoute';
import { NextStepTag } from '@/components/route/NextStepTag';
import { Button } from '@/components/ui/button';
import { customerOrdersQuery, orderQuery } from './queries.js';
import { OrderRow, yours } from './OrderRow.jsx';

/** Counts as large numerals; the one that needs the customer is filled turn. */
function Counts({ orders }) {
  const month = new Date().toISOString().slice(0, 7);
  const blocks = [
    { label: 'ถึงตาคุณ', value: orders.filter(yours).length, turn: true },
    { label: 'อยู่ระหว่างดำเนินการ', value: orders.filter(order => !closedStatuses.includes(order.status) && !yours(order)).length },
    { label: 'ปิดแล้วเดือนนี้', value: orders.filter(order => closedStatuses.includes(order.status) && order.updatedAt?.startsWith(month)).length }
  ];
  return <CountBlocks blocks={blocks} />;
}

function SelectedOrder({ orderId }) {
  const { data: order, error, isPending } = useQuery(orderQuery(orderId));
  if (isPending) return <Skeleton aria-busy="true" className="h-64 rounded-xl" />;
  if (error) return <StateBlock tone="danger" title="โหลดคำสั่งซื้อไม่สำเร็จ">{error.message}</StateBlock>;
  return (
    <article className="grid gap-5 rounded-xl border border-line bg-panel p-5">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="num text-[22px] font-bold">{order.orderNumber}</h2>
        <span className="num text-sm text-ink-3">{order.items.length} รายการ</span>
      </header>
      <NextStepTag order={order} role="customer" />
      <PawRoute order={order} />
      {order.messages?.length > 0 && (
        <p className="rounded-lg bg-sunken px-4 py-3 text-[15px] text-ink-2">
          <b className="text-ink">{order.messages.at(-1).senderName}:</b> {order.messages.at(-1).messageBody}
        </p>
      )}
      <Button asChild size="lg" variant={yours(order) ? 'default' : 'outline'}>
        <Link to={`/orders/${order.orderId}`}>{yours(order) ? (order.status === 'draft' ? 'ตรวจแล้วส่งคำสั่งซื้อ' : 'ตอบแอดมิน') : 'ดูรายละเอียดทั้งหมด'}</Link>
      </Button>
    </article>
  );
}

export default function CustomerHome() {
  const session = useSession();
  const navigate = useNavigate();
  const { data: orders = [], error, isPending, refetch } = useQuery(customerOrdersQuery);
  const open = orders.filter(order => !closedStatuses.includes(order.status))
    .sort((a, b) => Number(yours(b)) - Number(yours(a)) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const recentClosed = orders.filter(order => order.status === 'completed').slice(0, 3);
  const [chosen, setChosen] = useState(null);
  const selectedId = chosen ?? open[0]?.orderId;
  const [reorderState, setReorderState] = useState({ id: null, error: '' });

  function select(orderId) {
    // Phones have no room for a side panel: go straight to the order.
    if (window.matchMedia('(max-width: 1023px)').matches) navigate(`/orders/${orderId}`);
    else setChosen(orderId);
  }

  async function reorder(orderId) {
    setReorderState({ id: orderId, error: '' });
    try {
      const notice = await reorderIntoCart(session.uid, orderId);
      navigate('/catalog', { state: { notice } });
    } catch (err) {
      setReorderState({ id: null, error: err.message });
    }
  }

  return (
    <>
      <PageHeader
        title="คำสั่งซื้อของฉัน"
        description="คำสั่งซื้อที่มีป้ายสีส้มกำลังรอคุณ"
        actions={<Button asChild size="lg"><Link to="/catalog"><Plus aria-hidden="true" /> สร้างคำสั่งซื้อ</Link></Button>}
      />
      {error ? (
        <StateBlock tone="danger" title="โหลดคำสั่งซื้อไม่สำเร็จ" action={<Button variant="outline" onClick={() => refetch()}>ลองใหม่</Button>}>{error.message}</StateBlock>
      ) : isPending ? (
        <div aria-busy="true" className="grid gap-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-80 rounded-xl" /></div>
      ) : (
        <>
          <Counts orders={orders} />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
            <section aria-labelledby="open-orders" className="self-start overflow-hidden rounded-xl border border-line bg-panel">
              <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
                <h2 id="open-orders" className="text-[17px] font-bold">กำลังดำเนินการ</h2>
                <Link to="/orders" className="text-[15px] font-semibold text-brand hover:underline">ดูทั้งหมด</Link>
              </div>
              {open.length ? (
                <ul>{open.map(order => <OrderRow key={order.orderId} order={order} selected={order.orderId === selectedId} onSelect={select} />)}</ul>
              ) : (
                <StateBlock title="ไม่มีคำสั่งซื้อที่เปิดอยู่" action={<Button asChild variant="outline"><Link to="/catalog">เริ่มสั่งสินค้า</Link></Button>}>คำสั่งซื้อที่ส่งแล้วจะแสดงที่นี่ พร้อมป้ายบอกขั้นถัดไป</StateBlock>
              )}
              {recentClosed.length > 0 && (
                <div className="border-t border-line px-4 py-4 sm:px-5">
                  <h3 className="mb-2 text-[15px] font-bold text-ink-2">สั่งซ้ำจากคำสั่งซื้อล่าสุด</h3>
                  <ul className="flex flex-wrap gap-2">
                    {recentClosed.map(order => (
                      <li key={order.orderId}>
                        <Button variant="outline" size="sm" disabled={reorderState.id === order.orderId} onClick={() => reorder(order.orderId)}>
                          <RotateCcw aria-hidden="true" /> <span className="num">{order.orderNumber}</span> · {order.itemCount} รายการ
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {reorderState.error && <p role="alert" className="mt-2 text-[15px] text-danger">{reorderState.error}</p>}
                </div>
              )}
            </section>
            <div className="hidden lg:block">{selectedId && <SelectedOrder orderId={selectedId} />}</div>
          </div>
        </>
      )}
    </>
  );
}
