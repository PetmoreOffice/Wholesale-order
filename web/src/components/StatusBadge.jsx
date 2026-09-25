import React from 'react';
import { BadgeCheck, CircleCheckBig, CircleX, ClipboardList, FilePen, Inbox, MessageCircleQuestion, Package, Truck, UserCheck } from 'lucide-react';
import { statusText, statusTone } from '../lib/orderStatus.js';

const statusIcon = {
  draft: FilePen,
  submitted: Inbox,
  assigned: UserCheck,
  need_information: MessageCircleQuestion,
  approved: BadgeCheck,
  erp_entry: ClipboardList,
  preparing: Package,
  shipped: Truck,
  completed: CircleCheckBig,
  rejected: CircleX
};

// DESIGN.md: status is never color alone — tone, icon and label always travel together.
export function StatusBadge({ status }) {
  const Icon = statusIcon[status] || Inbox;
  return (
    <span className="status" data-tone={statusTone[status] || 'neutral'}>
      <Icon aria-hidden="true" />
      {statusText[status] || status}
    </span>
  );
}
