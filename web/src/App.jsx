import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, firebaseConfigured } from './firebase.js';
import { AppShell } from './components/layout/AppShell.jsx';
import { AdminQueue } from './pages/AdminQueue.jsx';
import { Catalog } from './pages/Catalog.jsx';
import { CustomerOrderPage } from './pages/CustomerOrderPage.jsx';
import { CustomerOrders } from './pages/CustomerOrders.jsx';
import { Login } from './pages/Login.jsx';

export function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured) {
      setAuthLoading(false);
      return undefined;
    }
    return onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setSession(null);
        setAuthLoading(false);
        return;
      }
      const token = await user.getIdTokenResult();
      const role = token.claims.role === 'admin' ? 'admin' : 'customer';
      setSession({ uid: user.uid, name: user.displayName || user.email, email: user.email, role });
      setAuthLoading(false);
    });
  }, []);

  if (!firebaseConfigured) {
    return (
      <main className="login-page">
        <section className="login-panel standalone">
          <h1>ยังไม่ได้เชื่อม Firebase</h1>
          <p>คัดลอก .env.firebase.example เป็น .env แล้วกรอกค่า Firebase Web App ก่อนเริ่มใช้งาน</p>
        </section>
      </main>
    );
  }
  if (authLoading) {
    return (
      <main className="login-page">
        <section className="login-panel standalone" aria-busy="true"><p>กำลังตรวจสอบการเข้าสู่ระบบ…</p></section>
      </main>
    );
  }
  if (!session) return <Login />;

  const home = session.role === 'admin' ? '/admin' : '/catalog';
  return (
    <AppShell key={session.uid} session={session}>
      <Routes>
        <Route path="/" element={<Navigate to={home} replace />} />
        <Route path="/catalog" element={<Catalog session={session} />} />
        {session.role === 'customer' && <Route path="/orders" element={<CustomerOrders />} />}
        {session.role === 'customer' && <Route path="/orders/:orderId" element={<CustomerOrderPage />} />}
        {/* One route for the queue and its detail so selecting an order does not remount the queue. */}
        {session.role === 'admin' && <Route path="/admin/*" element={<AdminQueue adminId={session.uid} />} />}
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </AppShell>
  );
}
