import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { auth, firebaseConfigured } from '@/firebase';
import { demoMode, queryClient } from '@/lib/api';
import { SessionContext } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { AppShell } from './AppShell.jsx';
import { GateFrame, LoginPage } from '@/features/auth/LoginPage';

// Each area loads on first visit: customers never download the admin screens.
const CustomerHome = lazy(() => import('@/features/orders/CustomerHome'));
const OrdersPage = lazy(() => import('@/features/orders/OrdersPage'));
const OrderPage = lazy(() => import('@/features/orders/OrderPage'));
const CatalogPage = lazy(() => import('@/features/catalog/CatalogPage'));
const AdminQueue = lazy(() => import('@/features/admin/AdminQueue'));
const AdminSettings = lazy(() => import('@/features/settings/AdminSettings'));

function GateMessage({ title, children }) {
  return (
    <GateFrame>
      <div className="w-full max-w-[420px]" aria-live="polite">
        <h1 className="text-[28px] font-medium">{title}</h1>
        <div className="mt-2 text-[16px] text-ink-2">{children}</div>
      </div>
    </GateFrame>
  );
}

function useSessionState() {
  const [state, setState] = useState(() => ({ loading: !demoMode, session: null }));
  useEffect(() => {
    if (demoMode) {
      import('@/demo/demoApi.js').then(({ demoSession }) => setState({ loading: false, session: demoSession() }));
      return undefined;
    }
    if (!firebaseConfigured) return undefined;
    return onIdTokenChanged(auth, async (user) => {
      if (!user) {
        queryClient.clear();
        setState({ loading: false, session: null });
        return;
      }
      const token = await user.getIdTokenResult();
      // Accounts need a role set by an admin; the API refuses the rest, so say so here too.
      const role = ['admin', 'customer'].includes(token.claims.role) ? token.claims.role : null;
      setState({ loading: false, session: { uid: user.uid, name: user.displayName || user.email, email: user.email, role } });
    });
  }, []);
  return state;
}

export function App() {
  const { loading, session } = useSessionState();

  if (!firebaseConfigured && !demoMode) {
    return <GateMessage title="ยังไม่ได้เชื่อม Firebase">คัดลอก <code>.env.firebase.example</code> เป็น <code>.env</code> แล้วกรอกค่า Firebase Web App ก่อนเริ่มใช้งาน</GateMessage>;
  }
  if (loading) return <GateMessage title="กำลังตรวจสอบการเข้าสู่ระบบ…" />;
  if (!session) return <LoginPage />;
  if (!session.role) {
    return (
      <GateMessage title="บัญชียังไม่ได้รับสิทธิ์">
        <p>บัญชี {session.email} ยังไม่ได้ถูกกำหนดให้เป็นลูกค้าหรือแอดมิน กรุณาติดต่อผู้ดูแลระบบ</p>
        <Button type="button" variant="outline" className="mt-6" onClick={() => signOut(auth)}>ออกจากระบบ</Button>
      </GateMessage>
    );
  }

  const home = session.role === 'admin' ? '/admin' : '/home';
  return (
    <SessionContext.Provider value={session}>
      <AppShell key={session.uid} session={session}>
        <Suspense fallback={<p className="py-10 text-ink-2" aria-busy="true">กำลังโหลด…</p>}>
          <Routes>
            <Route path="/" element={<Navigate to={home} replace />} />
            <Route path="/catalog" element={<CatalogPage />} />
            {session.role === 'customer' && <Route path="/home" element={<CustomerHome />} />}
            {session.role === 'customer' && <Route path="/orders" element={<OrdersPage />} />}
            {session.role === 'customer' && <Route path="/orders/:orderId" element={<OrderPage />} />}
            {/* One route for the queue and its detail so selecting an order does not remount the queue. */}
            {session.role === 'admin' && <Route path="/admin/*" element={<AdminQueue />} />}
            {session.role === 'admin' && <Route path="/settings" element={<AdminSettings />} />}
            <Route path="*" element={<Navigate to={home} replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </SessionContext.Provider>
  );
}
