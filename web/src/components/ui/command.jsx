import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Search } from "lucide-react"
import { cn } from "cn"

// shadcn's Command (cmdk), wired to this app's own dialog styles instead of shadcn's Dialog,
// whose API differs from components/ui/dialog.jsx.

function Command({ className, ...props }) {
  return <CommandPrimitive data-slot="command" className={cn("flex h-full w-full flex-col overflow-hidden bg-panel text-ink", className)} {...props} />
}

function CommandDialog({ open, onOpenChange, title = "ค้นหา", children }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgb(10_40_38/0.45)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-50 w-[min(640px,calc(100%-24px))] -translate-x-1/2 overflow-hidden rounded-[20px] border border-line bg-panel shadow-overlay outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2"
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[13px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-ink-3">
            {children}
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function CommandInput({ className, ...props }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4">
      <Search aria-hidden="true" className="size-5 shrink-0 text-ink-3" />
      <CommandPrimitive.Input data-slot="command-input" className={cn("h-14 w-full bg-transparent text-[17px] outline-none placeholder:text-ink-3 disabled:opacity-50", className)} {...props} />
    </div>
  )
}

function CommandList({ className, ...props }) {
  return <CommandPrimitive.List data-slot="command-list" className={cn("max-h-[min(60vh,440px)] overflow-y-auto overscroll-contain px-2 pb-2", className)} {...props} />
}

function CommandEmpty(props) {
  return <CommandPrimitive.Empty data-slot="command-empty" className="px-3 py-8 text-center text-[15px] text-ink-2" {...props} />
}

function CommandGroup({ className, ...props }) {
  return <CommandPrimitive.Group data-slot="command-group" className={cn("overflow-hidden", className)} {...props} />
}

function CommandItem({ className, ...props }) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] outline-none select-none data-[selected=true]:bg-brand-tint data-[selected=true]:text-brand-deep data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-ink-3 data-[selected=true]:[&_svg]:text-brand", className)}
      {...props}
    />
  )
}

function CommandShortcut({ className, ...props }) {
  return <span data-slot="command-shortcut" className={cn("ml-auto text-[13px] text-ink-3", className)} {...props} />
}

export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut }
