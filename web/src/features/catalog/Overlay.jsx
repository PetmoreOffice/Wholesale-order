import React, { useEffect, useState } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';

const phoneQuery = '(max-width: 639px)';

function usePhone() {
  const [phone, setPhone] = useState(() => window.matchMedia(phoneQuery).matches);
  useEffect(() => {
    const media = window.matchMedia(phoneQuery);
    const update = () => setPhone(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return phone;
}

function CloseButton({ locked, label, as: Close }) {
  return (
    <Close disabled={locked} aria-label={label} className="-mr-2 grid size-11 shrink-0 sm:size-10 place-items-center rounded-full text-ink-2 hover:bg-brand-tint hover:text-brand-deep disabled:opacity-50">
      <X aria-hidden="true" className="size-5" />
    </Close>
  );
}

/**
 * Cart, order review and scanner panel. On phones it is a shadcn Drawer (vaul): it slides up
 * from the bottom and can be swiped down to close. From 640px up it is a centred Radix dialog.
 * Both trap focus, close on Esc and return focus. `locked` keeps it open while a request is
 * in flight (no swipe, no Esc).
 */
export function Overlay({ title, description, onClose, locked = false, closeLabel = 'ปิด', footer, wide = false, children }) {
  const phone = usePhone();
  const onOpenChange = open => { if (!open && !locked) onClose(); };
  const body = <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">{children}</div>;
  const foot = footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-4 py-3 sm:px-6 [&>*]:max-sm:flex-1">{footer}</footer>;

  if (phone) {
    return (
      <Drawer open onOpenChange={onOpenChange} dismissible={!locked} repositionInputs={false}>
        <DrawerContent className="max-h-[92dvh] rounded-t-[24px] border-line bg-panel pb-[env(safe-area-inset-bottom)] text-ink">
          <header className="flex items-start justify-between gap-4 border-b border-line px-4 pt-3 pb-3">
            <div className="min-w-0">
              <DrawerTitle className="font-display text-[20px] font-medium">{title}</DrawerTitle>
              {description ? <DrawerDescription className="mt-0.5 text-[15px] text-ink-2">{description}</DrawerDescription> : <DrawerDescription className="sr-only">{title}</DrawerDescription>}
            </div>
            <CloseButton locked={locked} label={closeLabel} as={DrawerClose} />
          </header>
          {body}
          {foot}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DialogPrimitive.Root open onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgb(10_40_38/0.5)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[88dvh] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[20px] bg-panel text-ink shadow-overlay outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2 data-[state=open]:duration-200',
            wide ? 'w-[min(760px,calc(100%-48px))]' : 'w-[min(600px,calc(100%-48px))]'
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-display text-[20px] font-medium">{title}</DialogPrimitive.Title>
              {description && <p className="mt-0.5 text-[15px] text-ink-2">{description}</p>}
            </div>
            <CloseButton locked={locked} label={closeLabel} as={DialogPrimitive.Close} />
          </header>
          {body}
          {foot}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
