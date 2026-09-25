import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"
import { cn } from "cn"

/**
 * shadcn Sheet: a Radix Dialog that slides in from the right. Focus trap, Esc, scroll lock
 * and focus return come from Radix. `locked` keeps it open while a save is in flight.
 */
function Sheet({ onClose, locked = false, children }) {
  return (
    <SheetPrimitive.Root open onOpenChange={(open) => { if (!open && !locked) onClose() }}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="sheet-overlay" />
        {children}
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  )
}

// Radix's Portal hands its child a ref, so this must forward it (React 18).
const SheetContent = React.forwardRef(function SheetContent({ className, children, ...props }, ref) {
  return (
    <SheetPrimitive.Content ref={ref} data-slot="sheet-content" className={cn("sheet", className)} aria-describedby={undefined} {...props}>
      {children}
    </SheetPrimitive.Content>
  )
})

function SheetHeader({ className, ...props }) {
  return <div data-slot="sheet-header" className={cn("sheet-header", className)} {...props} />
}

function SheetBody({ className, ...props }) {
  return <div data-slot="sheet-body" className={cn("sheet-body", className)} {...props} />
}

function SheetFooter({ className, ...props }) {
  return <div data-slot="sheet-footer" className={cn("sheet-footer", className)} {...props} />
}

const SheetTitle = SheetPrimitive.Title
const SheetDescription = SheetPrimitive.Description
const SheetClose = SheetPrimitive.Close

export { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription, SheetClose }
