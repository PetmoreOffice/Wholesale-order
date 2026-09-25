import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase.js';

export function AppShell({ session, children }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigate = useNavigate();
  const closeNavigation = () => setNavigationOpen(false);
  const navClass = ({ isActive }) => (isActive ? 'active' : '');
  async function logOut() {
    // Start the next account at its own home page instead of this account's last URL.
    navigate('/', { replace: true });
    await signOut(auth);
  }
  return (
    <div className={`app-shell ${navigationOpen ? 'navigation-open' : ''}`}>
      <button className="nav-scrim" aria-label="ปิดเมนู" onClick={closeNavigation} />
      <nav id="main-navigation" className="sidebar" aria-label="เมนูหลัก">
        <Link className="brand" to="/" onClick={closeNavigation}>
          <span>◈</span> WHOLESALE<br />CONTROL DESK
        </Link>
        <div className="nav-group">
          <NavLink to="/catalog" className={navClass} onClick={closeNavigation}>▦ สินค้า</NavLink>
          {session.role === 'customer' && (
            <NavLink to="/orders" className={navClass} onClick={closeNavigation}>▤ คำสั่งซื้อของฉัน</NavLink>
          )}
          {session.role === 'admin' && (
            <NavLink to="/admin" className={navClass} onClick={closeNavigation}>▣ Admin Queue</NavLink>
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
            <button className="text-button" onClick={logOut}>ออกจากระบบ</button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
