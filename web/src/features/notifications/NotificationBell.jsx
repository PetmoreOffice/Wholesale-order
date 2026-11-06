import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Popover } from 'radix-ui';
import { Bell } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { timeAgo } from '@/lib/format';
import { markNotificationsRead, notificationLink, notificationsQuery, notificationTitle } from '@/lib/notifications';
import { StatusBadge } from '@/components/route/StatusBadge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const baseTitle = document.title;

export function NotificationBell({ role, className }) {
  const queryClient = useQueryClient();
  const { data, error } = useQuery(notificationsQuery);
  const [open, setOpen] = useState(false);
  // While the panel is open, keep the highlight on what was new when it opened.
  const [highlight, setHighlight] = useState(() => new Set());
  const events = data?.data || [];
  const unreadCount = open ? 0 : data?.unreadCount || 0;

  useEffect(() => {
    document.title = unreadCount ? `(${unreadCount}) ${baseTitle}` : baseTitle;
    return () => { document.title = baseTitle; };
  }, [unreadCount]);

  async function onOpenChange(nextOpen) {
    setOpen(nextOpen);
    if (nextOpen) {
      setHighlight(new Set(events.filter(event => event.unread).map(event => event.id)));
      if (data?.unreadCount) {
        try { await markNotificationsRead(events[0]?.createdAt); } catch { /* the badge returns on the next poll */ }
        queryClient.invalidateQueries({ queryKey: notificationsQuery.queryKey });
      }
    }
  }

  const label = unreadCount ? `การแจ้งเตือน ${unreadCount} รายการใหม่` : 'การแจ้งเตือน';
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Popover.Trigger aria-label={label} className={`relative grid size-11 place-items-center lg:size-10 rounded-full text-ink-2 transition-colors hover:bg-brand-tint hover:text-brand-deep ${className || ''}`}>
            <Bell aria-hidden="true" className="size-5" />
            {unreadCount > 0 && (
              <span aria-hidden="true" className="num absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-turn px-1 text-center text-xs leading-5 font-bold text-ink ring-2 ring-panel">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Popover.Trigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} collisionPadding={12} className="z-50 max-h-[min(70vh,560px)] w-[min(92vw,400px)] overflow-y-auto rounded-xl border border-line bg-panel shadow-overlay">
          <h2 className="sticky top-0 border-b border-line bg-panel px-4 py-3 text-[17px] font-bold">การแจ้งเตือน</h2>
          {error && !events.length ? (
            <p className="px-4 py-6 text-[15px] text-ink-2">{error.message}</p>
          ) : events.length ? (
            <ol>
              {events.map(event => (
                <li key={event.id} className="border-b border-line last:border-0">
                  <Link to={notificationLink(event, role)} onClick={() => setOpen(false)} className={`grid gap-1 px-4 py-3 transition-colors hover:bg-sunken ${highlight.has(event.id) ? 'bg-turn-soft' : ''}`}>
                    <span className="font-bold text-ink">{notificationTitle(event, role)}</span>
                    <span className="text-sm text-ink-3"><span className="num">{event.orderNumber}</span> · {timeAgo(event.createdAt)}</span>
                    {event.message && ['need_information', 'rejected', 'approved'].includes(event.toStatus) && role !== 'admin' && <span className="text-[15px] text-ink-2">{event.message}</span>}
                    <StatusBadge status={event.toStatus} className="justify-self-start" />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-4 py-6 text-[15px] text-ink-2">ยังไม่มีการแจ้งเตือน ความคืบหน้าของคำสั่งซื้อจะแสดงที่นี่</p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
