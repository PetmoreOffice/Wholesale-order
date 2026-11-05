import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseBackup, Download, RefreshCw } from 'lucide-react';
import { api, apiFetch } from '@/lib/api';
import { downloadFile } from '@/lib/csv';
import { count, dateTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StateBlock } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { fileSize, NumberStrip, Notice, SettingsSection } from './parts.jsx';

const dataQuery = { queryKey: ['admin', 'data'], queryFn: () => api('/admin/data').then(result => result.data) };

// Downloads need the sign-in token, so they go through fetch instead of a plain link.
async function download(path, name) {
  const response = await apiFetch(`/admin/data${path}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'ดาวน์โหลดไม่สำเร็จ');
  }
  downloadFile(name, await response.blob());
}

const subTitle = 'px-4 pt-5 pb-2 text-[17px] font-bold text-ink sm:px-5';

export function DataSection() {
  const queryClient = useQueryClient();
  const { data: status, error: loadError, isPending, isFetching, refetch } = useQuery(dataQuery);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState({ error: '', notice: '' });

  async function run(key, task, success) {
    setBusy(key); setResult({ error: '', notice: '' });
    try {
      await task();
      if (success) setResult({ error: '', notice: success });
    } catch (err) {
      setResult({ error: err.message, notice: '' });
    } finally {
      setBusy('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'activity'] });
    }
  }

  const backupNow = () => run('backup', async () => {
    const saved = await api('/admin/data/backups', { method: 'POST' });
    queryClient.setQueryData(dataQuery.queryKey, saved.data);
  }, 'สำรองข้อมูลแล้ว');

  const exportNow = () => run('export', () => download('/export', `orders-export-${new Date().toISOString().slice(0, 10)}.json`), 'ดาวน์โหลดข้อมูลปัจจุบันแล้ว เก็บไฟล์ไว้ในที่ปลอดภัย เพราะมีข้อมูลลูกค้า');

  return (
    <SettingsSection
      id="data"
      title="ข้อมูลและการสำรอง"
      description="ไฟล์ข้อมูล Order สำรองอัตโนมัติทุกชั่วโมงที่มีการเปลี่ยนแปลง เก็บย้อนหลัง 30 วัน ควรดาวน์โหลดเก็บไว้นอกเครื่อง server สม่ำเสมอ"
      actions={<>
        <Button type="button" variant="outline" size="lg" disabled={isFetching} onClick={() => refetch()} aria-label="รีเฟรชข้อมูล"><RefreshCw aria-hidden="true" className={cn(isFetching && 'animate-spin')} /></Button>
        <Button type="button" variant="outline" size="lg" disabled={Boolean(busy)} onClick={exportNow}><Download aria-hidden="true" /> {busy === 'export' ? 'กำลังดาวน์โหลด…' : 'ดาวน์โหลดข้อมูลปัจจุบัน'}</Button>
        <Button type="button" size="lg" disabled={Boolean(busy)} onClick={backupNow}><DatabaseBackup aria-hidden="true" /> {busy === 'backup' ? 'กำลังสำรอง…' : 'สำรองตอนนี้'}</Button>
      </>}
    >
      {loadError && !status ? (
        <StateBlock tone="danger" title="โหลดข้อมูลระบบไม่สำเร็จ" action={<Button variant="outline" onClick={() => refetch()}>ลองใหม่</Button>}>{loadError.message}</StateBlock>
      ) : (
        <>
          <NumberStrip loading={isPending} items={status ? [
            { label: 'คำสั่งซื้อในไฟล์หลัก', value: count.format(status.orders), hint: `เปิดอยู่ ${count.format(status.openOrders)} · ข้อมูลลูกค้า ${count.format(status.customers)} ราย` },
            { label: 'ขนาดไฟล์ข้อมูล', value: fileSize(status.size), hint: status.updatedAt ? `แก้ไขล่าสุด ${timeAgo(status.updatedAt)}` : 'ยังไม่มีไฟล์' },
            { label: 'สำรองล่าสุด', value: status.lastBackupAt ? timeAgo(status.lastBackupAt) : 'ยังไม่มี', hint: `ไฟล์สำรอง ${count.format(status.backups.length)} ไฟล์` }
          ] : [{ label: 'คำสั่งซื้อในไฟล์หลัก' }, { label: 'ขนาดไฟล์ข้อมูล' }, { label: 'สำรองล่าสุด' }]} />
          <Notice {...result} />

          <h3 className={subTitle}>ไฟล์สำรอง</h3>
          {isPending ? (
            <Skeleton className="mx-4 mb-4 h-24 rounded-lg sm:mx-5" aria-busy="true" />
          ) : status.backups.length ? (
            <ul className="border-b border-line">
              {status.backups.map(backup => (
                <li key={backup.name} className="flex items-center gap-3 border-t border-line px-4 py-3 sm:px-5">
                  <DatabaseBackup aria-hidden="true" className="size-5 shrink-0 text-ink-3" />
                  <div className="min-w-0 flex-1">
                    <p className="num text-[15px] font-bold text-ink">{dateTime(backup.createdAt)}</p>
                    <p className="text-sm text-ink-3"><span className="num">{fileSize(backup.size)}</span> · {backup.manual ? 'สำรองโดยแอดมิน' : 'สำรองอัตโนมัติ'}</p>
                  </div>
                  <Button
                    type="button" variant="ghost" disabled={Boolean(busy)} aria-label={`ดาวน์โหลดไฟล์สำรอง ${dateTime(backup.createdAt)}`}
                    onClick={() => run(backup.name, () => download(`/backups/${encodeURIComponent(backup.name)}`, backup.name))}
                  >
                    <Download aria-hidden="true" /> <span className="max-sm:sr-only">{busy === backup.name ? 'กำลังดาวน์โหลด…' : 'ดาวน์โหลด'}</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <StateBlock title="ยังไม่มีไฟล์สำรอง">ไฟล์แรกจะถูกสร้างเมื่อมีการเปลี่ยนแปลงข้อมูล หรือกด “สำรองตอนนี้”</StateBlock>
          )}
          <p className="px-4 py-3 text-sm text-ink-3 sm:px-5">
            กู้คืน: หยุด API แล้วคัดลอกไฟล์สำรองจาก <code className="sku text-[13px]">api/data/backups/</code> ทับ <code className="sku text-[13px]">api/data/orders.json</code>
          </p>

          <h3 className={cn(subTitle, 'border-t border-line')}>คำสั่งซื้อที่เก็บถาวร</h3>
          <p className="px-4 pb-3 text-[15px] text-ink-2 sm:px-5">คำสั่งซื้อที่ปิดแล้วเกิน 1 ปี ย้ายไปเก็บแยกตามปีโดยอัตโนมัติ ยังเปิดดูจากลิงก์คำสั่งซื้อได้ตามปกติ</p>
          {status?.archives.length ? (
            <ul>
              {status.archives.map(archive => (
                <li key={archive.name} className="flex items-baseline justify-between gap-3 border-t border-line px-4 py-3 text-[15px] sm:px-5">
                  <b className="font-semibold text-ink">{archive.name}</b>
                  <span className="text-ink-2"><span className="num">{count.format(archive.orders)}</span> คำสั่งซื้อ</span>
                </li>
              ))}
            </ul>
          ) : status && <p className="px-4 pb-5 text-[15px] text-ink-3 sm:px-5">ยังไม่มีคำสั่งซื้อที่เก็บถาวร</p>}
        </>
      )}
    </SettingsSection>
  );
}
