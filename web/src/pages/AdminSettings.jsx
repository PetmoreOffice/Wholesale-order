import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Mail, MoreHorizontal, Pencil, Power, RefreshCw, Search, ShieldCheck, Store, UserPlus, UsersRound, X } from 'lucide-react';
import { auth } from '../firebase.js';
import { apiFetch, apiUrl } from '../api/client.js';
import { useSession } from '../context/session.js';
import { count, dateTime, timeAgo } from '../lib/format.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { CountUp } from '../components/react-bits/CountUp.jsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sheet, SheetBody, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const POLL_MS = 30000;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const roleOptions = [
  { value: 'customer', label: 'ลูกค้า', description: 'สั่งซื้อและติดตามคำสั่งซื้อของตัวเอง', icon: Store },
  { value: 'admin', label: 'แอดมิน', description: 'จัดการคิวงาน คำสั่งซื้อ และผู้ใช้งาน', icon: ShieldCheck },
];
const roleText = Object.fromEntries(roleOptions.map(option => [option.value, option.label]));

const tabs = [
  { id: 'all', label: 'ทั้งหมด', match: () => true },
  { id: 'customer', label: 'ลูกค้า', match: user => user.role === 'customer' && !user.disabled },
  { id: 'admin', label: 'แอดมิน', match: user => user.role === 'admin' && !user.disabled },
  { id: 'disabled', label: 'ปิดใช้งาน', match: user => user.disabled },
];

async function send(path, method, body) {
  const response = await apiFetch(`${apiUrl}/admin/users${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'บันทึกไม่สำเร็จ');
  return data.data;
}

// Firebase sends its own email; the user picks a password and the admin never sees it.
function sendPasswordLink(email) {
  return sendPasswordResetEmail(auth, email);
}

const nameOf = user => user.displayName || user.email;

function lastActive(user) {
  if (user.disabled) return 'ปิดใช้งาน';
  if (user.online) return 'ออนไลน์';
  const latest = [user.lastSeenAt, user.lastActiveAt, user.lastSignInAt].filter(Boolean).sort().pop();
  return latest ? timeAgo(latest) : 'ยังไม่เคยเข้าใช้งาน';
}

export function AdminSettings() {
  const session = useSession();
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  async function load() {
    try {
      const response = await apiFetch(`${apiUrl}/admin/users`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setUsers(data.data);
      setError('');
    } catch (err) {
      setError(err.message || 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ');
    } finally { setLoaded(true); }
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  function replaceUser(updated) {
    setUsers(current => current.some(user => user.uid === updated.uid)
      ? current.map(user => user.uid === updated.uid ? updated : user)
      : [updated, ...current]);
  }

  async function setDisabled(user, disabled) {
    setError(''); setNotice('');
    try {
      replaceUser(await send(`/${user.uid}/status`, 'PATCH', { disabled }));
      setNotice(disabled ? `ปิดใช้งาน ${nameOf(user)} แล้ว ผู้ใช้ถูกออกจากระบบทันที` : `เปิดใช้งาน ${nameOf(user)} แล้ว`);
    } catch (err) { setError(err.message); }
  }

  async function resendLink(user) {
    setError(''); setNotice('');
    try {
      await sendPasswordLink(user.email);
      setNotice(`ส่งลิงก์ตั้งรหัสผ่านไปที่ ${user.email} แล้ว`);
    } catch { setError('ส่งลิงก์ตั้งรหัสผ่านไม่สำเร็จ กรุณาลองใหม่'); }
  }

  function toggle(user) {
    if (user.disabled) setDisabled(user, false);
    else setConfirming(user);
  }

  const counts = Object.fromEntries(tabs.map(tab => [tab.id, users.filter(tab.match).length]));
  const activeTab = tabs.find(tab => tab.id === searchParams.get('tab')) || tabs[0];
  const term = search.trim().toLowerCase();
  const visible = users.filter(activeTab.match).filter(user => !term
    || [user.displayName, user.email, user.profile.companyName, user.profile.phone].some(value => value?.toLowerCase().includes(term)));
  const onlineCount = users.filter(user => user.online && !user.disabled).length;
  const stats = [
    { label: 'ออนไลน์ตอนนี้', value: onlineCount, hint: 'ใช้งานภายใน 5 นาทีล่าสุด', live: true },
    { label: 'บัญชีที่เปิดใช้', value: users.length - counts.disabled, hint: `ลูกค้า ${count.format(counts.customer)} · แอดมิน ${count.format(counts.admin)}` },
    { label: 'ปิดใช้งาน', value: counts.disabled, hint: 'เข้าสู่ระบบไม่ได้จนกว่าจะเปิดอีกครั้ง' },
  ];

  return (
    // Plain wrapper, no entrance transform (see DESIGN.md): the sheet and menus are portalled overlays.
    <div className="page settings-page">
      <PageHeader
        title="ตั้งค่าผู้ใช้งาน"
        description="ดูว่าใครกำลังใช้งาน เพิ่มบัญชีให้ลูกค้าหรือแอดมิน และปิดบัญชีที่ไม่ใช้แล้ว"
        actions={<Button type="button" size="lg" onClick={() => setEditing({})}><UserPlus aria-hidden="true" /> เพิ่มผู้ใช้</Button>}
      />

      <dl className="settings-stats">
        {stats.map(stat => (
          <div className="panel" key={stat.label}>
            <dt>{stat.live && <span className="live-dot" aria-hidden="true" />}{stat.label}</dt>
            <dd className="num">{loaded ? <CountUp to={stat.value} /> : '–'}</dd>
            <dd className="stat-hint">{stat.hint}</dd>
          </div>
        ))}
      </dl>

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-notice" role="status">{notice}</p>}

      <section className="panel user-panel" aria-labelledby="users-title">
        <header className="user-panel-head">
          <div>
            <h2 id="users-title">บัญชีผู้ใช้</h2>
            <p>อัปเดตสถานะอัตโนมัติทุก 30 วินาที</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={load}><RefreshCw aria-hidden="true" /> รีเฟรช</Button>
        </header>

        <div className="user-toolbar">
          <div className="segmented" role="tablist" aria-label="กรองผู้ใช้">
            {tabs.map(tab => (
              <button key={tab.id} type="button" role="tab" aria-selected={tab.id === activeTab.id} onClick={() => setSearchParams({ tab: tab.id }, { replace: true })}>
                {tab.label}<span className="num">{count.format(counts[tab.id])}</span>
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="user-search">ค้นหาผู้ใช้</label>
          <InputGroup className="user-search h-9 bg-card md:w-80">
            <InputGroupInput id="user-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาชื่อ อีเมล ร้าน หรือเบอร์โทร" autoComplete="off" />
            <InputGroupAddon align="inline-start"><Search aria-hidden="true" /></InputGroupAddon>
          </InputGroup>
        </div>

        <div role="tabpanel" aria-label={activeTab.label} aria-busy={!loaded}>
          <div className="user-columns" aria-hidden="true"><span>ผู้ใช้</span><span>บทบาท</span><span>ใช้งานล่าสุด</span><span>เปิดใช้งาน</span></div>
          {!loaded ? (
            Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="user-row" aria-hidden="true">
                <div className="user-identity"><span className="skeleton avatar-skeleton" /><span className="skeleton" style={{ width: '12rem' }} /></div>
                <span className="skeleton" style={{ width: '3.5rem' }} /><span className="skeleton" style={{ width: '5rem' }} /><span className="skeleton" style={{ width: '4rem' }} />
              </div>
            ))
          ) : visible.length ? visible.map(user => {
            const self = user.uid === session.uid;
            const name = nameOf(user);
            const online = user.online && !user.disabled;
            return (
              <div className="user-row" key={user.uid} data-disabled={user.disabled || undefined}>
                <div className="user-identity">
                  <span className="user-avatar" data-online={online || undefined} aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <b>{name}{self && <span className="user-self">คุณ</span>}</b>
                    <small>{user.email}{user.profile.companyName && user.profile.companyName !== name ? ` · ${user.profile.companyName}` : ''}</small>
                  </div>
                </div>
                <span className="user-role">
                  {user.role
                    ? <span className="pill" data-tone={user.role === 'admin' ? 'info' : 'neutral'}>{user.role === 'admin' ? <ShieldCheck aria-hidden="true" /> : <Store aria-hidden="true" />}{roleText[user.role]}</span>
                    : <span className="pill" data-tone="attention">ไม่มีสิทธิ์</span>}
                </span>
                <span className="user-active" data-online={online || undefined} title={user.lastSignInAt ? `เข้าสู่ระบบล่าสุด ${dateTime(user.lastSignInAt)}` : undefined}>{lastActive(user)}</span>
                <span className="user-actions">
                  <Switch checked={!user.disabled} disabled={self} onCheckedChange={() => toggle(user)}
                    aria-label={`${user.disabled ? 'เปิด' : 'ปิด'}ใช้งานบัญชี ${name}`} title={self ? 'ปิดใช้งานบัญชีตัวเองไม่ได้' : undefined} />
                  <DropdownMenu>
                    <DropdownMenuTrigger className="icon-button" aria-label={`ตัวเลือกของ ${name}`}><MoreHorizontal aria-hidden="true" /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditing(user)}><Pencil aria-hidden="true" /> แก้ไขข้อมูล</DropdownMenuItem>
                      <DropdownMenuItem disabled={user.disabled} onSelect={() => resendLink(user)}><Mail aria-hidden="true" /> ส่งลิงก์ตั้งรหัสผ่าน</DropdownMenuItem>
                      {!self && <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant={user.disabled ? 'default' : 'destructive'} onSelect={() => toggle(user)}><Power aria-hidden="true" /> {user.disabled ? 'เปิดใช้งานบัญชี' : 'ปิดใช้งานบัญชี'}</DropdownMenuItem>
                      </>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </span>
              </div>
            );
          }) : (
            <div className="state">
              <UsersRound className="state-icon" aria-hidden="true" />
              <b>{term ? `ไม่พบผู้ใช้ที่ตรงกับ “${search.trim()}”` : `ไม่มีผู้ใช้ในกลุ่ม “${activeTab.label}”`}</b>
              <p>{term ? 'ลองค้นหาด้วยอีเมลหรือชื่อร้านที่สั้นลง' : 'เพิ่มบัญชีให้ลูกค้าหรือแอดมินได้เลย ระบบจะส่งอีเมลตั้งรหัสผ่านให้เอง'}</p>
              {term ? <Button type="button" variant="outline" onClick={() => setSearch('')}>ล้างการค้นหา</Button> : <Button type="button" variant="outline" onClick={() => setEditing({})}><UserPlus aria-hidden="true" /> เพิ่มผู้ใช้</Button>}
            </div>
          )}
        </div>
        {loaded && users.length > 0 && <footer className="user-panel-foot">แสดง <span className="num">{count.format(visible.length)}</span> จาก <span className="num">{count.format(users.length)}</span> บัญชี</footer>}
      </section>

      {editing && (
        <UserSheet
          user={editing.uid ? editing : null}
          self={editing.uid === session.uid}
          onClose={() => setEditing(null)}
          onSaved={(saved, message) => { replaceUser(saved); setEditing(null); setError(''); setNotice(message); }}
        />
      )}
      {confirming && (
        <Dialog className="review confirm-dialog" labelledBy="disable-title" onClose={() => setConfirming(null)}>
          <DialogTitle id="disable-title">ปิดใช้งานบัญชี {nameOf(confirming)}?</DialogTitle>
          <p className="dialog-intro">ผู้ใช้จะถูกออกจากระบบทันที และเข้าสู่ระบบไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง คำสั่งซื้อและประวัติเดิมยังอยู่ครบ</p>
          <div className="review-actions">
            <Button type="button" variant="outline" onClick={() => setConfirming(null)}>ยกเลิก</Button>
            <Button type="button" variant="destructive" onClick={() => { const user = confirming; setConfirming(null); setDisabled(user, true); }}>ปิดใช้งานบัญชี</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function UserSheet({ user, self, onClose, onSaved }) {
  const creating = !user;
  const [form, setForm] = useState({
    email: user?.email || '',
    displayName: user?.displayName || '',
    role: user?.role || 'customer',
    companyName: user?.profile.companyName || '',
    phone: user?.profile.phone || '',
    taxId: user?.profile.taxId || '',
    address: user?.profile.address || '',
    note: user?.profile.note || ''
  });
  const [invalid, setInvalid] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const customer = form.role === 'customer';

  function update(field, value) {
    setForm(current => ({ ...current, [field]: value }));
    setInvalid(current => ({ ...current, [field]: undefined }));
    setError('');
  }
  const bind = field => ({ value: form[field], onChange: event => update(field, event.target.value) });

  async function save(event) {
    event.preventDefault();
    const problems = {};
    if (creating && !emailPattern.test(form.email.trim())) problems.email = 'กรอกอีเมลให้ถูกต้อง';
    if (!form.displayName.trim()) problems.displayName = 'กรอกชื่อที่แสดง';
    setInvalid(problems);
    if (Object.keys(problems).length) return;

    setSaving(true); setError('');
    // Admin accounts carry no shop details; keep only the internal note for them.
    const profile = customer
      ? { companyName: form.companyName, phone: form.phone, taxId: form.taxId, address: form.address, note: form.note }
      : { note: form.note };
    try {
      if (creating) {
        const saved = await send('', 'POST', { email: form.email, displayName: form.displayName, role: form.role, profile });
        let message = `สร้างบัญชี ${saved.email} แล้ว และส่งลิงก์ตั้งรหัสผ่านไปที่อีเมลนี้แล้ว`;
        try { await sendPasswordLink(saved.email); } catch { message = `สร้างบัญชี ${saved.email} แล้ว แต่ส่งอีเมลตั้งรหัสผ่านไม่สำเร็จ เลือก “ส่งลิงก์ตั้งรหัสผ่าน” จากเมนูของบัญชีนี้อีกครั้ง`; }
        onSaved(saved, message);
      } else {
        const saved = await send(`/${user.uid}`, 'PATCH', { displayName: form.displayName, ...(self ? {} : { role: form.role }), profile });
        onSaved(saved, form.role !== user.role ? `บันทึกแล้ว ${nameOf(saved)} ต้องเข้าสู่ระบบใหม่เพื่อใช้สิทธิ์ใหม่` : `บันทึกข้อมูล ${nameOf(saved)} แล้ว`);
      }
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Sheet locked={saving} onClose={onClose}>
      <SheetContent>
        <form className="sheet-form" onSubmit={save} noValidate>
          <SheetHeader>
            <div>
              <SheetTitle>{creating ? 'เพิ่มผู้ใช้' : 'แก้ไขผู้ใช้'}</SheetTitle>
              <SheetDescription>{creating ? 'สร้างบัญชีเข้าสู่ระบบ แล้วระบบจะส่งอีเมลให้ผู้ใช้ตั้งรหัสผ่านเอง' : user.email}</SheetDescription>
            </div>
            <SheetClose className="icon-button" disabled={saving} aria-label="ปิด"><X aria-hidden="true" /></SheetClose>
          </SheetHeader>

          <SheetBody>
            <FieldGroup className="gap-8">
              <FieldSet disabled={saving} className="gap-4">
                <FieldLegend className="mb-3 text-[15px] font-bold text-[var(--ink)]">บัญชีเข้าสู่ระบบ</FieldLegend>
                <FieldGroup className="gap-5">
                  {creating && (
                    <Field data-invalid={Boolean(invalid.email)}>
                      <FieldLabel htmlFor="user-email">อีเมล</FieldLabel>
                      <Input id="user-email" type="email" {...bind('email')} maxLength={254} placeholder="name@company.com" autoComplete="off" autoFocus aria-invalid={Boolean(invalid.email)} />
                      <FieldDescription>{invalid.email || 'ใช้เข้าสู่ระบบ และรับลิงก์ตั้งรหัสผ่าน'}</FieldDescription>
                    </Field>
                  )}
                  <Field data-invalid={Boolean(invalid.displayName)}>
                    <FieldLabel htmlFor="user-name">ชื่อที่แสดง</FieldLabel>
                    <Input id="user-name" {...bind('displayName')} maxLength={120} placeholder="ชื่อผู้ติดต่อ หรือชื่อร้าน" aria-invalid={Boolean(invalid.displayName)} />
                    {invalid.displayName && <FieldDescription>{invalid.displayName}</FieldDescription>}
                  </Field>
                  <Field>
                    <FieldLabel id="user-role-label">บทบาท</FieldLabel>
                    <RadioGroup className="role-options" value={form.role} onValueChange={value => update('role', value)} disabled={self} aria-labelledby="user-role-label">
                      {roleOptions.map(option => (
                        <label key={option.value} className="role-option" data-checked={form.role === option.value || undefined}>
                          <option.icon className="role-icon" aria-hidden="true" />
                          <span className="role-text"><b>{option.label}</b><small>{option.description}</small></span>
                          <RadioGroupItem value={option.value} aria-label={option.label} />
                        </label>
                      ))}
                    </RadioGroup>
                    {self && <FieldDescription>เปลี่ยนบทบาทของบัญชีตัวเองไม่ได้</FieldDescription>}
                    {!creating && !self && form.role !== user.role && <FieldDescription className="text-[var(--tone-attention-fg)]">ผู้ใช้จะถูกออกจากระบบ และต้องเข้าสู่ระบบใหม่เพื่อใช้สิทธิ์ใหม่</FieldDescription>}
                  </Field>
                </FieldGroup>
              </FieldSet>

              {customer && <Separator />}
              {customer && (
                <FieldSet disabled={saving} className="gap-4">
                  <FieldLegend className="mb-3 text-[15px] font-bold text-[var(--ink)]">ข้อมูลร้านค้า</FieldLegend>
                  <FieldDescription>ชื่อร้านจะแสดงในคิวงานแทนอีเมล ส่วนที่อยู่จะกรอกให้อัตโนมัติตอนลูกค้าสั่งซื้อ</FieldDescription>
                  <FieldGroup className="gap-5">
                    <Field>
                      <FieldLabel htmlFor="user-company">ชื่อร้าน / บริษัท</FieldLabel>
                      <Input id="user-company" {...bind('companyName')} maxLength={200} placeholder="บริษัท ตัวอย่าง จำกัด" />
                    </Field>
                    <div className="field-pair">
                      <Field>
                        <FieldLabel htmlFor="user-phone">เบอร์โทร</FieldLabel>
                        <Input id="user-phone" type="tel" inputMode="tel" {...bind('phone')} maxLength={50} placeholder="081-234-5678" />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="user-tax">เลขผู้เสียภาษี</FieldLabel>
                        <Input id="user-tax" inputMode="numeric" className="num" {...bind('taxId')} maxLength={20} placeholder="13 หลัก" />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="user-address">ที่อยู่จัดส่ง</FieldLabel>
                      <Textarea id="user-address" {...bind('address')} maxLength={1000} rows="3" placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์" />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              )}

              <Separator />
              <FieldSet disabled={saving} className="gap-4">
                <FieldLegend className="mb-3 text-[15px] font-bold text-[var(--ink)]">หมายเหตุภายใน</FieldLegend>
                <Field>
                  <FieldLabel htmlFor="user-note" className="sr-only">หมายเหตุภายใน</FieldLabel>
                  <Textarea id="user-note" {...bind('note')} maxLength={2000} rows="3" placeholder="เช่น เงื่อนไขการชำระเงิน หรือผู้ติดต่อสำรอง" />
                  <FieldDescription>เห็นเฉพาะแอดมิน ผู้ใช้จะไม่เห็นข้อความนี้</FieldDescription>
                </Field>
              </FieldSet>
            </FieldGroup>
            {error && <p className="form-error" role="alert">{error}</p>}
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก…' : creating ? 'สร้างบัญชีและส่งอีเมล' : 'บันทึกการเปลี่ยนแปลง'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
