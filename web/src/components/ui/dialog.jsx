import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

/**
 * Radix Dialog with the app's existing modal styles: focus trap, Esc to close,
 * background scroll lock and focus return come from Radix.
 * `locked` keeps the dialog open while a save is in flight.
 */
function Dialog({ onClose, locked = false, className, labelledBy, children }) {
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open && !locked) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-backdrop">
          <DialogPrimitive.Content className={className} aria-describedby={undefined} aria-labelledby={labelledBy}>
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

const DialogTitle = DialogPrimitive.Title
const DialogClose = DialogPrimitive.Close

export { Dialog, DialogTitle, DialogClose }
