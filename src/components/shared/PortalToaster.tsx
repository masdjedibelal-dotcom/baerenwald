"use client";

import { Toaster } from "sonner";

/**
 * Einheitliche Portal-Toasts:
 * - kein Leading-Icon (Check wirkt bei „Anfrage eingereicht“ fehl am Platz)
 * - Farben: Grün (success), Rot (error), Gelb (warning)
 * - etwas größer (Schrift + Padding)
 */
export function PortalToaster() {
  return (
    <Toaster
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
            "min-h-[3.25rem] !gap-0 rounded-xl border px-4 py-3.5 shadow-lg [&>[data-icon]]:!hidden",
          title: "!text-[18px] !leading-snug font-semibold",
          description: "!text-[15.4px] !leading-snug mt-0.5 opacity-90",
          content: "!gap-0.5",
          icon: "!hidden !w-0 !m-0 !p-0",
          closeButton:
            "!left-0 !right-auto !top-0 !z-20 !flex !h-7 !w-7 !translate-x-[-35%] !translate-y-[-35%] !items-center !justify-center !rounded-full !border !border-black/15 !bg-white !text-zinc-800 !opacity-100 !shadow-sm hover:!bg-zinc-100 hover:!text-zinc-950 [&>svg]:!h-3.5 [&>svg]:!w-3.5 [&>svg]:!stroke-[2.5]",
          success:
            "!border-emerald-700/20 !bg-emerald-600 !text-white [&_[data-description]]:!text-emerald-50 [&_[data-close-button]]:!border-black/10 [&_[data-close-button]]:!bg-white [&_[data-close-button]]:!text-zinc-800",
          error:
            "!border-red-800/20 !bg-red-600 !text-white [&_[data-description]]:!text-red-50 [&_[data-close-button]]:!border-black/10 [&_[data-close-button]]:!bg-white [&_[data-close-button]]:!text-zinc-800",
          warning:
            "!border-amber-700/25 !bg-amber-500 !text-white [&_[data-description]]:!text-amber-50 [&_[data-close-button]]:!border-black/10 [&_[data-close-button]]:!bg-white [&_[data-close-button]]:!text-zinc-800",
          info:
            "!border-emerald-700/20 !bg-emerald-600 !text-white [&_[data-description]]:!text-emerald-50 [&_[data-close-button]]:!border-black/10 [&_[data-close-button]]:!bg-white [&_[data-close-button]]:!text-zinc-800",
        },
      }}
    />
  );
}
