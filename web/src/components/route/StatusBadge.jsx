import React from 'react';
import { BadgeCheck, CircleCheckBig, CircleX, ClipboardList, FilePen, Inbox, MessageCircleQuestion, PackageCheck, Truck, Undo2, UserCheck } from 'lucide-react';
import { statusText, statusTone } from '@shared/orderWorkflow.js';
import { cn } from '@/lib/utils';

const icons = {
  draft: FilePen,
  submitted: Inbox,
  assigned: UserCheck,
  need_information: MessageCircleQuestion,
  approved: BadgeCheck,
  erp_entry: ClipboardList,
  preparing: PackageCheck,
  shipped: Truck,
  completed: CircleCheckBig,
  rejected: CircleX,
  cancelled: Undo2
};

// Roles: kibble orange is "your turn", blue informs, red stops, teal is work in progress.
export const toneClass = {
  neutral: 'bg-sunken text-ink-2 ring-line-strong',
  info: 'bg-info-soft text-info ring-info/30',
  progress: 'bg-brand-tint text-brand-deep ring-brand/25',
  attention: 'bg-turn text-ink ring-ink/20',
  success: 'bg-brand text-white ring-brand',
  danger: 'bg-danger-soft text-danger ring-danger/30'
};

export function StatusIcon({ status, className }) {
  const Icon = icons[status] || Inbox;
  return <Icon aria-hidden="true" className={className} />;
}

/** Status is never colour alone: tone + icon + written Thai label. */
export function StatusBadge({ status, className }) {
  if (!status) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ring-inset', toneClass[statusTone[status]] || toneClass.neutral, className)}>
      <StatusIcon status={status} className="size-3.5" />
      {statusText[status] || status}
    </span>
  );
}
