import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Popover } from 'radix-ui';
import { Bell } from 'lucide-react';
import { timeAgo } from '../lib/format.js';
import { fetchNotifications, markNotificationsRead, notificationLink, notificationTitle } from '../lib/notifications.js';
import { StatusBadge } from './StatusBadge.jsx';

const POLL_MS = 30000;
const baseTitle = document.title;

export function NotificationBell({ role }) {
  const [feed, setFeed] = useState({ data: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const openRef = useRef(open);
  openRef.current = open;

  async function load() {
    try {
      const next = await fetchNotifications();
      setFeed(current => {
        if (!openRef.current) return next;
        // While the panel is open, keep the highlight on what was new when it opened.
        const wasUnread = new Set(current.data.filter(event => event.unread).map(event => event.id));
        return { ...next, unreadCount: 0, data: next.data.map(event => ({ ...event, unread: event.unread || wasUnread.has(event.id) })) };
      });
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  useEffect(() => {
    document.title = feed.unreadCount ? `(${feed.unreadCount}) ${baseTitle}` : baseTitle;
    return () => { document.title = baseTitle; };
  }, [feed.unreadCount]);

  async function onOpenChange(nextOpen) {
    setOpen(nextOpen);
    if (nextOpen && feed.unreadCount) {
      setFeed(current => ({ ...current, unreadCount: 0 }));
      try { await markNotificationsRead(); } catch { /* the badge returns on the next poll */ }
    }
    if (!nextOpen) setFeed(current => ({ ...current, data: current.data.map(event => ({ ...event, unread: false })) }));
  }

  const label = feed.unreadCount ? `การแจ้งเตือน ${feed.unreadCount} รายการใหม่` : 'การแจ้งเตือน';
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger className="icon-button bell" aria-label={label} title={label}>
        <Bell aria-hidden="true" />
        {feed.unreadCount > 0 && <span className="bell-count num" aria-hidden="true">{feed.unreadCount > 99 ? '99+' : feed.unreadCount}</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="notification-panel" align="end" sideOffset={8} collisionPadding={12}>
          <div className="notification-head"><h2>การแจ้งเตือน</h2></div>
          {error && !feed.data.length ? (
            <p className="notification-empty">{error}</p>
          ) : feed.data.length ? (
            <ol className="notification-list">
              {feed.data.map(event => (
                <li key={event.id} data-unread={event.unread || undefined}>
                  <Link to={notificationLink(event, role)} onClick={() => onOpenChange(false)}>
                    <span className="notification-title">{notificationTitle(event, role)}</span>
                    <span className="notification-meta"><span className="num">{event.orderNumber}</span> · {timeAgo(event.createdAt)}</span>
                    {event.message && ['need_information', 'rejected', 'approved'].includes(event.toStatus) && role !== 'admin' && <span className="notification-message">{event.message}</span>}
                    <StatusBadge status={event.toStatus} />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="notification-empty">ยังไม่มีการแจ้งเตือน ความคืบหน้าของคำสั่งซื้อจะแสดงที่นี่</p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
