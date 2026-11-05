import React, { useEffect, useRef } from 'react';

// The morning sky behind the work area: a soft blue-to-cream gradient, slow sun rays from the
// top-left corner that lean toward the pointer, and golden pollen drifting up through the light.
// It sits behind every page, so it stays pale: white panels read cleanly on top of it.
// Under reduced motion the rays and pollen hold still.

const POLLEN = 46;

function usePollen(canvasRef, reduced) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let ratio = 1;
    let raf = 0;
    const pointer = { x: -9999, y: -9999 };
    const motes = Array.from({ length: POLLEN }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1.2 + Math.random() * 2.4,
      speed: 0.006 + Math.random() * 0.014,
      sway: Math.random() * Math.PI * 2,
      glow: 0
    }));

    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      // Resizing clears the canvas; a still sky has no next frame to repaint it.
      if (reduced) draw(0);
    };

    const draw = (time) => {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      for (const mote of motes) {
        const x = mote.x * width + Math.sin(time / 1800 + mote.sway) * 14;
        const y = mote.y * height;
        // Pollen near the pointer catches the light.
        const near = Math.max(0, 1 - Math.hypot(x - pointer.x, y - pointer.y) / 160);
        mote.glow += (near - mote.glow) * 0.08;
        const radius = mote.r * (1 + mote.glow * 0.8);
        ctx.globalAlpha = 0.18 + mote.glow * 0.35;
        ctx.fillStyle = '#F2C14E';
        ctx.beginPath();
        ctx.arc(x, y, radius * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.55 + mote.glow * 0.45;
        ctx.fillStyle = '#E7A92A';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const frame = (time) => {
      for (const mote of motes) {
        mote.y -= mote.speed / 60;
        if (mote.y < -0.02) { mote.y = 1.02; mote.x = Math.random(); }
      }
      draw(time);
      raf = requestAnimationFrame(frame);
    };

    const onMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };

    resize();
    window.addEventListener('resize', resize);
    if (!reduced) {
      window.addEventListener('pointermove', onMove);
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, [canvasRef, reduced]);
}

export function SkyBackdrop({ className = '' }) {
  const ref = useRef(null);
  const canvasRef = useRef(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  usePollen(canvasRef, reduced);

  // The rays lean a few degrees toward the pointer.
  useEffect(() => {
    const sky = ref.current;
    if (!sky || reduced) return undefined;
    let frame = 0;
    const onMove = (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        sky.style.setProperty('--lean', `${((event.clientX / window.innerWidth) - 0.5) * 8}deg`);
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', onMove); };
  }, [reduced]);

  return (
    <div ref={ref} aria-hidden="true" className={`sky-backdrop pointer-events-none overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#D3ECF1_0%,#E9F5F1_40%,#F7F6EA_75%,#FDF1DE_100%)]" />
      <div className="sky-rays absolute -top-[40vmax] -left-[40vmax] size-[110vmax]" />
      <div className="absolute -top-[14vmin] -left-[14vmin] size-[42vmin] rounded-full bg-[radial-gradient(circle,rgb(255_226_150/0.75)_0%,rgb(255_226_150/0.25)_45%,transparent_70%)]" />
      {/* Far hills along the bottom edge, pale like morning haze. */}
      <svg viewBox="0 0 1600 200" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[16vh] w-full">
        <path d="M0 110C220 60 420 80 640 95S1040 130 1260 90 1500 60 1600 75V200H0z" fill="#CFE8D9" />
        <path d="M0 150C260 115 520 130 800 140S1320 165 1600 125V200H0z" fill="#B9DEC8" />
      </svg>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  );
}
