import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { createBarcodeDetector } from '../../lib/barcodeDetector.js';
import { Dialog, DialogClose, DialogTitle } from '@/components/ui/dialog';

// The WebAssembly fallback is heavier than the native detector; ~7 frames a second is plenty for a barcode.
const SCAN_INTERVAL_MS = 150;

export function Scanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const [manual, setManual] = useState('');
  const [state, setState] = useState('กำลังเปิดกล้อง…');
  // The parent passes a new callback on every render; keep the camera running across those renders.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    let stream;
    let stopped = false;
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
        if (stopped) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
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
    <Dialog className="scanner" labelledBy="scanner-title" onClose={onClose}>
      <DialogClose className="close" aria-label="ปิดหน้าสแกน"><X aria-hidden="true" /></DialogClose>
      <p className="eyebrow">MOBILE SCAN</p>
      <DialogTitle id="scanner-title">สแกนบาร์โค้ดสินค้า</DialogTitle>
      <div className="camera">
        <video ref={videoRef} muted playsInline />
        <div className="scan-line" />
      </div>
      <p className="scanner-state" role="status">{state}</p>
      <form onSubmit={event => { event.preventDefault(); if (manual.trim()) onResult(manual.trim()); }}>
        <label htmlFor="barcode">หรือกรอกรหัสบาร์โค้ด / SKU</label>
        <div className="manual-scan">
          <input id="barcode" value={manual} onChange={e => setManual(e.target.value)} placeholder="เช่น 8859816300611" autoComplete="off" />
          <button className="secondary">ค้นหา</button>
        </div>
      </form>
    </Dialog>
  );
}
