import React, { Suspense, lazy, useState } from 'react';
import { MeadowScene } from './MeadowScene.jsx';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { ArrowRight, Eye, EyeOff, Mail } from 'lucide-react';
import { auth } from '@/firebase';
import { BrandMark } from '@/app/AppShell';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';

const headline = 'สั่งอาหารสัตว์ทั้งร้าน ในไม่กี่คลิก';
const headlineClass = 'max-w-lg font-display text-[52px] leading-[1.1] font-medium text-brand-deep';
// BlurText brings the motion library (~100 KB gzipped): load it with the sign-in page only,
// not in the bundle every signed-in visit downloads first.
const BlurText = lazy(() => import('@/components/react-bits/BlurText'));

/**
 * Full-screen frame for sign-in and the account states before the app (no Firebase, no role):
 * a morning meadow fills the screen, the promise sits in the sky, the form on a white card.
 */
export function GateFrame({ children, animateHeadline = false }) {
  // BlurText does not honour reduced motion on its own and would stay blurred. Only the sign-in
  // page animates the headline: the loading and account screens show it still, so BlurText is
  // not downloaded on every visit.
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-[#CBE9EC]">
      <MeadowScene className="-z-10" />
      <div className="mx-auto flex min-h-dvh w-full max-w-[1280px] flex-col gap-8 px-5 py-6 sm:px-10 lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-16 lg:py-12">
        <header className="lg:pt-6">
          <p className="flex items-center gap-3 font-display text-xl font-medium text-brand-deep"><BrandMark />Wholesale Order</p>
          <div className="mt-8 max-lg:hidden lg:mt-16">
            {reducedMotion || !animateHeadline
              ? <p className={headlineClass}>{headline}</p>
              : (
                // The invisible copy holds the space until the words blur in, so nothing jumps.
                <Suspense fallback={<p className={`${headlineClass} invisible`}>{headline}</p>}>
                  <BlurText text={headline} animateBy="words" delay={120} className={headlineClass} />
                </Suspense>
              )}
            <p className="mt-5 max-w-md text-[18px] text-brand-deep/85">อาหารและของใช้สัตว์เลี้ยงจากคลังจริง ค้นด้วยชื่อ SKU หรือสแกนบาร์โค้ด แล้วติดตามได้ทุกขั้นจนส่งถึงร้าน</p>
          </div>
        </header>
        <section className="w-full max-w-[440px] self-center rounded-[24px] bg-panel/95 p-6 shadow-overlay ring-1 ring-white/60 sm:p-8 lg:mt-10 lg:self-start">
          {children}
        </section>
        <p className="mt-auto text-sm font-medium text-white lg:col-span-2">หากยังไม่มีบัญชี โปรดติดต่อผู้ดูแลระบบของบริษัท</p>
      </div>
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
    <GateFrame animateHeadline>
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
      </div>
    </GateFrame>
  );
}
