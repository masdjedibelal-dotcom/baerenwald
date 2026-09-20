"use client";

import { PortalSonnerToaster } from "@/lib/shared/portal-toast";

/**
 * Einheitliche Portal-Toasts:
 * - kein Leading-Icon (Check wirkt bei „Anfrage eingereicht“ fehl am Platz)
 * - Farben: Grün (success), Rot (error), Gelb (warning)
 * - etwas größer (Schrift + Padding)
 */
export function PortalToaster() {
  return (
    <PortalSonnerToaster
      position="top-center"
      closeButton
      offset={16}
      gap={10}
      icons={{
        success: <span aria-hidden className="hidden" />,
        error: <span aria-hidden className="hidden" />,
        warning: <span aria-hidden className="hidden" />,
        info: <span aria-hidden className="hidden" />,
        loading: <span aria-hidden className="hidden" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "min-h-[3.25rem] !gap-0 rounded-sheet border px-4 py-3.5 shadow-lg [&>[data-icon]]:!hidden",
          title: "!text-fs-head !leading-snug font-semibold",
          description: "!text-fs-title !leading-snug mt-0.5 opacity-90",
          content: "!gap-0.5",
          icon: "!hidden !w-0 !m-0 !p-0",
          closeButton:
            "!left-0 !right-auto !top-0 !z-20 !flex !h-7 !w-7 !translate-x-[-35%] !translate-y-[-35%] !items-center !justify-center !rounded-full !border !border-black/15 !bg-white !text-p2-ink !opacity-100 !shadow-sm hover:!bg-p2-bg hover:!text-p2-ink [&>svg]:!h-3.5 [&>svg]:!w-3.5 [&>svg]:!stroke-[2.5]",
          success:
            "!border-p2-primary/20 !bg-p2-primary !text-white [&_[data-description]]:!text-white [&_[data-close-button]]:!border-black/10 [&_[data-close-button]]:!bg-white [&_[data-close-button]]:!text-p2-ink",
          error:
            "!border-p2-danger/20 !bg-p2-danger !text-white [&_[data-description]]:!text-white [&_[data-close-button]]:!border-black/10 [&_[data-close-button]]:!bg-white [&_[data-close-button]]:!text-p2-ink",
          warning:
            "!border-warning-border/25 !bg-warning-bg !text-white [&_[data-description]]:!text-warning-text [&_[data-close-button]]:!border-black/10 [&_[data-close-button]]:!bg-white [&_[data-close-button]]:!text-p2-ink",
          info:
            "!border-p2-primary/20 !bg-p2-primary !text-white [&_[data-description]]:!text-white [&_[data-close-button]]:!border-black/10 [&_[data-close-button]]:!bg-white [&_[data-close-button]]:!text-p2-ink",
        },
      }}
    />
  );
}
