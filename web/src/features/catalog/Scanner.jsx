import React, { useEffect, useRef, useState } from 'react';
import { createBarcodeDetector } from '@/lib/barcodeDetector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Overlay } from './Overlay.jsx';

// The WebAssembly fallback is heavier than the native detector; ~7 frames a second is plenty for a barcode.
const SCAN_INTERVAL_MS = 150;

/** Camera barcode reader with a typed fallback. Browsers only open the camera on HTTPS (or localhost). */
export function Scanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const [manual, setManual] = useState('');
  const [state, setState] = useState('กำลังเปิดกล้อง…');
  const [live, setLive] = useState(false);
  // The parent passes a new callback on every render; keep the camera running across those renders.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    let stream;
    let stopped = false;
    async function start() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setState('กล้องใช้ได้เมื่อเปิดเว็บผ่าน HTTPS เท่านั้น กรุณากรอกรหัสด้านล่าง');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
        if (stopped) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setLive(true);
        }
      } catch {
        if (!stopped) setState('ไม่สามารถใช้กล้องได้ กรุณาอนุญาตกล้องหรือกรอกรหัสด้านล่าง');
        return;
      }
      let detector;
      try {
        setState('กำลังเตรียมตัวอ่านบาร์โค้ด…');
        detector = await createBarcodeDetector();
      } catch {
        if (!stopped) setState('อ่านบาร์โค้ดอัตโนมัติไม่ได้บนอุปกรณ์นี้ กรุณากรอกรหัสด้านล่าง');
        return;
      }
      if (stopped) return;
      setState('วางบาร์โค้ดให้อยู่ในกรอบ');
      const scan = async () => {
        if (stopped || !videoRef.current) return;
        try {
          const found = await detector.detect(videoRef.current);
          if (found[0]?.rawValue && !stopped) {
            stopped = true;
            onResultRef.current(found[0].rawValue);
            return;
          }
        } catch {
          // A frame can fail while the video is still warming up; try the next one.
        }
        if (!stopped) timerRef.current = setTimeout(scan, SCAN_INTERVAL_MS);
      };
      scan();
    }
    start();
    return () => {
      stopped = true;
      clearTimeout(timerRef.current);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <Overlay title="สแกนบาร์โค้ดสินค้า" onClose={onClose} closeLabel="ปิดหน้าสแกน">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#0E1A14]">
        <video ref={videoRef} muted playsInline className="size-full object-cover" />
        {/* The aiming frame: where the barcode should sit. */}
        <div aria-hidden="true" className="absolute inset-x-[12%] top-1/2 h-[34%] -translate-y-1/2 rounded-md border-2 border-white/85">
          {live && <div className="absolute inset-x-2 top-1/2 h-0.5 bg-turn" />}
        </div>
      </div>
      <p role="status" className="mt-3 text-[15px] text-ink-2">{state}</p>
      <form className="mt-4 grid gap-2" onSubmit={event => { event.preventDefault(); if (manual.trim()) onResult(manual.trim()); }}>
        <label htmlFor="barcode" className="text-[15px] font-bold">หรือกรอกรหัสบาร์โค้ด / SKU</label>
        <div className="flex gap-2">
          <Input id="barcode" value={manual} onChange={event => setManual(event.target.value)} placeholder="เช่น 8859816300611" autoComplete="off" inputMode="text" className="sku h-11 bg-panel text-[15px]" />
          <Button variant="outline" size="lg" className="h-11">ค้นหา</Button>
        </div>
      </form>
    </Overlay>
  );
}
