import React, { useEffect, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, firebaseConfigured } from './firebase.js';
import { AppShell } from './components/layout/AppShell.jsx';
import { AdminQueue } from './pages/AdminQueue.jsx';
import { Catalog } from './pages/Catalog.jsx';
import { CustomerOrders } from './pages/CustomerOrders.jsx';
import { Login } from './pages/Login.jsx';

export function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('catalog');

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
      setView(role === 'admin' ? 'admin' : 'catalog');
      setAuthLoading(false);
    });
  }, []);

  if (!firebaseConfigured) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <p className="eyebrow">SETUP REQUIRED</p>
          <h1>ยังไม่ได้เชื่อม Firebase</h1>
          <p>คัดลอก .env.firebase.example เป็น .env แล้วกรอกค่า Firebase Web App ก่อนเริ่มใช้งาน</p>
        </section>
      </main>
    );
  }
  if (authLoading) {
    return (
      <main className="login-page">
        <section className="login-panel"><p>กำลังตรวจสอบ Session…</p></section>
      </main>
    );
  }
  if (!session) return <Login />;

  return (
    <AppShell key={session.uid} session={session} view={view} setView={setView}>
      {view === 'catalog' && <Catalog session={session} />}
      {view === 'orders' && session.role === 'customer' && <CustomerOrders accountName={session.name} />}
      {view === 'admin' && session.role === 'admin' && <AdminQueue adminName={session.name} adminId={session.uid} />}
    </AppShell>
  );
}
