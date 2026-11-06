import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Archive, DatabaseBackup, Download, History, Pencil, Power, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { count, dateTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StateBlock } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { SettingsSection } from './parts.jsx';

const toneClass = {
  progress: 'bg-brand-tint text-brand-deep',
  neutral: 'bg-sunken text-ink-2',
  attention: 'bg-turn text-ink',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info'
};

const actions = {
  'user.created': { label: 'สร้างบัญชี', icon: UserPlus, tone: 'progress' },
  'user.updated': { label: 'แก้ไขบัญชี', icon: Pencil, tone: 'neutral' },
  'user.role_changed': { label: 'เปลี่ยนบทบาท', icon: ShieldCheck, tone: 'attention' },
  'user.disabled': { label: 'ปิดใช้งาน', icon: Power, tone: 'danger' },
  'user.enabled': { label: 'เปิดใช้งาน', icon: Power, tone: 'progress' },
  'backup.created': { label: 'สำรองข้อมูล', icon: DatabaseBackup, tone: 'info' },
  'data.downloaded': { label: 'ดาวน์โหลดข้อมูล', icon: Download, tone: 'info' },
  'orders.archived': { label: 'เก็บถาวร', icon: Archive, tone: 'neutral' }
};

const activityQuery = { queryKey: ['admin', 'activity'], queryFn: () => api('/admin/data/activity?limit=200') };

export function ActivitySection() {
  const { data, error, isPending, isFetching, refetch } = useQuery(activityQuery);
  const entries = data?.data || [];
  const total = data?.total || 0;

  return (
    <SettingsSection
      id="activity"
      title="บันทึกกิจกรรม"
      description="ใครทำอะไรกับบัญชีผู้ใช้และข้อมูลระบบ เมื่อไร · เก็บล่าสุด 500 รายการ การเปลี่ยนสถานะคำสั่งซื้อดูได้ในประวัติของแต่ละคำสั่งซื้อ"
      actions={<Button type="button" variant="outline" size="lg" disabled={isFetching} onClick={() => refetch()} aria-label="รีเฟรชบันทึกกิจกรรม"><RefreshCw aria-hidden="true" className={cn(isFetching && 'animate-spin')} /> รีเฟรช</Button>}
    >
      {error && !data ? (
        <StateBlock tone="danger" title="โหลดบันทึกกิจกรรมไม่สำเร็จ" action={<Button variant="outline" onClick={() => refetch()}>ลองใหม่</Button>}>{error.message}</StateBlock>
      ) : isPending ? (
        <div aria-busy="true">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 border-b border-line" />)}</div>
      ) : entries.length ? (
        <>
          <ol className="max-h-[560px] overflow-y-auto">
            {entries.map(entry => {
              const meta = actions[entry.action] || { label: entry.action, icon: History, tone: 'neutral' };
              return (
                <li key={entry.activityId} className="grid grid-cols-[auto_1fr_auto] items-start gap-3 border-b border-line px-4 py-3.5 last:border-0 sm:px-5">
                  <span aria-hidden="true" className={cn('grid size-9 place-items-center rounded-full', toneClass[meta.tone])}><meta.icon className="size-4" /></span>
                  <div className="min-w-0">
                    <p className="text-[15px] text-ink"><b className="font-bold">{entry.actorName || 'ระบบ'}</b> {meta.label}{entry.targetName && <> · <b className="font-bold">{entry.targetName}</b></>}</p>
                    {entry.detail && <p className="text-sm break-words text-ink-3">{entry.detail}</p>}
                  </div>
                  <time className="num text-sm whitespace-nowrap text-ink-3" dateTime={entry.createdAt} title={dateTime(entry.createdAt)}>{timeAgo(entry.createdAt)}</time>
                </li>
              );
            })}
          </ol>
          <p className="border-t border-line px-4 py-3 text-sm text-ink-3 sm:px-5">แสดง <span className="num">{count.format(entries.length)}</span> จาก <span className="num">{count.format(total)}</span> รายการ</p>
        </>
      ) : (
        <StateBlock title="ยังไม่มีกิจกรรม">การสร้าง แก้ไข หรือปิดบัญชี และการสำรองข้อมูล จะถูกบันทึกไว้ที่นี่</StateBlock>
      )}
    </SettingsSection>
  );
}
