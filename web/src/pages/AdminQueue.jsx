import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useMatch, useNavigate, useSearchParams } from 'react-router';
import { FileDown, RefreshCw, X } from 'lucide-react';
import { apiFetch, apiUrl } from '../api/client.js';
import { downloadFile, orderCsv } from '../lib/csv.js';
import { count, dateTime, timeAgo } from '../lib/format.js';
import { adminActionText, adminActions, closedStatuses, messageRequired } from '../lib/orderStatus.js';
import { OrderMessages } from '../components/OrderMessages.jsx';
import { OrderProgress } from '../components/OrderProgress.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { CountUp } from '../components/react-bits/CountUp.jsx';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function AdminQueue({ adminId }) {
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const match = useMatch('/admin/orders/:orderId');
  const selectedId = match ? Number.parseInt(match.params.orderId, 10) : null;
  // Ignore detail responses that arrive after the admin has already opened another order.
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const tabs = [
    { id: 'unclaimed', label: 'รอรับงาน', match: order => order.status === 'submitted' },
    { id: 'mine', label: 'งานของฉัน', match: order => order.assignedAdminId === adminId && !closedStatuses.includes(order.status) && order.status !== 'need_information' },
    { id: 'waiting', label: 'รอลูกค้าตอบ', match: order => order.status === 'need_information' },
    { id: 'open', label: 'เปิดอยู่ทั้งหมด', match: order => !closedStatuses.includes(order.status) },
    { id: 'closed', label: 'ปิดแล้ว', match: order => closedStatuses.includes(order.status) },
  ];

  async function load() {
    try {
      const response = await apiFetch(`${apiUrl}/orders/admin/queue`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setOrders(data.data);
    } catch (err) {
      setError(err.message || 'โหลดคิวงานไม่สำเร็จ');
    } finally { setLoaded(true); }
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 15000);
    return () => clearInterval(timer);
  }, []);

  async function loadDetail(orderId) {
    try {
      const response = await apiFetch(`${apiUrl}/orders/${orderId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      if (selectedIdRef.current !== orderId) return;
      setDetail(data.data);
      setSelected(data.data);
    } catch (err) {
      if (selectedIdRef.current === orderId) setError(err.message || 'โหลดรายละเอียดไม่สำเร็จ');
    }
  }

  useEffect(() => {
    setDetail(null);
    setMessage('');
    setError('');
    setSelected(selectedId ? orders.find(order => order.orderId === selectedId) || null : null);
    if (selectedId) loadDetail(selectedId);
  }, [selectedId]);

  // Keep the chosen tab in the URL while moving between orders.
  const choose = (order) => navigate({ pathname: `/admin/orders/${order.orderId}`, search: location.search });
  const closeDetail = () => navigate({ pathname: '/admin', search: location.search });

  async function claim() {
    if (busy || !selected) return;
    setBusy(true); setError('');
    try {
      const response = await apiFetch(`${apiUrl}/orders/${selected.orderId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setSelected(current => ({ ...current, assignedAdminId: data.data.assignedAdminId, assignedAdminName: data.data.assignedAdminName, status: data.data.status }));
      await loadDetail(selected.orderId);
      await load();
    } catch (err) {
      setError(err.message || 'รับงานไม่สำเร็จ');
    } finally { setBusy(false); }
  }

  async function move(status) {
    if (busy || !selected) return;
    if (messageRequired.includes(status) && !message.trim()) {
      setError(status === 'rejected' ? 'ระบุเหตุผลที่ปฏิเสธและแนวทางให้ลูกค้าก่อน' : 'ระบุข้อมูลที่ต้องการจากลูกค้าก่อน');
      return;
    }
    setBusy(true); setError('');
    try {
      const response = await apiFetch(`${apiUrl}/orders/${selected.orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, message })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setSelected(current => ({ ...current, status: data.data.status }));
      setMessage('');
      await loadDetail(selected.orderId);
      await load();
    } catch (err) {
      setError(err.message || 'อัปเดตสถานะไม่สำเร็จ');
    } finally { setBusy(false); }
  }

  const counts = Object.fromEntries(tabs.map(tab => [tab.id, orders.filter(tab.match).length]));
  const requested = searchParams.get('tab');
  // Default to new work when there is any; otherwise the admin's own open work.
  const activeTab = tabs.find(tab => tab.id === requested) || (counts.unclaimed ? tabs[0] : tabs[3]);
  const visible = orders.filter(activeTab.match);

  const mine = selected?.assignedAdminId === adminId;
  const claimable = selected && !['draft', ...closedStatuses].includes(selected.status) && !mine;
  const actions = adminActions[selected?.status] || [];
  const needsMessage = actions.some(status => messageRequired.includes(status));

  return (
    // Plain wrapper, no entrance transform: a transformed ancestor would pin the mobile detail sheet to the page instead of the viewport.
    <div className="page">
      <PageHeader
        title="คิวงานคำสั่งซื้อ"
        description="รับงาน ตรวจสอบ และติดตามการบันทึกเข้า ERP · อัปเดตอัตโนมัติทุก 15 วินาที"
        actions={<Button type="button" variant="outline" disabled={busy} onClick={load}><RefreshCw aria-hidden="true" /> รีเฟรช</Button>}
      />
      <div className="tabs" role="tablist" aria-label="กลุ่มงาน">
        {tabs.map(tab => (
          <button key={tab.id} type="button" role="tab" aria-selected={tab.id === activeTab.id} onClick={() => setSearchParams({ tab: tab.id }, { replace: true })}>
            {tab.label}<span className="tab-count"><CountUp to={counts[tab.id]} /></span>
          </button>
        ))}
      </div>
      {error && !selected && <p className="form-error" role="alert">{error}</p>}
      <div className="queue-layout" data-detail-open={selectedId ? 'true' : 'false'}>
        <section className="panel queue" role="tabpanel" aria-label={activeTab.label}>
          <div className="queue-columns" aria-hidden="true"><span>คำสั่งซื้อ</span><span>ลูกค้า</span><span>ผู้รับผิดชอบ</span><span>สถานะ</span></div>
          {!loaded ? (
            Array.from({ length: 5 }, (_, index) => <div key={index} className="queue-row" aria-hidden="true"><span className="skeleton" style={{ width: '8rem' }} /><span className="skeleton" style={{ width: '70%' }} /><span className="skeleton" style={{ width: '5rem' }} /><span className="skeleton" style={{ width: '6rem' }} /></div>)
          ) : visible.length ? visible.map(order => (
            <button type="button" className="queue-row" key={order.orderId} aria-current={selectedId === order.orderId ? 'true' : undefined} onClick={() => choose(order)}>
              <span className="queue-id"><b className="num">{order.orderNumber}</b><small>{timeAgo(order.updatedAt)}</small></span>
              <span className="queue-customer"><b>{order.customerName}</b><small><span className="num">{count.format(order.itemCount)}</span> รายการ</small></span>
              <span className="queue-owner" data-empty={!order.assignedAdminName}>{order.assignedAdminId === adminId ? 'คุณ' : order.assignedAdminName || 'ยังไม่มีผู้รับ'}</span>
              <StatusBadge status={order.status} />
            </button>
          )) : (
            <div className="state">
              <b>ไม่มีงานในกลุ่ม “{activeTab.label}”</b>
              <p>{activeTab.id === 'unclaimed' ? 'คำสั่งซื้อใหม่จะแสดงที่นี่อัตโนมัติ' : 'ลองดูกลุ่มอื่นจากแท็บด้านบน'}</p>
            </div>
          )}
        </section>

        <aside className="panel order-panel" aria-label="รายละเอียดคำสั่งซื้อ">
          {selected ? (
            <>
              <div className="order-panel-head">
                <div>
                  <h2 className="num">{selected.orderNumber}</h2>
                  <p>{selected.customerName}</p>
                </div>
                <button type="button" className="icon-button" onClick={closeDetail} aria-label="ปิดรายละเอียด"><X aria-hidden="true" /></button>
              </div>
              <div className="order-panel-status">
                <StatusBadge status={selected.status} />
                <span>{selected.assignedAdminName ? <>ผู้รับผิดชอบ: <b>{mine ? 'คุณ' : selected.assignedAdminName}</b></> : 'ยังไม่มีผู้รับงาน'}</span>
                {detail && <Button type="button" size="sm" variant="outline" onClick={() => downloadFile(`${detail.orderNumber}.csv`, orderCsv(detail), 'text/csv;charset=utf-8')} title="ไฟล์ CSV สำหรับคีย์เข้า ERP (เปิดใน Excel ได้)"><FileDown aria-hidden="true" /> CSV สำหรับ ERP</Button>}
                {claimable && <Button type="button" size="sm" variant={selected.assignedAdminName ? 'outline' : 'default'} disabled={busy || !detail} onClick={claim}>{selected.assignedAdminName ? 'รับช่วงงาน' : 'รับงานนี้'}</Button>}
              </div>

              <ul className="line-items compact">
                {detail ? detail.items.map(item => (
                  <li key={item.itemId}>
                    <div className="line-item-text"><b>{item.name}</b><small className="sku">{item.sku}</small></div>
                    <strong className="item-quantity"><span className="num">{count.format(item.quantity)}</span> {item.unitName}</strong>
                  </li>
                )) : <li aria-hidden="true"><span className="skeleton" style={{ width: '80%' }} /></li>}
              </ul>
              {(detail?.deliveryDetails || detail?.customerNote) && (
                <dl className="progress-facts">
                  {detail.deliveryDetails && <><dt>จัดส่ง</dt><dd>{detail.deliveryDetails}</dd></>}
                  {detail.customerNote && <><dt>หมายเหตุ</dt><dd>{detail.customerNote}</dd></>}
                </dl>
              )}

              <OrderMessages messages={detail?.messages} />

              {actions.length > 0 && (
                <div className="admin-action-box">
                  {mine ? (
                    <>
                      <Label htmlFor="admin-message">ข้อความถึงลูกค้า {needsMessage && <small>(จำเป็นเมื่อขอข้อมูลเพิ่มหรือปฏิเสธ)</small>}</Label>
                      <Textarea id="admin-message" value={message} onChange={e => setMessage(e.target.value)} placeholder="อธิบายการดำเนินการ หรือข้อมูลที่ต้องการจากลูกค้า" rows="3" className="bg-card" />
                      <div className="action-buttons">
                        {actions.map(status => (
                          <Button key={status} type="button" disabled={busy || !detail}
                            variant={status === 'rejected' ? 'outline' : status === 'need_information' ? 'outline' : 'default'}
                            className={status === 'rejected' ? 'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive' : undefined}
                            onClick={() => move(status)}>{adminActionText[status]}</Button>
                        ))}
                      </div>
                    </>
                  ) : <p>รับงานนี้ก่อน จึงจะอนุมัติ ขอข้อมูลเพิ่ม หรือปฏิเสธได้</p>}
                </div>
              )}
              {selected.status === 'submitted' && !actions.length && <p className="progress-note">กด “รับงานนี้” เพื่อเริ่มตรวจสอบ</p>}
              {error && <p className="form-error" role="alert">{error}</p>}

              {detail && <OrderProgress order={detail} />}
              {detail?.assignmentLog?.length > 0 && (
                <details className="history">
                  <summary>ประวัติผู้รับงาน ({detail.assignmentLog.length})</summary>
                  <ol>
                    {detail.assignmentLog.map(log => (
                      <li key={log.assignmentId}><b>{log.adminName}</b> · {log.action === 'reassigned' ? 'รับช่วงงาน' : 'รับงาน'}<small>{dateTime(log.createdAt)}</small></li>
                    ))}
                  </ol>
                </details>
              )}
            </>
          ) : (
            <div className="state">
              {selectedId ? <p>กำลังโหลดรายละเอียดคำสั่งซื้อ…</p> : <><b>เลือกคำสั่งซื้อจากคิว</b><p>รายละเอียด รายการสินค้า และปุ่มดำเนินการจะแสดงที่นี่</p></>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
