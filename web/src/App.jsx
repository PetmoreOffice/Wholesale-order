import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { auth, firebaseConfigured } from './firebase.js';
import { AppShell } from './components/layout/AppShell.jsx';
import { SessionContext } from './context/session.js';
import { observeSession } from './lib/observeSession.js';
import { RouteBoundary } from './components/RouteBoundary.jsx';
const AdminQueue = lazy(() => import('./pages/AdminQueue.jsx').then(m => ({ default: m.AdminQueue })));
const AdminSettings = lazy(() => import('./pages/AdminSettings.jsx').then(m => ({ default: m.AdminSettings })));
const Catalog = lazy(() => import('./pages/Catalog.jsx').then(m => ({ default: m.Catalog })));
const CustomerHome = lazy(() => import('./pages/CustomerHome.jsx').then(m => ({ default: m.CustomerHome })));
const CustomerOrderPage = lazy(() => import('./pages/CustomerOrderPage.jsx').then(m => ({ default: m.CustomerOrderPage })));
const CustomerOrders = lazy(() => import('./pages/CustomerOrders.jsx').then(m => ({ default: m.CustomerOrders })));
import { Login } from './pages/Login.jsx';
import { Button } from '@/components/ui/button';

export function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authAttempt, setAuthAttempt] = useState(0);

  useEffect(() => {
    if (!firebaseConfigured) {
      setAuthLoading(false);
      return undefined;
    }
    return observeSession(callback => onIdTokenChanged(auth, callback), {
      loading: setAuthLoading, session: setSession, error: setAuthError
    });
  }, [authAttempt]);

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
  if (authError) return <main className="login-page"><section className="login-panel standalone" role="alert">
    <p>{authError}</p><Button onClick={() => { setAuthLoading(true); setAuthAttempt(value => value + 1); }}>ลองใหม่</Button>
  </section></main>;
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
        <RouteBoundary><Suspense fallback={<p role="status" className="p-6">กำลังโหลดหน้า…</p>}><Routes>
          <Route path="/" element={<Navigate to={home} replace />} />
          <Route path="/catalog" element={<Catalog session={session} />} />
          {session.role === 'customer' && <Route path="/home" element={<CustomerHome />} />}
          {session.role === 'customer' && <Route path="/orders" element={<CustomerOrders />} />}
          {session.role === 'customer' && <Route path="/orders/:orderId" element={<CustomerOrderPage />} />}
          {/* One route for the queue and its detail so selecting an order does not remount the queue. */}
          {session.role === 'admin' && <Route path="/admin/*" element={<AdminQueue adminId={session.uid} />} />}
          {session.role === 'admin' && <Route path="/settings" element={<AdminSettings />} />}
          <Route path="*" element={<Navigate to={home} replace />} />
        </Routes></Suspense></RouteBoundary>
      </AppShell>
    </SessionContext.Provider>
  );
}
