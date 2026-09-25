import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { apiFetch, apiUrl } from '../api/client.js';
import { count, timeAgo } from '../lib/format.js';
import { closedStatuses, customerNextStep } from '../lib/orderStatus.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { AnimatedContent } from '../components/react-bits/AnimatedContent.jsx';
import { CountUp } from '../components/react-bits/CountUp.jsx';
import { Button } from '@/components/ui/button';

const tabs = [
  { id: 'action', label: 'ต้องดำเนินการ', match: order => customerNextStep[order.status]?.owner === 'customer' && order.status !== 'rejected' },
  { id: 'open', label: 'กำลังดำเนินการ', match: order => !closedStatuses.includes(order.status) && customerNextStep[order.status]?.owner !== 'customer' },
  { id: 'closed', label: 'ปิดแล้ว', match: order => closedStatuses.includes(order.status) },
  { id: 'all', label: 'ทั้งหมด', match: () => true },
];

export function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch(`${apiUrl}/orders`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setOrders(data.data);
    } catch (err) {
      setError(err.message || 'โหลดคำสั่งซื้อไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const counts = Object.fromEntries(tabs.map(tab => [tab.id, orders.filter(tab.match).length]));
  // Land on the orders that need the customer first; fall back to everything in progress.
  const requested = searchParams.get('tab');
  const activeTab = tabs.find(tab => tab.id === requested) || (counts.action ? tabs[0] : tabs[1]);
  const visible = orders.filter(activeTab.match);

  return (
    <AnimatedContent className="page" distance={12}>
      <PageHeader
        title="คำสั่งซื้อของฉัน"
        description="ดูว่าแต่ละคำสั่งซื้ออยู่ขั้นไหน และใครต้องทำอะไรต่อ"
        actions={<Button type="button" variant="outline" onClick={load} disabled={loading}><RefreshCw aria-hidden="true" className={loading ? 'spin' : undefined} /> รีเฟรช</Button>}
      />
      <div className="tabs" role="tablist" aria-label="กรองคำสั่งซื้อ">
        {tabs.map(tab => (
          <button key={tab.id} type="button" role="tab" aria-selected={tab.id === activeTab.id} onClick={() => setSearchParams({ tab: tab.id }, { replace: true })}>
            {tab.label}<span className="tab-count"><CountUp to={counts[tab.id]} /></span>
          </button>
        ))}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <section className="panel order-list" role="tabpanel" aria-busy={loading} aria-label={activeTab.label}>
        {loading && !orders.length ? (
          Array.from({ length: 4 }, (_, index) => <div key={index} className="order-row" aria-hidden="true"><span className="skeleton" style={{ width: '9rem' }} /><span className="skeleton" style={{ width: '60%' }} /><span className="skeleton" style={{ width: '6rem' }} /></div>)
        ) : visible.length ? visible.map(order => {
          const next = customerNextStep[order.status];
          return (
            <Link className="order-row" key={order.orderId} to={`/orders/${order.orderId}`}>
              <div className="order-row-id">
                <b className="num">{order.orderNumber}</b>
                <small><span className="num">{count.format(order.itemCount)}</span> รายการ · อัปเดต {timeAgo(order.updatedAt)}</small>
              </div>
              <StatusBadge status={order.status} />
              <p className="order-row-next" data-owner={next?.owner || 'none'}>
                {next?.owner === 'customer' && <b>ถึงตาคุณ: </b>}{next?.text}
              </p>
              <ChevronRight className="row-chevron" aria-hidden="true" />
            </Link>
          );
        }) : (
          <div className="state">
            <b>{activeTab.id === 'action' ? 'ไม่มีคำสั่งซื้อที่รอคุณดำเนินการ' : 'ยังไม่มีคำสั่งซื้อในกลุ่มนี้'}</b>
            <p>สร้างคำสั่งซื้อใหม่ได้จากหน้าสินค้า</p>
            <Button asChild variant="outline"><Link to="/catalog">ไปที่หน้าสินค้า</Link></Button>
          </div>
        )}
      </section>
    </AnimatedContent>
  );
}
