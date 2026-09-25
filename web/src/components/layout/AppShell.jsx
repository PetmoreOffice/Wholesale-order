import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase.js';

export function AppShell({ session, view, setView, children }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const changeView = (nextView) => {
    setView(nextView);
    setNavigationOpen(false);
  };
  return (
    <div className={`app-shell ${navigationOpen ? 'navigation-open' : ''}`}>
      <button className="nav-scrim" aria-label="ปิดเมนู" onClick={() => setNavigationOpen(false)} />
      <nav id="main-navigation" className="sidebar" aria-label="เมนูหลัก">
        <a className="brand" href="#catalog" onClick={() => changeView('catalog')}>
          <span>◈</span> WHOLESALE<br />CONTROL DESK
        </a>
        <div className="nav-group">
          <button onClick={() => changeView('catalog')} className={view === 'catalog' ? 'active' : ''}>▦ สินค้า</button>
          {session.role === 'customer' && (
            <button onClick={() => changeView('orders')} className={view === 'orders' ? 'active' : ''}>▤ คำสั่งซื้อของฉัน</button>
          )}
          {session.role === 'admin' && (
            <button onClick={() => changeView('admin')} className={view === 'admin' ? 'active' : ''}>▣ Admin Queue</button>
          )}
        </div>
        <div className="nav-foot">ต้องการความช่วยเหลือ?<br /><b>ติดต่อทีมงาน</b></div>
      </nav>
      <main>
        <header className="topbar">
          <button className="menu" aria-label="ย่อหรือขยายเมนูหลัก" aria-pressed={navigationOpen} aria-controls="main-navigation" onClick={() => setNavigationOpen(open => !open)}>☰</button>
          <div className="account">
            <span className="avatar">{session.name.slice(0, 1)}</span>
            <span>
              <b>{session.name}</b>
              <small>{session.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ลูกค้าขายส่ง'}</small>
            </span>
            <button className="text-button" onClick={() => signOut(auth)}>ออกจากระบบ</button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
