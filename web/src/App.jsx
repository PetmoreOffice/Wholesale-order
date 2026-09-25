import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { auth, firebaseConfigured } from './firebase.js';
import { AppShell } from './components/layout/AppShell.jsx';
import { SessionContext } from './context/session.js';
import { AdminQueue } from './pages/AdminQueue.jsx';
import { AdminSettings } from './pages/AdminSettings.jsx';
import { Catalog } from './pages/Catalog.jsx';
import { CustomerHome } from './pages/CustomerHome.jsx';
import { CustomerOrderPage } from './pages/CustomerOrderPage.jsx';
import { CustomerOrders } from './pages/CustomerOrders.jsx';
import { Login } from './pages/Login.jsx';
import { Button } from '@/components/ui/button';

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
      // Accounts need a role set by an admin; the API refuses the rest, so say so here too.
      const role = ['admin', 'customer'].includes(token.claims.role) ? token.claims.role : null;
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
  if (!session.role) {
    return (
      <main className="login-page">
        <section className="login-panel standalone">
          <h1>บัญชียังไม่ได้รับสิทธิ์</h1>
          <p>บัญชี {session.email} ยังไม่ได้ถูกกำหนดให้เป็นลูกค้าหรือแอดมิน กรุณาติดต่อผู้ดูแลระบบ</p>
          <Button type="button" variant="outline" className="mt-6 self-start" onClick={() => signOut(auth)}>ออกจากระบบ</Button>
        </section>
      </main>
    );
  }

  const home = session.role === 'admin' ? '/admin' : '/home';
  return (
    <SessionContext.Provider value={session}>
      <AppShell key={session.uid} session={session}>
        <Routes>
          <Route path="/" element={<Navigate to={home} replace />} />
          <Route path="/catalog" element={<Catalog session={session} />} />
          {session.role === 'customer' && <Route path="/home" element={<CustomerHome />} />}
          {session.role === 'customer' && <Route path="/orders" element={<CustomerOrders />} />}
          {session.role === 'customer' && <Route path="/orders/:orderId" element={<CustomerOrderPage />} />}
          {/* One route for the queue and its detail so selecting an order does not remount the queue. */}
          {session.role === 'admin' && <Route path="/admin/*" element={<AdminQueue adminId={session.uid} />} />}
          {session.role === 'admin' && <Route path="/settings" element={<AdminSettings />} />}
          <Route path="*" element={<Navigate to={home} replace />} />
        </Routes>
      </AppShell>
    </SessionContext.Provider>
  );
}
