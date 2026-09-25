import React, { useEffect, useState } from 'react';
import { Archive, DatabaseBackup, Download, RefreshCw } from 'lucide-react';
import { apiFetch, apiUrl } from '../../api/client.js';
import { downloadFile } from '../../lib/csv.js';
import { count, dateTime, timeAgo } from '../../lib/format.js';
import { Button } from '@/components/ui/button';

function fileSize(bytes) {
  if (bytes < 1024) return `${count.format(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Downloads need the sign-in token, so they go through fetch instead of a plain link.
async function download(path, name) {
  const response = await apiFetch(`${apiUrl}/admin/data${path}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'ดาวน์โหลดไม่สำเร็จ');
  }
  downloadFile(name, await response.blob());
}

export function DataSection() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    try {
      const response = await apiFetch(`${apiUrl}/admin/data`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setStatus(data.data);
      setError('');
    } catch (err) { setError(err.message || 'โหลดข้อมูลระบบไม่สำเร็จ'); }
  }

  useEffect(() => { load(); }, []);

  async function run(key, task, success) {
    setBusy(key); setError(''); setNotice('');
    try {
      await task();
      if (success) setNotice(success);
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  }

  const backupNow = () => run('backup', async () => {
    const response = await apiFetch(`${apiUrl}/admin/data/backups`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'สำรองข้อมูลไม่สำเร็จ');
    setStatus(data.data);
  }, 'สำรองข้อมูลแล้ว');

  const exportNow = () => run('export', () => download('/export', `orders-export-${new Date().toISOString().slice(0, 10)}.json`), 'ดาวน์โหลดข้อมูลปัจจุบันแล้ว เก็บไฟล์ไว้ในที่ปลอดภัย เพราะมีข้อมูลลูกค้า');

  const stats = status ? [
    { label: 'คำสั่งซื้อในไฟล์หลัก', value: count.format(status.orders), hint: `เปิดอยู่ ${count.format(status.openOrders)} · ข้อมูลลูกค้า ${count.format(status.customers)} ราย` },
    { label: 'ขนาดไฟล์ข้อมูล', value: fileSize(status.size), hint: status.updatedAt ? `แก้ไขล่าสุด ${timeAgo(status.updatedAt)}` : 'ยังไม่มีไฟล์' },
    { label: 'สำรองล่าสุด', value: status.lastBackupAt ? timeAgo(status.lastBackupAt) : 'ยังไม่มี', hint: `ไฟล์สำรอง ${count.format(status.backups.length)} ไฟล์` },
  ] : [];

  return (
    <>
      <dl className="settings-stats">
        {status ? stats.map(stat => (
          <div className="panel" key={stat.label}>
            <dt>{stat.label}</dt>
            <dd className="num">{stat.value}</dd>
            <dd className="stat-hint">{stat.hint}</dd>
          </div>
        )) : Array.from({ length: 3 }, (_, index) => <div className="panel" key={index} aria-hidden="true"><span className="skeleton" style={{ width: '50%' }} /><span className="skeleton" style={{ width: '30%', height: '1.6rem', marginTop: 6 }} /></div>)}
      </dl>

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-notice" role="status">{notice}</p>}

      <section className="panel user-panel" aria-labelledby="backup-title">
        <header className="user-panel-head">
          <div>
            <h2 id="backup-title">ไฟล์สำรอง</h2>
            <p>ระบบสำรองอัตโนมัติทุกชั่วโมงที่มีการเปลี่ยนแปลง เก็บย้อนหลัง 30 วัน · ควรดาวน์โหลดเก็บไว้นอกเครื่อง server สม่ำเสมอ</p>
          </div>
          <div className="panel-head-actions">
            <Button type="button" variant="outline" size="sm" onClick={load} aria-label="รีเฟรชข้อมูล"><RefreshCw aria-hidden="true" /></Button>
            <Button type="button" variant="outline" size="sm" disabled={Boolean(busy)} onClick={exportNow}><Download aria-hidden="true" /> {busy === 'export' ? 'กำลังดาวน์โหลด…' : 'ดาวน์โหลดข้อมูลปัจจุบัน'}</Button>
            <Button type="button" size="sm" disabled={Boolean(busy)} onClick={backupNow}><DatabaseBackup aria-hidden="true" /> {busy === 'backup' ? 'กำลังสำรอง…' : 'สำรองตอนนี้'}</Button>
          </div>
        </header>
        {status?.backups.length ? (
          <ul className="file-list">
            {status.backups.map(backup => (
              <li key={backup.name}>
                <DatabaseBackup className="file-icon" aria-hidden="true" />
                <div className="file-text">
                  <b className="num">{dateTime(backup.createdAt)}</b>
                  <small><span className="num">{fileSize(backup.size)}</span> · {backup.manual ? 'สำรองโดยแอดมิน' : 'สำรองอัตโนมัติ'}</small>
                </div>
                <Button type="button" variant="ghost" size="sm" disabled={Boolean(busy)} aria-label={`ดาวน์โหลดไฟล์สำรอง ${dateTime(backup.createdAt)}`}
                  onClick={() => run(backup.name, () => download(`/backups/${encodeURIComponent(backup.name)}`, backup.name))}>
                  <Download aria-hidden="true" /> ดาวน์โหลด
                </Button>
              </li>
            ))}
          </ul>
        ) : status && (
          <div className="state">
            <DatabaseBackup className="state-icon" aria-hidden="true" />
            <b>ยังไม่มีไฟล์สำรอง</b>
            <p>ไฟล์แรกจะถูกสร้างเมื่อมีการเปลี่ยนแปลงข้อมูล หรือกด “สำรองตอนนี้”</p>
          </div>
        )}
        <footer className="user-panel-foot">กู้คืน: หยุด API แล้วคัดลอกไฟล์สำรองจาก <code>api/data/backups/</code> ทับ <code>api/data/orders.json</code></footer>
      </section>

      <section className="panel user-panel settings-section-gap" aria-labelledby="archive-title">
        <header className="user-panel-head">
          <div>
            <h2 id="archive-title">คำสั่งซื้อที่เก็บถาวร</h2>
            <p>คำสั่งซื้อที่ปิดแล้วเกิน 1 ปี ย้ายไปเก็บแยกตามปีโดยอัตโนมัติ ยังเปิดดูจากลิงก์คำสั่งซื้อได้ตามปกติ</p>
          </div>
        </header>
        {status?.archives.length ? (
          <ul className="file-list">
            {status.archives.map(archive => (
              <li key={archive.name}>
                <Archive className="file-icon" aria-hidden="true" />
                <div className="file-text"><b>{archive.name}</b><small><span className="num">{count.format(archive.orders)}</span> คำสั่งซื้อ</small></div>
              </li>
            ))}
          </ul>
        ) : status && <p className="settings-empty-line">ยังไม่มีคำสั่งซื้อที่เก็บถาวร</p>}
      </section>
    </>
  );
}
