import React from 'react';

// The morning sky behind the work area: a soft blue-to-cream gradient, slow sun rays turning from
// the top-left corner, and hazy hills along the bottom.
// It sits behind every page, so it stays pale: white panels read cleanly on top of it.
// The rays turn on transform only, so the compositor runs them. Under reduced motion they hold still.

export function SkyBackdrop({ className = '' }) {
  return (
    <div aria-hidden="true" className={`sky-backdrop pointer-events-none overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--sky-1)_0%,var(--sky-2)_40%,var(--sky-3)_75%,var(--sky-4)_100%)]" />
      <div className="sky-rays absolute -top-[40vmax] -left-[40vmax] size-[110vmax]" />
      <div className="absolute -top-[14vmin] -left-[14vmin] size-[42vmin] rounded-full bg-[radial-gradient(circle,rgb(255_226_150/0.75)_0%,rgb(255_226_150/0.25)_45%,transparent_70%)]" />
      {/* Far hills along the bottom edge, pale like morning haze. */}
      <svg viewBox="0 0 1600 200" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[16vh] w-full">
        <path d="M0 110C220 60 420 80 640 95S1040 130 1260 90 1500 60 1600 75V200H0z" fill="var(--sky-haze-far)" />
        <path d="M0 150C260 115 520 130 800 140S1320 165 1600 125V200H0z" fill="var(--sky-haze-near)" />
      </svg>
    </div>
  );
}
