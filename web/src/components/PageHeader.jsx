import React from 'react';

/** Page title row: heading and one line of context on the left, actions on the right (full width on phones). */
export function PageHeader({ title, description, actions }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] font-medium tracking-normal text-ink sm:text-[34px]">{title}</h1>
        {description && <p className="mt-0.5 text-[15px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>*]:max-sm:flex-1">{actions}</div>}
    </header>
  );
}

/** Loading, empty and error states share one shape so every list reads the same. */
export function StateBlock({ title, children, action, tone }) {
  return (
    <div role={tone === 'danger' ? 'alert' : undefined} className={`flex flex-col items-start gap-2 px-5 py-8 ${tone === 'danger' ? 'text-danger' : 'text-ink-2'}`}>
      <p className={`text-[17px] font-bold ${tone === 'danger' ? 'text-danger' : 'text-ink'}`}>{title}</p>
      {children && <div className="text-[15px]">{children}</div>}
      {action}
    </div>
  );
}
