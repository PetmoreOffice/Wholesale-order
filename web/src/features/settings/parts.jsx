import React from 'react';
import { cn } from '@/lib/utils';

/** One settings section: a panel with its own heading row; the page nav links to its id. */
export function SettingsSection({ id, title, description, actions, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 overflow-hidden rounded-xl border border-line bg-panel">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-line px-4 py-4 sm:px-5">
        <div className="min-w-0 max-w-[62ch]">
          <h2 id={`${id}-title`} className="text-[20px] font-medium text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-[15px] text-ink-2">{description}</p>}
        </div>
        {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>*]:max-sm:flex-1">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

/** Large numerals in a strip divided by rules: no boxes inside the section. */
export function NumberStrip({ items, loading }) {
  return (
    <dl className={cn('grid divide-x divide-line border-b border-line', items.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
      {items.map(item => (
        // Numeral first, then its label, as in every count row of the app.
        <div key={item.label} title={item.hint || undefined} className="flex min-w-0 flex-col-reverse gap-1 px-3 py-4 sm:px-5">
          <dt className="text-[14px] leading-tight font-semibold text-ink-2 sm:text-[15px]">{item.label}</dt>
          <dd className="num text-[28px] leading-none font-bold break-words text-ink sm:text-[40px]">
            {loading ? <span className="inline-block h-9 w-16 animate-pulse rounded-md bg-brand-tint/70 align-middle" aria-hidden="true" /> : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Result of the last action, shown in place under the section heading. */
export function Notice({ error, notice }) {
  if (!error && !notice) return null;
  return error
    ? <p role="alert" className="border-b border-line bg-danger-soft px-4 py-3 text-[15px] font-semibold text-danger sm:px-5">{error}</p>
    : <p role="status" className="border-b border-line bg-brand-tint px-4 py-3 text-[15px] font-semibold text-brand-deep sm:px-5">{notice}</p>;
}

export function fileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
