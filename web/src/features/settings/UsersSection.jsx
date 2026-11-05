import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, MoreHorizontal, Pencil, Power, RefreshCw, Search, ShieldCheck, Store, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { count, dateTime, timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { StateBlock } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/features/admin/Overlay.jsx';
import { usersQuery } from '@/features/admin/queue.js';
import { NumberStrip, Notice, SettingsSection } from './parts.jsx';
import { nameOf, roleOptions, sendPasswordLink, UserPanel } from './UserPanel.jsx';

const POLL_MS = 30_000;
const roleText = Object.fromEntries(roleOptions.map(option => [option.value, option.label]));

const filters = [
  { id: 'all', label: 'ทั้งหมด', match: () => true },
  { id: 'customer', label: 'ลูกค้า', match: user => user.role === 'customer' && !user.disabled },
  { id: 'admin', label: 'แอดมิน', match: user => user.role === 'admin' && !user.disabled },
  { id: 'disabled', label: 'ปิดใช้งาน', match: user => user.disabled }
];

function lastActive(user) {
  if (user.disabled) return 'ปิดใช้งาน';
  if (user.online) return 'ออนไลน์';
  const latest = [user.lastSeenAt, user.lastActiveAt, user.lastSignInAt].filter(Boolean).sort().pop();
  return latest ? timeAgo(latest) : 'ยังไม่เคยเข้าใช้งาน';
}

function RoleBadge({ role }) {
  if (!role) return <span className="inline-flex rounded-full bg-turn px-2.5 py-0.5 text-sm font-bold text-ink">ไม่มีสิทธิ์</span>;
  const Icon = role === 'admin' ? ShieldCheck : Store;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ring-inset', role === 'admin' ? 'bg-info-soft text-info ring-info/30' : 'bg-sunken text-ink-2 ring-line-strong')}>
      <Icon aria-hidden="true" className="size-3.5" />{roleText[role]}
    </span>
  );
}

function UserRow({ user, self, onEdit, onToggle, onResend }) {
  const name = nameOf(user);
  const online = user.online && !user.disabled;
  return (
    <li className={cn('grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 last:border-0 sm:px-5 md:grid-cols-[minmax(0,1fr)_110px_150px_88px]', user.disabled && 'bg-sunken')}>
      <div className="min-w-0">
        <p className={cn('truncate text-[15px] font-bold', user.disabled ? 'text-ink-2' : 'text-ink')}>
          {name}{self && <span className="ml-2 rounded-md bg-brand-tint px-1.5 py-0.5 text-xs font-bold text-brand-deep">คุณ</span>}
        </p>
        <p className="truncate text-sm text-ink-3">{user.email}{user.profile?.companyName && user.profile.companyName !== name ? ` · ${user.profile.companyName}` : ''}</p>
      </div>
      <div className="col-start-1 row-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 md:contents">
        <span className="md:col-start-2 md:row-start-1"><RoleBadge role={user.role} /></span>
        <span className={cn('inline-flex items-center gap-1.5 text-sm md:col-start-3 md:row-start-1', online ? 'font-bold text-brand' : 'text-ink-2')} title={user.lastSignInAt ? `เข้าสู่ระบบล่าสุด ${dateTime(user.lastSignInAt)}` : undefined}>
          {online && <span aria-hidden="true" className="size-2 rounded-full bg-brand" />}
          <span className="num">{lastActive(user)}</span>
        </span>
      </div>
      <div className="col-start-2 row-span-2 row-start-1 flex items-center gap-1 md:col-start-4 md:row-span-1">
        <Switch
          checked={!user.disabled} disabled={self} onCheckedChange={() => onToggle(user)}
          aria-label={`${user.disabled ? 'เปิด' : 'ปิด'}ใช้งานบัญชี ${name}`} title={self ? 'ปิดใช้งานบัญชีตัวเองไม่ได้' : undefined}
        />
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={`ตัวเลือกของ ${name}`} className="grid size-10 place-items-center rounded-md text-ink-2 hover:bg-brand-tint hover:text-brand-deep">
            <MoreHorizontal aria-hidden="true" className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="shadow-overlay">
            <DropdownMenuItem className="text-[15px]" onSelect={() => onEdit(user)}><Pencil aria-hidden="true" /> แก้ไขข้อมูล</DropdownMenuItem>
            <DropdownMenuItem className="text-[15px]" disabled={user.disabled} onSelect={() => onResend(user)}><Mail aria-hidden="true" /> ส่งลิงก์ตั้งรหัสผ่าน</DropdownMenuItem>
            {!self && <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[15px]" variant={user.disabled ? 'default' : 'destructive'} onSelect={() => onToggle(user)}><Power aria-hidden="true" /> {user.disabled ? 'เปิดใช้งานบัญชี' : 'ปิดใช้งานบัญชี'}</DropdownMenuItem>
            </>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

export function UsersSection() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: users = [], error: loadError, isPending, isFetching, refetch } = useQuery({ ...usersQuery, refetchInterval: POLL_MS });
  const [result, setResult] = useState({ error: '', notice: '' });
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);

  function replaceUser(updated) {
    queryClient.setQueryData(usersQuery.queryKey, (current = []) => current.some(user => user.uid === updated.uid)
      ? current.map(user => user.uid === updated.uid ? updated : user)
      : [updated, ...current]);
    queryClient.invalidateQueries({ queryKey: ['admin', 'activity'] });
  }

  const status = useMutation({
    mutationFn: ({ user, disabled }) => api(`/admin/users/${user.uid}/status`, { method: 'PATCH', body: { disabled } }).then(response => response.data),
    onMutate: () => setResult({ error: '', notice: '' }),
    onSuccess: (saved, { user, disabled }) => {
      replaceUser(saved);
      setResult({ error: '', notice: disabled ? `ปิดใช้งาน ${nameOf(user)} แล้ว ผู้ใช้ถูกออกจากระบบทันที` : `เปิดใช้งาน ${nameOf(user)} แล้ว` });
    },
    onError: (err) => setResult({ error: err.message, notice: '' })
  });

  async function resendLink(user) {
    setResult({ error: '', notice: '' });
    try {
      await sendPasswordLink(user.email);
      setResult({ error: '', notice: `ส่งลิงก์ตั้งรหัสผ่านไปที่ ${user.email} แล้ว` });
    } catch { setResult({ error: 'ส่งลิงก์ตั้งรหัสผ่านไม่สำเร็จ กรุณาลองใหม่', notice: '' }); }
  }

  function toggle(user) {
    if (user.disabled) status.mutate({ user, disabled: false });
    else setConfirming(user);
  }

  const counts = Object.fromEntries(filters.map(filter => [filter.id, users.filter(filter.match).length]));
  const active = filters.find(filter => filter.id === searchParams.get('users')) || filters[0];
  const term = search.trim().toLowerCase();
  const visible = users.filter(active.match).filter(user => !term
    || [user.displayName, user.email, user.profile?.companyName, user.profile?.phone].some(value => value?.toLowerCase().includes(term)));
  const online = users.filter(user => user.online && !user.disabled).length;

  function chooseFilter(id) {
    const next = new URLSearchParams(searchParams);
    next.set('users', id);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  }

  return (
    <SettingsSection
      id="users"
      title="ผู้ใช้งาน"
      description="ดูว่าใครกำลังใช้งาน เพิ่มบัญชีให้ลูกค้าหรือแอดมิน และปิดบัญชีที่ไม่ใช้แล้ว · อัปเดตอัตโนมัติทุก 30 วินาที"
      actions={<>
        <Button type="button" variant="outline" size="lg" disabled={isFetching} onClick={() => refetch()} aria-label="รีเฟรชรายชื่อ"><RefreshCw aria-hidden="true" className={cn(isFetching && 'animate-spin')} /></Button>
        <Button type="button" size="lg" onClick={() => setEditing({})}><UserPlus aria-hidden="true" /> เพิ่มผู้ใช้</Button>
      </>}
    >
      <NumberStrip loading={isPending} items={[
        { label: 'ออนไลน์ตอนนี้', value: count.format(online), hint: 'ใช้งานภายใน 5 นาทีล่าสุด' },
        { label: 'บัญชีที่เปิดใช้', value: count.format(users.length - counts.disabled), hint: `ลูกค้า ${count.format(counts.customer)} · แอดมิน ${count.format(counts.admin)}` },
        { label: 'ปิดใช้งาน', value: count.format(counts.disabled), hint: 'เข้าสู่ระบบไม่ได้จนกว่าจะเปิดอีกครั้ง' }
      ]} />
      <Notice {...result} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div role="tablist" aria-label="กรองผู้ใช้" className="flex gap-1 overflow-x-auto">
          {filters.map(filter => {
            const selected = filter.id === active.id;
            return (
              <button
                key={filter.id} type="button" role="tab" aria-selected={selected} aria-controls="users-list" onClick={() => chooseFilter(filter.id)}
                className={cn('flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[15px] whitespace-nowrap', selected ? 'bg-brand-tint font-bold text-brand-deep' : 'font-semibold text-ink-2 hover:bg-sunken')}
              >
                {filter.label}<span className="num text-sm">{count.format(counts[filter.id])}</span>
              </button>
            );
          })}
        </div>
        <label className="sr-only" htmlFor="user-search">ค้นหาผู้ใช้</label>
        <InputGroup className="h-10 bg-panel md:w-80">
          <InputGroupInput id="user-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาชื่อ อีเมล ร้าน หรือเบอร์โทร" autoComplete="off" className="text-[15px]" />
          <InputGroupAddon align="inline-start"><Search aria-hidden="true" /></InputGroupAddon>
        </InputGroup>
      </div>

      <div id="users-list" role="tabpanel" aria-label={active.label} aria-busy={isPending}>
        {loadError && !users.length ? (
          <StateBlock tone="danger" title="โหลดรายชื่อผู้ใช้ไม่สำเร็จ" action={<Button variant="outline" onClick={() => refetch()}>ลองใหม่</Button>}>{loadError.message}</StateBlock>
        ) : isPending ? (
          <div>{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[68px] border-b border-line" />)}</div>
        ) : visible.length ? (
          <>
            <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_110px_150px_88px] gap-x-4 border-b border-line bg-sunken px-5 py-2.5 text-sm font-semibold text-ink-2 md:grid">
              <span>ผู้ใช้</span><span>บทบาท</span><span>ใช้งานล่าสุด</span><span>เปิดใช้งาน</span>
            </div>
            <ul>
              {visible.map(user => (
                <UserRow key={user.uid} user={user} self={user.uid === session.uid} onEdit={setEditing} onToggle={toggle} onResend={resendLink} />
              ))}
            </ul>
            <p className="border-t border-line px-4 py-3 text-sm text-ink-3 sm:px-5">แสดง <span className="num">{count.format(visible.length)}</span> จาก <span className="num">{count.format(users.length)}</span> บัญชี</p>
          </>
        ) : (
          <StateBlock
            title={term ? `ไม่พบผู้ใช้ที่ตรงกับ “${search.trim()}”` : `ไม่มีผู้ใช้ในกลุ่ม “${active.label}”`}
            action={term
              ? <Button type="button" variant="outline" onClick={() => setSearch('')}>ล้างการค้นหา</Button>
              : <Button type="button" variant="outline" onClick={() => setEditing({})}><UserPlus aria-hidden="true" /> เพิ่มผู้ใช้</Button>}
          >
            {term ? 'ลองค้นหาด้วยอีเมลหรือชื่อร้านที่สั้นลง' : 'เพิ่มบัญชีให้ลูกค้าหรือแอดมินได้เลย ระบบจะส่งอีเมลตั้งรหัสผ่านให้เอง'}
          </StateBlock>
        )}
      </div>

      {editing && (
        <UserPanel
          user={editing.uid ? editing : null}
          self={editing.uid === session.uid}
          onClose={() => setEditing(null)}
          onSaved={(saved, message) => { replaceUser(saved); setEditing(null); setResult({ error: '', notice: message }); }}
        />
      )}
      {confirming && (
        <ConfirmDialog
          title={`ปิดใช้งานบัญชี ${nameOf(confirming)}?`}
          onClose={() => setConfirming(null)}
          confirm={<>
            <Button type="button" size="lg" variant="outline" onClick={() => setConfirming(null)}>ยกเลิก</Button>
            <Button type="button" size="lg" variant="destructive" onClick={() => { const user = confirming; setConfirming(null); status.mutate({ user, disabled: true }); }}>ปิดใช้งานบัญชี</Button>
          </>}
        >
          ผู้ใช้จะถูกออกจากระบบทันที และเข้าสู่ระบบไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง คำสั่งซื้อและประวัติเดิมยังอยู่ครบ
        </ConfirmDialog>
      )}
    </SettingsSection>
  );
}
