import React from 'react';
import { Cat, Dog } from 'lucide-react';

// The foot of the teal rail: two ridges of hills, a dog and a cat walking across, and a fringe
// of swaying grass, so the app carries on from the meadow on the sign-in page.
// Under reduced motion the animals rest on the ridge and the grass holds still.

const blades = Array.from({ length: 34 }, (_, index) => {
  const x = (index / 34) * 240 + ((index * 37) % 7);
  const height = 16 + ((index * 53) % 22);
  const lean = ((index * 29) % 13) - 6;
  return { x, height, lean, delay: -((index * 0.37) % 4).toFixed(2), duration: (3 + (index % 5) * 0.4).toFixed(2) };
});

export function RailMeadow({ className = '' }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 h-[150px] overflow-hidden ${className}`}>
      <svg viewBox="0 0 240 150" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <path d="M0 70C40 52 80 58 120 66S200 76 240 56V150H0z" fill="#2F8A6B" />
      </svg>
      <div className="absolute inset-x-0 bottom-[62px] h-9">
        <div className="rail-walk absolute bottom-0 flex items-end gap-3 text-[#E8F5EE]">
          <Dog className="meadow-bob size-8" strokeWidth={2} />
          <Cat className="meadow-bob size-6 [animation-delay:-0.3s]" strokeWidth={2} />
        </div>
      </div>
      <svg viewBox="0 0 240 150" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <path d="M0 104C60 92 120 96 180 104S230 100 240 96V150H0z" fill="#1F7A5E" />
      </svg>
      <svg viewBox="0 0 240 60" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[44px] w-full">
        <rect x="0" y="44" width="240" height="16" fill="#0A4643" />
        {blades.map((blade) => (
          <path
            key={blade.x}
            className="meadow-blade"
            d={`M${blade.x - 3} 60 Q${blade.x + blade.lean * 0.4} ${60 - blade.height * 0.6} ${blade.x + blade.lean} ${60 - blade.height} Q${blade.x + 1} ${60 - blade.height * 0.5} ${blade.x + 3} 60z`}
            fill={blade.x % 3 > 1.5 ? '#14695A' : '#0E5E5A'}
            style={{ transformOrigin: `${blade.x}px 60px`, animationDelay: `${blade.delay}s`, animationDuration: `${blade.duration}s` }}
          />
        ))}
      </svg>
    </div>
  );
}
