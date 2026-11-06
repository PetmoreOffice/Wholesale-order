import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { X } from 'lucide-react';
import { count } from '@/lib/format';
import { cn } from '@/lib/utils';
import { findCategory } from './catalogData.js';

function Chip({ selected, onClick, children, label }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-baseline gap-1.5 rounded-full border px-3.5 py-1.5 text-[15px] max-sm:py-2.5 font-semibold whitespace-nowrap transition-colors',
        selected ? 'border-brand bg-brand text-white' : 'border-line-strong bg-panel text-ink hover:border-brand hover:bg-brand-tint'
      )}
    >
      {label}
      {children !== undefined && <span className={cn('num text-[13px] font-medium', selected ? 'text-brand-soft' : 'text-ink-3')}>{children}</span>}
    </button>
  );
}

function Row({ label, children }) {
  return (
    // Phones scroll each level sideways; wider screens wrap.
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      {children}
    </div>
  );
}

/**
 * The three-level shelf: group → department → sub-department. Each chosen level opens the
 * next as its own row, so the path reads top to bottom and lives in the URL (?g=&d=&s=).
 */
export function CategoryShelf({ groups, value, onChange, error }) {
  const { group, department, sub } = findCategory(groups, value);
  if (error) return <p role="alert" className="text-[15px] text-danger">ไม่สามารถโหลดประเภทสินค้าได้</p>;
  if (!groups.length) return <Skeleton aria-hidden="true" className="h-9 w-2/3 rounded-full" />;
  return (
    <nav aria-label="หมวดหมู่สินค้า" className="grid gap-2">
      <Row label="กลุ่มสินค้า">
        <Chip label="ทั้งหมด" selected={!group} onClick={() => onChange({})} />
        {groups.map(item => (
          <Chip key={item.id} label={item.name} selected={group?.id === item.id} onClick={() => onChange({ g: item.id })}>{count.format(item.products)}</Chip>
        ))}
      </Row>
      {group && group.departments.length > 0 && (
        <Row label={`หมวดใน${group.name}`}>
          <Chip label={`ทุกหมวดใน${group.name}`} selected={!department} onClick={() => onChange({ g: group.id })} />
          {group.departments.map(item => (
            <Chip key={item.id} label={item.name} selected={department?.id === item.id} onClick={() => onChange({ g: group.id, d: String(item.id) })}>{count.format(item.products)}</Chip>
          ))}
        </Row>
      )}
      {department && department.children.length > 0 && (
        <Row label={`หมวดย่อยของ ${department.name}`}>
          <Chip label={`ทั้งหมดใน${department.name}`} selected={!sub} onClick={() => onChange({ g: group.id, d: String(department.id) })} />
          {department.children.map(item => (
            <Chip key={item.id} label={item.name} selected={sub?.id === item.id} onClick={() => onChange({ g: group.id, d: String(department.id), s: String(item.id) })}>{count.format(item.products)}</Chip>
          ))}
        </Row>
      )}
      {group && (
        <button type="button" onClick={() => onChange({})} className="inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-1 text-[15px] font-semibold text-brand hover:underline">
          <X aria-hidden="true" className="size-4" /> ล้างหมวดหมู่
        </button>
      )}
    </nav>
  );
}
