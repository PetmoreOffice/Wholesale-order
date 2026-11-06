import React from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetBody, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Thin wrappers over the shared Sheet and Dialog so admin screens share one header and close button.

/** A panel from the right edge; full screen on phones (≤ 760px). */
export function SidePanel({ title, description, onClose, locked = false, footer, children }) {
  return (
    <Sheet onClose={onClose} locked={locked}>
      <SheetContent className="max-[760px]:w-screen">
        <SheetHeader className="items-start px-4 sm:px-5">
          <div className="min-w-0">
            <SheetTitle className="text-[20px] leading-snug font-bold text-ink">{title}</SheetTitle>
            {description && <SheetDescription className="mt-0.5 text-[15px] text-ink-2">{description}</SheetDescription>}
          </div>
          <SheetClose disabled={locked} aria-label="ปิด" className="-mr-2 grid size-11 shrink-0 sm:size-10 place-items-center rounded-md text-ink-2 hover:bg-brand-tint hover:text-brand-deep disabled:opacity-50">
            <X aria-hidden="true" className="size-5" />
          </SheetClose>
        </SheetHeader>
        <SheetBody className="overscroll-contain p-0">{children}</SheetBody>
        {footer && <SheetFooter className="justify-end px-4 sm:px-5 [&>*]:max-sm:flex-1">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}

/** A small centred question before a destructive step. */
export function ConfirmDialog({ title, children, confirm, onClose }) {
  return (
    <Dialog onClose={onClose} labelledBy="confirm-title" className="grid max-w-[460px] gap-3 p-5 outline-none sm:p-6">
      <DialogTitle id="confirm-title" className="text-[19px] leading-snug font-bold text-ink">{title}</DialogTitle>
      <div className="text-[15px] text-ink-2">{children}</div>
      <div className="mt-2 flex flex-wrap justify-end gap-2 [&>*]:max-sm:flex-1">{confirm}</div>
    </Dialog>
  );
}
