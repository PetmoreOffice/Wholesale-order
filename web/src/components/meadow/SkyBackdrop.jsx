import React from 'react';

// The morning sky behind the work area: a soft blue-to-cream gradient, slow sun rays turning from
// the top-left corner, and hazy hills along the bottom.
// It sits behind every page, so it stays pale: white panels read cleanly on top of it.
// The rays turn on transform only, so the compositor runs them. Under reduced motion they hold still.

export function SkyBackdrop({ className = '' }) {
  return (
    <div aria-hidden="true" className={`sky-backdrop pointer-events-none overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#D3ECF1_0%,#E9F5F1_40%,#F7F6EA_75%,#FDF1DE_100%)]" />
      <div className="sky-rays absolute -top-[40vmax] -left-[40vmax] size-[110vmax]" />
      <div className="absolute -top-[14vmin] -left-[14vmin] size-[42vmin] rounded-full bg-[radial-gradient(circle,rgb(255_226_150/0.75)_0%,rgb(255_226_150/0.25)_45%,transparent_70%)]" />
      {/* Far hills along the bottom edge, pale like morning haze. */}
      <svg viewBox="0 0 1600 200" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[16vh] w-full">
        <path d="M0 110C220 60 420 80 640 95S1040 130 1260 90 1500 60 1600 75V200H0z" fill="#CFE8D9" />
        <path d="M0 150C260 115 520 130 800 140S1320 165 1600 125V200H0z" fill="#B9DEC8" />
      </svg>
    </div>
  );
}
