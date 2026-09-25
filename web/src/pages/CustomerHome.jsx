import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, CircleCheckBig, Plus, RotateCcw, ShoppingCart } from 'lucide-react';
import { apiFetch, apiUrl } from '../api/client.js';
import { useSession } from '../context/session.js';
import { readCart, reorderIntoCart } from '../lib/cart.js';
import { count, timeAgo } from '../lib/format.js';
import { fetchNotifications, notificationLink, notificationTitle } from '../lib/notifications.js';
import { closedStatuses, customerNextStep } from '../lib/orderStatus.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { AnimatedContent } from '../components/react-bits/AnimatedContent.jsx';
import { Button } from '@/components/ui/button';

const REORDER_LIMIT = 5;
const PROGRESS_LIMIT = 6;

export function CustomerHome() {
  const session = useSession();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reordering, setReordering] = useState(null);
  const cartCount = readCart(session.uid).length;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await apiFetch(`${apiUrl}/orders`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        if (active) setOrders(data.data);
      } catch (err) {
        if (active) setError(err.message || 'โหลดคำสั่งซื้อไม่สำเร็จ');
      } finally {
        if (active) setLoading(false);
      }
      try {
        const feed = await fetchNotifications();
        if (active) setUpdates(feed.data.slice(0, 5));
      } catch { /* the updates column is optional */ }
    })();
    return () => { active = false; };
  }, []);

  async function reorder(order) {
    setReordering(order.orderId); setError('');
    try {
      const notice = await reorderIntoCart(session.uid, order.orderId);
      navigate('/catalog', { state: { notice } });
    } catch (err) {
      setError(err.message);
      setReordering(null);
    }
  }

  const byRecent = (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  // A rejection stays on the to-do list for two weeks, long enough to read the reason and act.
  const recent = order => order.status !== 'rejected' || Date.now() - Date.parse(order.updatedAt) < 14 * 86400000;
  const yourTurn = orders.filter(order => customerNextStep[order.status]?.owner === 'customer' && recent(order)).sort(byRecent);
  const inProgress = orders.filter(order => !closedStatuses.includes(order.status) && customerNextStep[order.status]?.owner !== 'customer').sort(byRecent);
  const reorderable = orders.filter(order => order.status === 'completed').sort(byRecent).slice(0, REORDER_LIMIT);

  return (
    <AnimatedContent className="page" distance={12}>
      <PageHeader
        title={`สวัสดี ${session.name}`}
        description="ภาพรวมคำสั่งซื้อของคุณ และสิ่งที่ต้องทำต่อ"
        actions={<>
          {cartCount > 0 && <Button asChild variant="outline"><Link to="/catalog"><ShoppingCart aria-hidden="true" /> ตะกร้า <span className="num">{count.format(cartCount)}</span> รายการ</Link></Button>}
          <Button asChild><Link to="/catalog"><Plus aria-hidden="true" /> สร้างคำสั่งซื้อ</Link></Button>
        </>}
      />
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="home-layout">
        <div className="home-main">
          <section className="panel home-section" aria-labelledby="your-turn">
            <div className="panel-heading"><h2 id="your-turn">ถึงตาคุณ</h2>{yourTurn.length > 0 && <span className="pill" data-tone="attention"><span className="num">{yourTurn.length}</span> รายการ</span>}</div>
            {loading ? (
              <div className="order-row" aria-hidden="true"><span className="skeleton" style={{ width: '9rem' }} /><span className="skeleton" style={{ width: '60%' }} /></div>
            ) : yourTurn.length ? yourTurn.map(order => (
              <Link className="order-row" key={order.orderId} to={`/orders/${order.orderId}`}>
                <div className="order-row-id"><b className="num">{order.orderNumber}</b><small>อัปเดต {timeAgo(order.updatedAt)}</small></div>
                <StatusBadge status={order.status} />
                <p className="order-row-next" data-owner="customer">{customerNextStep[order.status].text}</p>
                <ArrowRight className="row-chevron" aria-hidden="true" />
              </Link>
            )) : (
              <div className="home-clear"><CircleCheckBig aria-hidden="true" /><span>ไม่มีงานค้าง — ทุกคำสั่งซื้อไม่ต้องรอคุณ</span></div>
            )}
          </section>

          <section className="panel home-section" aria-labelledby="in-progress">
            <div className="panel-heading"><h2 id="in-progress">กำลังดำเนินการ</h2><Link className="link-button" to="/orders?tab=open">ดูทั้งหมด</Link></div>
            {loading ? (
              <div className="order-row" aria-hidden="true"><span className="skeleton" style={{ width: '9rem' }} /><span className="skeleton" style={{ width: '60%' }} /></div>
            ) : inProgress.length ? inProgress.slice(0, PROGRESS_LIMIT).map(order => (
              <Link className="order-row" key={order.orderId} to={`/orders/${order.orderId}`}>
                <div className="order-row-id"><b className="num">{order.orderNumber}</b><small><span className="num">{count.format(order.itemCount)}</span> รายการ · {timeAgo(order.updatedAt)}</small></div>
                <StatusBadge status={order.status} />
                <p className="order-row-next">{customerNextStep[order.status]?.text}</p>
                <ArrowRight className="row-chevron" aria-hidden="true" />
              </Link>
            )) : (
              <div className="state"><p>ยังไม่มีคำสั่งซื้อที่อยู่ระหว่างดำเนินการ</p></div>
            )}
          </section>
        </div>

        <aside className="home-side">
          <section className="panel home-section" aria-labelledby="reorder">
            <div className="panel-heading"><h2 id="reorder">สั่งซ้ำ</h2></div>
            {reorderable.length ? (
              <ul className="reorder-list">
                {reorderable.map(order => (
                  <li key={order.orderId}>
                    <div className="order-row-id"><Link className="num" to={`/orders/${order.orderId}`}>{order.orderNumber}</Link><small><span className="num">{count.format(order.itemCount)}</span> รายการ · {timeAgo(order.updatedAt)}</small></div>
                    <Button type="button" variant="outline" size="sm" disabled={reordering !== null} onClick={() => reorder(order)}>
                      <RotateCcw aria-hidden="true" className={reordering === order.orderId ? 'spin' : undefined} /> {reordering === order.orderId ? 'กำลังเพิ่ม…' : 'สั่งซ้ำ'}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="home-note">คำสั่งซื้อที่เสร็จสมบูรณ์แล้วจะแสดงที่นี่ กดครั้งเดียวเพื่อใส่สินค้าชุดเดิมลงตะกร้า</p>
            )}
          </section>

          <section className="panel home-section" aria-labelledby="updates">
            <div className="panel-heading"><h2 id="updates">อัปเดตล่าสุด</h2></div>
            {updates.length ? (
              <ol className="update-list">
                {updates.map(event => (
                  <li key={event.id}>
                    <Link to={notificationLink(event, 'customer')}>
                      <b>{notificationTitle(event, 'customer')}</b>
                      <small><span className="num">{event.orderNumber}</span> · {timeAgo(event.createdAt)}</small>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : <p className="home-note">ความคืบหน้าจากแอดมินจะแสดงที่นี่</p>}
          </section>
        </aside>
      </div>
    </AnimatedContent>
  );
}
