import React, { useEffect, useRef, useState } from 'react';

export function Scanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const [manual, setManual] = useState('');
  const [state, setState] = useState('กำลังเปิดกล้อง…');

  useEffect(() => {
    let stream;
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (!('BarcodeDetector' in window)) {
          setState('เบราว์เซอร์นี้ไม่รองรับการอ่านบาร์โค้ดอัตโนมัติ กรุณากรอกรหัสด้านล่าง');
          return;
        }
        const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'] });
        setState('วางบาร์โค้ดให้อยู่ในกรอบ');
        const scan = async () => {
          if (!videoRef.current) return;
          const found = await detector.detect(videoRef.current);
          if (found[0]?.rawValue) {
            onResult(found[0].rawValue);
            return;
          }
          timerRef.current = requestAnimationFrame(scan);
        };
        timerRef.current = requestAnimationFrame(scan);
      } catch {
        setState('ไม่สามารถใช้กล้องได้ กรุณาอนุญาตกล้องหรือกรอกรหัสด้านล่าง');
      }
    }
    start();
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [onResult]);

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="scanner" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
        <button className="close" onClick={onClose} aria-label="ปิดหน้าสแกน">×</button>
        <p className="eyebrow">MOBILE SCAN</p>
        <h2 id="scanner-title">สแกนบาร์โค้ดสินค้า</h2>
        <div className="camera">
          <video ref={videoRef} muted playsInline />
          <div className="scan-line" />
        </div>
        <p className="scanner-state">{state}</p>
        <form onSubmit={event => { event.preventDefault(); if (manual.trim()) onResult(manual.trim()); }}>
          <label htmlFor="barcode">หรือกรอกรหัสบาร์โค้ด / SKU</label>
          <div className="manual-scan">
            <input id="barcode" value={manual} onChange={e => setManual(e.target.value)} placeholder="เช่น 8859816300611" autoFocus />
            <button className="secondary">ค้นหา</button>
          </div>
        </form>
      </section>
    </div>
  );
}
