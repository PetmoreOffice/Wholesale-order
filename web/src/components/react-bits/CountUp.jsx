import React, { useEffect, useRef, useState } from 'react';
import { count as formatCount } from '../../lib/format.js';

/**
 * React Bits CountUp, trimmed for queue counters: eases from the previous value to the
 * new one so a changed count is noticeable, and jumps straight there under reduced motion.
 */
export function CountUp({ to, duration = 0.6 }) {
  const [value, setValue] = useState(to);
  const fromRef = useRef(to);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = to;
    // Background tabs pause requestAnimationFrame; show the real number instead of a stale one.
    if (from === to || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(to);
      return undefined;
    }
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration]);

  return <span className="num">{formatCount.format(value)}</span>;
}
