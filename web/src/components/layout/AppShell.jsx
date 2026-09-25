import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { signOut } from 'firebase/auth';
import { Boxes, ClipboardList, House, Inbox, LogOut, Package, PanelLeft, Settings } from 'lucide-react';
import { auth } from '../../firebase.js';
import { NotificationBell } from '../NotificationBell.jsx';

export function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><Boxes /></span>;
}

export function AppShell({ session, children }) {
  // Desktop: collapses the rail to icons. Phone: opens the drawer.
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigate = useNavigate();
  const closeOnPhone = () => setNavigationOpen(false);
  const links = [
    ...(session.role === 'customer' ? [{ to: '/home', label: 'หน้าหลัก', icon: House }] : []),
    { to: '/catalog', label: 'สินค้า', icon: Package },
    ...(session.role === 'customer' ? [{ to: '/orders', label: 'คำสั่งซื้อของฉัน', icon: ClipboardList }] : []),
    ...(session.role === 'admin' ? [{ to: '/admin', label: 'คิวงานคำสั่งซื้อ', icon: Inbox }, { to: '/settings', label: 'ตั้งค่า', icon: Settings }] : []),
  ];
  async function logOut() {
    // Start the next account at its own home page instead of this account's last URL.
    navigate('/', { replace: true });
    await signOut(auth);
  }
  return (
    <div className={`app-shell ${navigationOpen ? 'navigation-open' : ''}`}>
      <button className="nav-scrim" tabIndex={-1} aria-label="ปิดเมนู" onClick={closeOnPhone} />
      <nav id="main-navigation" className="sidebar" aria-label="เมนูหลัก">
        <Link className="brand" to="/" onClick={closeOnPhone}>
          <BrandMark />
          <span className="nav-label">Wholesale<br />Control Desk</span>
        </Link>
        <div className="nav-group">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} title={label} onClick={closeOnPhone}>
              <Icon aria-hidden="true" />
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="app-main">
        <header className="topbar">
          <button className="icon-button" aria-label="ย่อหรือขยายเมนูหลัก" aria-pressed={navigationOpen} aria-controls="main-navigation" onClick={() => setNavigationOpen(open => !open)}>
            <PanelLeft aria-hidden="true" />
          </button>
          <div className="account">
            <NotificationBell role={session.role} />
            <span className="avatar" aria-hidden="true">{session.name.slice(0, 1)}</span>
            <span className="account-name">
              <b>{session.name}</b>
              <small>{session.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ลูกค้าขายส่ง'}</small>
            </span>
            <button className="icon-button" onClick={logOut} aria-label="ออกจากระบบ" title="ออกจากระบบ"><LogOut aria-hidden="true" /></button>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
