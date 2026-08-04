"use client";

import { Toaster } from "sonner";

/** Success: grüner Fill (CRM-Grundpolish N5). */
export function PortalToaster() {
  return (
    <Toaster
      position="top-center"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-border-default bg-surface-card text-text-primary shadow-lg",
          title: "font-semibold text-sm",
          description: "text-xs text-text-secondary",
          success:
            "!border-emerald-600/25 !bg-emerald-600 !text-white [&_[data-description]]:!text-emerald-50",
          error:
            "!border-red-200 !bg-red-50 !text-red-900 [&_[data-description]]:!text-red-800",
        },
      }}
    />
  );
}
