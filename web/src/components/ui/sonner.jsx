import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react"
import { Toaster as Sonner } from "sonner";

/**
 * Toasts in the Kibble Bag world: white panel, teal check for success, red for errors.
 * The app is light only, so there is no theme switch.
 */
const Toaster = ({ ...props }) => {
  // Below the top bar on phones (the bottom nav owns the bottom); bottom right on desktop,
  // clear of the Ctrl+K search that opens near the top.
  const phone = window.matchMedia("(max-width: 1023px)").matches
  return (
    <Sonner
      theme="light"
      position={phone ? "top-center" : "bottom-right"}
      offset={{ bottom: 24, right: 24 }}
      mobileOffset={{ top: 64 }}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-5 text-brand" />,
        info: <InfoIcon className="size-5 text-info" />,
        warning: <TriangleAlertIcon className="size-5 text-kibble" />,
        error: <OctagonXIcon className="size-5 text-danger" />,
        loading: <Loader2Icon className="size-5 animate-spin text-brand" />,
      }}
      toastOptions={{
        classNames: {
          toast: "!font-sans !text-[15px] !gap-3 !px-4 !py-3.5 !shadow-overlay",
          title: "!font-semibold !text-ink",
          description: "!text-ink-2",
          actionButton: "!rounded-full !bg-brand !text-white !font-semibold",
        },
      }}
      style={{
        "--normal-bg": "var(--panel)",
        "--normal-text": "var(--ink)",
        "--normal-border": "var(--line)",
        "--border-radius": "16px",
      }}
      {...props}
    />
  );
}

export { Toaster }
