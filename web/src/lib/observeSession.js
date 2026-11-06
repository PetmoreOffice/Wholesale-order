// Ignore stale token reads after sign-out/account changes, and always end loading.
export function observeSession(subscribe, { loading, session, error }) {
  let generation = 0;
  const unsubscribe = subscribe(async user => {
    const current = ++generation;
    loading(true);
    error('');
    try {
      if (!user) { session(null); return; }
      const token = await user.getIdTokenResult();
      if (current !== generation) return;
      const role = ['admin', 'customer'].includes(token.claims.role) ? token.claims.role : null;
      session({ uid: user.uid, name: user.displayName || user.email, email: user.email, role });
    } catch {
      if (current === generation) {
        session(null);
        error('ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่');
      }
    } finally {
      if (current === generation) loading(false);
    }
  });
  return () => { generation++; unsubscribe(); };
}
