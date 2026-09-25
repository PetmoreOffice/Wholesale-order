import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { apiFetch, apiUrl } from '../api/client.js';
import { CustomerOrderDetail } from '../components/CustomerOrderDetail.jsx';
import { AnimatedContent } from '../components/react-bits/AnimatedContent.jsx';
import { Button } from '@/components/ui/button';

export function CustomerOrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setOrder(null); setError('');
    apiFetch(`${apiUrl}/orders/${encodeURIComponent(orderId)}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        if (active) setOrder(data.data);
      })
      .catch(err => { if (active) setError(err.message || 'โหลดรายละเอียดไม่สำเร็จ'); });
    return () => { active = false; };
  }, [orderId]);

  return (
    <AnimatedContent className="workspace" distance={18}>
      {order ? (
        <CustomerOrderDetail key={order.orderId} initialOrder={order} onChanged={() => {}} onClose={() => navigate('/orders')} />
      ) : error ? (
        <div className="state error">
          <b>เปิดคำสั่งซื้อไม่ได้</b>
          <p>{error}</p>
          <Button asChild variant="outline" className="secondary"><Link to="/orders">กลับไปคำสั่งซื้อ</Link></Button>
        </div>
      ) : (
        <div className="state">กำลังโหลดคำสั่งซื้อ…</div>
      )}
    </AnimatedContent>
  );
}
