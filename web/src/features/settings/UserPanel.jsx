import React, { useState } from 'react';
import { ShieldCheck, Store } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { SidePanel } from '@/features/admin/Overlay.jsx';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const roleOptions = [
  { value: 'customer', label: 'ลูกค้า', description: 'สั่งซื้อและติดตามคำสั่งซื้อของตัวเอง', icon: Store },
  { value: 'admin', label: 'แอดมิน', description: 'จัดการคิวงาน คำสั่งซื้อ และผู้ใช้งาน', icon: ShieldCheck }
];

export const nameOf = user => user.displayName || user.email;

// Firebase sends its own email; the user picks a password and the admin never sees it.
export function sendPasswordLink(email) {
  if (!auth) return Promise.reject(new Error('Firebase is not configured'));
  return sendPasswordResetEmail(auth, email);
}

const legend = 'mb-1 text-[17px] font-bold text-ink';

/** Create a user (then send the password email) or edit name, role and customer profile. */
export function UserPanel({ user, self, onClose, onSaved }) {
  const creating = !user;
  const [form, setForm] = useState({
    email: user?.email || '',
    displayName: user?.displayName || '',
    role: user?.role || 'customer',
    companyName: user?.profile?.companyName || '',
    phone: user?.profile?.phone || '',
    taxId: user?.profile?.taxId || '',
    address: user?.profile?.address || '',
    note: user?.profile?.note || ''
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
    if (Object.keys(problems).length) {
      document.getElementById(problems.email ? 'user-email' : 'user-name')?.focus();
      return;
    }

    setSaving(true); setError('');
    // Admin accounts carry no shop details; keep only the internal note for them.
    const profile = customer
      ? { companyName: form.companyName, phone: form.phone, taxId: form.taxId, address: form.address, note: form.note }
      : { note: form.note };
    try {
      if (creating) {
        const saved = (await api('/admin/users', { body: { email: form.email, displayName: form.displayName, role: form.role, profile } })).data;
        let message = `สร้างบัญชี ${saved.email} แล้ว และส่งลิงก์ตั้งรหัสผ่านไปที่อีเมลนี้แล้ว`;
        try { await sendPasswordLink(saved.email); } catch { message = `สร้างบัญชี ${saved.email} แล้ว แต่ส่งอีเมลตั้งรหัสผ่านไม่สำเร็จ เลือก “ส่งลิงก์ตั้งรหัสผ่าน” จากเมนูของบัญชีนี้อีกครั้ง`; }
        onSaved(saved, message);
      } else {
        const saved = (await api(`/admin/users/${user.uid}`, { method: 'PATCH', body: { displayName: form.displayName, ...(self ? {} : { role: form.role }), profile } })).data;
        onSaved(saved, form.role !== user.role ? `บันทึกแล้ว ${nameOf(saved)} ต้องเข้าสู่ระบบใหม่เพื่อใช้สิทธิ์ใหม่` : `บันทึกข้อมูล ${nameOf(saved)} แล้ว`);
      }
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <SidePanel
      title={creating ? 'เพิ่มผู้ใช้' : 'แก้ไขผู้ใช้'}
      description={creating ? 'สร้างบัญชีเข้าสู่ระบบ แล้วระบบจะส่งอีเมลให้ผู้ใช้ตั้งรหัสผ่านเอง' : user.email}
      onClose={onClose}
      locked={saving}
      footer={<>
        <Button type="button" size="lg" variant="outline" disabled={saving} onClick={onClose}>ยกเลิก</Button>
        <Button type="submit" size="lg" form="user-form" disabled={saving}>{saving ? 'กำลังบันทึก…' : creating ? 'สร้างบัญชีและส่งอีเมล' : 'บันทึกการเปลี่ยนแปลง'}</Button>
      </>}
    >
      <form id="user-form" onSubmit={save} noValidate className="grid gap-8 bg-panel px-4 py-5 sm:px-5">
        <FieldSet disabled={saving} className="gap-4">
          <FieldLegend className={legend}>บัญชีเข้าสู่ระบบ</FieldLegend>
          <FieldGroup className="gap-5">
            {creating && (
              <Field data-invalid={Boolean(invalid.email)}>
                <FieldLabel htmlFor="user-email">อีเมล</FieldLabel>
                <Input id="user-email" type="email" {...bind('email')} maxLength={254} placeholder="name@company.com" autoComplete="off" autoFocus aria-invalid={Boolean(invalid.email)} />
                <FieldDescription className={cn(invalid.email && 'font-semibold text-danger')}>{invalid.email || 'ใช้เข้าสู่ระบบ และรับลิงก์ตั้งรหัสผ่าน'}</FieldDescription>
              </Field>
            )}
            <Field data-invalid={Boolean(invalid.displayName)}>
              <FieldLabel htmlFor="user-name">ชื่อที่แสดง</FieldLabel>
              <Input id="user-name" {...bind('displayName')} maxLength={120} placeholder="ชื่อผู้ติดต่อ หรือชื่อร้าน" aria-invalid={Boolean(invalid.displayName)} />
              {invalid.displayName && <FieldDescription className="font-semibold text-danger">{invalid.displayName}</FieldDescription>}
            </Field>
            <Field>
              <FieldLabel id="user-role-label">บทบาท</FieldLabel>
              <RadioGroup value={form.role} onValueChange={value => update('role', value)} disabled={self} aria-labelledby="user-role-label" className="gap-2">
                {roleOptions.map(option => {
                  const checked = form.role === option.value;
                  return (
                    <label key={option.value} className={cn('flex items-center gap-3 rounded-lg border px-4 py-3', checked ? 'border-brand bg-brand-tint' : 'border-line-strong', self ? 'opacity-60' : 'cursor-pointer hover:bg-sunken')}>
                      <option.icon aria-hidden="true" className={cn('size-5 shrink-0', checked ? 'text-brand' : 'text-ink-3')} />
                      <span className="min-w-0 flex-1"><b className="block text-[15px] font-bold text-ink">{option.label}</b><span className="block text-sm text-ink-2">{option.description}</span></span>
                      <RadioGroupItem value={option.value} aria-label={option.label} />
                    </label>
                  );
                })}
              </RadioGroup>
              {self && <FieldDescription>เปลี่ยนบทบาทของบัญชีตัวเองไม่ได้</FieldDescription>}
              {!creating && !self && form.role !== user.role && <p className="rounded-md bg-turn px-3 py-2 text-sm font-semibold text-ink">ผู้ใช้จะถูกออกจากระบบ และต้องเข้าสู่ระบบใหม่เพื่อใช้สิทธิ์ใหม่</p>}
            </Field>
          </FieldGroup>
        </FieldSet>

        {customer && (
          <FieldSet disabled={saving} className="gap-4 border-t border-line pt-6">
            <FieldLegend className={legend}>ข้อมูลร้านค้า</FieldLegend>
            <FieldDescription>ชื่อร้านจะแสดงในคิวงานแทนอีเมล ส่วนที่อยู่จะกรอกให้อัตโนมัติตอนลูกค้าสั่งซื้อ</FieldDescription>
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="user-company">ชื่อร้าน / บริษัท</FieldLabel>
                <Input id="user-company" {...bind('companyName')} maxLength={200} placeholder="บริษัท ตัวอย่าง จำกัด" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="user-phone">เบอร์โทร</FieldLabel>
                  <Input id="user-phone" type="tel" inputMode="tel" className="num" {...bind('phone')} maxLength={50} placeholder="081-234-5678" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="user-tax">เลขผู้เสียภาษี</FieldLabel>
                  <Input id="user-tax" inputMode="numeric" className="num" {...bind('taxId')} maxLength={20} placeholder="13 หลัก" />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="user-address">ที่อยู่จัดส่ง</FieldLabel>
                <Textarea id="user-address" {...bind('address')} maxLength={1000} rows={3} placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์" />
              </Field>
            </FieldGroup>
          </FieldSet>
        )}

        <FieldSet disabled={saving} className="gap-4 border-t border-line pt-6">
          <FieldLegend className={legend}>หมายเหตุภายใน</FieldLegend>
          <Field>
            <FieldLabel htmlFor="user-note" className="sr-only">หมายเหตุภายใน</FieldLabel>
            <Textarea id="user-note" {...bind('note')} maxLength={2000} rows={3} placeholder="เช่น เงื่อนไขการชำระเงิน หรือผู้ติดต่อสำรอง" />
            <FieldDescription>เห็นเฉพาะแอดมิน ผู้ใช้จะไม่เห็นข้อความนี้</FieldDescription>
          </Field>
        </FieldSet>
        {error && <p role="alert" className="text-[15px] font-semibold text-danger">{error}</p>}
      </form>
    </SidePanel>
  );
}
