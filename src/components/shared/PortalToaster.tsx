"use client";

import { Toaster } from "sonner";

/** Success: grüner Fill (CRM-Grundpolish N5). Close-X immer sichtbar (nicht weiß auf Grün). */
export function PortalToaster() {
  return (
    <Toaster
      position="top-center"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-border-default bg-surface-card text-text-primary shadow-lg",
          title: "portal-text-body font-semibold",
          description: "portal-text-meta text-text-secondary",
          closeButton:
            "!left-0 !right-auto !top-0 !z-20 !flex !h-6 !w-6 !translate-x-[-35%] !translate-y-[-35%] !items-center !justify-center !rounded-full !border !border-black/15 !bg-white !text-zinc-800 !opacity-100 !shadow-sm hover:!bg-zinc-100 hover:!text-zinc-950 [&>svg]:!h-3.5 [&>svg]:!w-3.5 [&>svg]:!stroke-[2.5]",
          success:
            "!border-emerald-600/25 !bg-emerald-600 !text-white [&_[data-description]]:!text-emerald-50 [&_[data-close-button]]:!border-black/10 [&_[data-close-button]]:!bg-white [&_[data-close-button]]:!text-zinc-800",
          error:
            "!border-red-200 !bg-red-50 !text-red-900 [&_[data-description]]:!text-red-800 [&_[data-close-button]]:!border-black/10 [&_[data-close-button]]:!bg-white [&_[data-close-button]]:!text-zinc-800",
        },
      }}
    />
  );
}
