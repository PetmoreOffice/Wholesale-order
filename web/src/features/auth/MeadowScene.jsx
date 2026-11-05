import React, { useEffect, useRef } from 'react';
import { Cat, Dog } from 'lucide-react';

// A morning meadow drawn in code: sky, sun, drifting clouds, three ridges of hills, a dog and
// a cat walking the middle ridge, grass that sways and a few leaves on the wind. Every layer
// moves a little with the pointer (deeper layers less), so the scene reads as having depth.
// Nothing here is a photo or a downloaded asset. Under reduced motion everything holds still.

// Deterministic "random" so the grass looks the same on every load.
function seeded(seed) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const random = seeded(42);
const blades = Array.from({ length: 140 }, (_, index) => {
  const x = (index / 140) * 1600 + random() * 14;
  const height = 46 + random() * 70;
  const lean = (random() - 0.5) * 26;
  return { x, height, lean, shade: random() };
});
// The grass sways as three interleaved layers, each a single composited element.
const grassLayers = [0, 1, 2].map((group) => blades.filter((_, index) => index % 3 === group));
const leaves = Array.from({ length: 7 }, (_, index) => ({
  top: 8 + random() * 50,
  delay: -(index * 3.1 + random() * 2).toFixed(1),
  duration: (16 + random() * 10).toFixed(1),
  size: 14 + random() * 12,
  hue: random() > 0.5 ? '#7FB069' : '#C9A24B'
}));


export function MeadowScene({ className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const scene = ref.current;
    if (!scene || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const layers = scene.querySelectorAll('[data-depth]');
    let frame = 0;
    const onMove = (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // The scene fills the viewport, so the window size stands in for measuring it.
        const x = (event.clientX / window.innerWidth) - 0.5;
        const y = (event.clientY / window.innerHeight) - 0.5;
        // Each layer's transform is written directly: a shared CSS variable made the browser
        // restyle the whole scene on every move.
        for (const node of layers) {
          const depth = Number(node.dataset.depth);
          node.style.transform = `translate3d(${(x * depth).toFixed(2)}px, ${(y * depth * 0.4).toFixed(2)}px, 0)`;
        }
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', onMove); };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className={`meadow pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* Sky and the low morning sun. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#9ED3E3_0%,#CBE9EC_45%,#FFF1D6_78%,#FFE2B8_100%)]" />
      <div className="meadow-layer absolute top-[10%] left-[50%] size-[18vmin] rounded-full bg-[#FFD27A] shadow-[0_0_120px_60px_rgb(255_214_130/0.55)]" data-depth={-8} />

      {/* Clouds drift slowly across. */}
      {[{ top: '10%', delay: '-12s', scale: 1 }, { top: '22%', delay: '-48s', scale: 0.7 }, { top: '6%', delay: '-80s', scale: 0.85 }].map((cloud) => (
        <svg key={cloud.delay} viewBox="0 0 220 80" className="meadow-cloud absolute w-[22vw] min-w-40" style={{ top: cloud.top, animationDelay: cloud.delay, '--s': cloud.scale }}>
          <path d="M30 62c-16 0-24-10-24-20 0-12 12-22 26-20 4-14 18-20 32-16 8-14 28-18 42-8 10-8 30-6 38 8 18-4 34 8 34 24 0 18-14 32-32 32H30z" fill="#fff" opacity="0.92" />
        </svg>
      ))}

      {/* Three ridges of hills, far to near. */}
      <svg viewBox="0 0 1600 600" preserveAspectRatio="none" className="meadow-layer absolute inset-x-[-4%] bottom-0 h-[62%] w-[108%]" data-depth={6}>
        <path d="M0 260C180 180 340 210 520 190S880 120 1060 170 1420 150 1600 120V600H0z" fill="#A7D7BE" />
      </svg>
      <svg viewBox="0 0 1600 600" preserveAspectRatio="none" className="meadow-layer absolute inset-x-[-4%] bottom-0 h-[50%] w-[108%]" data-depth={14}>
        <path d="M0 300C220 230 420 250 640 270S1040 330 1260 280 1500 230 1600 250V600H0z" fill="#5FAE8C" />
      </svg>

      {/* A dog and a cat out for a walk along the middle ridge. */}
      <div className="meadow-layer absolute inset-x-0 bottom-[32%] h-12" data-depth={14}>
        <div className="meadow-walk absolute inset-x-0 bottom-0 h-full">
          <div className="absolute bottom-0 left-0 flex items-end gap-6 text-[#1F5E4A]">
            <Dog className="meadow-bob size-14" strokeWidth={2} />
            <Cat className="meadow-bob size-10 [animation-delay:-0.3s]" strokeWidth={2} />
          </div>
        </div>
      </div>

      <svg viewBox="0 0 1600 600" preserveAspectRatio="none" className="meadow-layer absolute inset-x-[-4%] bottom-0 h-[34%] w-[108%]" data-depth={24}>
        <path d="M0 330C260 280 520 300 800 320S1320 360 1600 300V600H0z" fill="#2F8A6B" />
      </svg>

      {/* Foreground grass, swaying in three layers. */}
      <div className="meadow-layer absolute inset-x-[-4%] bottom-0 h-[18%]" data-depth={36}>
        {grassLayers.map((blades, group) => (
          <div key={group} className="grass-sway absolute inset-0" style={{ animationDelay: `${-group * 1.4}s`, animationDuration: `${3.8 + group * 0.6}s` }}>
            <svg viewBox="0 0 1600 160" preserveAspectRatio="none" className="size-full">
              {blades.map((blade) => (
                <path
                  key={blade.x}
                  d={`M${blade.x - 5} 160 Q${blade.x + blade.lean * 0.4} ${160 - blade.height * 0.6} ${blade.x + blade.lean} ${160 - blade.height} Q${blade.x + 2} ${160 - blade.height * 0.5} ${blade.x + 5} 160z`}
                  fill={blade.shade > 0.6 ? '#1F7A5E' : blade.shade > 0.3 ? '#14695A' : '#0E5E5A'}
                />
              ))}
            </svg>
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-brand" />
      </div>

      {/* A few leaves on the morning wind. */}
      {leaves.map((leaf) => (
        <svg key={leaf.delay} viewBox="0 0 24 24" className="meadow-leaf absolute left-0" style={{ top: `${leaf.top}%`, width: leaf.size, height: leaf.size, animationDelay: `${leaf.delay}s`, animationDuration: `${leaf.duration}s` }}>
          <path d="M3 21C3 11 9 4 21 3c0 11-7 18-18 18zm0 0L13 11" fill={leaf.hue} stroke="#2F6B3A" strokeWidth="1" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}
