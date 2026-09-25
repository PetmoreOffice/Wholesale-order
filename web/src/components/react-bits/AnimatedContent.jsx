import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * React Bits AnimatedContent (JS/CSS variant), adapted for this operational UI.
 * Keeps content visible by default and respects the user's reduce-motion setting.
 */
export function AnimatedContent({
  children,
  className = '',
  distance = 18,
  direction = 'vertical',
  reverse = false,
  duration = 0.42,
  delay = 0,
  threshold = 0.12,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const axis = direction === 'horizontal' ? 'x' : 'y';
    const offset = reverse ? -distance : distance;
    const timeline = gsap.timeline({ paused: true, delay });

    gsap.set(element, { [axis]: offset, opacity: 0.01 });
    timeline.to(element, {
      [axis]: 0,
      opacity: 1,
      duration,
      ease: 'power3.out',
      clearProps: 'transform,opacity',
    });

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: `top ${(1 - threshold) * 100}%`,
      once: true,
      onEnter: () => timeline.play(),
    });

    return () => {
      trigger.kill();
      timeline.kill();
    };
  }, [delay, direction, distance, duration, reverse, threshold]);

  return <div ref={ref} className={className}>{children}</div>;
}
