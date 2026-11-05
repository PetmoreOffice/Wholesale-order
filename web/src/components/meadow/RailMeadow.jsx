import React from 'react';
import { Cat, Dog } from 'lucide-react';

// The foot of the teal rail: two ridges of hills, a dog and a cat walking across, and a fringe
// of swaying grass, so the app carries on from the meadow on the sign-in page.
// Under reduced motion the animals rest on the ridge and the grass holds still.

const blades = Array.from({ length: 34 }, (_, index) => {
  const x = (index / 34) * 240 + ((index * 37) % 7);
  const height = 16 + ((index * 53) % 22);
  const lean = ((index * 29) % 13) - 6;
  return { x, height, lean };
});
// The grass sways as three interleaved layers, each a single composited element.
const layers = [0, 1, 2].map((group) => blades.filter((_, index) => index % 3 === group));

export function RailMeadow({ className = '' }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 h-[150px] overflow-hidden ${className}`}>
      <svg viewBox="0 0 240 150" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <path d="M0 70C40 52 80 58 120 66S200 76 240 56V150H0z" fill="#2F8A6B" />
      </svg>
      <div className="rail-walk absolute inset-x-0 bottom-[62px] h-9">
        <div className="absolute bottom-0 left-0 flex items-end gap-3 text-[#E8F5EE]">
          <Dog className="meadow-bob size-8" strokeWidth={2} />
          <Cat className="meadow-bob size-6 [animation-delay:-0.3s]" strokeWidth={2} />
        </div>
      </div>
      <svg viewBox="0 0 240 150" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <path d="M0 104C60 92 120 96 180 104S230 100 240 96V150H0z" fill="#1F7A5E" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-[44px]">
        {layers.map((layer, group) => (
          <div key={group} className="grass-sway absolute inset-0" style={{ animationDelay: `${-group * 1.3}s`, animationDuration: `${3.6 + group * 0.5}s` }}>
            <svg viewBox="0 0 240 60" preserveAspectRatio="none" className="size-full">
              {layer.map((blade) => (
                <path
                  key={blade.x}
                  d={`M${blade.x - 3} 60 Q${blade.x + blade.lean * 0.4} ${60 - blade.height * 0.6} ${blade.x + blade.lean} ${60 - blade.height} Q${blade.x + 1} ${60 - blade.height * 0.5} ${blade.x + 3} 60z`}
                  fill={group === 1 ? '#14695A' : '#0E5E5A'}
                />
              ))}
            </svg>
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 h-[12px] bg-[#0A4643]" />
      </div>
    </div>
  );
}
