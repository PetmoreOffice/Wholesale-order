import React, { Suspense, lazy, useState } from 'react';
import BlurText from '@/components/react-bits/BlurText';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { ArrowRight, Eye, EyeOff, Mail } from 'lucide-react';
import { auth } from '@/firebase';
import { BrandMark } from '@/app/AppShell';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';

// The kibble pit is a WebGL scene: load it only with the sign-in screen.
const Ballpit = lazy(() => import('@/components/react-bits/Ballpit'));

/** Full-screen frame for sign-in and the account states before the app (no Firebase, no role). */
const headline = 'สั่งอาหารสัตว์ทั้งร้าน ในไม่กี่คลิก';

export function GateFrame({ children }) {
  // BlurText does not honour reduced motion on its own and would stay blurred.
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="flex flex-col gap-8 overflow-hidden bg-brand px-6 py-8 text-white sm:px-10 lg:px-14 lg:py-12">
        <p className="flex items-center gap-3 font-display text-xl font-medium"><BrandMark />Wholesale Order</p>
        <div className="max-lg:hidden lg:mt-6">
          {reducedMotion
            ? <p className="max-w-md font-display text-[40px] leading-[1.15] font-medium">{headline}</p>
            : <BlurText text={headline} animateBy="words" delay={120} className="max-w-md font-display text-[40px] leading-[1.15] font-medium" />}
          <p className="mt-5 max-w-md text-[17px] text-brand-soft">ค้นหาด้วยชื่อ SKU หรือสแกนบาร์โค้ด ส่งคำสั่งซื้อ แล้วดูป้ายแขวนบอกเสมอว่าถึงขั้นไหนและถึงตาใคร</p>
        </div>
        {/* A bag's worth of kibble tumbles into its own box below the copy and follows the
            pointer there; it cannot reach the text. Without motion it would freeze mid-fall,
            so it is left out and the box stays empty. */}
        <div aria-hidden="true" className="relative -mx-6 min-h-0 flex-1 overflow-hidden max-lg:hidden sm:-mx-10 lg:-mx-14">
          {!reducedMotion && (
            <Suspense fallback={null}>
              <Ballpit count={55} colors={['#F07A3A', '#C9824A', '#8A5A33', '#F4B183']} material="satin" gravity={1.2} minSize={0.45} maxSize={0.85} followCursor clickEffect="burst" lightIntensity={1.1} />
            </Suspense>
          )}
        </div>
        <p className="text-sm text-brand-soft max-lg:hidden">หากยังไม่มีบัญชี โปรดติดต่อผู้ดูแลระบบของบริษัท</p>
      </aside>
      <section className="flex items-start justify-center bg-ground px-5 py-10 sm:items-center sm:px-10">{children}</section>
    </main>
  );
}

export function LoginPage() {
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
      setError('กรอกอีเมลก่อน แล้วกด "ลืมรหัสผ่าน" อีกครั้ง');
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
    <GateFrame>
      <div className="w-full max-w-[400px]">
        <h1 className="text-[30px] font-bold">เข้าสู่ระบบ</h1>
        <p className="mt-1 mb-7 text-[15px] text-ink-2">ใช้บัญชีที่บริษัทสร้างให้ เพื่อสั่งซื้อหรือดูแลคิวงาน</p>
        <form onSubmit={login} noValidate className="grid gap-5">
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="login-email">อีเมล</FieldLabel>
              <InputGroup className="h-12 bg-panel">
                <InputGroupInput id="login-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength="254" placeholder="name@company.com" required aria-invalid={Boolean(error)} />
                <InputGroupAddon align="inline-start"><Mail aria-hidden="true" /></InputGroupAddon>
              </InputGroup>
            </Field>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="login-password">รหัสผ่าน</FieldLabel>
              <InputGroup className="h-12 bg-panel">
                <InputGroupInput id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required aria-invalid={Boolean(error)} />
                <InputGroupAddon align="inline-end"><InputGroupButton aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} onClick={() => setShowPassword(visible => !visible)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</InputGroupButton></InputGroupAddon>
              </InputGroup>
            </Field>
          </FieldGroup>
          {error && <FieldError>{error}</FieldError>}
          {notice && <p role="status" className="rounded-md bg-brand-tint px-3 py-2 text-[15px] text-brand-deep">{notice}</p>}
          <Button size="lg" className="h-12 text-[17px]" disabled={submitting}>{submitting ? 'กำลังตรวจสอบ…' : <>เข้าสู่ระบบ <ArrowRight aria-hidden="true" /></>}</Button>
          <Button variant="link" type="button" className="justify-self-start px-0" onClick={resetPassword} disabled={submitting}>ลืมรหัสผ่าน</Button>
        </form>
        <p className="mt-8 text-sm text-ink-3 lg:hidden">หากยังไม่มีบัญชี โปรดติดต่อผู้ดูแลระบบของบริษัท</p>
      </div>
    </GateFrame>
  );
}
