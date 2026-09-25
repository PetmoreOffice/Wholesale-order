import React, { useEffect, useState } from 'react';
import { Archive, DatabaseBackup, Download, History, Pencil, Power, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';
import { apiFetch, apiUrl } from '../../api/client.js';
import { count, dateTime, timeAgo } from '../../lib/format.js';
import { Button } from '@/components/ui/button';

const actions = {
  'user.created': { label: 'สร้างบัญชี', icon: UserPlus, tone: 'progress' },
  'user.updated': { label: 'แก้ไขบัญชี', icon: Pencil, tone: 'neutral' },
  'user.role_changed': { label: 'เปลี่ยนบทบาท', icon: ShieldCheck, tone: 'attention' },
  'user.disabled': { label: 'ปิดใช้งาน', icon: Power, tone: 'danger' },
  'user.enabled': { label: 'เปิดใช้งาน', icon: Power, tone: 'progress' },
  'backup.created': { label: 'สำรองข้อมูล', icon: DatabaseBackup, tone: 'info' },
  'data.downloaded': { label: 'ดาวน์โหลดข้อมูล', icon: Download, tone: 'info' },
  'orders.archived': { label: 'เก็บถาวร', icon: Archive, tone: 'neutral' },
};

export function ActivitySection() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const response = await apiFetch(`${apiUrl}/admin/data/activity?limit=200`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setEntries(data.data);
      setTotal(data.total);
      setError('');
    } catch (err) {
      setError(err.message || 'โหลดบันทึกกิจกรรมไม่สำเร็จ');
    } finally { setLoaded(true); }
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="panel user-panel" aria-labelledby="activity-title" aria-busy={!loaded}>
      <header className="user-panel-head">
        <div>
          <h2 id="activity-title">บันทึกกิจกรรม</h2>
          <p>เก็บล่าสุด 500 รายการ · การเปลี่ยนสถานะคำสั่งซื้อดูได้ในประวัติของแต่ละคำสั่งซื้อ</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={load} aria-label="รีเฟรชบันทึกกิจกรรม"><RefreshCw aria-hidden="true" /></Button>
      </header>
      {error && <p className="form-error settings-inline-error" role="alert">{error}</p>}
      {!loaded ? (
        <ol className="activity-list" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => <li key={index}><span className="skeleton avatar-skeleton" /><span className="skeleton" style={{ width: '60%' }} /></li>)}
        </ol>
      ) : entries.length ? (
        <ol className="activity-list">
          {entries.map(entry => {
            const meta = actions[entry.action] || { label: entry.action, icon: History, tone: 'neutral' };
            return (
              <li key={entry.activityId}>
                <span className="activity-icon" data-tone={meta.tone} aria-hidden="true"><meta.icon /></span>
                <div className="activity-text">
                  <p><b>{entry.actorName || 'ระบบ'}</b> {meta.label}{entry.targetName && <> · <b>{entry.targetName}</b></>}</p>
                  {entry.detail && <small>{entry.detail}</small>}
                </div>
                <time className="activity-time" dateTime={entry.createdAt} title={dateTime(entry.createdAt)}>{timeAgo(entry.createdAt)}</time>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="state">
          <History className="state-icon" aria-hidden="true" />
          <b>ยังไม่มีกิจกรรม</b>
          <p>การสร้าง แก้ไข หรือปิดบัญชี และการสำรองข้อมูล จะถูกบันทึกไว้ที่นี่</p>
        </div>
      )}
      {loaded && total > 0 && <footer className="user-panel-foot">แสดง <span className="num">{count.format(entries.length)}</span> จาก <span className="num">{count.format(total)}</span> รายการ</footer>}
    </section>
  );
}
