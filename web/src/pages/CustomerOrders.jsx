import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { apiFetch, apiUrl } from '../api/client.js';
import { statusText } from '../lib/orderStatus.js';
import { AnimatedContent } from '../components/react-bits/AnimatedContent.jsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CustomerOrders({ accountName }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <AnimatedContent className="workspace" distance={18}>
      <p className="eyebrow">CUSTOMER PORTAL / ORDERS</p>
      <h1>คำสั่งซื้อของฉัน</h1>
      <p className="workspace-copy">รายการนี้ผูกกับบัญชีที่เข้าสู่ระบบโดยอัตโนมัติ</p>
      <div className="customer-lookup">
        <Input value={accountName} readOnly aria-label="บัญชีผู้สั่งซื้อ" />
        <Button type="button" className="primary" onClick={load}>รีเฟรช</Button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <div className="state">กำลังโหลดคำสั่งซื้อ…</div>
      ) : (
        <div className="order-cards">
          {orders.map(order => (
            <article className="order-card" key={order.orderId}>
              <div>
                <Badge variant="secondary" className={`status ${order.status}`}>{statusText[order.status] || order.status}</Badge>
                <h2>{order.orderNumber}</h2>
                <p>{order.itemCount} รายการ · อัปเดต {new Date(order.updatedAt).toLocaleString('th-TH')}</p>
              </div>
              <Button asChild variant="outline" className="secondary"><Link to={`/orders/${order.orderId}`}>ดูรายละเอียด</Link></Button>
            </article>
          ))}
          {!orders.length && (
            <div className="state">
              <b>ยังไม่มีคำสั่งซื้อ</b>
              <p>เริ่มจากเลือกสินค้าใน Catalog และบันทึกร่างคำสั่งซื้อ</p>
            </div>
          )}
        </div>
      )}
    </AnimatedContent>
  );
}
