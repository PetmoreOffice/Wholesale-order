import React, { useState } from 'react';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ScanBarcode, ShieldCheck } from 'lucide-react';
import { auth } from '../firebase.js';
import { BrandMark } from '../components/layout/AppShell.jsx';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function login(event) {
    event.preventDefault();
    setSubmitting(true); setError(''); setNotice('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (authError) {
      setError(authError.code === 'auth/too-many-requests'
        ? 'มีการลองเข้าสู่ระบบหลายครั้ง กรุณารอสักครู่แล้วลองใหม่'
        : authError.code === 'auth/user-disabled'
          ? 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
          : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally { setSubmitting(false); }
  }

  async function resetPassword() {
    const normalizedEmail = email.trim();
    setError(''); setNotice('');
    if (!normalizedEmail) {
      setError('กรุณากรอกอีเมลก่อนขอลิงก์ตั้งรหัสผ่านใหม่');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setNotice('ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว กรุณาตรวจสอบอีเมล');
    } catch {
      setError('ส่งลิงก์ไม่สำเร็จ กรุณาตรวจสอบอีเมลหรือติดต่อผู้ดูแลระบบ');
    } finally { setSubmitting(false); }
  }

  return (
    <main className="login-page">
      <section className="login-layout" aria-labelledby="login-title">
        <aside className="login-brand-panel" aria-label="Wholesale Control Desk">
          <div className="brand"><BrandMark /><span>Wholesale<br />Control Desk</span></div>
          <div className="brand-copy">
            <h2>ทุกคำสั่งซื้อ<br />ชัดเจนในที่เดียว</h2>
            <p>ค้นหาสินค้า สร้างคำสั่งซื้อ และติดตามขั้นตอนการดำเนินงานอย่างเป็นระบบ</p>
          </div>
          <div className="brand-proof" aria-label="ความสามารถของระบบ">
            <span><ScanBarcode aria-hidden="true" /> ค้นหาด้วย SKU และบาร์โค้ด</span>
            <span><ShieldCheck aria-hidden="true" /> ติดตามคำสั่งซื้อตามสิทธิ์การใช้งาน</span>
          </div>
        </aside>

        <section className="login-panel">
          <div className="login-mobile-brand"><BrandMark /> Wholesale Control Desk</div>
          <div className="login-intro">
            <h1 id="login-title">เข้าสู่ระบบ</h1>
            <p>ใช้บัญชีที่บริษัทสร้างให้เพื่อสั่งซื้อ หรือตรวจสอบคิวงาน</p>
          </div>
          <form className="login-form" onSubmit={login} noValidate>
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="login-email">อีเมล</FieldLabel>
                <InputGroup className="h-12 bg-card">
                  <InputGroupInput id="login-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength="254" placeholder="name@company.com" required aria-invalid={Boolean(error)} />
                  <InputGroupAddon align="inline-start"><Mail aria-hidden="true" /></InputGroupAddon>
                </InputGroup>
              </Field>
              <Field data-invalid={Boolean(error)}>
                <div className="password-label-row"><FieldLabel htmlFor="login-password">รหัสผ่าน</FieldLabel><LockKeyhole aria-hidden="true" /></div>
                <InputGroup className="h-12 bg-card">
                  <InputGroupInput id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" placeholder="กรอกรหัสผ่าน" required aria-invalid={Boolean(error)} />
                  <InputGroupAddon align="inline-end"><InputGroupButton aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} onClick={() => setShowPassword(visible => !visible)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</InputGroupButton></InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>
            {error && <FieldError>{error}</FieldError>}
            {notice && <p className="form-notice" role="status">{notice}</p>}
            <Button size="lg" className="login-submit" disabled={submitting}>{submitting ? 'กำลังตรวจสอบ…' : <>เข้าสู่ระบบ <ArrowRight aria-hidden="true" /></>}</Button>
            <Button variant="link" className="forgot-password" type="button" onClick={resetPassword} disabled={submitting}>ลืมรหัสผ่าน</Button>
          </form>
          <p className="login-help">หากยังไม่มีบัญชี โปรดติดต่อผู้ดูแลระบบ</p>
        </section>
      </section>
    </main>
  );
}
