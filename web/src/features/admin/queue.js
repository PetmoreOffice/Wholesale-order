import { useEffect, useState } from 'react';
import { closedStatuses } from '@shared/orderWorkflow.js';
import { api } from '@/lib/api';

export const POLL_MS = 15_000;
export const STALE_HOURS = 24;

export const queueQuery = {
  queryKey: ['orders', 'admin', 'queue'],
  queryFn: () => api('/orders/admin/queue').then(result => result.data),
  refetchInterval: POLL_MS
};

// Shared with settings: the customer profile (phone, address, internal note) lives on the user.
export const usersQuery = {
  queryKey: ['admin', 'users'],
  queryFn: () => api('/admin/users').then(result => result.data),
  staleTime: 30_000
};

export const queueTabs = (adminId) => [
  { id: 'unclaimed', label: 'รอรับงาน', match: order => order.status === 'submitted' },
  { id: 'mine', label: 'งานของฉัน', match: order => order.assignedAdminId === adminId && !closedStatuses.includes(order.status) && order.status !== 'need_information' },
  { id: 'waiting', label: 'รอลูกค้าตอบ', match: order => order.status === 'need_information' },
  { id: 'open', label: 'เปิดอยู่ทั้งหมด', match: order => !closedStatuses.includes(order.status) },
  { id: 'closed', label: 'ปิดแล้ว', match: order => closedStatuses.includes(order.status) }
];

export const sourceText = { self: 'ลูกค้าสั่งเอง', phone: 'ลูกค้าโทรมาสั่ง', assisted: 'ลูกค้าฝากสั่ง' };

/** Minutes since the order last changed. */
export const waitingMinutes = (order, now = Date.now()) => Math.max(0, Math.floor((now - Date.parse(order.updatedAt)) / 60000));

export const isStale = (order, now) => !closedStatuses.includes(order.status) && waitingMinutes(order, now) >= STALE_HOURS * 60;

/** "35 นาที", "26 ชม.", "3 วัน": short enough for a table cell. */
export function waitingText(minutes) {
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} ชม.`;
  return `${Math.floor(hours / 24)} วัน`;
}

/** True when the screen has room for the detail beside the table (wider than 1024px). */
export function useWide(query = '(min-width: 1025px)') {
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setWide(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return wide;
}
